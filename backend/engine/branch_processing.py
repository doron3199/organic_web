import itertools
import uuid
import logging

from rdkit import Chem
from rdkit.Chem import AllChem

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
    unique = []
    seen = set()
    for b in branches:
        sig = ".".join(sorted(b.get_smiles()))
        if sig not in seen:
            seen.add(sig)
            unique.append(b)
    return unique


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
    )
    all_steps.append(step_info)
    step_counter += 1

    new_branches = []

    # 1. Primary Product Branch
    product_mols = [i["mol"] for i in prod_info]
    main_branch = branch.copy(product_mols + spectators, step_id)
    new_branches.append(main_branch)

    # 2. Carbocation Rearrangements (creates additional parallel branches)
    if is_carbocation:
        for info in prod_info:
            if info["stability"] <= 0:
                continue

            rearrangements = get_all_rearrangements(info["mol"])
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
                    )
                )
                step_counter += 1

                new_branches.append(main_branch.copy(branch_mols, rearr_step_id))

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
            results = rxn.RunReactants(reactants)
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
