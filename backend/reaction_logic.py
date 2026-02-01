from rdkit import Chem
from rdkit.Chem import AllChem
import itertools
import uuid
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ReactionStepInfo:
    """Represents a single step in the reaction tree."""

    step_id: str
    step_index: int
    smarts_used: str
    input_smiles: list[str]
    products: list[str]
    parent_id: Optional[str]
    step_type: str  # 'initial' | 'reaction' | 'carbocation_intermediate' | 'carbocation_rearrangement' | 'auto_add'
    group_id: Optional[str] = None  # To visually group related products
    parent_ids: list[str] = field(
        default_factory=list
    )  # For multiple parents (e.g., auto-add + previous step)

    def to_dict(self) -> dict:
        return {
            "step_id": self.step_id,
            "step_index": self.step_index,
            "smarts_used": self.smarts_used,
            "input_smiles": self.input_smiles,
            "products": self.products,
            "parent_id": self.parent_id,
            "parent_ids": self.parent_ids
            if self.parent_ids
            else [self.parent_id]
            if self.parent_id
            else [],
            "step_type": self.step_type,
            "group_id": self.group_id,
        }


@dataclass
class ReactionBranch:
    """Represents a single pathway/branch in the reaction tree."""

    molecules: list[Chem.Mol]  # Current molecules in this branch
    parent_step_id: Optional[str]  # ID of the step that created this branch
    branch_id: str = field(default_factory=lambda: f"branch_{str(uuid.uuid4())[:8]}")
    auto_add_step_id: Optional[str] = (
        None  # ID of the auto-add step if molecules were added
    )

    def get_smiles(self) -> list[str]:
        return [Chem.MolToSmiles(m, isomericSmiles=True) for m in self.molecules]


def mol_list_to_smiles_list(mol_list: list[Chem.Mol]) -> list[str]:
    return [Chem.MolToSmiles(m) for m in mol_list]


def is_organic(smiles: str) -> bool:
    """Heuristic to check if a molecule is organic (contains Carbon)."""
    mol = Chem.MolFromSmiles(smiles)
    if not mol:
        return "C" in smiles.replace("Cl", "").replace("Ca", "").replace("Cs", "")
    return any(a.GetSymbol() == "C" for a in mol.GetAtoms())


# ============================================================================
# Helper Functions for Carbocation Chemistry
# ============================================================================


def get_carbocation_stability(mol: Chem.Mol) -> int:
    """
    Detect if a molecule is a carbocation and return the degree (stability) of the C+ center.
    """
    for atom in mol.GetAtoms():
        if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
            return atom.GetDegree()
    return -1


def get_all_rearrangements(mol: Chem.Mol) -> list[tuple[Chem.Mol, str]]:
    """
    Get all possible carbocation rearrangements (1,2-hydride and 1,2-methyl shifts).
    """
    rearrangements = []
    rxn_hydride = AllChem.ReactionFromSmarts("[C;!H0:1]-[C+1:2]>>[C+1:1]-[C+0:2]")
    rxn_methyl = AllChem.ReactionFromSmarts(
        "[C:1](-[CH3:3])-[C+1:2]>>[C+1:1]-[C+0:2](-[CH3:3])"
    )

    current_stability = get_carbocation_stability(mol)

    for rxn, shift_type in [
        (rxn_hydride, "hydride_shift"),
        (rxn_methyl, "methyl_shift"),
    ]:
        try:
            prods = rxn.RunReactants((mol,))
            for prod_tuple in prods:
                p = prod_tuple[0]
                try:
                    Chem.SanitizeMol(p)
                    new_stability = get_carbocation_stability(p)
                    if new_stability > current_stability:
                        rearrangements.append((p, shift_type))
                except Exception:
                    continue
        except Exception:
            continue

    return rearrangements


# ============================================================================
# Product Processing Functions
# ============================================================================


# ============================================================================
# Ring Ozonolysis Handling
# ============================================================================


def is_ozonolysis_smarts(smarts: str) -> bool:
    """Check if this is an ozonolysis reaction SMARTS."""
    return "[O-][O+]=O" in smarts or "O=[O+][O-]" in smarts


def find_ring_double_bond(mol: Chem.Mol) -> tuple[int, int, int] | None:
    """
    Find a C=C double bond in a ring.
    Returns (bond_idx, begin_atom_idx, end_atom_idx) or None if not found.
    """
    if mol is None:
        return None
    for bond in mol.GetBonds():
        if bond.GetBondType() == Chem.BondType.DOUBLE:
            begin_atom = bond.GetBeginAtom()
            end_atom = bond.GetEndAtom()
            # Check if it's a C=C double bond in a ring
            if (
                begin_atom.GetSymbol() == "C"
                and end_atom.GetSymbol() == "C"
                and bond.IsInRing()
            ):
                return (bond.GetIdx(), begin_atom.GetIdx(), end_atom.GetIdx())
    return None


def perform_ring_ozonolysis(mol: Chem.Mol) -> Chem.Mol | None:
    """
    Perform ozonolysis on a cyclic alkene by fragmenting the ring at the
    double bond and capping the ends with aldehyde groups (C=O).

    This produces a single dicarbonyl chain instead of two separate aldehydes.

    Args:
        mol: The cyclic alkene molecule

    Returns:
        The dicarbonyl product molecule, or None if failed
    """
    ring_db = find_ring_double_bond(mol)
    if ring_db is None:
        return None

    bond_idx, c1_idx, c2_idx = ring_db

    try:
        # Fragment the molecule at the double bond
        # dummyLabels assigns different labels to the dummy atoms created
        fragmented = Chem.FragmentOnBonds(mol, [bond_idx], dummyLabels=[(1, 2)])

        if fragmented is None:
            print("  Warning: FragmentOnBonds returned None")
            return None

        # Convert to editable molecule
        editable = Chem.RWMol(fragmented)

        # Find the dummy atoms (they have atomic number 0 with isotope labels)
        dummy_atoms = []
        for atom in editable.GetAtoms():
            if atom.GetAtomicNum() == 0:  # Dummy atom
                dummy_atoms.append(atom.GetIdx())

        if len(dummy_atoms) != 2:
            print(f"  Warning: Expected 2 dummy atoms, found {len(dummy_atoms)}")
            return None

        # For each dummy atom, find its neighbor (the carbon it's attached to)
        # and replace the connection with a C=O (aldehyde)
        for dummy_idx in dummy_atoms:
            dummy_atom = editable.GetAtomWithIdx(dummy_idx)
            neighbors = list(dummy_atom.GetNeighbors())

            if len(neighbors) != 1:
                print(
                    f"  Warning: Dummy atom has {len(neighbors)} neighbors, expected 1"
                )
                continue

            carbon_idx = neighbors[0].GetIdx()

            # Add an oxygen atom
            oxygen_idx = editable.AddAtom(Chem.Atom(8))  # Oxygen

            # Add a double bond between carbon and oxygen
            editable.AddBond(carbon_idx, oxygen_idx, Chem.BondType.DOUBLE)

        # Remove the dummy atoms (in reverse order to keep indices valid)
        for dummy_idx in sorted(dummy_atoms, reverse=True):
            editable.RemoveAtom(dummy_idx)

        # Sanitize the result
        Chem.SanitizeMol(editable)
        result_smiles = Chem.MolToSmiles(editable, isomericSmiles=True)
        print(f"  Ring ozonolysis: Fragmented ring into {result_smiles}")

        return editable.GetMol()

    except Exception as e:
        print(f"  Warning: Ring ozonolysis failed: {e}")
        return None


def handle_ring_ozonolysis_for_branch(
    branch: "ReactionBranch", smarts: str
) -> tuple[list[Chem.Mol], list[int]] | None:
    """
    Check if this is a ring ozonolysis case and handle it specially.

    Args:
        branch: The current reaction branch
        smarts: The reaction SMARTS

    Returns:
        Tuple of (product_mols, reactant_indices) if handled, None otherwise
    """
    if not is_ozonolysis_smarts(smarts):
        return None

    # Find the alkene with a ring double bond
    alkene_idx = None
    ozone_idx = None

    for i, mol in enumerate(branch.molecules):
        if mol is None:
            continue
        smiles = Chem.MolToSmiles(mol)

        # Check for ozone
        if "[O-][O+]=O" in smiles or "O=[O+][O-]" in smiles:
            ozone_idx = i
            continue

        # Check for ring double bond
        if find_ring_double_bond(mol) is not None:
            alkene_idx = i

    # If we found both alkene with ring double bond and ozone
    if alkene_idx is not None and ozone_idx is not None:
        alkene_mol = branch.molecules[alkene_idx]
        product_mol = perform_ring_ozonolysis(alkene_mol)

        if product_mol is not None:
            return ([product_mol], [alkene_idx, ozone_idx])

    return None


def sanitize_and_gather_products(products: tuple) -> list[dict]:
    """Sanitize reaction products and gather information about each."""
    prod_info = []
    for p in products:
        try:
            p.UpdatePropertyCache()
            Chem.SanitizeMol(p)
            prod_info.append(
                {
                    "mol": p,
                    "smiles": Chem.MolToSmiles(p, isomericSmiles=True),
                    "stability": get_carbocation_stability(p),
                }
            )
        except Exception:
            continue
    return prod_info


def deduplicate_branches(branches: list[ReactionBranch]) -> list[ReactionBranch]:
    """Remove duplicate branches based on their molecule SMILES."""
    unique_branches = []
    seen_signatures = set()

    for branch in branches:
        # Create a signature from sorted SMILES
        signature = ".".join(sorted(branch.get_smiles()))
        if signature not in seen_signatures:
            seen_signatures.add(signature)
            unique_branches.append(branch)

    return unique_branches


def separate_organic_inorganic(
    branches: list[ReactionBranch],
) -> tuple[set[str], set[str]]:
    """Separate molecules into organic and inorganic from all branches."""
    organic = set()
    inorganic = set()

    for branch in branches:
        for mol in branch.molecules:
            if mol is None:
                continue
            smi = Chem.MolToSmiles(mol, isomericSmiles=True)
            has_carbon = any(atom.GetSymbol() == "C" for atom in mol.GetAtoms())

            if has_carbon:
                organic.add(smi)
            else:
                inorganic.add(smi)

    return organic, inorganic


# ============================================================================
# Branch-Based Reaction Processing
# ============================================================================


def process_branch_reaction_outcome(
    branch: ReactionBranch,
    reactant_indices: tuple[int, ...],
    products: tuple,
    smarts: str,
    step_counter: int,
    all_steps: list[ReactionStepInfo],
) -> tuple[list[ReactionBranch], int]:
    """
    Process a single reaction outcome from a branch, creating new branches for each outcome.

    Returns:
        Tuple of (list of new branches, updated step_counter)
    """
    new_branches = []
    group_id = f"grp_{str(uuid.uuid4())[:8]}"

    # Gather and sanitize products
    prod_info = sanitize_and_gather_products(products)
    if not prod_info:
        return [], step_counter

    # Get reactant molecules and spectators
    reactants = [branch.molecules[i] for i in reactant_indices]

    spectator_mols = [
        branch.molecules[i]
        for i in range(len(branch.molecules))
        if i not in reactant_indices
    ]
    spectator_smiles = [
        Chem.MolToSmiles(m, isomericSmiles=True) for m in spectator_mols
    ]

    # Determine step type
    is_carbocation_intermediate = any(info["stability"] > 0 for info in prod_info)
    reaction_step_id = f"step_{step_counter}_rxn"
    input_smiles = [Chem.MolToSmiles(r) for r in reactants]
    all_step_products = [info["smiles"] for info in prod_info] + spectator_smiles

    # Build parent_ids list - includes main parent and auto_add parent if present
    parent_ids = []
    if branch.parent_step_id:
        parent_ids.append(branch.parent_step_id)
    if branch.auto_add_step_id:
        parent_ids.append(branch.auto_add_step_id)

    # Record the reaction step
    all_steps.append(
        ReactionStepInfo(
            step_id=reaction_step_id,
            step_index=step_counter,
            smarts_used=smarts,
            input_smiles=input_smiles,
            products=all_step_products,
            parent_id=branch.parent_step_id,
            step_type="carbocation_intermediate"
            if is_carbocation_intermediate
            else "reaction",
            group_id=group_id,
            parent_ids=parent_ids,
        )
    )
    step_counter += 1

    # Create new branch with products + spectators
    product_mols = [info["mol"] for info in prod_info]
    new_branch = ReactionBranch(
        molecules=product_mols + spectator_mols,
        parent_step_id=reaction_step_id,
    )
    new_branches.append(new_branch)
    print(f"  Created branch: {new_branch.get_smiles()}")

    # Handle carbocation rearrangements - each creates a new branch
    if is_carbocation_intermediate:
        for info in prod_info:
            if info["stability"] > 0:
                rearrangements = get_all_rearrangements(info["mol"])

                for rearranged_mol, shift_type in rearrangements:
                    rearranged_smiles = Chem.MolToSmiles(
                        rearranged_mol, isomericSmiles=True
                    )
                    rearr_step_id = f"step_{step_counter}_rearr"

                    # Get other product molecules (not the one being rearranged)
                    other_prod_mols = [i["mol"] for i in prod_info if i is not info]
                    other_prod_smiles = [
                        i["smiles"] for i in prod_info if i is not info
                    ]
                    all_rearranged_products = (
                        [rearranged_smiles] + other_prod_smiles + spectator_smiles
                    )

                    # Record rearrangement step
                    all_steps.append(
                        ReactionStepInfo(
                            step_id=rearr_step_id,
                            step_index=step_counter,
                            smarts_used=f"({shift_type})",
                            input_smiles=[info["smiles"]],
                            products=all_rearranged_products,
                            parent_id=reaction_step_id,
                            step_type="carbocation_rearrangement",
                            group_id=group_id,
                        )
                    )
                    step_counter += 1

                    # Create rearrangement branch
                    rearr_branch = ReactionBranch(
                        molecules=[rearranged_mol] + other_prod_mols + spectator_mols,
                        parent_step_id=rearr_step_id,
                    )
                    new_branches.append(rearr_branch)
                    print(
                        f"  Created rearrangement branch: {rearr_branch.get_smiles()}"
                    )

    return new_branches, step_counter


def process_branch_with_smarts(
    branch: ReactionBranch,
    smarts: str,
    step_counter: int,
    all_steps: list[ReactionStepInfo],
) -> tuple[list[ReactionBranch], int]:
    """
    Process a single branch with a SMARTS pattern.

    Returns:
        Tuple of (list of new branches, updated step_counter)
    """
    print(f"\nProcessing branch: {branch.get_smiles()}")
    print(f"  SMARTS: {smarts}")

    # Special handling for ring ozonolysis - use fragmentation instead of SMARTS
    ring_ozonolysis_result = handle_ring_ozonolysis_for_branch(branch, smarts)
    if ring_ozonolysis_result is not None:
        product_mols, reactant_indices = ring_ozonolysis_result
        print(f"  Ring ozonolysis detected, using fragmentation approach")

        # Create products tuple for further processing
        products_tuple = tuple(product_mols)

        # Process this outcome through the standard outcome handler
        outcome_branches, step_counter = process_branch_reaction_outcome(
            branch,
            tuple(reactant_indices),
            products_tuple,
            smarts + " (ring fragmentation)",
            step_counter,
            all_steps,
        )
        return outcome_branches, step_counter

    # Standard SMARTS-based processing for non-ring cases
    rxn = AllChem.ReactionFromSmarts(smarts)
    num_templates = rxn.GetNumReactantTemplates()
    new_branches = []

    print(f"  SMARTS needs {num_templates} reactant(s)")

    # Generate all permutations of molecules from this branch
    reactant_combinations = list(
        itertools.permutations(range(len(branch.molecules)), num_templates)
    )

    # Track unique outcomes to avoid duplicates within this branch
    seen_outcomes = set()

    for combo_indices in reactant_combinations:
        reactants = tuple(branch.molecules[i] for i in combo_indices)

        try:
            products_tuple_list = rxn.RunReactants(reactants)

            for products in products_tuple_list:
                # Create outcome signature
                outcome_sig = ".".join(
                    sorted([Chem.MolToSmiles(p, isomericSmiles=True) for p in products])
                )
                if outcome_sig in seen_outcomes:
                    continue
                seen_outcomes.add(outcome_sig)

                print(
                    f"  Reaction: {mol_list_to_smiles_list(reactants)} -> {mol_list_to_smiles_list(products)}"
                )

                # Process this outcome, creating new branches
                outcome_branches, step_counter = process_branch_reaction_outcome(
                    branch, combo_indices, products, smarts, step_counter, all_steps
                )
                new_branches.extend(outcome_branches)

        except Exception as e:
            print(f"  Error: {e}")
            continue

    return new_branches, step_counter


def process_all_branches_with_smarts(
    branches: list[ReactionBranch],
    smarts: str,
    step_counter: int,
    all_steps: list[ReactionStepInfo],
) -> tuple[list[ReactionBranch], int]:
    """
    Process all branches with a single SMARTS pattern.

    Returns:
        Tuple of (list of all new branches, updated step_counter)
    """
    all_new_branches = []

    print(f"\n{'=' * 60}")
    print(f"Processing SMARTS step: {smarts}")
    print(f"Number of input branches: {len(branches)}")
    print(f"{'=' * 60}")

    for branch in branches:
        new_branches, step_counter = process_branch_with_smarts(
            branch, smarts, step_counter, all_steps
        )
        all_new_branches.extend(new_branches)

    # Deduplicate branches
    all_new_branches = deduplicate_branches(all_new_branches)

    print(f"\nResulting branches after dedup: {len(all_new_branches)}")
    for b in all_new_branches:
        print(f"  - {b.get_smiles()}")

    return all_new_branches, step_counter


def initialize_reaction_branches(
    reactants_smiles: list[str],
) -> tuple[list[ReactionBranch], list[ReactionStepInfo]]:
    """
    Initialize a single branch with all reactants.

    Returns:
        Tuple of (list with single initial branch, initial_steps_list)
    """
    initial_step_id = "step_0_reactants"
    initial_step = ReactionStepInfo(
        step_id=initial_step_id,
        step_index=0,
        smarts_used="(initial reactants)",
        input_smiles=[],
        products=reactants_smiles,
        parent_id=None,
        step_type="initial",
    )

    # Create single initial branch with all reactants
    initial_branch = ReactionBranch(
        molecules=[Chem.MolFromSmiles(s) for s in reactants_smiles],
        parent_step_id=initial_step_id,
    )

    return [initial_branch], [initial_step]


# ============================================================================
# Main Reaction Function
# ============================================================================


def run_reaction(
    reactants_smiles: list[str],
    reaction_smarts: str | list[str],
    debug: bool = False,
    auto_add: list[str | dict] | None = None,
) -> dict:
    """
    Runs a reaction and returns products. If debug=True, returns all intermediate steps.

    Each distinct reaction outcome creates a separate branch that continues independently
    through subsequent steps. This properly handles regioselectivity and competing pathways.

    Args:
        reactants_smiles: List of SMILES strings for reactants
        reaction_smarts: Single SMARTS string or list of SMARTS for multi-step reactions
        debug: If True, returns detailed debug info with all intermediate steps
        auto_add: Optional list of SMILES strings (or empty dicts) to auto-add at each step.
                  Each element corresponds to a SMARTS step. If element is a SMILES string,
                  those molecules are added to branches before the step runs.

    Returns:
        If debug=False: {"organic": [...], "inorganic": [...]}
        If debug=True: {"steps": [...], "final_organic": [...], "final_inorganic": [...]}
    """
    # Normalize input
    if isinstance(reaction_smarts, str):
        steps_list = [reaction_smarts]
    else:
        steps_list = reaction_smarts

    # Normalize auto_add to match steps_list length
    if auto_add is None:
        auto_add = []
    # Pad auto_add with empty dicts if shorter than steps_list
    while len(auto_add) < len(steps_list):
        auto_add.append({})

    # Initialize with a single branch containing all reactants
    current_branches, all_steps = initialize_reaction_branches(reactants_smiles)
    step_counter = 1

    print(f"\n{'#' * 60}")
    print(f"Starting reaction with {len(reactants_smiles)} reactants")
    print(f"Reactants: {reactants_smiles}")
    print(f"Number of SMARTS steps: {len(steps_list)}")
    print(f"Auto-add: {auto_add}")
    print(f"{'#' * 60}")

    # Process each SMARTS step
    for step_idx, smarts in enumerate(steps_list):
        # Check if we need to auto-add molecules at this step
        auto_add_entry = auto_add[step_idx] if step_idx < len(auto_add) else {}

        if isinstance(auto_add_entry, str) and auto_add_entry.strip():
            # Parse the auto-add SMILES string (can contain multiple molecules separated by '.')
            auto_add_smiles = auto_add_entry
            print(f"\n>>> Auto-adding molecules at step {step_idx}: {auto_add_smiles}")

            # Parse additional molecules
            additional_mols = []
            additional_smiles = []
            for smi in auto_add_smiles.split("."):
                smi = smi.strip()
                if smi:
                    mol = Chem.MolFromSmiles(smi)
                    if mol:
                        additional_mols.append(mol)
                        additional_smiles.append(
                            Chem.MolToSmiles(mol, isomericSmiles=True)
                        )
                    else:
                        print(f"  Warning: Could not parse auto-add SMILES: {smi}")

            # Add these molecules to all current branches and create a step for the graph
            if additional_mols:
                # Create an auto_add step to show in the graph
                auto_add_step_id = f"step_{step_counter}_autoadd"
                auto_add_step = ReactionStepInfo(
                    step_id=auto_add_step_id,
                    step_index=step_counter,
                    smarts_used="(auto-added reagents)",
                    input_smiles=[],  # No inputs, these are added from outside
                    products=additional_smiles,
                    parent_id=None,  # No parent - these come from outside the reaction
                    step_type="auto_add",
                )
                all_steps.append(auto_add_step)
                step_counter += 1

                # Add molecules to all branches and track the auto-add step
                for branch in current_branches:
                    branch.molecules.extend(additional_mols)
                    branch.auto_add_step_id = auto_add_step_id
                print(
                    f"  Added {len(additional_mols)} molecule(s) to {len(current_branches)} branch(es)"
                )

        current_branches, step_counter = process_all_branches_with_smarts(
            current_branches, smarts, step_counter, all_steps
        )

        if not current_branches:
            print("No branches remaining, stopping.")
            break

    # Separate final products from all branches
    final_organic, final_inorganic = separate_organic_inorganic(current_branches)

    print(f"\n{'#' * 60}")
    print(f"Final Results:")
    print(f"  Organic: {list(final_organic)}")
    print(f"  Inorganic: {list(final_inorganic)}")
    print(f"{'#' * 60}\n")

    # Return based on debug flag
    if debug:
        return {
            "steps": [s.to_dict() for s in all_steps],
            "final_organic": list(final_organic),
            "final_inorganic": list(final_inorganic),
        }
    else:
        return {"organic": list(final_organic), "inorganic": list(final_inorganic)}


# ============================================================================
# Legacy Helper Functions
# ============================================================================


def apply_carbocation_rearrangements_smiles(smiles: str) -> set[str]:
    """Convert SMILES to molecule, apply rearrangements, return SMILES set."""
    mol = Chem.MolFromSmiles(smiles)
    if not mol:
        return set()
    mols = apply_carbocation_rearrangements(mol)
    return {Chem.MolToSmiles(m) for m in mols}


def apply_carbocation_rearrangements(mol: Chem.Mol) -> list[Chem.Mol]:
    """
    Identifies 1,2-hydride and 1,2-alkyl shifts that lead to more stable carbocations.
    """
    rearranged_mols = []
    mol_with_hs = Chem.AddHs(mol)

    rearr_rxns = [
        AllChem.ReactionFromSmarts("[C:1](-[H:3])-[#6+:2]>>[C+:1]-[#6:2](-[H:3])"),
        AllChem.ReactionFromSmarts("[C:1](-[#6:3])-[#6+:2]>>[C+:1]-[#6:2](-[#6:3])"),
    ]

    def get_max_stability(m):
        max_s = -1
        for atom in m.GetAtoms():
            if atom.GetSymbol() == "C" and atom.GetFormalCharge() == 1:
                stab = atom.GetDegree()
                if stab > max_s:
                    max_s = stab
        return max_s

    current_stability = get_max_stability(mol)

    for rxn in rearr_rxns:
        try:
            results = rxn.RunReactants((mol_with_hs,))
            for product_tuple in results:
                for prod_mol in product_tuple:
                    prod_no_hs = Chem.RemoveHs(prod_mol)
                    if get_max_stability(prod_no_hs) > current_stability:
                        rearranged_mols.append(prod_no_hs)
        except Exception:
            continue

    return rearranged_mols
