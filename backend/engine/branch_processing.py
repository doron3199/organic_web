import itertools
import uuid
import logging

from rdkit import Chem
from rdkit.Chem import AllChem
import concurrent.futures

from engine.models import ReactionStepInfo, ReactionBranch
from engine.carbocation import get_carbocation_stability, get_all_rearrangements
from engine.ozonolysis import handle_ring_ozonolysis_for_branch


logger = logging.getLogger(__name__)


# ============================================================================
# Core Logic: Branch Processing
# ============================================================================


def sanitize_and_gather_products(products: tuple) -> list[dict]:
    """Sanitize mols and return dict with metadata."""
    info = []
    for p in products:
        try:
            p.UpdatePropertyCache()
            Chem.SanitizeMol(p)
            info.append(
                {
                    "mol": p,
                    "smiles": Chem.MolToSmiles(p, isomericSmiles=True),
                    "stability": get_carbocation_stability(p),
                }
            )
        except Exception:
            pass
    return info


def deduplicate_branches(branches: list[ReactionBranch]) -> list[ReactionBranch]:
    """Deduplicate branches by SMILES signature, preferring major-path branches.

    When two branches produce the same molecules (e.g. a direct Markovnikov
    carbocation and a rearranged anti-Markovnikov carbocation), the one on the
    major path is kept so that selectivity labels propagate correctly through
    subsequent steps.
    """
    unique: dict[str, ReactionBranch] = {}
    for b in branches:
        sig = ".".join(sorted(b.get_smiles()))
        if sig not in unique:
            unique[sig] = b
        elif b.is_on_major_path and not unique[sig].is_on_major_path:
            # Replace minor-path duplicate with the major-path branch
            unique[sig] = b
    return list(unique.values())


def process_branch_reaction_outcome(
    branch: ReactionBranch,
    reactant_indices: tuple[int, ...],
    products: tuple,
    smarts: str,
    step_counter: int,
    all_steps: list[ReactionStepInfo],
    reaction_context: str | None = None,
    reaction_name: str | None = None,
) -> tuple[list[ReactionBranch], int]:
    """
    Creates new branches from a reaction result.
    Handles product creation, spectator preservation, and carbocation rearrangements.
    """
    prod_info = sanitize_and_gather_products(products)
    if not prod_info:
        return [], step_counter

    # Identify reactants and spectators
    reactants = [branch.molecules[i] for i in reactant_indices]
    spectators = [
        m for i, m in enumerate(branch.molecules) if i not in reactant_indices
    ]
    spectator_smiles = [Chem.MolToSmiles(m, isomericSmiles=True) for m in spectators]

    # Create the reaction step
    is_carbocation = any(i["stability"] > 0 for i in prod_info)
    step_id = f"step_{step_counter}_rxn"
    group_id = f"grp_{str(uuid.uuid4())[:8]}"

    input_smiles = [Chem.MolToSmiles(r) for r in reactants]
    product_smiles = [i["smiles"] for i in prod_info] + spectator_smiles

    # Build parent IDs
    parents = []
    if branch.parent_step_id:
        parents.append(branch.parent_step_id)
    if branch.auto_add_step_id:
        parents.append(branch.auto_add_step_id)

    step_info = ReactionStepInfo(
        step_id=step_id,
        step_index=step_counter,
        smarts_used=smarts,
        input_smiles=input_smiles,
        products=product_smiles,
        parent_id=branch.parent_step_id,
        step_type="carbocation_intermediate" if is_carbocation else "reaction",
        group_id=group_id,
        parent_ids=parents,
        reaction_context=reaction_context,
        reaction_name=reaction_name,
        is_on_major_path=branch.is_on_major_path,
    )
    all_steps.append(step_info)
    step_counter += 1

    new_branches = []

    # 1. Primary Product Branch
    product_mols = [i["mol"] for i in prod_info]
    main_branch = branch.copy(product_mols + spectators, step_id)
    new_branches.append(main_branch)

    # 2. Carbocation Rearrangements (creates additional parallel branches)
    #    Rearrangement to a more stable carbocation is thermodynamically
    #    favored, so: rearranged → major, direct (non-rearranged) → minor.
    if is_carbocation:
        has_rearrangements = False
        for info in prod_info:
            if info["stability"] <= 0:
                continue

            rearrangements = get_all_rearrangements(info["mol"])
            if not rearrangements:
                continue
            has_rearrangements = True
            other_products = [i for i in prod_info if i is not info]

            for rearr_mol, shift_type in rearrangements:
                rearr_step_id = f"step_{step_counter}_rearr"
                rearr_smiles = Chem.MolToSmiles(rearr_mol, isomericSmiles=True)

                # Gather all molecules for this outcome
                branch_mols = (
                    [rearr_mol] + [op["mol"] for op in other_products] + spectators
                )
                branch_smiles = (
                    [rearr_smiles]
                    + [op["smiles"] for op in other_products]
                    + spectator_smiles
                )

                # Rearrangement to more stable carbocation is favored → major
                # ONLY IF parent branch is on major path.
                # However, if the parent branch was "equal" (not "major"),
                # the rearrangement can be at most "equal", never "major".
                rearr_is_major = branch.is_on_major_path
                if not rearr_is_major:
                    rearr_label = "minor"
                elif branch.selectivity_label == "equal":
                    rearr_label = "equal"
                else:
                    rearr_label = "major"

                all_steps.append(
                    ReactionStepInfo(
                        step_id=rearr_step_id,
                        step_index=step_counter,
                        smarts_used=f"({shift_type})",
                        input_smiles=[info["smiles"]],
                        products=branch_smiles,
                        parent_id=step_id,
                        step_type="carbocation_rearrangement",
                        group_id=group_id,
                        reaction_context=reaction_context,
                        reaction_name=reaction_name,
                        is_on_major_path=rearr_is_major,
                        step_selectivity=rearr_label,
                    )
                )
                step_counter += 1

                rearr_branch = main_branch.copy(branch_mols, rearr_step_id)
                rearr_branch.is_on_major_path = rearr_is_major
                rearr_branch.selectivity_label = rearr_label
                new_branches.append(rearr_branch)

        # If rearrangements exist, the direct (non-rearranged) path is minor
        if has_rearrangements:
            step_info.step_selectivity = "minor"
            main_branch.is_on_major_path = False
            main_branch.selectivity_label = "minor"

    return new_branches, step_counter


def process_branch_with_smarts(
    branch: ReactionBranch,
    smarts: str,
    step_counter: int,
    all_steps: list[ReactionStepInfo],
    reaction_context: str | None = None,
    reaction_name: str | None = None,
) -> tuple[list[ReactionBranch], int]:
    """Apply a single SMARTS pattern to a branch."""

    # Check for Ring Ozonolysis special case
    ozonolysis = handle_ring_ozonolysis_for_branch(branch, smarts)
    if ozonolysis:
        mols, indices = ozonolysis
        return process_branch_reaction_outcome(
            branch,
            tuple(indices),
            tuple(mols),
            smarts + " (ring fragmentation)",
            step_counter,
            all_steps,
            reaction_context,
            reaction_name,
        )

    # Standard SMARTS processing
    rxn = AllChem.ReactionFromSmarts(smarts)
    num_templates = rxn.GetNumReactantTemplates()

    # Try all permutations of molecules
    indices = range(len(branch.molecules))
    combinations = list(itertools.permutations(indices, num_templates))

    new_branches = []
    seen_outcomes = set()

    for combo in combinations:
        reactants = tuple(branch.molecules[i] for i in combo)
        try:

            def _run():
                return rxn.RunReactants(reactants, maxProducts=1000)

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_run)
                # Timeout after 2 seconds to prevent ReDoS-style hangs
                results = future.result(timeout=2.0)

            for product_tuple in results:
                # Deduplicate outcomes within this branch execution
                sig = ".".join(
                    sorted(
                        [
                            Chem.MolToSmiles(p, isomericSmiles=True)
                            for p in product_tuple
                        ]
                    )
                )
                if sig in seen_outcomes:
                    continue
                seen_outcomes.add(sig)

                b_list, step_counter = process_branch_reaction_outcome(
                    branch,
                    combo,
                    product_tuple,
                    smarts,
                    step_counter,
                    all_steps,
                    reaction_context,
                    reaction_name,
                )
                new_branches.extend(b_list)
        except Exception as e:
            logger.debug(f"Reaction execution failed: {e}")
            continue

    return new_branches, step_counter
