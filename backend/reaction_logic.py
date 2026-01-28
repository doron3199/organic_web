from rdkit import Chem
from rdkit.Chem import AllChem


def run_reaction(reactants_smiles: list[str], reaction_smarts: str) -> list[str]:
    """
    Runs a reaction defined by SMARTs against a list of reactant SMILES.
    """
    rxn = AllChem.ReactionFromSmarts(reaction_smarts)
    n_templates = rxn.GetNumReactantTemplates()

    reactant_mols = []
    for smi in reactants_smiles:
        mol = Chem.MolFromSmiles(smi)
        if mol:
            reactant_mols.append(mol)

    try:
        products_smiles = set()

        # Case 1: Exact match
        # Case 1: Exact match - Try all permutations to ensure order independence
        if len(reactant_mols) == n_templates:
            import itertools

            # Use permutations to handle cases where input order doesn't match SMARTS template order
            for reactants_perm in itertools.permutations(reactant_mols):
                try:
                    products_tuple_tuple = rxn.RunReactants(tuple(reactants_perm))
                    for product_tuple in products_tuple_tuple:
                        for mol in product_tuple:
                            products_smiles.add(Chem.MolToSmiles(mol))
                except Exception:
                    continue

        # Case 2: SMARTS expects 1 reactant, but we got multiple (e.g. Substrate + Reagent)
        elif n_templates == 1 and len(reactant_mols) > 1:
            # Try running the reaction on each reactant individually
            for mol in reactant_mols:
                try:
                    # RunReactants returns tuple of tuples
                    # If the molecule doesn't match the template, it simply returns an empty tuple (usually)
                    # or might throw depending on RDKit version/strictness, but usually safe.
                    results = rxn.RunReactants((mol,))
                    for product_tuple in results:
                        for prod_mol in product_tuple:
                            products_smiles.add(Chem.MolToSmiles(prod_mol))
                except:
                    continue

        # Case 3: Mismatch that we can't easily resolve (e.g. SMARTS needs 2, we got 1)
        else:
            print(
                f"Warning: Reactant count mismatch. SMARTS expects {n_templates}, got {len(reactant_mols)}."
            )
            # Attempt to run anyway if RDKit allows (it might throw)
            if len(reactant_mols) > 0:
                # Try first N reactants?
                try:
                    subset = tuple(reactant_mols[:n_templates])
                    results = rxn.RunReactants(subset)
                    for product_tuple in results:
                        for prod_mol in product_tuple:
                            products_smiles.add(Chem.MolToSmiles(prod_mol))
                except:
                    pass

        return list(products_smiles)
    except Exception as e:
        print(f"Error running reaction: {e}")
        return []
