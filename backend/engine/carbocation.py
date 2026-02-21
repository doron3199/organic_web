from rdkit import Chem
from rdkit.Chem import AllChem


# ============================================================================
# Carbocation Chemistry
# ============================================================================


def get_carbocation_stability(mol: Chem.Mol) -> int:
    """Returns the degree (stability) of a carbocation center, or -1 if none."""
    for atom in mol.GetAtoms():
        if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
            return atom.GetDegree()
    return -1


def get_all_rearrangements(mol: Chem.Mol) -> list[tuple[Chem.Mol, str]]:
    """Get all possible carbocation rearrangements (1,2-hydride/methyl shifts)."""
    rearrangements = []

    # Pre-compiled reactions for performance
    rxn_hydride = AllChem.ReactionFromSmarts("[C;!H0:1]-[C+1:2]>>[C+1:1]-[C+0:2]")
    rxn_methyl = AllChem.ReactionFromSmarts(
        "[C;H0:1](-[CH3:3])-[C+1:2]>>[C+1:1]-[C+0:2](-[CH3:3])"
    )

    current_stability = get_carbocation_stability(mol)

    # Check for vinyl carbocation (C+ on double bond) - these don't typically rearrange
    is_vinyl = False
    for atom in mol.GetAtoms():
        if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
            if atom.GetHybridization() == Chem.HybridizationType.SP:
                is_vinyl = True
            else:
                for bond in atom.GetBonds():
                    if bond.GetBondType() == Chem.BondType.DOUBLE:
                        is_vinyl = True
            if is_vinyl:
                break

    if is_vinyl:
        return []

    # Check for carbocation in an unsaturated ring (e.g. Sigma complex)
    # We want to prevent rearrangements of resonance-stabilized cyclic intermediates
    # that should instead follow the reaction path (e.g. elimination/aromatization).
    carbocation_atom = None
    for atom in mol.GetAtoms():
        if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
            carbocation_atom = atom
            break

    if carbocation_atom and carbocation_atom.IsInRing():
        ring_info = mol.GetRingInfo()
        for ring in ring_info.AtomRings():
            if carbocation_atom.GetIdx() in ring:
                # Check if this ring contains any double or aromatic bonds
                has_unsaturation = False
                for bond in mol.GetBonds():
                    if bond.GetBeginAtomIdx() in ring and bond.GetEndAtomIdx() in ring:
                        if (
                            bond.GetBondType() == Chem.BondType.DOUBLE
                            or bond.GetBondType() == Chem.BondType.AROMATIC
                        ):
                            has_unsaturation = True
                            break
                if has_unsaturation:
                    return []

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
                    if get_carbocation_stability(p) > current_stability:
                        rearrangements.append((p, shift_type))
                except Exception:
                    continue
        except Exception:
            continue

    return rearrangements
