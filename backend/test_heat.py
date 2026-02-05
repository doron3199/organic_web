from substitution_elimination import (
    predict_mechanism,
    classify_substrate,
    classify_reagent,
    REAGENT_PROPERTIES,
)


def test(sub, reag, conditions):
    sub_type = classify_substrate(sub)
    reag_props = classify_reagent(reag)
    mechs, expl = predict_mechanism(sub_type, reag_props, conditions)
    print(f"{sub_type} + {reag} ({conditions}) -> {mechs}")
    print(expl)
    print("-" * 10)


from rdkit import Chem

mol = Chem.MolFromSmiles("CCCO")  # Primary Alcohol

# 1. Primary Alcohol + HBr (Cold)
test(mol, "Br", [])

# 2. Primary Alcohol + HBr (Heat)
test(mol, "Br", ["heat"])

# 3. Secondary Alcohol + HBr (Cold)
mol_sec = Chem.MolFromSmiles("CC(O)C")
test(mol_sec, "Br", [])

# 4. H2SO4 checks
test(mol, "OS(O)(=O)=O", ["heat"])
test(mol, "OS(O)(=O)=O", [])

# 5. Strong Nuc checks (e.g. Br-)
test(mol, "[Br-]", [])
test(mol, "[Br-]", ["heat"])
