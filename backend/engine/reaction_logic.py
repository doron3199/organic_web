"""
Main orchestration for the reaction engine.

Delegates to specialized modules:
  - engine.models: Data structures (ReactionStepInfo, ReactionBranch) and constants
  - engine.carbocation: Carbocation stability and rearrangement logic
  - engine.ozonolysis: Ring ozonolysis special-case handling
  - engine.branch_processing: Core branch processing (SMARTS execution, outcome handling)
  - engine.helpers: Utility functions (matching, auto-add, organic/inorganic separation)
"""

import logging


from rdkit import Chem

from engine.models import (
    ReactionStepInfo,
    ReactionBranch,
    MAX_CHAIN_STEPS,
)
from engine.branch_processing import (
    process_branch_with_smarts,
    deduplicate_branches,
)
from engine.helpers import (
    separate_organic_inorganic,
    find_next_reaction_matches,
    _parse_auto_add_molecules,
    _apply_auto_add_step,
    normalize_smarts_steps,
    extract_step_explanations,
    extract_step_selectivities,
)
from reactions.models import SmartsEntry


logger = logging.getLogger(__name__)


# ============================================================================
# Selectivity Helpers
# ============================================================================


def _apply_step_selectivity(
    all_steps: list[ReactionStepInfo],
    selectivity,
    step_idx_from: int,
    step_idx_to: int,
):
    """
    Apply step-level selectivity rules to newly created steps.

    Groups sibling steps (same parent_id) and labels each as
    major / minor / equal based on the selectivity rules.
    Also propagates ``is_on_major_path`` to rearrangement steps.
    """
    from collections import defaultdict

    new_steps = [s for s in all_steps if step_idx_from <= s.step_index < step_idx_to]

    reaction_steps = [
        s for s in new_steps if s.step_type in ("reaction", "carbocation_intermediate")
    ]
    rearrangement_steps = [
        s for s in new_steps if s.step_type == "carbocation_rearrangement"
    ]

    # Group reaction steps by parent_id (siblings from the same input branch)
    groups: dict[str | None, list[ReactionStepInfo]] = defaultdict(list)
    for s in reaction_steps:
        groups[s.parent_id].append(s)

    step_map = {s.step_id: s for s in all_steps}

    for _parent_id, siblings in groups.items():
        # If the parent is already on a minor path, all its descendants
        # are also minor. We don't upgrade them even if they match a major rule.
        parent = step_map.get(_parent_id)
        if parent and not parent.is_on_major_path:
            for s in siblings:
                s.step_selectivity = "minor"
                s.is_on_major_path = False
            continue

        if len(siblings) <= 1:
            # Only one outcome — no selectivity decision to make
            continue

        # Relative ranking: best rank(s) → major, rest → minor
        sibling_ranks: dict[str, int] = {}
        for step in siblings:
            best_rank = len(selectivity.rules)
            for rank, smarts in enumerate(selectivity.rules):
                pattern = Chem.MolFromSmarts(smarts)
                if not pattern:
                    continue
                for product_smiles in step.products:
                    mol = Chem.MolFromSmiles(product_smiles)
                    if mol and mol.HasSubstructMatch(pattern):
                        if rank < best_rank:
                            best_rank = rank
                        break
            sibling_ranks[step.step_id] = best_rank

        best_overall = min(sibling_ranks.values())
        major_count = sum(1 for r in sibling_ranks.values() if r == best_overall)
        # Two or more share the best rank → equal; exactly one → major
        winner_label = "equal" if major_count >= 2 else "major"
        for step in siblings:
            if sibling_ranks[step.step_id] == best_overall:
                step.step_selectivity = winner_label
            else:
                step.step_selectivity = "minor"
                step.is_on_major_path = False
            logger.debug(
                "  Selectivity: step %s  products=%s  label=%s",
                step.step_id,
                step.products,
                step.step_selectivity,
            )

    # Propagate to rearrangement steps.
    # If a parent step was demoted to minor (e.g. anti-Markovnikov),
    # its rearrangement children must also be demoted, even if
    # they were labeled "major" by the rearrangement fork logic.
    for rearr in rearrangement_steps:
        parent = step_map.get(rearr.parent_id)
        if parent and not parent.is_on_major_path:
            # Parent was demoted — rearrangement inherits minor
            rearr.is_on_major_path = False
            rearr.step_selectivity = "minor"
        elif rearr.step_selectivity is None and parent:
            rearr.is_on_major_path = parent.is_on_major_path


def _build_product_selectivity(
    branches: list[ReactionBranch],
) -> dict[str, str]:
    """
    Build a mapping from organic product SMILES to a selectivity label
    (``"major"``, ``"minor"``, or ``"equal"``) based on the branch's
    ``selectivity_label`` (falling back to ``is_on_major_path``).

    Precedence when a product appears in multiple branches:
    major > equal > minor.
    """
    _PRIORITY = {"major": 0, "equal": 1, "minor": 2}
    result: dict[str, str] = {}
    for branch in branches:
        sel = branch.selectivity_label
        if sel is None:
            sel = "major" if branch.is_on_major_path else "minor"
        for mol in branch.molecules:
            if not mol:
                continue
            if any(a.GetSymbol() == "C" for a in mol.GetAtoms()):
                smi = Chem.MolToSmiles(mol, isomericSmiles=True)
                prev = result.get(smi)
                if prev is None or _PRIORITY.get(sel, 2) < _PRIORITY.get(prev, 2):
                    result[smi] = sel
    return result


# ============================================================================
# Main Orchestration
# ============================================================================


def run_chain_reaction(
    initial_branches: list[ReactionBranch],
    all_steps: list[ReactionStepInfo],
    step_counter: int,
    conditions: list[str] | None = None,
) -> tuple[list[ReactionBranch], int]:
    """
    Open World Mode: Iteratively finds and executes reactions on branches until stability.
    """
    logger.debug("=== run_chain_reaction START ===")
    logger.debug(
        f"  Initial branches: {len(initial_branches)}, step_counter: {step_counter}, conditions: {conditions}"
    )
    current_branches = initial_branches

    for iteration in range(MAX_CHAIN_STEPS):
        logger.debug(f"  Chain iteration {iteration}: {len(current_branches)} branches")
        next_round_branches = []
        something_happened = False

        for branch in current_branches:
            branch_smiles = [Chem.MolToSmiles(m) for m in branch.molecules if m]
            # Find applicable rules
            matches = find_next_reaction_matches(
                branch, exclude_ids=branch.rule_history, conditions=conditions
            )

            if not matches:
                logger.debug(
                    f"    Branch {branch_smiles}: no matches, carrying forward"
                )
                next_round_branches.append(branch)
                continue

            something_happened = True
            logger.debug(f"    Branch {branch_smiles}: {len(matches)} rule(s) matched")

            # Apply each matching rule (forking the universe)
            for rule_id, rule_data in matches:
                # Prepare SMARTS list — normalize mixed str/SmartsEntry
                raw_smarts = rule_data.get("reactionSmarts") or []
                if isinstance(raw_smarts, str):
                    raw_smarts = [raw_smarts]
                elif isinstance(raw_smarts, SmartsEntry):
                    raw_smarts = [raw_smarts]
                smarts_list = normalize_smarts_steps(raw_smarts)

                auto_adds = rule_data.get("autoAdd", [])
                rule_name = rule_data.get("name")
                logger.debug(
                    f"      Applying rule '{rule_name}' (id={rule_id}), {len(smarts_list)} SMARTS step(s)"
                )

                # Active branches for this rule execution chain
                rule_branches = [branch]

                # Execute sequential steps of the rule (skip for engine rules)
                if rule_id != "elimination_substitution":
                    for i, smarts in enumerate(smarts_list):
                        # 1. Handle Auto Add
                        aa_mols = []
                        if i < len(auto_adds):
                            aa_mols = _parse_auto_add_molecules(auto_adds[i])

                        if aa_mols:
                            for b in rule_branches:
                                b.molecules.extend(aa_mols)

                        # 2. Execute SMARTS
                        next_step_branches = []
                        for b in rule_branches:
                            res_branches, step_counter = process_branch_with_smarts(
                                b,
                                smarts,
                                step_counter,
                                all_steps,
                                reaction_context=rule_id,
                                reaction_name=rule_name,
                            )
                            next_step_branches.extend(res_branches)

                        rule_branches = next_step_branches
                        logger.debug(
                            f"        After SMARTS step {i}: {len(rule_branches)} branch(es)"
                        )
                        if not rule_branches:
                            logger.debug(
                                f"        No branches remaining after step {i}, stopping rule"
                            )
                            break

                else:
                    # Only when its intramolecular substitution
                    from engine.substitution_elimination import (
                        check_and_run_intramolecular,
                        classify_reagent,
                    )

                    # Determine base presence (needed for alcohol deprotonation)
                    base_present = False
                    for m in branch.molecules:
                        if not m:
                            continue
                        props = classify_reagent(Chem.MolToSmiles(m))
                        if props.get("base") in ["strong", "weak"]:
                            base_present = True

                    generated_branches = []

                    # Try intramolecular on each molecule
                    for i, mol in enumerate(branch.molecules):
                        if not mol:
                            continue

                        res = check_and_run_intramolecular(
                            mol, base_present=base_present
                        )
                        if res:
                            # Success
                            products_mols = [
                                Chem.MolFromSmiles(p) for p in res["products"]
                            ]
                            inorganic_mols = [
                                Chem.MolFromSmiles(inc)
                                for inc in res.get("inorganic", [])
                            ]

                            # Construct new molecule list for the branch
                            others = branch.molecules[:i] + branch.molecules[i + 1 :]
                            new_mols = others + products_mols + inorganic_mols

                            # Record Step
                            s_uuid = f"step_{step_counter}_intra"
                            step_counter += 1

                            new_step = ReactionStepInfo(
                                step_id=s_uuid,
                                step_index=step_counter,
                                smarts_used="",
                                input_smiles=[Chem.MolToSmiles(mol)],
                                products=res["products"],
                                parent_id=branch.parent_step_id,
                                step_type="reaction",
                                reaction_name=rule_name or "Intramolecular Cyclization",
                                is_on_major_path=branch.is_on_major_path,
                                step_selectivity="major"
                                if branch.is_on_major_path
                                else "minor",
                            )
                            all_steps.append(new_step)

                            # Create Branch
                            new_branch = branch.copy(
                                new_molecules=new_mols, new_parent_id=s_uuid
                            )
                            new_branch.is_on_major_path = new_step.is_on_major_path
                            new_branch.selectivity_label = new_step.step_selectivity
                            generated_branches.append(new_branch)
                            rule_branches = generated_branches
                    if not rule_branches:
                        logger.debug(
                            f"    Branch {branch_smiles}: no intramolecular substitution, carrying forward"
                        )
                        next_round_branches.append(branch)
                # Update history (applies to both SMARTS and engine rules)
                for final_b in rule_branches:
                    final_b.rule_history = branch.rule_history + [rule_id]
                    next_round_branches.append(final_b)

        if something_happened:
            current_branches = deduplicate_branches(next_round_branches)
            logger.debug(f"  After dedup: {len(current_branches)} branches")
        else:
            logger.debug("  Stability reached, ending chain reaction")
            break  # Stability reached

    logger.debug(
        f"=== run_chain_reaction END === ({len(current_branches)} final branches, step_counter={step_counter})"
    )
    return current_branches, step_counter


def run_reaction(
    reactants_smiles: list[str],
    reaction_smarts: str | list[str],
    debug: bool = False,
    auto_add: list[str | dict] | None = None,
    reaction_context: str | None = None,
    conditions: list[str] | None = None,
    reaction_name: str | None = None,
    chain_block: list[str] | None = None,
) -> dict:
    """
    Main entry point. Runs a reaction (sequence) and returns products/steps.
    """
    logger.debug("=== run_reaction START ===")
    logger.debug(f"  Reactants: {reactants_smiles}")
    logger.debug(f"  SMARTS: {reaction_smarts}")
    logger.debug(
        f"  debug={debug}, reaction_context={reaction_context}, reaction_name={reaction_name}"
    )
    logger.debug(f"  conditions={conditions}, auto_add={auto_add}")

    # 1. Initialization — normalize mixed str/SmartsEntry lists
    if isinstance(reaction_smarts, str):
        initial_steps_queue = [reaction_smarts]
    elif isinstance(reaction_smarts, SmartsEntry):
        initial_steps_queue = [reaction_smarts.smarts]
    else:
        initial_steps_queue = normalize_smarts_steps(reaction_smarts)
    step_explanations = extract_step_explanations(reaction_smarts)
    step_selectivities = extract_step_selectivities(reaction_smarts)
    auto_adds = auto_add or []
    logger.debug(f"  {len(initial_steps_queue)} directed step(s) queued")

    # Create initial branch
    initial_mols = [Chem.MolFromSmiles(s) for s in reactants_smiles]
    initial_step_id = "step_0_reactants"

    all_steps = [
        ReactionStepInfo(
            step_id=initial_step_id,
            step_index=0,
            smarts_used="(initial reactants)",
            input_smiles=[],
            products=reactants_smiles,
            parent_id=None,
            step_type="initial",
        )
    ]

    current_branches = [
        ReactionBranch(molecules=initial_mols, parent_step_id=initial_step_id)
    ]
    step_counter = 1

    # 2. Process Initial Directed Steps
    ctx = reaction_context or "reaction"

    for i, smarts in enumerate(initial_steps_queue):
        if not current_branches:
            logger.debug(f"  No branches remaining, stopping at directed step {i}")
            break
        logger.debug(f"  Directed step {i}: SMARTS={smarts}")

        # Auto-add
        if i < len(auto_adds):
            mols = _parse_auto_add_molecules(auto_adds[i])
            step_counter = _apply_auto_add_step(
                current_branches, mols, step_counter, all_steps
            )

        # Track where new reaction steps start
        step_counter_before = step_counter

        # Process SMARTS
        next_branches = []
        for branch in current_branches:
            branches, step_counter = process_branch_with_smarts(
                branch,
                smarts,
                step_counter,
                all_steps,
                reaction_context=ctx,
                reaction_name=reaction_name,
            )
            # Propagate history
            for nb in branches:
                nb.rule_history = list(branch.rule_history)
            next_branches.extend(branches)

        # Apply step-level selectivity BEFORE dedup so that
        # deduplicate_branches can prefer major-path branches when a
        # rearranged minor-path intermediate duplicates a direct major one.
        step_sel = step_selectivities[i] if i < len(step_selectivities) else None
        if step_sel:
            _apply_step_selectivity(
                all_steps, step_sel, step_counter_before, step_counter
            )
            # Sync branches' is_on_major_path with their parent step.
            # Use AND logic: a branch is on-major only if BOTH the
            # parent step is major AND the branch wasn't already
            # demoted (e.g. by rearrangement fork logic).
            step_map = {s.step_id: s for s in all_steps}
            for branch in next_branches:
                parent = step_map.get(branch.parent_step_id)
                if parent:
                    branch.is_on_major_path = (
                        parent.is_on_major_path and branch.is_on_major_path
                    )
                    if not parent.is_on_major_path:
                        branch.selectivity_label = "minor"
                    elif branch.selectivity_label is None:
                        branch.selectivity_label = parent.step_selectivity

        current_branches = deduplicate_branches(next_branches)
        logger.debug(f"  After directed step {i}: {len(current_branches)} branches")

        # Attach step explanation to any new reaction steps created in this iteration
        explanation = step_explanations[i] if i < len(step_explanations) else None
        if explanation:
            for s in all_steps:
                if (
                    s.step_explanation is None
                    and s.step_type in ("reaction", "carbocation_intermediate")
                    and s.smarts_used == smarts
                ):
                    s.step_explanation = explanation

    # 3. Open World Chain Reaction
    if current_branches:
        logger.debug(
            f"  Entering open-world chain reaction with {len(current_branches)} branches"
        )
        # Seed rule_history so the same rule isn't immediately re-applied to products.
        # Also seed any chain_block IDs provided by the rule (e.g., reverse reactions).
        ids_to_block = []
        if reaction_context:
            ids_to_block.append(reaction_context)
        if chain_block:
            ids_to_block.extend(chain_block)
        for branch in current_branches:
            for bid in ids_to_block:
                if bid not in branch.rule_history:
                    branch.rule_history = list(branch.rule_history) + [bid]
        current_branches, step_counter = run_chain_reaction(
            current_branches, all_steps, step_counter, conditions
        )

    # 4. Finalize Results
    organic, inorganic = separate_organic_inorganic(current_branches)
    product_selectivity = _build_product_selectivity(current_branches)
    logger.debug("=== run_reaction END ===")
    logger.debug(f"  Product selectivity: {product_selectivity}")
    logger.debug(f"  Final organic: {list(organic)}")
    logger.debug(f"  Final inorganic: {list(inorganic)}")
    logger.debug(f"  Total steps recorded: {len(all_steps)}")

    if debug:
        return {
            "steps": [s.to_dict() for s in all_steps],
            "final_organic": list(organic),
            "final_inorganic": list(inorganic),
            "product_selectivity": product_selectivity,
        }
    else:
        return {
            "organic": list(organic),
            "inorganic": list(inorganic),
            "product_selectivity": product_selectivity,
        }
