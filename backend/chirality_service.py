from rdkit import Chem


def get_chiral_centers(smiles: str, name: str = None, locant_map: dict = None) -> dict:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {
            "chiral_centers": [],
            "chiral_atom_indices": [],
            "is_chiral": False,
            "error": "Invalid SMILES",
            "stereo_name": name,
        }

    Chem.AssignStereochemistry(
        mol, cleanIt=True, force=True, flagPossibleStereoCenters=True
    )
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

    stereo_name = name
    if name and centers:
        # Build prefix, e.g., (2R, 3S)-
        # Note: Ideally we'd map atom indices to IUPAC locants, but without full mapping,
        # we can just list the centers or rely on the frontend to do complex mapping.
        # Since we just have R/S labels, we can append them or prepend them simply.
        labels = []
        for c in centers:
            atom_idx_str = str(c["atom_index"])
            locant = locant_map.get(atom_idx_str) if locant_map else None
            config = c["configuration"] if c["configuration"] != "Unassigned" else "?"
            labels.append(
                {"config": config, "locant": locant, "atom_index": c["atom_index"]}
            )

        # Sort labels: if locants exist and are numeric, sort by them, otherwise by atom_index
        def sort_key(x):
            if x["locant"] and x["locant"].isdigit():
                return (0, int(x["locant"]))
            elif x["locant"]:
                return (1, x["locant"])
            return (2, x["atom_index"])

        labels.sort(key=sort_key)

        label_strs = []
        for x in labels:
            label_strs.append(x["config"])

        if len(label_strs) == 1:
            prefix = f"({label_strs[0]})-"
        else:
            prefix = f"({','.join(label_strs)})-"

        stereo_name = prefix + name

    return {
        "chiral_centers": centers,
        "chiral_atom_indices": atom_indices,
        "is_chiral": len(centers) > 0,
        "stereo_name": stereo_name,
    }
