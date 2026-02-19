"""
Stereochemistry post-processing for reaction products.

Handles:
- SN2 Walden inversion (R->S, S->R at the reaction center)
- SN1 racemization (produce both enantiomers at the former carbocation center)
- Syn-addition stereochemistry (e.g., KMnO4 hydroxylation, hydroboration)
- Anti-addition stereochemistry (e.g., halogenation, halohydrin)
"""

import logging
from rdkit import Chem

logger = logging.getLogger(__name__)

# Leaving-group SMARTS used to locate the alpha carbon in substrates
_LG_SMARTS = [
    Chem.MolFromSmarts("[CX4:1][F,Cl,Br,I]"),
    Chem.MolFromSmarts("[CX4:1][OH]"),
]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _find_alpha_stereo(mol):
    """
    Locate the alpha-carbon bearing a leaving group and return its CIP code.

    Returns (atom_idx, cip_code) where cip_code is 'R', 'S', or None.
    Returns (None, None) when no chiral alpha-C is found.
    """
    Chem.AssignStereochemistry(mol, cleanIt=True, force=True)
    for pat in _LG_SMARTS:
        if pat is None:
            continue
        for match in mol.GetSubstructMatches(pat):
            c_idx = match[0]
            atom = mol.GetAtomWithIdx(c_idx)
            if atom.GetChiralTag() == Chem.ChiralType.CHI_UNSPECIFIED:
                continue
            cip = atom.GetPropsAsDict().get("_CIPCode")
            if cip in ("R", "S"):
                return c_idx, cip
    return None, None


def _set_stereocenter_cip(rw_mol, atom_idx, target_cip):
    """
    Set the chiral tag on *atom_idx* of *rw_mol* (an RWMol) so that its
    CIP code equals *target_cip* ('R' or 'S').

    Returns True on success, False if stereo could not be assigned.
    """
    atom = rw_mol.GetAtomWithIdx(atom_idx)
    for tag in (
        Chem.ChiralType.CHI_TETRAHEDRAL_CW,
        Chem.ChiralType.CHI_TETRAHEDRAL_CCW,
    ):
        atom.SetChiralTag(tag)
        Chem.AssignStereochemistry(rw_mol, cleanIt=True, force=True)
        got = atom.GetPropsAsDict().get("_CIPCode")
        if got == target_cip:
            return True
    # Reset on failure
    atom.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    return False


def _find_unassigned_centers(mol):
    """Return list of (atom_idx, label) for possible stereocenters."""
    Chem.AssignStereochemistry(
        mol, cleanIt=True, force=True, flagPossibleStereoCenters=True
    )
    return Chem.FindMolChiralCenters(
        mol, includeUnassigned=True, includeCIP=True, useLegacyImplementation=False
    )


# ---------------------------------------------------------------------------
# SN2 — Walden Inversion
# ---------------------------------------------------------------------------

def apply_sn2_inversion(substrate_smiles, product_smiles_list):
    """
    Apply stereochemical inversion at the reaction center for SN2 products.

    If the substrate has a defined stereocenter (R or S) at the carbon
    bearing the leaving group, every product that inherits that center
    is returned with the *inverted* configuration.

    Parameters
    ----------
    substrate_smiles : str
        SMILES of the substrate (alkyl halide / alcohol).
    product_smiles_list : list[str]
        SMILES of the organic products from the SN2 SMARTS reaction.

    Returns
    -------
    tuple[list[str], str | None]
        (modified_products, stereo_note)
    """
    sub_mol = Chem.MolFromSmiles(substrate_smiles)
    if sub_mol is None:
        return product_smiles_list, None

    _, substrate_cip = _find_alpha_stereo(sub_mol)

    # If substrate has no defined stereo at alpha-C, check for *potential* center
    if substrate_cip is None:
        # Even without defined stereo, note that inversion occurs conceptually
        sub_mol_check = Chem.MolFromSmiles(substrate_smiles)
        if sub_mol_check is None:
            return product_smiles_list, None
        Chem.AssignStereochemistry(
            sub_mol_check, cleanIt=True, force=True, flagPossibleStereoCenters=True
        )
        for pat in _LG_SMARTS:
            if pat is None:
                continue
            for match in sub_mol_check.GetSubstructMatches(pat):
                c_idx = match[0]
                atom = sub_mol_check.GetAtomWithIdx(c_idx)
                if atom.HasProp("_ChiralityPossible"):
                    return product_smiles_list, (
                        "SN2 proceeds with backside attack causing Walden inversion "
                        "of configuration at the reaction center."
                    )
        return product_smiles_list, None

    target_cip = "S" if substrate_cip == "R" else "R"
    logger.debug(
        f"apply_sn2_inversion: substrate CIP={substrate_cip}, target={target_cip}"
    )

    inverted = []
    for prod_smi in product_smiles_list:
        prod_mol = Chem.MolFromSmiles(prod_smi)
        if prod_mol is None:
            inverted.append(prod_smi)
            continue

        centers = _find_unassigned_centers(prod_mol)
        if not centers:
            inverted.append(prod_smi)
            continue

        rw = Chem.RWMol(prod_mol)
        modified = False
        for atom_idx, label in centers:
            # Target the unassigned center (the one created by the nucleophilic
            # displacement) or an existing center matching substrate CIP.
            if label == "?" or label == substrate_cip:
                if _set_stereocenter_cip(rw, atom_idx, target_cip):
                    modified = True
                    break  # invert only the reaction center

        inverted.append(Chem.MolToSmiles(rw) if modified else prod_smi)

    note = (
        f"SN2 proceeds with backside attack causing Walden inversion "
        f"(configuration inverted from {substrate_cip} to {target_cip} "
        f"at the reaction center)."
    )
    return inverted, note


# ---------------------------------------------------------------------------
# SN1 — Racemization
# ---------------------------------------------------------------------------

def apply_sn1_racemization(substrate_smiles, product_smiles_list):
    """
    Generate a racemic mixture for SN1 products.

    In SN1, the intermediate planar carbocation is attacked from both
    faces, leading to a mixture of both enantiomers (racemization).

    Parameters
    ----------
    substrate_smiles : str
        SMILES of the substrate.
    product_smiles_list : list[str]
        Organic product SMILES from the SN1 SMARTS reaction.

    Returns
    -------
    tuple[list[str], str | None]
        (products_including_both_enantiomers, stereo_note)
    """
    sub_mol = Chem.MolFromSmiles(substrate_smiles)
    if sub_mol is None:
        return product_smiles_list, None

    # Determine whether the alpha-C is a (potential) stereocenter
    _, substrate_cip = _find_alpha_stereo(sub_mol)

    # Even without defined stereo, check for potential stereocenter
    has_potential = False
    if substrate_cip is None:
        sub_check = Chem.MolFromSmiles(substrate_smiles)
        if sub_check:
            Chem.AssignStereochemistry(
                sub_check, cleanIt=True, force=True, flagPossibleStereoCenters=True
            )
            for pat in _LG_SMARTS:
                if pat is None:
                    continue
                for match in sub_check.GetSubstructMatches(pat):
                    c_idx = match[0]
                    atom = sub_check.GetAtomWithIdx(c_idx)
                    if atom.HasProp("_ChiralityPossible"):
                        has_potential = True
                        break
                if has_potential:
                    break

    if substrate_cip is None and not has_potential:
        return product_smiles_list, None

    racemic_set = set()
    for prod_smi in product_smiles_list:
        prod_mol = Chem.MolFromSmiles(prod_smi)
        if prod_mol is None:
            racemic_set.add(prod_smi)
            continue

        centers = _find_unassigned_centers(prod_mol)
        unassigned = [
            (idx, lbl) for idx, lbl in centers if lbl == "?" or lbl == substrate_cip
        ]

        if not unassigned:
            racemic_set.add(prod_smi)
            continue

        target_idx = unassigned[0][0]

        for cip in ("R", "S"):
            rw = Chem.RWMol(prod_mol)
            if _set_stereocenter_cip(rw, target_idx, cip):
                racemic_set.add(Chem.MolToSmiles(rw))
            else:
                racemic_set.add(prod_smi)

    note = (
        "SN1 proceeds via a planar carbocation intermediate. "
        "Nucleophilic attack occurs from both faces, producing "
        "a racemic mixture (equal amounts of R and S enantiomers)."
    )
    return list(racemic_set), note


def _centers_in_same_ring(mol, idx1, idx2):
    """Return True if both atoms belong to the same ring."""
    ri = mol.GetRingInfo()
    for ring in ri.AtomRings():
        if idx1 in ring and idx2 in ring:
            return True
    return False


# ---------------------------------------------------------------------------
# Syn-addition  (e.g., KMnO4 hydroxylation, hydroboration-oxidation)
# ---------------------------------------------------------------------------

_DIOL_PATTERN = Chem.MolFromSmarts("[C:1]([OH])-[C:2]([OH])")


def _apply_addition_stereo(product_smiles_list, pattern, mode):
    """
    Internal helper for syn/anti 1,2-addition stereochemical assignment.

    Parameters
    ----------
    product_smiles_list : list[str]
        Candidate product SMILES strings.
    pattern : rdkit.Chem.Mol
        SMARTS pattern mapping [C:1]-[C:2] stereocenter candidates.
    mode : str
        Either 'syn' or 'anti'.

    Returns
    -------
    tuple[list[str], bool]
        (processed_products, any_stereo_assigned)
    """
    result = []
    any_stereo = False

    for prod_smi in product_smiles_list:
        prod_mol = Chem.MolFromSmiles(prod_smi)
        if prod_mol is None:
            result.append(prod_smi)
            continue

        matches = prod_mol.GetSubstructMatches(pattern)
        if not matches:
            result.append(prod_smi)
            continue

        # Pattern [C:1]([X])-[C:2]([Y]) → match indices: 0=C1, 2=C2
        c1_idx, c2_idx = matches[0][0], matches[0][2]

        Chem.AssignStereochemistry(
            prod_mol, cleanIt=True, force=True, flagPossibleStereoCenters=True
        )
        c1_atom = prod_mol.GetAtomWithIdx(c1_idx)
        c2_atom = prod_mol.GetAtomWithIdx(c2_idx)

        c1_possible = c1_atom.HasProp("_ChiralityPossible") or (
            c1_atom.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED
        )
        c2_possible = c2_atom.HasProp("_ChiralityPossible") or (
            c2_atom.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED
        )

        if not (c1_possible and c2_possible):
            result.append(prod_smi)
            continue

        cyclic = _centers_in_same_ring(prod_mol, c1_idx, c2_idx)
        if mode == "syn":
            # Syn: acyclic (R,R)/(S,S), cyclic (R,S)/(S,R)
            cip_pairs = [("R", "S"), ("S", "R")] if cyclic else [("R", "R"), ("S", "S")]
        else:
            # Anti: acyclic (R,S)/(S,R), cyclic (R,R)/(S,S)
            cip_pairs = [("R", "R"), ("S", "S")] if cyclic else [("R", "S"), ("S", "R")]

        stereo_products = set()
        for cip_pair in cip_pairs:
            rw = Chem.RWMol(prod_mol)
            ok1 = _set_stereocenter_cip(rw, c1_idx, cip_pair[0])
            ok2 = _set_stereocenter_cip(rw, c2_idx, cip_pair[1])
            if ok1 and ok2:
                smi = Chem.MolToSmiles(rw)
                stereo_products.add(smi)
                any_stereo = True

        if stereo_products:
            result.extend(stereo_products)
        else:
            result.append(prod_smi)

    return result, any_stereo


def apply_syn_addition_stereo(product_smiles_list):
    """
    For syn-addition reactions (e.g., KMnO4 hydroxylation), enforce
    that the two new stereocenters of a 1,2-diol have a *syn*
    relationship (both added from the same face).

    For **acyclic** substrates syn-addition gives the (R,R)/(S,S) pair.
    For **cyclic** substrates (both C atoms in the same ring) the
    same-face relationship corresponds to CIP (R,S)/(S,R) — the
    *cis* diastereomer — because the ring reverses the geometric
    ↔ CIP mapping.

    Returns
    -------
    tuple[list[str], str | None]
        (modified_products, stereo_note)
    """
    result, any_stereo = _apply_addition_stereo(
        product_smiles_list, pattern=_DIOL_PATTERN, mode="syn"
    )

    note = None
    if any_stereo:
        note = (
            "Syn-addition: both hydroxyl groups are added to the same face "
            "of the double bond via a cyclic intermediate, producing the "
            "syn (cis) diol diastereomer."
        )
    return result, note


_ANTI_DIHALO_PATTERN = Chem.MolFromSmarts("[C:1]([F,Cl,Br,I])-[C:2]([F,Cl,Br,I])")
_ANTI_HALOHYDRIN_PATTERN = Chem.MolFromSmarts("[C:1]([OH])-[C:2]([F,Cl,Br,I])")


def apply_anti_addition_stereo(product_smiles_list, pattern=None):
    """
    For anti-addition reactions (halogenation, halohydrin formation),
    enforce that the two new substituents are on opposite faces.

    For **acyclic** substrates anti-addition gives the (R,S)/(S,R) pair.
    For **cyclic** substrates (both C atoms in the same ring) the
    opposite-face relationship corresponds to CIP (R,R)/(S,S) — the
    *trans* diastereomer.

    Returns
    -------
    tuple[list[str], str | None]
        (modified_products, stereo_note)
    """
    if pattern is None:
        pattern = _ANTI_DIHALO_PATTERN

    result, any_stereo = _apply_addition_stereo(
        product_smiles_list, pattern=pattern, mode="anti"
    )

    note = None
    if any_stereo:
        note = (
            "Anti-addition: the two substituents are added to opposite faces "
            "of the double bond (via a cyclic halonium/bridged intermediate), "
            "producing the anti (trans) diastereomer."
        )
    return result, note


# ---------------------------------------------------------------------------
# Convenience: reaction-aware dispatcher
# ---------------------------------------------------------------------------

# Reaction IDs that receive specific stereochemical treatment
SYN_ADDITION_RULES = {"alkene_hydroxylation", "alkene_hydroboration"}
ANTI_ADDITION_RULES = {"alkene_halogenation", "alkene_halohydrin"}


def postprocess_stereo(reaction_id, products, substrate_smi=None, mechanism=None):
    """
    High-level dispatcher that applies the appropriate stereochemical
    post-processing based on the reaction identifier or mechanism type.

    Parameters
    ----------
    reaction_id : str
        The rule id (e.g. 'alkene_hydroxylation').
    products : list[str]
        Organic product SMILES.
    substrate_smi : str | None
        Substrate SMILES (needed for SN1/SN2).
    mechanism : str | None
        Mechanism name (e.g. 'SN2', 'SN1') when called from the sub/elim engine.

    Returns
    -------
    tuple[list[str], str | None]
        (processed_products, stereo_note)
    """
    if mechanism in ("SN2", "SN2_anionic", "SN2_neutral") and substrate_smi:
        return apply_sn2_inversion(substrate_smi, products)

    if mechanism == "SN1" and substrate_smi:
        return apply_sn1_racemization(substrate_smi, products)

    if reaction_id in SYN_ADDITION_RULES:
        return apply_syn_addition_stereo(products)

    if reaction_id in ANTI_ADDITION_RULES:
        pattern = (
            _ANTI_HALOHYDRIN_PATTERN
            if reaction_id == "alkene_halohydrin"
            else _ANTI_DIHALO_PATTERN
        )
        return apply_anti_addition_stereo(products, pattern=pattern)

    return products, None
