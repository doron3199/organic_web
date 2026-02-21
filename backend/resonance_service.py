import traceback

from fastapi import HTTPException
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit import Chem
from rdkit.Chem import ResonanceMolSupplier, AllChem, RWMol


def _draw_mol_svg(mol, width: int = 280, height: int = 200) -> str:
    """Draw a molecule to SVG with dark-theme colors (black bg, white bonds)."""

    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    opts = drawer.drawOptions()
    opts.backgroundColour = (0, 0, 0, 1)       # black background
    opts.symbolColour = (1, 1, 1, 1)            # white bonds/default text
    opts.bondLineWidth = 2
    opts.padding = 0.15
    # Update the atom palette so element colours are visible on dark background
    palette = opts.getAtomPalette()
    palette[0] = (1, 1, 1, 1)    # default -> white
    palette[6] = (1, 1, 1, 1)    # C (carbon) -> white
    palette[7] = (0.3, 0.6, 1, 1)   # N -> light blue
    palette[8] = (1, 0.3, 0.3, 1)   # O -> light red
    palette[9] = (0.4, 1, 0.4, 1)   # F -> light green
    palette[16] = (1, 0.8, 0.2, 1)  # S -> yellow
    palette[17] = (0.4, 1, 0.4, 1)  # Cl -> light green
    palette[35] = (0.8, 0.3, 0.1, 1) # Br -> orange
    palette[53] = (0.6, 0.2, 0.8, 1) # I -> purple
    opts.setAtomPalette(palette)
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()


def _add_structure(structures, seen, res_mol):
    """Try to add res_mol to structures list; returns True if added."""
    charge_sig = tuple(
        (a.GetIdx(), a.GetFormalCharge())
        for a in res_mol.GetAtoms()
        if a.GetFormalCharge() != 0
    )
    if charge_sig in seen:
        return False
    seen.add(charge_sig)
    smi = Chem.MolToSmiles(res_mol, kekuleSmiles=True)
    AllChem.Compute2DCoords(res_mol)
    molblock = Chem.MolToMolBlock(res_mol)
    svg = _draw_mol_svg(res_mol, 280, 200)

    # Track which atom(s) carry formal charges (used for mechanism ordering)
    charged_atoms = [
        a.GetIdx() for a in res_mol.GetAtoms() if a.GetFormalCharge() != 0
    ]

    structures.append({
        "smiles": smi,
        "molblock": molblock,
        "svg": svg,
        "index": len(structures),
        "charged_atom_idx": charged_atoms[0] if charged_atoms else -1,
    })
    return True


def _walk_charge_through_ring(smiles, structures, seen, max_structures):
    """
    Manually enumerate charge-migration resonance for atoms conjugated
    to 6-membered aromatic rings.

    For a benzylic-type cation  R-[CH⁺]-Ph the charge can delocalise to
    the ortho and para ring positions, giving 4 contributors total
    (1 benzylic + 2 ortho + 1 para).

    We construct each Kekulé structure explicitly so that the C⁺ atom
    always has only single bonds (correct cyclohexadienyl pattern).
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return
    ri = mol.GetRingInfo()

    # For a 6-membered ring ordered 0(ipso)..5, with C⁺ at step t,
    # the two ring double-bond positions (bond index i → ordered[i]-ordered[i+1]):
    _double_bond_map = {
        1: (2, 4),   # C⁺ ortho  → doubles at bonds 2 and 4
        3: (1, 4),   # C⁺ para   → doubles at bonds 1 and 4
        5: (1, 3),   # C⁺ ortho' → doubles at bonds 1 and 3
    }

    for atom in mol.GetAtoms():
        fc = atom.GetFormalCharge()
        if fc == 0:
            continue
        orig_idx = atom.GetIdx()

        for nbr in atom.GetNeighbors():
            if not nbr.GetIsAromatic():
                continue
            ipso_idx = nbr.GetIdx()

            for ring in ri.AtomRings():
                if ipso_idx not in ring:
                    continue
                if len(ring) != 6:
                    continue  # only handle benzene-size rings

                ring_list = list(ring)
                start = ring_list.index(ipso_idx)
                ordered = ring_list[start:] + ring_list[:start]

                for target_step, dbl_bonds in _double_bond_map.items():
                    if len(structures) >= max_structures:
                        return
                    target_idx = ordered[target_step]

                    try:
                        new_mol = RWMol(Chem.MolFromSmiles(smiles))
                        if new_mol is None:
                            continue

                        # ── move the formal charge ──
                        new_mol.GetAtomWithIdx(orig_idx).SetFormalCharge(0)
                        new_mol.GetAtomWithIdx(target_idx).SetFormalCharge(fc)

                        # ── clear aromaticity on ring + exo atom ──
                        ring_set = set(ordered)
                        for ridx in ring_set:
                            new_mol.GetAtomWithIdx(ridx).SetIsAromatic(False)
                        new_mol.GetAtomWithIdx(orig_idx).SetIsAromatic(False)

                        for bond in new_mol.GetBonds():
                            bi, ei = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
                            if bi in ring_set or ei in ring_set or bi == orig_idx or ei == orig_idx:
                                bond.SetIsAromatic(False)

                        # ── exo → ipso = DOUBLE ──
                        exo_bond = new_mol.GetBondBetweenAtoms(orig_idx, ipso_idx)
                        if exo_bond:
                            exo_bond.SetBondType(Chem.BondType.DOUBLE)

                        # ── ring bonds: explicit Kekulé pattern ──
                        for i in range(6):
                            a1 = ordered[i]
                            a2 = ordered[(i + 1) % 6]
                            bond = new_mol.GetBondBetweenAtoms(a1, a2)
                            if bond is None:
                                continue
                            if i in dbl_bonds:
                                bond.SetBondType(Chem.BondType.DOUBLE)
                            else:
                                bond.SetBondType(Chem.BondType.SINGLE)

                        # ── partial sanitise (skip aromaticity & kekulise) ──
                        Chem.SanitizeMol(
                            new_mol,
                            Chem.SanitizeFlags.SANITIZE_ALL
                            ^ Chem.SanitizeFlags.SANITIZE_SETAROMATICITY
                            ^ Chem.SanitizeFlags.SANITIZE_KEKULIZE,
                        )

                        _add_structure(structures, seen, new_mol)
                    except Exception:
                        continue


def get_resonance_structures(data):
    """Generate all resonance structures for a given molecule."""
    try:

        mol = Chem.MolFromSmiles(data.smiles)
        if mol is None:
            raise HTTPException(status_code=400, detail="Invalid SMILES")

        AllChem.Compute2DCoords(mol)

        flags_res = Chem.KEKULE_ALL
        if data.allow_incomplete_octets:
            flags_res |= Chem.ALLOW_INCOMPLETE_OCTETS
        if data.allow_charge_separation:
            flags_res |= Chem.ALLOW_CHARGE_SEPARATION
        if data.unconstrained_cations:
            flags_res |= Chem.UNCONSTRAINED_CATIONS
        if data.unconstrained_anions:
            flags_res |= Chem.UNCONSTRAINED_ANIONS
        structures = []
        seen = set()
        max_structures = 20

        def _collect(supplier):
            for res_mol in supplier:
                if len(structures) >= max_structures:
                    break
                if res_mol is None:
                    continue
                try:
                    _add_structure(structures, seen, res_mol)
                except Exception:
                    continue

        def _fresh_mol(kekulize=False):
            m = Chem.MolFromSmiles(data.smiles)
            if m is None:
                return None
            AllChem.Compute2DCoords(m)
            if kekulize:
                try:
                    Chem.Kekulize(m, clearAromaticFlags=False)
                except Exception:
                    pass
            return m

        # --- RDKit passes (best effort) ---
        for kekulize in (False, True):
            if len(structures) >= max_structures:
                break
            m = _fresh_mol(kekulize=kekulize)
            if m:
                s = ResonanceMolSupplier(m, flags_res)
                s.SetNumThreads(1)
                _collect(s)

        # --- Also add the original input as-is (in case RDKit skipped it) ---
        if len(structures) < max_structures:
            orig = _fresh_mol()
            if orig:
                _add_structure(structures, seen, orig)

        # --- Manual charge walk (fills in anything RDKit missed) ---
        if len(structures) < max_structures:
            _walk_charge_through_ring(data.smiles, structures, seen, max_structures)

        # If ResonanceMolSupplier gave nothing, just return the input as the only structure
        if not structures:
            AllChem.Compute2DCoords(mol)
            svg = _draw_mol_svg(mol, 280, 200)
            structures.append({
                "smiles": data.smiles,
                "molblock": Chem.MolToMolBlock(mol),
                "svg": svg,
                "index": 0,
            })

        # ── Sort in mechanism order ──
        # For conjugated-ring systems (benzylic cation etc.) order by
        # walking the charge around the ring: exo → ortho → para → ortho'.
        ref = Chem.MolFromSmiles(data.smiles)
        order_map = {}  # atom_idx → mechanism step
        if ref is not None:
            ri_ref = ref.GetRingInfo()
            for at in ref.GetAtoms():
                if at.GetFormalCharge() == 0:
                    continue
                order_map[at.GetIdx()] = 0  # exo / original position = first
                for nbr in at.GetNeighbors():
                    if not nbr.GetIsAromatic():
                        continue
                    for ring in ri_ref.AtomRings():
                        if nbr.GetIdx() not in ring or len(ring) != 6:
                            continue
                        rl = list(ring)
                        st = rl.index(nbr.GetIdx())
                        od = rl[st:] + rl[:st]
                        # mechanism walk: ortho(1)→para(3)→ortho'(5)
                        order_map[od[1]] = 1
                        order_map[od[3]] = 2
                        order_map[od[5]] = 3
                        break
                break

        for s in structures:
            s["mechanism_order"] = order_map.get(s.get("charged_atom_idx", -1), 99)
        structures.sort(key=lambda s: s["mechanism_order"])
        for i, s in enumerate(structures):
            s["index"] = i

        return {
            "input_smiles": data.smiles,
            "structures": structures,
            "count": len(structures),
            "capped": len(structures) >= max_structures,
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
