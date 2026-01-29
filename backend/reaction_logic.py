from rdkit import Chem
from rdkit.Chem import AllChem
import itertools


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
        # SMARTS for 1,2-hydride shift (move H to C+, move + to neighbor)
        rxn_hydride = AllChem.ReactionFromSmarts(
            "[Ch1,Ch2,Ch3:1]-[C+1:2]>>[C+1:1]-[C:2]"
        )
        # SMARTS for 1,2-methyl shift (move CH3 to C+, move + to neighbor)
        rxn_methyl = AllChem.ReactionFromSmarts(
            "[C:1](-[CH3:3])-[C+1:2]>>[C+1:1]-[C:2](-[CH3:3])"
        )

        moves = [rxn_hydride, rxn_methyl]
        current_mol = mol

        # Limit iterations to prevent infinite loops in degenerate cases
        for _ in range(5):
            current_stability = get_carbocation_stability(current_mol)
            if current_stability == -1:
                break  # Not a carbocation

            best_mol = current_mol
            improved = False

            # Try all possible shifts
            for move in moves:
                try:
                    # Apply transformation
                    prods = move.RunReactants((current_mol,))
                    for prod_tuple in prods:
                        p = prod_tuple[0]
                        try:
                            Chem.SanitizeMol(p)
                            new_stability = get_carbocation_stability(p)
                            # If new C+ is more substituted (stable), keep it
                            if new_stability > current_stability:
                                best_mol = p
                                current_stability = new_stability
                                improved = True
                        except ValueError:
                            continue
                except Exception:
                    continue

            if improved:
                current_mol = best_mol
            else:
                break  # No further stabilization possible

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
