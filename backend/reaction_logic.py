from rdkit import Chem
from rdkit.Chem import AllChem

def run_reaction(reactants_smiles: list[str], reaction_smarts: str) -> list[str]:
    """
    Runs a reaction defined by SMARTs against a list of reactant SMILES.
    """
    rxn = AllChem.ReactionFromSmarts(reaction_smarts)
    
    reactant_mols = []
    for smi in reactants_smiles:
        mol = Chem.MolFromSmiles(smi)
        if mol:
            reactant_mols.append(mol)
        else:
            # Handle invalid smiles if necessary, or skip
            pass
            
    # RDKit expects a tuple of reactants
    if len(reactant_mols) != rxn.GetNumReactantTemplates():
        # simple check, might need more robust matching logic if we have optional reactants or multiple sets
        # But for this simple implementation, we try to match what we have.
        # However, the frontend sends all reactants. RDKit RunReactants expects arguments in order.
        pass

    # For safety, let's try to pass them all. 
    # If the number doesn't match, RDKit might throw or just fail. 
    # But usually we want to see if these reactants MATCH the reaction templates first.
    # The current frontend logic just "pushes" them into the reaction.

    try:
        products_tuple_tuple = rxn.RunReactants(tuple(reactant_mols))
        
        products_smiles = set()
        for product_tuple in products_tuple_tuple:
            for mol in product_tuple:
                products_smiles.add(Chem.MolToSmiles(mol))
        
        return list(products_smiles)
    except Exception as e:
        print(f"Error running reaction: {e}")
        return []
