from rdkit import Chem
from reaction_logic import run_reaction


# --- SMARTS PATTERNS ---

METHYL_PATTERN = Chem.MolFromSmarts("[CX4;H3][F,Cl,Br,I]")
PRIMARY_PATTERN = Chem.MolFromSmarts("[CX4;H2][F,Cl,Br,I]")
SECONDARY_PATTERN = Chem.MolFromSmarts("[CX4;H1]([C,c,N,O,S])[F,Cl,Br,I]")
TERTIARY_PATTERN = Chem.MolFromSmarts("[CX4;H0]([C,c,N,O,S])([C,c,N,O,S])[F,Cl,Br,I]")

ALCOHOL_METHYL_PATTERN = Chem.MolFromSmarts("[CX4;H3][OH]")
ALCOHOL_PRIMARY_PATTERN = Chem.MolFromSmarts("[CX4;H2][OH]")
ALCOHOL_SECONDARY_PATTERN = Chem.MolFromSmarts("[CX4;H1]([C,c,N,O,S])[OH]")
ALCOHOL_TERTIARY_PATTERN = Chem.MolFromSmarts("[CX4;H0]([C,c,N,O,S])([C,c,N,O,S])[OH]")


def check_and_run_intramolecular(mol):
    """
    Checks for intramolecular substitution (cyclization) forming 5 or 6 membered rings.
    Returns result dict if reaction occurs, else None.
    """
    # Define Nucleophiles
    nuc_specs = [
        (
            Chem.MolFromSmarts("[NX3;H2,H1,H0;+0;!$(NC=O)]"),
            "amine",
        ),  # Amines (Neutral, not amide)
        (Chem.MolFromSmarts("[OX1;-1]"), "alkoxide"),  # Alkoxides
        (Chem.MolFromSmarts("[OX2;H1;+0]"), "alcohol"),  # Alcohols
        (Chem.MolFromSmarts("[SX1;-1]"), "thiolate"),  # Thiolates
        (Chem.MolFromSmarts("[SX2;H1;+0]"), "thiol"),  # Thiols
    ]

    # Leaving Group Carbon Pattern: [C][X]
    lg_pattern = Chem.MolFromSmarts("[C][F,Cl,Br,I]")

    lg_matches = mol.GetSubstructMatches(lg_pattern)
    if not lg_matches:
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

                    if ring_size in [5, 6]:
                        # Found a candidate. Prioritize 5/6.
                        best_candidate = (
                            nuc_idx,
                            c_alpha_idx,
                            lg_idx,
                            ring_size,
                            ntype,
                        )
                        break  # Found one, good enough for now?
                except Exception:
                    continue
            if best_candidate:
                break
        if best_candidate:
            break

    if not best_candidate:
        return None

    # Execute Reaction
    nuc_idx, c_alpha_idx, lg_idx, ring_size, ntype = best_candidate
    rwmol = Chem.RWMol(mol)

    # 1. Form Bond
    rwmol.AddBond(nuc_idx, c_alpha_idx, Chem.BondType.SINGLE)

    # 2. Break LG Bond
    rwmol.RemoveBond(c_alpha_idx, lg_idx)

    # 3. Update Charges
    atom_nuc = rwmol.GetAtomWithIdx(nuc_idx)
    atom_nuc.SetFormalCharge(atom_nuc.GetFormalCharge() + 1)

    atom_lg = rwmol.GetAtomWithIdx(lg_idx)
    atom_lg.SetFormalCharge(atom_lg.GetFormalCharge() - 1)

    # 4. Process Products
    products_smi = Chem.MolToSmiles(rwmol)
    fragments = products_smi.split(".")

    # Assume the largest fragment is the ring product
    organic_product = max(fragments, key=len)

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

    return {
        "mechanisms": ["Intramolecular_SN2"],
        "explanation": f"Intramolecular reaction favored due to formation of a {ring_size}-membered ring.",
        "products": [organic_product],
        "steps": [step_0, step_1],
    }


REAGENTS = "[N,S,P,O;-1,O;H1,H2,C;-1,F-1,Cl-1,Br-1,I-1]"
# Dictionary for Reagent Classification
# Simplify for now to common agents found in curriculum
REAGENT_PROPERTIES = {
    # Strong Base / Strong Nucleophile
    "O": {"base": "weak", "nuc": "weak", "bulky": False},  # H2O
    "[OH-]": {"base": "strong", "nuc": "strong", "bulky": False},
    "[O-]C": {"base": "strong", "nuc": "strong", "bulky": False},  # Methoxide
    "[O-]CC": {"base": "strong", "nuc": "strong", "bulky": False},  # Ethoxide
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
        "[C:1][OH2+:2].[F-,Cl-,Br-,I-,O-,S-,P-:3]>>[C:1][F,Cl,Br,I,O,S,P;+0:3].[OH2:2]",
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
    # Check for Alkyl Halides
    if mol.HasSubstructMatch(TERTIARY_PATTERN):
        return "tertiary"
    if mol.HasSubstructMatch(SECONDARY_PATTERN):
        return "secondary"
    if mol.HasSubstructMatch(PRIMARY_PATTERN):
        return "primary"
    if mol.HasSubstructMatch(METHYL_PATTERN):
        return "methyl"

    # Check for Alcohols - map to same types
    if mol.HasSubstructMatch(ALCOHOL_TERTIARY_PATTERN):
        return "tertiary_alcohol"
    if mol.HasSubstructMatch(ALCOHOL_SECONDARY_PATTERN):
        return "secondary_alcohol"
    if mol.HasSubstructMatch(ALCOHOL_PRIMARY_PATTERN):
        return "primary_alcohol"
    if mol.HasSubstructMatch(ALCOHOL_METHYL_PATTERN):
        return "methyl_alcohol"

    return "unknown"


def classify_reagent(mol_smiles):
    # Normalize SMILES using RDKit to match formatting in REAGENT_PROPERTIES
    mol = Chem.MolFromSmiles(mol_smiles)
    if not mol:
        return {"base": "weak", "nuc": "weak", "bulky": False}

    # Try canonical match (remove explicit H before canonicalizing to match keys generally)
    # The REAGENT_PROPERTIES keys seem to be mostly heavy atoms (except some specific ones)
    # Let's try direct canonicalization first.
    try:
        base_smi = Chem.MolToSmiles(mol, canonical=True, isomericSmiles=False)
    except Exception:
        base_smi = mol_smiles  # Fallback

    props = REAGENT_PROPERTIES.get(base_smi)

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
        if "N" in base_smi or "P" in base_smi:
            return {
                "base": "weak",
                "nuc": "strong",
                "bulky": False,
            }  # Neutral amine/phosphine
        return {"base": "weak", "nuc": "weak", "bulky": False}
    return props


def predict_mechanism(substrate_type, reagent_props, conditions):
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
                mechanisms.append("Alcohol SN1")
                explanation.append("Tertiary Alcohol + Acid -> SN1.")
            elif base_substrate_type == "secondary":
                mechanisms.append("Alcohol SN1")
                if temp == "heat":
                    mechanisms.append("Alcohol SN2")
                    explanation.append(
                        "Secondary Alcohol + Acid -> SN1. Heat enables SN2."
                    )
                else:
                    explanation.append("Secondary Alcohol + Acid -> SN1 favored.")
            elif base_substrate_type in ["primary", "methyl"]:
                if temp == "heat":
                    mechanisms.append("Alcohol SN2")
                    explanation.append("Primary + Acid + Heat -> SN2.")
                else:
                    explanation.append("Primary + Acid requires Heat for SN2.")
        else:
            explanation.append(
                "(Substitution suppressed: H2SO4 favors Elimination/Dehydration)."
            )

        # 2. ELIMINATION (Dehydration) - Requires Heat
        # 2. ELIMINATION (Dehydration) - Requires Heat
        # Special check: User SMARTS for "Alcohol Acid E1/E2" are specific to H2SO4 (require Sulfate match)
        is_h2so4 = reagent_props.get("acid_type") == "h2so4"

        if temp == "heat":
            if is_h2so4:
                if base_substrate_type == "primary":
                    mechanisms.append("Alcohol Acid E2")
                    explanation.append(
                        "Primary Alcohol + H2SO4 + Heat -> E2 (Dehydration)."
                    )
                else:
                    mechanisms.append("Alcohol Acid E1")
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

    # General Logic (SN1/SN2/E1/E2)
    # Now applies to both Halides AND Alcohols (assuming simplified leaving group 'OH')

    possible_mechanisms = []

    # 1. Tertiary
    if base_substrate_type == "tertiary":
        if reagent_props["base"] == "strong":
            possible_mechanisms.append("E2")
            explanation.append("Tertiary + Strong Base -> E2.")
        else:
            possible_mechanisms.append("SN1")
            possible_mechanisms.append("E1")
            explanation.append("Tertiary + Weak Reagent -> SN1/E1.")
            if temp == "heat":
                explanation.append("Heat favors E1.")

    # 2. Secondary
    elif base_substrate_type == "secondary":
        if reagent_type == "strong_base":
            possible_mechanisms.append("E2")
            possible_mechanisms.append("SN2")
            explanation.append("Secondary + Strong Base -> E2 Major, SN2 Minor.")
        elif reagent_type == "bulky_base":
            possible_mechanisms.append("E2")
            explanation.append("Secondary + Bulky Base -> E2.")
        elif reagent_type == "weak_base_strong_nuc":
            possible_mechanisms.append("SN2")
            explanation.append("Secondary + Strong Nuc -> SN2.")
        else:  # Weak/Weak
            possible_mechanisms.append("SN1")
            possible_mechanisms.append("E1")
            explanation.append("Secondary + Weak Reagent -> SN1/E1.")

    # 3. Primary
    elif base_substrate_type == "primary":
        if reagent_type == "bulky_base":
            possible_mechanisms.append("E2")
            explanation.append("Primary + Bulky Base -> E2.")
        elif reagent_type == "strong_base":
            possible_mechanisms.append("SN2")
            possible_mechanisms.append("E2")
            explanation.append("Primary + Strong Base -> SN2 Major, E2 Minor.")
        elif reagent_type == "weak_base_strong_nuc":
            possible_mechanisms.append("SN2")
            explanation.append("Primary + Strong Nuc -> SN2.")
        else:
            explanation.append("Primary + Weak Reagent -> No Reaction.")

    # 4. Methyl
    elif base_substrate_type == "methyl":
        if "SN2" not in possible_mechanisms:
            possible_mechanisms.append("SN2")
        explanation.append("Methyl -> SN2.")

    # Apply Alcohol Constraints (User Rules)
    if is_alcohol:
        # User Rule: Non-tertiary (Secondary, Primary, Methyl) SN2 requires Heat
        if "SN2" in possible_mechanisms:
            if base_substrate_type != "tertiary":
                if temp != "heat":
                    # Remove SN2 if no heat
                    if "SN2" in possible_mechanisms:
                        possible_mechanisms.remove("SN2")
                    explanation.append("(Alcohol SN2 prevented: Requires Heat).")

    mechanisms.extend(possible_mechanisms)

    return mechanisms, " ".join(explanation)


def run_substitution_elimination(reactants, conditions):
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

    # CHECK FOR INTRAMOLECULAR REACTION (Single Reactant)
    if not reagent and substrate and len(reactants) == 1:
        # Check if substrate can be its own reagent
        intra_res = check_and_run_intramolecular(substrate[1])
        if intra_res:
            return intra_res

    if not substrate:
        return {"error": "No suitable substrate (Alkyl Halide or Alcohol) found."}

    if not reagent:
        # Check if solvolysis condition implies a reagent (e.g., water/ethanol solvent acting as nuc)
        if "solvolysis" in conditions:
            # Implicit reagent? For now require explicit.
            # actually user might send just substrate?
            pass
        return {"error": "No reagent found."}

    sub_type = classify_substrate(substrate[1])
    reagent_props = classify_reagent(reagent[0])

    print(f"DEBUG: Substrate Type: {sub_type}")
    print(f"DEBUG: Reagent Props: {reagent_props}")

    mechanisms, explanation = predict_mechanism(sub_type, reagent_props, conditions)

    print(f"DEBUG: Predicted Mechanisms: {mechanisms}")

    # Run ALL predicted mechanisms (e.g. SN1 + E1)

    all_final_organic = []
    all_final_inorganic = []
    all_steps = []

    seen_products = set()

    for mech in mechanisms:
        print(f"DEBUG: Executing Mechanism: {mech}")
        current_mech_key = mech  # Key in TRANSFORMS

        # Mapping generic SN2 to specific implementation if needed
        if mech == "SN2":
            reagent_smi = reagent[0]
            if "-" in reagent_smi:
                current_mech_key = "SN2_anionic"
            else:
                current_mech_key = "SN2_neutral"

        smarts = TRANSFORMS.get(current_mech_key)
        if not smarts:
            print(f"DEBUG: No SMARTS for {current_mech_key}")
            continue

        # Prepare auto-add (e.g. Water for SN1 Step 3)
        auto_add = None
        if mech == "SN1" and reagent:
            auto_add = ["", "", "O"]
        elif mech == "Alcohol Acid E2":
            # Step 1: Protonation
            # Step 2: Elimination (Requires Water as base in user SMARTS)
            auto_add = ["", "O"]

        outcome = run_reaction(reactants, smarts, debug=True, auto_add=auto_add)

        # Merge Results
        outcome_organic = outcome.get("final_organic", [])
        outcome_inorganic = outcome.get("final_inorganic", [])
        outcome_steps = outcome.get("steps", [])

        print(f"DEBUG: {mech} produced {len(outcome_organic)} organic products")

        # Add products
        for prod in outcome_organic:
            if prod not in seen_products:
                all_final_organic.append(prod)
                seen_products.add(prod)

        for prod in outcome_inorganic:
            if prod not in seen_products:
                all_final_inorganic.append(prod)
                # seen_products.add(prod) # Don't block if organic has same smiles? Unlikely.
                pass

        # Merge Steps - Prefix ID with mech to separate trees in UI
        try:
            for step in outcome_steps:
                # Handle both dict and object cases defensively
                if isinstance(step, dict):
                    # If it's a dict, modifying it is easy
                    step["step_id"] = f"{mech}_{step['step_id']}"
                    if step.get("parent_id"):
                        step["parent_id"] = f"{mech}_{step['parent_id']}"

                    if step.get("parent_ids"):
                        step["parent_ids"] = [
                            f"{mech}_{pid}" for pid in step["parent_ids"]
                        ]

                    step["group_id"] = f"group_{mech}"
                else:
                    # Assume Object (dataclass)
                    step.step_id = f"{mech}_{step.step_id}"
                    if step.parent_id:
                        step.parent_id = f"{mech}_{step.parent_id}"

                    if hasattr(step, "parent_ids") and step.parent_ids:
                        step.parent_ids = [f"{mech}_{pid}" for pid in step.parent_ids]

                    step.group_id = f"group_{mech}"

                all_steps.append(step)
        except Exception as e:
            print(f"ERROR: Failed to process steps for {mech}: {e}")
            import traceback

            traceback.print_exc()

    print(f"DEBUG: Total Steps Merged: {len(all_steps)}")

    results = {
        "mechanisms": mechanisms,
        "explanation": explanation,
        "products": all_final_organic,
        "steps": all_steps,
    }
    # inorganic? not mapped in return yet but available.

    return results
