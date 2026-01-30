from rdkit import Chem
from rdkit.Chem import AllChem
import itertools
from dataclasses import dataclass
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
    step_type: str  # 'reaction' | 'carbocation_rearrangement'
    group_id: Optional[str] = None  # To visually group related products

    def to_dict(self) -> dict:
        return {
            "step_id": self.step_id,
            "step_index": self.step_index,
            "smarts_used": self.smarts_used,
            "input_smiles": self.input_smiles,
            "products": self.products,
            "parent_id": self.parent_id,
            "step_type": self.step_type,
            "group_id": self.group_id,
        }


def is_organic(smiles: str) -> bool:
    """Heuristic to check if a molecule is organic (contains Carbon)."""
    mol = Chem.MolFromSmiles(smiles)
    if not mol:
        # Fallback to string check but be careful with Cl, Ca, Cs, etc.
        # This fallback is rarely reached for valid SMILES.
        return "C" in smiles.replace("Cl", "").replace("Ca", "").replace("Cs", "")
    return any(a.GetSymbol() == "C" for a in mol.GetAtoms())


def run_reaction(reactants_smiles: list[str], reaction_smarts: str | list[str]) -> dict:
    """
    Runs a reaction and returns a dict with 'organic' and 'inorganic' products.
    Supports multi-step reactions and automatic carbocation rearrangements.
    """
    if isinstance(reaction_smarts, str):
        steps = [reaction_smarts]
    else:
        steps = reaction_smarts

    # Helper: Detect if a molecule is a carbocation and return the degree (stability) of the C+ center
    def get_carbocation_stability(mol):
        for atom in mol.GetAtoms():
            if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
                # Degree of C+ (number of non-H neighbors) indicates stability: Tert(3) > Sec(2) > Prim(1)
                return atom.GetDegree()
        return -1

    # Helper: Recursively stabilize carbocations via 1,2-shifts
    def stabilize_carbocation(mol):
        """
        Recursively stabilizes a carbocation via 1,2-hydride and 1,2-methyl shifts
        until no more stable isomer can be found.
        """
        # 1. SMARTS for 1,2-hydride shift
        # Matches: A Carbon with at least 1 H (neighbor) connected to a Cation
        # Action: Swap the charge. SanitizeMol will auto-adjust the implicit Hydrogens.
        rxn_hydride = AllChem.ReactionFromSmarts("[C;!H0:1]-[C+1:2]>>[C+1:1]-[C+0:2]")

        # 2. SMARTS for 1,2-methyl shift
        # Matches: A Carbon with a methyl group connected to a Cation
        # Action: Move the methyl group (:3) to the cation, move charge to the donor.
        rxn_methyl = AllChem.ReactionFromSmarts(
            "[C:1](-[CH3:3])-[C+1:2]>>[C+1:1]-[C+0:2](-[CH3:3])"
        )

        moves = [rxn_hydride, rxn_methyl]
        current_mol = mol

        # Allow up to 10 iterations to prevent infinite loops (e.g., oscillating between equivalent cations)
        for _ in range(10):
            current_stability = get_carbocation_stability(current_mol)

            # If not a carbocation or invalid, stop
            if current_stability == -1:
                break

            best_mol_step = None
            best_stability_step = current_stability
            found_improvement = False

            # Try all shift types
            for move in moves:
                try:
                    prods = move.RunReactants((current_mol,))

                    for prod_tuple in prods:
                        p = prod_tuple[0]
                        try:
                            # CRITICAL: Sanitize to recalculate implicit Valences/Hydrogens
                            Chem.SanitizeMol(p)

                            new_stability = get_carbocation_stability(p)

                            # Greedy approach: Find the single best move in this iteration
                            if new_stability > best_stability_step:
                                best_stability_step = new_stability
                                best_mol_step = p
                                found_improvement = True

                        except Exception:
                            continue  # Skip invalid molecules
                except Exception:
                    continue

            # If we found a strictly better form, update and loop again
            if found_improvement:
                current_mol = best_mol_step
            else:
                break  # Local maximum reached

        return current_mol

    # --- Main Execution ---

    # Initialize pool with reactant molecules
    current_mols = [Chem.MolFromSmiles(s) for s in reactants_smiles]

    for smarts in steps:
        rxn = AllChem.ReactionFromSmarts(smarts)
        num_templates = rxn.GetNumReactantTemplates()
        next_step_mols = []

        # Generate all permutations of reactants from the pool matching the required number of templates
        # (e.g., if reaction needs 2 reactants, try all pairs from the pool)
        reactant_combinations = itertools.permutations(current_mols, num_templates)

        for reactants in reactant_combinations:
            try:
                products_tuple_list = rxn.RunReactants(reactants)

                for products in products_tuple_list:
                    for prod in products:
                        prod.UpdatePropertyCache()
                        Chem.SanitizeMol(prod)

                        # Apply carbocation rearrangement logic
                        stable_prod = stabilize_carbocation(prod)
                        # Add the original intermediate (allows for minor products from unrearranged carbocations)
                        next_step_mols.append(prod)

                        # Add the rearranged/stabilized intermediate if it's different (major product)
                        # We compare objects; stabilize_carbocation returns a new object if changes occurred.
                        if stable_prod is not prod:
                            next_step_mols.append(stable_prod)
            except Exception:
                continue

        # For multi-step, the products of this step become the reactants for the next
        if next_step_mols:
            current_mols = next_step_mols
        else:
            # If a step produces nothing, the chain breaks; return empty or stopped state
            current_mols = []
            break

    # --- Separation ---

    results = {"organic": set(), "inorganic": set()}

    for m in current_mols:
        smi = Chem.MolToSmiles(m, isomericSmiles=True)
        # Simple heuristic: Organic molecules contain Carbon
        has_carbon = any(atom.GetSymbol() == "C" for atom in m.GetAtoms())

        if has_carbon:
            results["organic"].add(smi)
        else:
            results["inorganic"].add(smi)

    return {k: list(v) for k, v in results.items()}


def apply_carbocation_rearrangements_smiles(smiles: str) -> set[str]:
    mol = Chem.MolFromSmiles(smiles)
    if not mol:
        return set()
    mols = apply_carbocation_rearrangements(mol)
    return {Chem.MolToSmiles(m) for m in mols}


def apply_carbocation_rearrangements(mol: Chem.Mol) -> list[Chem.Mol]:
    """
    Identifies 1,2-hydride and 1,2-alkyl shifts that lead to more stable carbocations.
    Returns list of Molecules.
    """
    rearranged_mols = []

    # Use AddHs so that [H] in SMARTS can match
    mol_with_hs = Chem.AddHs(mol)

    rearr_rxns = [
        AllChem.ReactionFromSmarts("[C:1](-[H:3])-[#6+:2]>>[C+:1]-[#6:2](-[H:3])"),
        AllChem.ReactionFromSmarts("[C:1](-[#6:3])-[#6+:2]>>[C+:1]-[#6:2](-[#6:3])"),
    ]

    def get_max_stability(m):
        max_s = -1
        for atom in m.GetAtoms():
            if atom.GetSymbol() == "C" and atom.GetFormalCharge() == 1:
                # Use Degree (neighbor count)
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
                    # Remove Hs before comparing stability or returning
                    prod_no_hs = Chem.RemoveHs(prod_mol)
                    if get_max_stability(prod_no_hs) > current_stability:
                        rearranged_mols.append(prod_no_hs)
        except Exception:
            continue

    return rearranged_mols


def run_reaction_debug(
    reactants_smiles: list[str], reaction_smarts: str | list[str]
) -> dict:
    """
    Runs a reaction with full debug info, returning all intermediate steps
    including carbocation rearrangements as a tree structure.

    Returns:
        {
            "steps": [ReactionStepInfo, ...],
            "final_organic": [...],
            "final_inorganic": [...]
        }
    """
    if isinstance(reaction_smarts, str):
        steps_list = [reaction_smarts]
    else:
        steps_list = reaction_smarts

    all_steps: list[ReactionStepInfo] = []
    step_counter = 0

    # Helper: Detect if a molecule is a carbocation and return the degree (stability) of the C+ center
    def get_carbocation_stability(mol):
        for atom in mol.GetAtoms():
            if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
                return atom.GetDegree()
        return -1

    # Helper: Get all possible rearrangements (not just the best one)
    def get_all_rearrangements(mol):
        """Returns list of (rearranged_mol, shift_type) tuples for all possible rearrangements."""
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

    # Track molecules with their parent step IDs: (mol, parent_step_id)
    current_pool: list[tuple] = [
        (Chem.MolFromSmiles(s), None) for s in reactants_smiles
    ]

    # Create initial step for reactants
    initial_step_id = "step_0_reactants"
    all_steps.append(
        ReactionStepInfo(
            step_id=initial_step_id,
            step_index=0,
            smarts_used="(initial reactants)",
            input_smiles=[],
            products=reactants_smiles,
            parent_id=None,
            step_type="initial",
        )
    )
    step_counter = 1

    # Update pool with initial step as parent
    current_pool = [(Chem.MolFromSmiles(s), initial_step_id) for s in reactants_smiles]

    for smarts_idx, smarts in enumerate(steps_list):
        rxn = AllChem.ReactionFromSmarts(smarts)
        num_templates = rxn.GetNumReactantTemplates()
        next_pool: list[tuple] = []

        # Get just the molecules for permutations
        current_mols = [m for m, _ in current_pool]

        # Generate all permutations of reactants from the pool
        reactant_combinations = list(
            itertools.permutations(range(len(current_mols)), num_templates)
        )

        for combo_indices in reactant_combinations:
            reactants = tuple(current_mols[i] for i in combo_indices)
            parent_ids = [current_pool[i][1] for i in combo_indices]
            # Use the first parent as the main parent for simplicity
            main_parent_id = parent_ids[0] if parent_ids else None

            try:
                products_tuple_list = rxn.RunReactants(reactants)
                # remove duplicates from products_tuple_list
                unique_products_tuple_list = []
                seen_smiles = set()
                for products in products_tuple_list:
                    smi = Chem.MolToSmiles(products[0], isomericSmiles=True)
                    if smi not in seen_smiles:
                        seen_smiles.add(smi)
                        unique_products_tuple_list.append(products)
                products_tuple_list = unique_products_tuple_list

                for products in products_tuple_list:
                    import uuid

                    # Generate a unique group ID for this specific reaction outcome/pathway
                    current_group_id = f"grp_{str(uuid.uuid4())[:8]}"

                    reaction_products = []

                    for prod in products:
                        try:
                            prod.UpdatePropertyCache()
                            Chem.SanitizeMol(prod)
                            prod_smiles = Chem.MolToSmiles(prod, isomericSmiles=True)

                            # Record the reaction step
                            reaction_step_id = f"step_{step_counter}_rxn"
                            input_smiles = [Chem.MolToSmiles(r) for r in reactants]

                            reaction_products.append(prod_smiles)

                            # Check for carbocation rearrangements
                            if get_carbocation_stability(prod) > 0:
                                # This is a carbocation - record it
                                all_steps.append(
                                    ReactionStepInfo(
                                        step_id=reaction_step_id,
                                        step_index=step_counter,
                                        smarts_used=smarts,
                                        input_smiles=input_smiles,
                                        products=[prod_smiles],
                                        parent_id=main_parent_id,
                                        step_type="carbocation_intermediate",
                                        group_id=current_group_id,
                                    )
                                )
                                step_counter += 1

                                # Get all possible rearrangements
                                rearrangements = get_all_rearrangements(prod)

                                if rearrangements:
                                    for rearranged_mol, shift_type in rearrangements:
                                        rearranged_smiles = Chem.MolToSmiles(
                                            rearranged_mol, isomericSmiles=True
                                        )
                                        rearr_step_id = f"step_{step_counter}_rearr"

                                        all_steps.append(
                                            ReactionStepInfo(
                                                step_id=rearr_step_id,
                                                step_index=step_counter,
                                                smarts_used=f"({shift_type})",
                                                input_smiles=[prod_smiles],
                                                products=[rearranged_smiles],
                                                parent_id=reaction_step_id,
                                                step_type="carbocation_rearrangement",
                                                group_id=current_group_id,  # Share group ID with parent carbocation
                                            )
                                        )
                                        step_counter += 1

                                        # Add rearranged to pool
                                        next_pool.append(
                                            (rearranged_mol, rearr_step_id)
                                        )

                                # Also add unrearranged carbocation to pool (minor product path)
                                next_pool.append((prod, reaction_step_id))
                            else:
                                # Not a carbocation - regular product
                                all_steps.append(
                                    ReactionStepInfo(
                                        step_id=reaction_step_id,
                                        step_index=step_counter,
                                        smarts_used=smarts,
                                        input_smiles=input_smiles,
                                        products=[prod_smiles],
                                        parent_id=main_parent_id,
                                        step_type="reaction",
                                        group_id=current_group_id,
                                    )
                                )
                                step_counter += 1
                                next_pool.append((prod, reaction_step_id))

                        except Exception:
                            continue

            except Exception:
                continue

        # For multi-step, products of this step become reactants for next
        if next_pool:
            # clear pool from duplicates
            unique_pool = []
            seen_smiles = set()
            for mol, parent_id in next_pool:
                smi = Chem.MolToSmiles(mol, isomericSmiles=True)
                if smi not in seen_smiles:
                    seen_smiles.add(smi)
                    unique_pool.append((mol, parent_id))
            current_pool = unique_pool
        else:
            current_pool = []
            break

    # --- Final Separation ---
    final_organic = set()
    final_inorganic = set()

    for mol, _ in current_pool:
        if mol is None:
            continue
        smi = Chem.MolToSmiles(mol, isomericSmiles=True)
        has_carbon = any(atom.GetSymbol() == "C" for atom in mol.GetAtoms())

        if has_carbon:
            final_organic.add(smi)
        else:
            final_inorganic.add(smi)

    return {
        "steps": [s.to_dict() for s in all_steps],
        "final_organic": list(final_organic),
        "final_inorganic": list(final_inorganic),
    }
