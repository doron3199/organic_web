from reaction_logic import run_reaction


def debug():
    reactants = ["C(C)(C)C=C", "Br"]
    smarts = "[C:1]=[C:2].[F,Cl,Br,I:3]>>[C:1][C+:2].[F-,Cl-,Br-,I-:3]"
    result = run_reaction(reactants, smarts)
    print("Result:", result)
    # {'organic': ['[CH2+]CC', 'C[CH+]C(C)C'], 'inorganic': ['[Br-]']}

    # reactants = ["[CH2+]CC", "[Br-]"]
    # smarts = "[C+:1].[F-,Cl-,Br-,I-:2]>>[C+0:1][*+0:2]"
    # result = run_reaction(reactants, smarts)
    # print("Result:", result)
    #  {'organic': ['CC[CH+]Br'], 'inorganic': []}


if __name__ == "__main__":
    debug()
