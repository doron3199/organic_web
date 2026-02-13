"""
Main orchestration for the reaction engine.

Delegates to specialized modules:
  - engine.models: Data structures (ReactionStepInfo, ReactionBranch) and constants
  - engine.carbocation: Carbocation stability and rearrangement logic
  - engine.ozonolysis: Ring ozonolysis special-case handling
  - engine.branch_processing: Core branch processing (SMARTS execution, outcome handling)
  - engine.helpers: Utility functions (matching, auto-add, organic/inorganic separation)
"""

from rdkit import Chem

from engine.models import (
    ReactionStepInfo,
    ReactionBranch,
    ENGINE_RULES,
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
)


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
    current_branches = initial_branches

    for _ in range(MAX_CHAIN_STEPS):
        next_round_branches = []
        something_happened = False

        for branch in current_branches:
            # Find applicable rules
            matches = find_next_reaction_matches(
                branch, exclude_ids=branch.rule_history, conditions=conditions
            )

            if not matches:
                next_round_branches.append(branch)
                continue

            something_happened = True

            # Apply each matching rule (forking the universe)
            for rule_id, rule_data in matches:
                # Prepare SMARTS list
                smarts_list = rule_data.get("reactionSmarts") or []
                if isinstance(smarts_list, str):
                    smarts_list = [smarts_list]

                auto_adds = rule_data.get("autoAdd", [])
                rule_name = rule_data.get("name")

                # Active branches for this rule execution chain
                rule_branches = [branch]

                # Execute sequential steps of the rule (skip for engine rules)
                if rule_id not in ENGINE_RULES:
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
                        if not rule_branches:
                            break

                # Update history (applies to both SMARTS and engine rules)
                for final_b in rule_branches:
                    final_b.rule_history = branch.rule_history + [rule_id]
                    next_round_branches.append(final_b)

        if something_happened:
            current_branches = deduplicate_branches(next_round_branches)
        else:
            break  # Stability reached

    return current_branches, step_counter


def run_reaction(
    reactants_smiles: list[str],
    reaction_smarts: str | list[str],
    debug: bool = False,
    auto_add: list[str | dict] | None = None,
    reaction_context: str | None = None,
    conditions: list[str] | None = None,
    reaction_name: str | None = None,
) -> dict:
    """
    Main entry point. Runs a reaction (sequence) and returns products/steps.
    """
    # 1. Initialization
    initial_steps_queue = (
        [reaction_smarts] if isinstance(reaction_smarts, str) else reaction_smarts
    )
    auto_adds = auto_add or []

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
            break

        # Auto-add
        if i < len(auto_adds):
            mols = _parse_auto_add_molecules(auto_adds[i])
            step_counter = _apply_auto_add_step(
                current_branches, mols, step_counter, all_steps
            )

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

        current_branches = deduplicate_branches(next_branches)

    # 3. Open World Chain Reaction
    if current_branches:
        current_branches, step_counter = run_chain_reaction(
            current_branches, all_steps, step_counter, conditions
        )

    # 4. Finalize Results
    organic, inorganic = separate_organic_inorganic(current_branches)

    if debug:
        return {
            "steps": [s.to_dict() for s in all_steps],
            "final_organic": list(organic),
            "final_inorganic": list(inorganic),
        }
    else:
        return {"organic": list(organic), "inorganic": list(inorganic)}
