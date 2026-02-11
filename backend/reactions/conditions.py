# Condition ID/Label -> SMILES
# Used to augment reactants during matching
CONDITION_MOLECULES = {
    "h2so4": "OS(=O)(=O)O",
    "acid": "OS(=O)(=O)O",  # Generic acid often mapped to Sulfuric Acid for reaction matching purposes
    "br2": "BrBr",
    "cl2": "ClCl",
    "h2o": "O",
    "water": "O",
    "hbr": "Br",
    "hcl": "Cl",
    "hi": "I",
    "hf": "F",
    "socl2": "ClS(=O)Cl",
    "pbr3": "BrP(Br)Br",
    "pcl3": "ClP(Cl)Cl",
    "boh3": "B",  # Borane BH3
    "bh3": "B",
    "mcpba": "O=C(OO)c1cccc(Cl)c1",  # mCPBA approximation or generic peroxyacid
    # Use generic peroxyacid structure if needed: CC(=O)OO
    # But rule expects: [CX3](=[OX1])[OX2][OX2H1]
    "peroxyacid": "CC(=O)OO",
    "kmno4": "[O-][Mn](=O)(=O)=O",
    "h2": "[H][H]",
    "lindlar": "[H][H]",  # Lindlar is H2 + Catalyst, so provides H2
    "nanh2": "[Na+].[NH2-]",
    "nh2-": "[NH2-]",
    "base": "[OH-]",  # Generic base
    "oh-": "[OH-]",
    "mg": "[Mg]",
    "pcc": "Cl[Cr-](=O)(=O)O",  # PCC structure approximation or pyridinium chlorochromate
    # PCC Rule: [nH+]1ccccc1.[O-][Cr](Cl)(=O)=O
    # So we need both components or just the Cr part? The rule has 3 reactants: alcohol, pyridine, Cr part.
    # Let's map PCC to the Cr part + Pyridine
    # But dictionary key maps to single SMILES usually.
    # We can perform a split in matcher.
    "jones": "O[Cr](O)(=O)=O",  # Chromic acid H2CrO4
    "h2cro4": "O[Cr](O)(=O)=O",
    "nah": "[Na+].[H-]",
    "hydride": "[H-]",
    "lialh4": "[Li+].[AlH4-]",
    "nabh4": "[Na+].[BH4-]",
    "alcohol": "CO",  # Generic alcohol (Methanol) for checks?
    "ch3oh": "CO",
}
