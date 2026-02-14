import logging

from rdkit import Chem

from engine.reaction_logic import run_reaction

logger = logging.getLogger(__name__)


# --- SMARTS PATTERNS ---

METHYL_PATTERN = Chem.MolFromSmarts("[CX4;H3][F,Cl,Br,I]")
PRIMARY_PATTERN = Chem.MolFromSmarts("[CX4;H2][F,Cl,Br,I]")
SECONDARY_PATTERN = Chem.MolFromSmarts("[CX4;H1]([C,c,N,O,S])[F,Cl,Br,I]")
TERTIARY_PATTERN = Chem.MolFromSmarts("[CX4;H0]([C,c,N,O,S])([C,c,N,O,S])[F,Cl,Br,I]")

ALCOHOL_METHYL_PATTERN = Chem.MolFromSmarts("[CX4;H3][OH]")
ALCOHOL_PRIMARY_PATTERN = Chem.MolFromSmarts("[CX4;H2][OH]")
ALCOHOL_SECONDARY_PATTERN = Chem.MolFromSmarts("[CX4;H1]([C,c,N,O,S])[OH]")
ALCOHOL_TERTIARY_PATTERN = Chem.MolFromSmarts("[CX4;H0]([C,c,N,O,S])([C,c,N,O,S])[OH]")


def check_and_run_intramolecular(mol, base_present=False):
    """
    Checks for intramolecular substitution (cyclization) forming 5 or 6 membered rings.
    Returns result dict if reaction occurs, else None.
    """
    logger.debug(
        f"=== check_and_run_intramolecular START === mol={Chem.MolToSmiles(mol)}"
    )
    # Define Nucleophiles
    nuc_specs = [
        (
            Chem.MolFromSmarts("[NX3;H2,H1,H0;+0;!$(NC=O)]"),
            "amine",
        ),  # Amines (Neutral, not amide)
        (Chem.MolFromSmarts("[OX1;-1]"), "alkoxide"),  # Alkoxides
        (Chem.MolFromSmarts("[SX1;-1]"), "thiolate"),  # Thiolates
        (Chem.MolFromSmarts("[SX2;H1;+0]"), "thiol"),  # Thiols
    ]

    # Leaving Group Carbon Pattern: [C][X]
    lg_pattern = Chem.MolFromSmarts("[C][F,Cl,Br,I]")

    lg_matches = mol.GetSubstructMatches(lg_pattern)
    if not lg_matches:
        logger.debug("  No leaving group matches found, returning None")
        return None

    # Search for valid intramolecular path
    best_candidate = None

    for pat, ntype in nuc_specs:
        if not pat:
            continue
        nuc_matches = mol.GetSubstructMatches(pat)
        for nuc_match in nuc_matches:
            nuc_idx = nuc_match[0]

            for c_alpha_idx, lg_idx in lg_matches:
                if nuc_idx == c_alpha_idx or nuc_idx == lg_idx:
                    continue

                try:
                    # Check path length for ring size
                    # Path includes start and end atoms.
                    # N...C_alpha path length L -> Ring Size L
                    path = Chem.rdmolops.GetShortestPath(mol, nuc_idx, c_alpha_idx)
                    ring_size = len(path)

                    # Rules:
                    # 3: Good (Epoxide/Aziridine) - usually needs specific geom but we assume yes for now
                    # 5, 6: Favored
                    # > 6: Possible but slower (unless high dilution)
                    if ring_size == 3 or ring_size >= 5:
                        # Found a candidate.
                        # Prioritize 5/6 > 3 > Large (>6)
                        current_priority = 0
                        if ring_size in [5, 6]:
                            current_priority = 3
                        elif ring_size == 3:
                            current_priority = 2
                        elif ring_size > 6:
                            current_priority = 1

                        # Compare with best_candidate if any
                        if best_candidate:
                            # best_candidate format: (..., ring_size, ntype, priority)
                            # We need to store priority in best_candidate to compare
                            prev_priority = best_candidate[5]
                            if current_priority > prev_priority:
                                best_candidate = (
                                    nuc_idx,
                                    c_alpha_idx,
                                    lg_idx,
                                    ring_size,
                                    ntype,
                                    current_priority,
                                )
                        else:
                            best_candidate = (
                                nuc_idx,
                                c_alpha_idx,
                                lg_idx,
                                ring_size,
                                ntype,
                                current_priority,
                            )

                except Exception:
                    continue

    if not best_candidate:
        logger.debug("  No suitable intramolecular candidate found")
        return None
    logger.debug(
        f"  Best candidate: nuc={best_candidate[0]}, c_alpha={best_candidate[1]}, lg={best_candidate[2]}, ring_size={best_candidate[3]}, ntype={best_candidate[4]}"
    )

    # Execute Reaction
    nuc_idx, c_alpha_idx, lg_idx, ring_size, ntype, _ = best_candidate
    rwmol = Chem.RWMol(mol)

    # 1. Form Bond
    rwmol.AddBond(nuc_idx, c_alpha_idx, Chem.BondType.SINGLE)

    # 2. Break LG Bond
    rwmol.RemoveBond(c_alpha_idx, lg_idx)

    # 3. Update Charges
    atom_nuc = rwmol.GetAtomWithIdx(nuc_idx)

    # If using 'alcohol' nucleophile and base is present, we remove the proton implicitly (net charge +1 if we didn't remove H, but +1 on O is fine for protonated ether)
    # But for final product to be neutral (THF), we need charge 0 if we remove H.
    should_deprotonate = base_present and ntype in ["alcohol", "thiol"]

    if not should_deprotonate:
        atom_nuc.SetFormalCharge(atom_nuc.GetFormalCharge() + 1)
    else:
        # Don't change charge (neutral -> neutral linkage if H is lost)
        # However, RDKit might complain about valence if we don't fix H count?
        # atom_nuc.SetNumExplicitHs(0) # Force remove H? Or assume implicit valency
        pass

    atom_lg = rwmol.GetAtomWithIdx(lg_idx)
    atom_lg.SetFormalCharge(atom_lg.GetFormalCharge() - 1)

    # 4. Process Products
    products_smi = Chem.MolToSmiles(rwmol)
    fragments = products_smi.split(".")
    logger.debug(f"  Intramolecular product fragments: {fragments}")

    # Assume the largest fragment is the ring product
    organic_product = max(fragments, key=len)
    inorganic_products = [f for f in fragments if f != organic_product]

    # Create fake steps: Step 1 (Original) -> Step 2 (Product)

    step_0 = {
        "step_id": "intra_step_0",
        "step_index": 0,
        "step_type": "initial",
        "name": "Start",
        "input_smiles": [],
        "products": [Chem.MolToSmiles(mol)],
        "description": "Starting Molecule",
        "parent_id": None,
        "smarts_used": "",
    }

    step_1 = {
        "step_id": "intra_step_1",
        "step_index": 1,
        "step_type": "reaction",
        "group_id": "group_intramolecular",
        "name": "Intramolecular SN2",
        "input_smiles": [Chem.MolToSmiles(mol)],
        "products": [organic_product],  # Must be a list
        "description": f"Intramolecular nucleophilic attack forming a {ring_size}-membered ring ({ntype} attack).",
        "parent_id": "intra_step_0",
        "smarts_used": "",
        "is_major": True,
    }

    result = {
        "mechanisms": ["Intramolecular_SN2"],
        "explanation": f"Intramolecular reaction favored due to formation of a {ring_size}-membered ring.",
        "products": [organic_product],
        "inorganic": inorganic_products,
        "steps": [step_0, step_1],
    }
    logger.debug(f"=== check_and_run_intramolecular END === product={organic_product}")
    return result


REAGENTS = "[N,S,P,O;-1,O;H1,H2,C;-1,F-1,Cl-1,Br-1,I-1]"
# Dictionary for Reagent Classification
# Simplify for now to common agents found in curriculum
REAGENT_PROPERTIES = {
    # Strong Base / Strong Nucleophile
    "O": {"base": "weak", "nuc": "weak", "bulky": False},  # H2O
    "[OH-]": {"base": "strong", "nuc": "strong", "bulky": False},
    "[O-]C": {"base": "strong", "nuc": "strong", "bulky": False},  # Methoxide
    "[O-]CC": {"base": "strong", "nuc": "strong", "bulky": False},  # Ethoxide
    "[NaH]": {"base": "strong", "nuc": "strong", "bulky": False},  # Sodium Hydride
    "CC(C)(C)[O-]": {
        "base": "strong",
        "nuc": "strong",
        "bulky": True,
    },  # t-BuO- (Bulky)
    # Weak Base / Strong Nucleophile
    "[I-]": {"base": "weak", "nuc": "strong", "bulky": False},
    "[Br-]": {"base": "weak", "nuc": "strong", "bulky": False},
    "[Cl-]": {"base": "weak", "nuc": "strong", "bulky": False},
    "[C-]#[N]": {"base": "weak", "nuc": "strong", "bulky": False},  # Cyanide
    "[S-H]": {"base": "weak", "nuc": "strong", "bulky": False},  # Thiolate
    # Strong Base (Specifics usually overlap with Strong Nuc unless bulky)
    # Solvents / Weak Nuc
    "CO": {"base": "weak", "nuc": "weak", "bulky": False},  # Methanol
    "CCO": {"base": "weak", "nuc": "weak", "bulky": False},  # Ethanol
    # Acidic Halides (HX)
    "Br": {"base": "acidic", "nuc": "strong", "bulky": False, "is_acid": True},  # HBr
    "Cl": {"base": "acidic", "nuc": "strong", "bulky": False, "is_acid": True},  # HCl
    "I": {"base": "acidic", "nuc": "strong", "bulky": False, "is_acid": True},  # HI
    # Non-Nucleophilic Acids (Dehydration)
    "OS(=O)(=O)O": {
        "base": "acidic",
        "nuc": "weak",
        "bulky": False,
        "is_acid": True,
        "acid_type": "h2so4",
    },  # H2SO4 (Alternative)
    "O=S(=O)(O)O": {
        "base": "acidic",
        "nuc": "weak",
        "bulky": False,
        "is_acid": True,
        "acid_type": "h2so4",
    },  # H2SO4 (Canonical)
    "OP(=O)(O)O": {
        "base": "acidic",
        "nuc": "weak",
        "bulky": False,
        "is_acid": True,
        "acid_type": "h3po4",
    },  # H3PO4 (Alternative)
    "O=P(O)(O)O": {
        "base": "acidic",
        "nuc": "weak",
        "bulky": False,
        "is_acid": True,
        "acid_type": "h3po4",
    },  # H3PO4 (Canonical)
}

# --- TRANSFORMATION SMARTS ---
TRANSFORMS = {
    "SN2_anionic": "[C:1][F,Cl,Br,I,O:2].[O,N,S,C;-1:3]>>[C:1][O,N,S,C;+0:3].[F,Cl,Br,I,O;-1:2]",  # Explicitly set product charge
    "SN2_neutral": "[C:1][F,Cl,Br,I,O:2].[O,N,S,P;+0:3]>>[C:1][O,N,S,P;+1:3].[F,Cl,Br,I,O;-1:2]",  # Explicitly set product charge
    "SN1": [
        "[C:1][F,Cl,Br,I,O:2]>>[C+:1].[F-,Cl-,Br-,I-,O-:2]",  # Step 1: Loss of LG
        "[C+:1].[O,N,S:3]>>[C+0:1][O,N,S;+1:3]",  # Step 2: Nucleophilic Attack (Generic for O/N/S nuc) - explicit charge fix
        "[C:1][O,N,S;+1:3]>>[C:1][O,N,S;+0:3]",  # Step 3: Deprotonation / Neutralization
        "[F,Cl,Br,I,O;-1:2]>>[F,Cl,Br,I,O;+0:2]",  # Step 4: Deprotonation / Neutralization
    ],
    "E2": "[C:1]-[C:2][F,Cl,Br,I,O:3].[O,N,S,C;-1:4]>>[C:1]=[C:2].[F-,Cl-,Br-,I-,O-:3].[O,N,S,C;+0:4][H]",
    "E1": [
        "[C:1][F,Cl,Br,I,O:2]>>[C+:1].[F-,Cl-,Br-,I-,O-:2]",  # Step 1: Loss of LG
        "[C+:1]-[C:2].[O,N,S,P;+0:3]>>[C+0:1]=[C:2].[O,N,S,P;+1:3]",  # Step 2: Deprotonation (Base optional in simplified view)
    ],
    # Alcohol specific (Protonated pathways if needed explicitly, but generalized above handles basic OH leaving)
    "Alcohol SN1": [
        "[C:1][OH:2].[F,Cl,Br,I,O,S,P:3]>>[C:1][OH2+:2].[F-,Cl-,Br-,I-,O-,S-,P-:3]",
        "[C:1][OH2+:2]>>[C+:1].[O+0H2:2]",
        "[C+:1].[F-,Cl-,Br-,I-,O-,S-,P-:3]>>[C+0:1][F,Cl,Br,I,O,S,P;+0:3]",
    ],
    "Alcohol SN2": [
        "[C:1][OH:2].[F,Cl,Br,I,O,S,P:3]>>[C:1][OH2+:2].[F-,Cl-,Br-,I-,O-,S-,P-:3]",
        "[C:1][OH2+:2].[F-,Cl-,Br-,I-,O-,S-,P-:3]>>[C:1][F,Cl,Br,I,O,S,P;+0:3].[O+0:2]",
    ],
    "Alcohol Acid E1": [
        "[C:1][O].[S](=O)(=O)([OH])[OH]>>[C:1][O+H2].[S](=O)(=O)([OH])[O-]",
        "[C:1][O+H2].[S](=O)(=O)([OH])[O-]>>[C+:1].[O+0:3]",
        "[C+:1]-[C:2]>>[C+0:1]=[C:2]",
    ],
    "Alcohol Acid E2": [
        "[C:1][O].[S](=O)(=O)([OH])[OH]>>[C:1][O+H2].[S](=O)(=O)([OH])[O-]",
        "[C:1]-[C:2][O+H2:3].[O:4].[S](=O)(=O)([OH])[O-]>>[C:1]=[C:2].[O+0:3].[O+:4].[S](=O)(=O)([OH])[O-]",
    ],
}


def classify_substrate(mol):
    smi = Chem.MolToSmiles(mol)
    # Check for Alkyl Halides
    if mol.HasSubstructMatch(TERTIARY_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> tertiary")
        return "tertiary"
    if mol.HasSubstructMatch(SECONDARY_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> secondary")
        return "secondary"
    if mol.HasSubstructMatch(PRIMARY_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> primary")
        return "primary"
    if mol.HasSubstructMatch(METHYL_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> methyl")
        return "methyl"

    # Check for Alcohols - map to same types
    if mol.HasSubstructMatch(ALCOHOL_TERTIARY_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> tertiary_alcohol")
        return "tertiary_alcohol"
    if mol.HasSubstructMatch(ALCOHOL_SECONDARY_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> secondary_alcohol")
        return "secondary_alcohol"
    if mol.HasSubstructMatch(ALCOHOL_PRIMARY_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> primary_alcohol")
        return "primary_alcohol"
    if mol.HasSubstructMatch(ALCOHOL_METHYL_PATTERN):
        logger.debug(f"  classify_substrate({smi}) -> methyl_alcohol")
        return "methyl_alcohol"

    logger.debug(f"  classify_substrate({smi}) -> unknown")
    return "unknown"


def classify_reagent(mol_smiles):
    logger.debug(f"  classify_reagent({mol_smiles}) START")
    # Normalize SMILES using RDKit to match formatting in REAGENT_PROPERTIES
    mol = Chem.MolFromSmiles(mol_smiles)
    if not mol:
        logger.debug("  classify_reagent: invalid SMILES, returning weak defaults")
        return {"base": "weak", "nuc": "weak", "bulky": False}

    # Try canonical match (remove explicit H before canonicalizing to match keys generally)
    # The REAGENT_PROPERTIES keys seem to be mostly heavy atoms (except some specific ones)
    # Let's try direct canonicalization first.
    try:
        base_smi = Chem.MolToSmiles(mol, canonical=True, isomericSmiles=False)
    except Exception:
        base_smi = mol_smiles  # Fallback

    props = REAGENT_PROPERTIES.get(base_smi)
    logger.debug(
        f"  classify_reagent: canonical='{base_smi}', direct match={'found' if props else 'miss'}"
    )

    # If not found, try stripping H explicitly if the key might lack them
    if not props:
        try:
            mol_no_h = Chem.RemoveHs(mol)
            base_smi_no_h = Chem.MolToSmiles(
                mol_no_h, canonical=True, isomericSmiles=False
            )
            props = REAGENT_PROPERTIES.get(base_smi_no_h)
        except Exception:
            pass

    if not props:
        # Fallback heuristics
        # TODO: implement more sophisticated reagent classification
        _metals = {"Cr", "Mn", "Fe", "Cu", "Os", "Ru", "Pd", "Pt", "Zn"}
        has_metal = any(a.GetSymbol() in _metals for a in mol.GetAtoms())
        is_aromatic = any(a.GetIsAromatic() for a in mol.GetAtoms())
        if has_metal or is_aromatic:
            # Transition-metal reagents (PCC, KMnO4 …) and aromatic
            # species (pyridinium …) should NOT be treated as strong
            # bases / nucleophiles for SN/E purposes.
            return {"base": "weak", "nuc": "weak", "bulky": False}
        if "-" in base_smi:
            return {
                "base": "strong",
                "nuc": "strong",
                "bulky": False,
            }  # Assume anion is strong
        if "N" in base_smi or "P" in base_smi or "S" in base_smi:
            return {
                "base": "weak",
                "nuc": "strong",
                "bulky": False,
            }  # Neutral amine/phosphine/sulfur
        return {"base": "weak", "nuc": "weak", "bulky": False}
    logger.debug(f"  classify_reagent({mol_smiles}) -> {props}")
    return props


def _detect_substrate_hindrance(mol):
    """
    Detect if the substrate has beta-branching (steric hindrance).
    A substrate is considered "hindered" if any beta-carbon
    (carbon adjacent to the alpha-carbon bearing the leaving group)
    has 2+ carbon neighbours besides the alpha.
    """
    # Look for alpha carbon bearing a leaving group
    lg_pattern = Chem.MolFromSmarts("[CX4:1][F,Cl,Br,I,OH:2]")
    matches = mol.GetSubstructMatches(lg_pattern)
    if not matches:
        return False

    for alpha_idx, _ in matches:
        alpha = mol.GetAtomWithIdx(alpha_idx)
        for neighbor in alpha.GetNeighbors():
            # Only check carbon beta-neighbors
            if neighbor.GetSymbol() != "C":
                continue
            beta = neighbor
            # Count how many C neighbors beta has, excluding alpha
            c_neighbors = sum(
                1
                for n in beta.GetNeighbors()
                if n.GetSymbol() == "C" and n.GetIdx() != alpha_idx
            )
            if c_neighbors >= 2:
                logger.debug(
                    f"  _detect_substrate_hindrance: hindered "
                    f"(beta atom {beta.GetIdx()} has {c_neighbors} C-neighbors)"
                )
                return True
    return False


def predict_mechanism(substrate_type, reagent_props, conditions, substrate_mol=None):
    """
    Returns (mechanisms, explanation) where mechanisms is a list of
    (mechanism_name, selectivity) tuples.
    selectivity is one of: 'only', 'major', 'minor', 'mixture'
    """
    logger.debug("=== predict_mechanism START ===")
    logger.debug(
        f"  substrate_type={substrate_type}, reagent_props={reagent_props}, conditions={conditions}"
    )
    mechanisms = []
    explanation = []

    reagent_type = "unknown"
    if reagent_props.get("is_acid"):
        reagent_type = "acidic_halide"
    elif reagent_props["base"] == "strong":
        if reagent_props["bulky"]:
            reagent_type = "bulky_base"
        else:
            reagent_type = "strong_base"
    elif reagent_props["nuc"] == "strong":
        reagent_type = "weak_base_strong_nuc"
    else:
        reagent_type = "weak_weak"

    temp = "heat" if "heat" in conditions else "cold"

    is_alcohol = "alcohol" in substrate_type
    # Strip suffix to treat halides and alcohols uniformly for base logic
    base_substrate_type = substrate_type.split("_")[0]

    explanation.append(
        f"Substrate: {base_substrate_type} ({'Alcohol' if is_alcohol else 'Halide'})"
    )
    explanation.append(f"Reagent Type: {reagent_type}")

    # Specific logic for Acidic Halides (Original Alcohol Activation / HX reaction)
    # This path is preferred if explicit HX is used
    if is_alcohol and reagent_type == "acidic_halide":
        # Check if it's actually a non-nucleophilic acid (Dehydration)
        # Identify if we have a strong nucleophile (Halide) or weak (Sulfate/Phosphate)
        if reagent_props.get("acid_type") != "h2so4":
            # 1. SUBSTITUTION (SN1/SN2) - Only for HX or non-H2SO4 acids
            if base_substrate_type == "tertiary":
                mechanisms.append(("Alcohol SN1", "only"))
                explanation.append("Tertiary Alcohol + Acid -> SN1.")
            elif base_substrate_type == "secondary":
                if temp == "heat":
                    mechanisms.append(("Alcohol SN1", "major"))
                    mechanisms.append(("Alcohol SN2", "minor"))
                    explanation.append(
                        "Secondary Alcohol + Acid -> SN1. Heat enables SN2."
                    )
                else:
                    mechanisms.append(("Alcohol SN1", "only"))
                    explanation.append("Secondary Alcohol + Acid -> SN1 favored.")
            elif base_substrate_type in ["primary", "methyl"]:
                if temp == "heat":
                    mechanisms.append(("Alcohol SN2", "only"))
                    explanation.append("Primary + Acid + Heat -> SN2.")
                else:
                    explanation.append("Primary + Acid requires Heat for SN2.")
        else:
            explanation.append(
                "(Substitution suppressed: H2SO4 favors Elimination/Dehydration)."
            )

        # 2. ELIMINATION (Dehydration) - Requires Heat
        # Special check: User SMARTS for "Alcohol Acid E1/E2" are specific to H2SO4 (require Sulfate match)
        is_h2so4 = reagent_props.get("acid_type") == "h2so4"

        if temp == "heat":
            if is_h2so4:
                if base_substrate_type == "primary":
                    mechanisms.append(("Alcohol Acid E2", "only"))
                    explanation.append(
                        "Primary Alcohol + H2SO4 + Heat -> E2 (Dehydration)."
                    )
                else:
                    mechanisms.append(("Alcohol Acid E1", "only"))
                    explanation.append(
                        f"{base_substrate_type.capitalize()} Alcohol + H2SO4 + Heat -> E1 (Dehydration)."
                    )
            else:
                explanation.append(
                    "(Dehydration skipped: Specific SMARTS for H2SO4 only)."
                )
        else:
            explanation.append("(Dehydration requires Heat).")

        return mechanisms, " ".join(explanation)

    # ==================================================================================
    # General Halide Logic (SN1/SN2/E1/E2)
    # ** IMPORTANT: This logic mirrors the frontend ReactionPredictor component **
    # ** (frontend/src/components/ReactionPredictor.tsx)                        **
    # ** When changing selectivity rules here, update the frontend too!         **
    # ==================================================================================

    possible_mechanisms = []

    # Detect if the substrate is sterically hindered (beta-branching)
    is_hindered = _detect_substrate_hindrance(substrate_mol) if substrate_mol else False
    if is_hindered:
        logger.debug("  Substrate is sterically hindered (beta-branching detected)")

    # 1. Methyl
    if base_substrate_type == "methyl":
        if reagent_props["nuc"] == "strong" or reagent_props["base"] == "strong":
            possible_mechanisms.append(("SN2", "only"))
            explanation.append("Methyl -> SN2. No elimination possible (no β-H).")
        else:
            explanation.append("Methyl + Weak Reagent -> No Reaction.")

    # 2. Primary
    elif base_substrate_type == "primary":
        if reagent_props["base"] == "strong" or reagent_props["nuc"] == "strong":
            if reagent_props.get("bulky"):
                possible_mechanisms.append(("E2", "only"))
                explanation.append("Primary + Bulky Base -> E2.")
            elif reagent_props["base"] == "strong":
                # Strong small base: hindrance and temp affect selectivity
                if is_hindered:
                    possible_mechanisms.append(("E2", "major"))
                    possible_mechanisms.append(("SN2", "minor"))
                    explanation.append(
                        "Primary + Strong Base -> E2 Major, SN2 Minor (substrate hindered)."
                    )
                elif temp == "heat":
                    possible_mechanisms.append(("E2", "major"))
                    possible_mechanisms.append(("SN2", "minor"))
                    explanation.append(
                        "Primary + Strong Base + Heat -> E2 Major, SN2 Minor."
                    )
                else:
                    possible_mechanisms.append(("SN2", "major"))
                    possible_mechanisms.append(("E2", "minor"))
                    explanation.append("Primary + Strong Base -> SN2 Major, E2 Minor.")
            else:
                # Weak base + strong nuc -> SN2 only
                possible_mechanisms.append(("SN2", "only"))
                explanation.append("Primary + Strong Nuc (Weak Base) -> SN2.")
        else:
            explanation.append("Primary + Weak Reagent -> No Reaction.")

    # 3. Secondary
    elif base_substrate_type == "secondary":
        if reagent_props["base"] == "strong" or reagent_props["nuc"] == "strong":
            if reagent_props.get("bulky"):
                possible_mechanisms.append(("E2", "only"))
                explanation.append("Secondary + Bulky Base -> E2.")
            elif reagent_props["base"] == "strong":
                # Strong small base: hindrance and temp affect selectivity
                if is_hindered:
                    possible_mechanisms.append(("E2", "major"))
                    possible_mechanisms.append(("SN2", "minor"))
                    explanation.append(
                        "Secondary + Strong Base -> E2 Major, SN2 Minor (substrate hindered)."
                    )
                elif temp == "heat":
                    possible_mechanisms.append(("E2", "major"))
                    possible_mechanisms.append(("SN2", "minor"))
                    explanation.append(
                        "Secondary + Strong Base + Heat -> E2 Major, SN2 Minor."
                    )
                else:
                    possible_mechanisms.append(("SN2", "major"))
                    possible_mechanisms.append(("E2", "minor"))
                    explanation.append(
                        "Secondary + Strong Base + Low Temp -> SN2 Major, E2 Minor."
                    )
            else:
                # Weak base + strong nuc -> SN2 only
                possible_mechanisms.append(("SN2", "only"))
                explanation.append("Secondary + Strong Nuc (Weak Base) -> SN2.")
        else:
            # Weak/Weak -> SN1/E1
            if temp == "heat":
                possible_mechanisms.append(("E1", "major"))
                possible_mechanisms.append(("SN1", "minor"))
                explanation.append(
                    "Secondary + Weak Reagent + Heat -> E1 Major, SN1 Minor."
                )
            else:
                possible_mechanisms.append(("SN1", "major"))
                possible_mechanisms.append(("E1", "minor"))
                explanation.append("Secondary + Weak Reagent -> SN1 Major, E1 Minor.")

    # 4. Tertiary
    elif base_substrate_type == "tertiary":
        if reagent_props["base"] == "strong":
            possible_mechanisms.append(("E2", "only"))
            explanation.append(
                "Tertiary + Strong Base -> E2. SN2 impossible (sterics)."
            )
        else:
            if temp == "heat":
                possible_mechanisms.append(("E1", "major"))
                possible_mechanisms.append(("SN1", "minor"))
                explanation.append(
                    "Tertiary + Weak Reagent + Heat -> E1 Major, SN1 Minor."
                )
            else:
                possible_mechanisms.append(("SN1", "major"))
                possible_mechanisms.append(("E1", "minor"))
                explanation.append("Tertiary + Weak Reagent -> SN1 Major, E1 Minor.")

    # Apply Alcohol Constraints (User Rules)
    if is_alcohol:
        # User Rule: Non-tertiary (Secondary, Primary, Methyl) SN2 requires Heat
        sn2_entries = [m for m in possible_mechanisms if m[0] == "SN2"]
        if sn2_entries:
            if base_substrate_type != "tertiary":
                if temp != "heat":
                    # Remove SN2 if no heat
                    possible_mechanisms = [
                        m for m in possible_mechanisms if m[0] != "SN2"
                    ]
                    explanation.append("(Alcohol SN2 prevented: Requires Heat).")
                    # If only one mechanism remains, upgrade to 'only'
                    if len(possible_mechanisms) == 1:
                        name, _ = possible_mechanisms[0]
                        possible_mechanisms[0] = (name, "only")

    mechanisms.extend(possible_mechanisms)

    logger.debug(f"=== predict_mechanism END === mechanisms={mechanisms}")
    return mechanisms, " ".join(explanation)


def run_substitution_elimination(reactants, conditions):
    logger.debug("=== run_substitution_elimination START ===")
    logger.debug(f"  Reactants: {reactants}, Conditions: {conditions}")
    # 1. Identify Roles (Assumption: First is substrate if Halide/Alcohol, Second is Reagent)
    # Better: Scan reactants for Halide/Alcohol pattern
    substrate = None
    reagent = None

    for smi in reactants:
        mol = Chem.MolFromSmiles(smi)
        if not mol:
            continue
        # Check for Halide or Alcohol
        if mol.HasSubstructMatch(
            Chem.MolFromSmarts("[C][F,Cl,Br,I]")
        ) or mol.HasSubstructMatch(Chem.MolFromSmarts("[C][OH]")):
            if not substrate:  # Prefer first match as substrate if ambiguous
                substrate = (smi, mol)
            else:
                # If we already have a substrate, maybe this is the reagent?
                # E.g. Alcohol + Alcohol? Unlikely here.
                if not reagent:
                    reagent = (smi, mol)
        else:
            reagent = (smi, mol)

    logger.debug(f"  Substrate: {substrate[0] if substrate else None}")
    logger.debug(f"  Reagent: {reagent[0] if reagent else None}")

    # CHECK FOR INTRAMOLECULAR REACTION (Single Reactant OR Base Promoted)
    base_present = False
    if reagent:
        # Check if reagent is a base to allow intramolecular reaction
        # We classify temporarily here to check property
        # (It will be classified again later, which is fine)
        r_props = classify_reagent(reagent[0])
        if r_props.get("base") in ["strong", "weak"]:
            base_present = True

    if substrate and ((len(reactants) == 1 and not reagent) or base_present):
        logger.debug(f"  Checking intramolecular... (base_present={base_present})")
        # Check if substrate can be its own reagent
        intra_res = check_and_run_intramolecular(
            substrate[1], base_present=base_present
        )
    else:
        intra_res = None

    # 2. INTERMOLECULAR CHECK (Always check if possible)
    inter_res = {
        "organic": [],
        "inorganic": [],
        "mechanisms": [],
        "steps": [],
        "per_mechanism": [],
        "explanation": [],
    }

    # Prepare Intermolecular Reactants
    inter_reactants = list(reactants)
    inter_reagent_props = None
    inter_substrate_type = None

    run_inter = False

    if substrate:  # Must have substrate
        if reagent:
            run_inter = True
            inter_reagent_props = classify_reagent(reagent[0])
            inter_substrate_type = classify_substrate(substrate[1])
        elif len(reactants) == 1:
            # Self-Reaction (Intermolecular)
            # Use substrate as reagent
            logger.debug("  Checking Intermolecular Self-Reaction...")
            inter_reactants = [reactants[0], reactants[0]]
            inter_reagent_props = classify_reagent(
                reactants[0]
            )  # Classify itself as reagent
            inter_substrate_type = classify_substrate(substrate[1])
            run_inter = True

    if run_inter:
        logger.debug(
            f"  Running Intermolecular Logic: Substrate={inter_substrate_type}, Reagent={inter_reagent_props}"
        )

        mechanisms, explanation = predict_mechanism(
            inter_substrate_type,
            inter_reagent_props,
            conditions,
            substrate_mol=substrate[1],
        )
        inter_res["explanation"].append(explanation)

        # Execute Mechanisms
        for mech_name, mech_selectivity in mechanisms:
            logger.debug(f"    Executing Inter Mech: {mech_name}")

            # Key Mapping
            current_mech_key = mech_name
            if mech_name == "SN2":
                # Check actual reagent for charge
                # If explicit reagent exists, use it.
                # If self-reaction (reagent is None), use the second reactant in inter_reactants.
                if reagent:
                    reagent_smi_check = reagent[0]
                else:
                    reagent_smi_check = inter_reactants[1]

                if "-" in reagent_smi_check:
                    current_mech_key = "SN2_anionic"
                else:
                    current_mech_key = "SN2_neutral"

            smarts = TRANSFORMS.get(current_mech_key)
            if not smarts:
                continue

            # Auto Add
            auto_add = None
            if mech_name == "SN1":
                auto_add = ["", "", "O"]
            elif mech_name == "Alcohol Acid E2":
                auto_add = ["", "O"]

            outcome = run_reaction(
                inter_reactants,
                smarts,
                debug=True,
                auto_add=auto_add,
                reaction_name=mech_name,
            )

            # Collect
            inter_res["organic"].extend(outcome.get("final_organic", []))
            inter_res["inorganic"].extend(outcome.get("final_inorganic", []))

            # Steps prefix
            outcome_steps = outcome.get("steps", [])
            for step in outcome_steps:
                if isinstance(step, dict):
                    step["step_id"] = f"inter_{mech_name}_{step['step_id']}"
                    if step.get("parent_id"):
                        step["parent_id"] = f"inter_{mech_name}_{step['parent_id']}"
                    if step.get("parent_ids"):
                        step["parent_ids"] = [
                            f"inter_{mech_name}_{pid}" for pid in step["parent_ids"]
                        ]
            inter_res["steps"].extend(outcome_steps)

            inter_res["mechanisms"].append(mech_name)
            inter_res["per_mechanism"].append(
                {
                    "mechanism": mech_name,
                    "selectivity": mech_selectivity,
                    "organic": outcome.get("final_organic", []),
                    "inorganic": outcome.get("final_inorganic", []),
                }
            )

    # 3. MERGE AND DECIDE SELECTIVITY
    final_result = {
        "products": [],
        "inorganic": [],
        "mechanisms": [],
        "steps": [],
        "per_mechanism": [],
        "explanation": "",
    }

    # Case 1: Intra Only
    if intra_res and not inter_res["organic"]:
        return intra_res

    # Case 2: Inter Only
    if not intra_res and inter_res["organic"]:
        final_result["products"] = list(set(inter_res["organic"]))
        final_result["inorganic"] = list(set(inter_res["inorganic"]))
        final_result["mechanisms"] = inter_res["mechanisms"]
        final_result["steps"] = inter_res["steps"]
        final_result["per_mechanism"] = inter_res["per_mechanism"]
        final_result["explanation"] = " ".join(inter_res["explanation"])
        return final_result

    # Case 3: Both
    if intra_res and inter_res["organic"]:
        # Logic:
        # High Conc -> Inter Major
        # Low Conc -> Intra Major (if 3, 5, 6 rings)

        high_conc = "high_concentration" in conditions

        # Determine Intra Rank (stored in explanation or guess from steps?)
        # We need ring size from intra_res.
        # Hack: Parse it from explanation string? "forming a X-membered ring"
        ring_size = 0
        if "5-membered" in intra_res["explanation"]:
            ring_size = 5
        elif "6-membered" in intra_res["explanation"]:
            ring_size = 6
        elif "3-membered" in intra_res["explanation"]:
            ring_size = 3
        else:
            ring_size = 99  # Large/Unknown

        intra_is_major = False

        if high_conc:
            intra_is_major = False  # High conc favors Inter
        else:
            if ring_size in [3, 5, 6]:
                intra_is_major = True
            else:
                intra_is_major = False  # Large rings are harder than inter usually

        # Update Selectivity Labels based on decision

        # Process Intra
        intra_label = "major" if intra_is_major else "minor"
        intra_res["per_mechanism"] = [
            {
                "mechanism": intra_res["mechanisms"][0],
                "selectivity": intra_label,
                "organic": intra_res["products"],
                "inorganic": intra_res["inorganic"],
            }
        ]
        # Update intra step is_major?

        # Process Inter
        inter_label = "minor" if intra_is_major else "major"
        for pm in inter_res["per_mechanism"]:
            if pm["selectivity"] == "major":  # Only downgrade major inters
                pm["selectivity"] = inter_label

        # Combine
        final_result["per_mechanism"] = (
            intra_res["per_mechanism"] + inter_res["per_mechanism"]
        )
        final_result["products"] = list(
            set(intra_res["products"] + inter_res["organic"])
        )
        final_result["inorganic"] = list(
            set(intra_res["inorganic"] + inter_res["inorganic"])
        )
        final_result["mechanisms"] = intra_res["mechanisms"] + inter_res["mechanisms"]
        final_result["steps"] = intra_res["steps"] + inter_res["steps"]

        expl_parts = []
        if intra_is_major:
            expl_parts.append(
                intra_res["explanation"] + " (Favored due to entropy/low conc)."
            )
            expl_parts.append("Intermolecular is minor.")
        else:
            expl_parts.append(
                "Intermolecular reaction favored (High Concentration / Large Ring)."
            )
            expl_parts.append(intra_res["explanation"].replace("favored", "possible"))

        final_result["explanation"] = " ".join(expl_parts)

        return final_result

    return {"error": "No reaction predicted.", "products": []}
