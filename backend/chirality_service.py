from rdkit import Chem


def get_chiral_centers(smiles: str) -> dict:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {
            "chiral_centers": [],
            "chiral_atom_indices": [],
            "is_chiral": False,
            "error": "Invalid SMILES",
        }

    Chem.AssignStereochemistry(mol, cleanIt=True, force=True, flagPossibleStereoCenters=True)
    center_tuples = Chem.FindMolChiralCenters(
        mol,
        includeUnassigned=True,
        includeCIP=True,
        useLegacyImplementation=False,
    )

    centers = []
    atom_indices = []
    for atom_idx, label in center_tuples:
        atom = mol.GetAtomWithIdx(atom_idx)
        if atom.GetSymbol() != "C":
            continue

        neighbors = [n.GetSymbol() for n in atom.GetNeighbors()]
        if len(neighbors) < 4 and atom.GetTotalNumHs() == 0:
            continue

        if label == "?":
            config = "Unassigned"
        elif label in {"R", "S"}:
            config = label
        else:
            config = "Unassigned"

        centers.append(
            {
                "atom_index": atom_idx,
                "atom_symbol": atom.GetSymbol(),
                "configuration": config,
                "neighbors": neighbors,
            }
        )
        atom_indices.append(atom_idx)

    return {
        "chiral_centers": centers,
        "chiral_atom_indices": atom_indices,
        "is_chiral": len(centers) > 0,
    }
