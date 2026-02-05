from rdkit import Chem


def get_canonical(smi):
    m = Chem.MolFromSmiles(smi)
    if not m:
        return None
    return Chem.MolToSmiles(m, canonical=True, isomericSmiles=False)


h2so4_input = "OS(O)(=O)=O"
h2so4_key = "OS(=O)(=O)O"

print(f"Input: {h2so4_input} -> {get_canonical(h2so4_input)}")
print(f"Key:   {h2so4_key}   -> {get_canonical(h2so4_key)}")

m = Chem.MolFromSmiles(h2so4_input)
m_no_h = Chem.RemoveHs(m)
print(f"No H:  {Chem.MolToSmiles(m_no_h, canonical=True, isomericSmiles=False)}")
