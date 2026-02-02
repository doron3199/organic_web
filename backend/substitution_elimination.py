from rdkit import Chem
from reaction_logic import run_reaction


# --- SMARTS PATTERNS ---
METHYL_PATTERN = Chem.MolFromSmarts("[CX4;H3][F,Cl,Br,I]")
PRIMARY_PATTERN = Chem.MolFromSmarts("[CX4;H2][F,Cl,Br,I]")
SECONDARY_PATTERN = Chem.MolFromSmarts("[CX4;H1]([C,c,N,O,S])[F,Cl,Br,I]")
TERTIARY_PATTERN = Chem.MolFromSmarts("[CX4;H0]([C,c,N,O,S])([C,c,N,O,S])[F,Cl,Br,I]")

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
}

# --- TRANSFORMATION SMARTS ---
TRANSFORMS = {
    "SN2_anionic": "[C:1][F,Cl,Br,I:2].[O,N,S,C;-1:3]>>[C:1][O,N,S,C;+0:3].[F,Cl,Br,I;-1:2]",  # Explicitly set product charge
    "SN2_neutral": "[C:1][F,Cl,Br,I:2].[O,N,S,C;+0:3]>>[C:1][O,N,S,C;+1:3].[F,Cl,Br,I;-1:2]",  # Explicitly set product charge
    "SN1": [
        "[C:1][F,Cl,Br,I:2]>>[C+:1].[F-,Cl-,Br-,I-:2]",  # Step 1: Loss of LG
        "[C+:1].[O,N,S:3]>>[C+0:1][O,N,S;+1:3]",  # Step 2: Nucleophilic Attack (Generic for O/N/S nuc) - explicit charge fix
        "[C:1][O,N,S;+1:3]>>[C:1][O,N,S;+0:3]",  # Step 3: Deprotonation / Neutralization
        "[F,Cl,Br,I;-1:2]>>[F,Cl,Br,I;+0:2]",  # Step 4: Deprotonation / Neutralization
    ],
    "E2": "[C:1]-[C:2][F,Cl,Br,I:3].[O,N,S,C;-1:4]>>[C:1]=[C:2].[F-,Cl-,Br-,I-:3].[O,N,S,C;+0:4][H]",
    "E1": [
        "[C:1][F,Cl,Br,I:2]>>[C+:1].[F-,Cl-,Br-,I-:2]",  # Step 1: Loss of LG
        "[C+:1]-[C:2].[O,N,S,C;+0:3]>>[C+0:1]=[C:2].[O,N,S,C;+1:3]",  # Step 2: Deprotonation (Base optional in simplified view)
    ],
}


def classify_substrate(mol):
    if mol.HasSubstructMatch(TERTIARY_PATTERN):
        return "tertiary"
    if mol.HasSubstructMatch(SECONDARY_PATTERN):
        return "secondary"
    if mol.HasSubstructMatch(PRIMARY_PATTERN):
        return "primary"
    if mol.HasSubstructMatch(METHYL_PATTERN):
        return "methyl"
    return "unknown"


def classify_reagent(mol_smiles):
    # Normalize SMILES (remove explicit H if needed, or lookup directly)
    # Simple lookup for prototype
    base_smi = mol_smiles.replace("[H]", "").replace("()", "")  # Simple cleanup
    props = REAGENT_PROPERTIES.get(base_smi)
    if not props:
        # Fallback heuristics
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
    if reagent_props["base"] == "strong":
        if reagent_props["bulky"]:
            reagent_type = "bulky_base"
        else:
            reagent_type = "strong_base"
    elif reagent_props["nuc"] == "strong":
        reagent_type = "weak_base_strong_nuc"
    else:
        reagent_type = "weak_weak"

    temp = "heat" if "heat" in conditions else "cold"
    # solvent = "protic"  # unused

    explanation.append(f"Substrate: {substrate_type}")
    explanation.append(f"Reagent Type: {reagent_type}")

    # 1. Tertiary
    if substrate_type == "tertiary":
        if reagent_props["base"] == "strong":
            mechanisms.append("E2")
            explanation.append(
                "Tertiary substrate + Strong Base -> E2 dominates (SN2 blocked by sterics)."
            )
        else:
            # Weak base/nuc => SN1/E1
            mechanisms.append("SN1")
            mechanisms.append("E1")
            explanation.append(
                "Tertiary substrate + Weak Reagent -> SN1/E1 mix (Stable carbocation)."
            )
            if temp == "heat":
                explanation.append("Heat favors E1.")

    # 2. Secondary
    elif substrate_type == "secondary":
        if reagent_type == "strong_base":
            # E2 vs SN2. Strong base usually E2 major for secondary.
            mechanisms.append("E2")
            mechanisms.append("SN2")  # Minor
            explanation.append("Secondary + Strong Base -> E2 Major, SN2 Minor.")
        elif reagent_type == "bulky_base":
            mechanisms.append("E2")
            explanation.append("Secondary + Bulky Base -> E2 (Sterics hinder SN2).")
        elif reagent_type == "weak_base_strong_nuc":
            # I-, CN-, etc.
            mechanisms.append("SN2")
            explanation.append(
                "Secondary + Strong Nuc/Weak Base -> SN2 favors inversion."
            )
        else:
            # Solvolysis
            mechanisms.append("SN1")
            mechanisms.append("E1")
            explanation.append("Secondary + Weak/Weak -> SN1/E1 (Solvolysis).")

    # 3. Primary
    elif substrate_type == "primary":
        if reagent_type == "bulky_base":
            mechanisms.append("E2")
            explanation.append(
                "Primary + Bulky Base -> E2 (Base cannot reach carbon for SN2)."
            )
        else:
            mechanisms.append("SN2")
            explanation.append("Primary -> SN2 dominates (Low steric hindrance).")

    # 4. Methyl
    elif substrate_type == "methyl":
        if "SN2" not in mechanisms:
            mechanisms.append("SN2")
        explanation.append("Methyl -> Always SN2 (Elimination impossible).")

    return mechanisms, " ".join(explanation)


def run_substitution_elimination(reactants, conditions):
    # 1. Identify Roles (Assumption: First is substrate if Halide, Second is Reagent)
    # Better: Scan reactants for Halide pattern
    substrate = None
    reagent = None

    for smi in reactants:
        mol = Chem.MolFromSmiles(smi)
        if not mol:
            continue
        if mol.HasSubstructMatch(Chem.MolFromSmarts("[C][F,Cl,Br,I]")):
            substrate = (smi, mol)
        else:
            reagent = (smi, mol)

    if not substrate:
        return {"error": "No alkyl halide substrate found."}

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
        if mech == "SN2":
            reagent_smi = reagent[0]
            if "-" in reagent_smi:
                mech = "SN2_anionic"
            else:
                mech = "SN2_neutral"
        smarts = TRANSFORMS.get(mech)
        if not smarts:
            print(f"DEBUG: No SMARTS for {mech}")
            continue

        # Prepare auto-add (e.g. Water for SN1 Step 3)
        auto_add = None
        if mech == "SN1" and reagent:
            auto_add = ["", "", "O"]

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
                # Keep separate or merge? Frontend usually wants just products.
                # If we want to show byproducts, we should use a separate byproducts list.
                # But current frontend interface `products` usually implies organic.
                # We'll skip adding inorganic to all_final_organic to avoid pollution.
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
