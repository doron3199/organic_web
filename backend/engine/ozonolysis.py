import logging

from rdkit import Chem

from engine.models import ReactionBranch


logger = logging.getLogger(__name__)


# ============================================================================
# Special Reaction Handling (Ozonolysis)
# ============================================================================


def is_ozonolysis_smarts(smarts: str) -> bool:
    return "[O-][O+]=O" in smarts or "O=[O+][O-]" in smarts


def find_ring_double_bond(mol: Chem.Mol) -> tuple[int, int, int] | None:
    """Returns (bond_idx, begin_atom_idx, end_atom_idx) of a ring double bond."""
    if mol is None:
        return None
    for bond in mol.GetBonds():
        if bond.GetBondType() == Chem.BondType.DOUBLE and bond.IsInRing():
            begin = bond.GetBeginAtom()
            end = bond.GetEndAtom()
            if begin.GetSymbol() == "C" and end.GetSymbol() == "C":
                return (bond.GetIdx(), begin.GetIdx(), end.GetIdx())
    return None


def perform_ring_ozonolysis(mol: Chem.Mol) -> Chem.Mol | None:
    """Fragments a cyclic alkene at the double bond and caps with carbonyls."""
    ring_db = find_ring_double_bond(mol)
    if not ring_db:
        return None

    bond_idx, _, _ = ring_db
    try:
        # Fragment and get editable mol
        fragmented = Chem.FragmentOnBonds(mol, [bond_idx], dummyLabels=[(1, 2)])
        if not fragmented:
            return None

        editable = Chem.RWMol(fragmented)
        dummy_atoms = [a.GetIdx() for a in editable.GetAtoms() if a.GetAtomicNum() == 0]

        if len(dummy_atoms) != 2:
            return None

        # Replace dummies with Oxygen double bonds
        for dummy_idx in dummy_atoms:
            dummy_atom = editable.GetAtomWithIdx(dummy_idx)
            neighbors = list(dummy_atom.GetNeighbors())
            if len(neighbors) != 1:
                continue

            carbon_idx = neighbors[0].GetIdx()
            oxygen_idx = editable.AddAtom(Chem.Atom(8))
            editable.AddBond(carbon_idx, oxygen_idx, Chem.BondType.DOUBLE)

        # Remove dummies (reverse order to preserve indices)
        for dummy_idx in sorted(dummy_atoms, reverse=True):
            editable.RemoveAtom(dummy_idx)

        Chem.SanitizeMol(editable)
        return editable.GetMol()
    except Exception as e:
        logger.warning(f"Ring ozonolysis failed: {e}")
        return None


def handle_ring_ozonolysis_for_branch(
    branch: ReactionBranch, smarts: str
) -> tuple[list[Chem.Mol], list[int]] | None:
    """Detects and handles ring ozonolysis, returning products and reactant indices."""
    if not is_ozonolysis_smarts(smarts):
        return None

    alkene_idx, ozone_idx = None, None
    for i, mol in enumerate(branch.molecules):
        if not mol:
            continue
        smiles = Chem.MolToSmiles(mol)
        if "[O-][O+]=O" in smiles or "O=[O+][O-]" in smiles:
            ozone_idx = i
        elif find_ring_double_bond(mol):
            alkene_idx = i

    if alkene_idx is not None and ozone_idx is not None:
        product = perform_ring_ozonolysis(branch.molecules[alkene_idx])
        if product:
            return ([product], [alkene_idx, ozone_idx])

    return None
