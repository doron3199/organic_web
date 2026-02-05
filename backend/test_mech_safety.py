from substitution_elimination import (
    predict_mechanism,
    classify_substrate,
    classify_reagent,
    REAGENT_PROPERTIES,
)
from rdkit import Chem


def test_mech(substrate_smi, reagent_smi, conditions=["heat"]):
    sub_mol = Chem.MolFromSmiles(substrate_smi)
    sub_type = classify_substrate(sub_mol)
    reagent_props = classify_reagent(reagent_smi)

    print(f"Substrate: {substrate_smi} ({sub_type})")
    print(f"Reagent: {reagent_smi} {reagent_props}")

    mechs, expl = predict_mechanism(sub_type, reagent_props, conditions)
    print(f"Mechanisms: {mechs}")
    print(f"Explanation: {expl}")
    print("-" * 20)


# 1. Primary Alcohol + Weak Base (Water)
test_mech("CCCO", "O")

# 2. Primary Alcohol + Strong Base (NaOH) -> Should NOT be E2/SN2 (Bad LG)
test_mech("CCCO", "[OH-]")

# 3. Primary Halide + Weak Base (Water) -> Should NOT be E2
test_mech("CCCCl", "O")
