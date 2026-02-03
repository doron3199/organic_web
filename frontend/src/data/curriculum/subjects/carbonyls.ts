import { Subject } from '../types';

export const carbonyls: Subject = {
    id: 'carbonyls',
    name: 'Carbonyl Compounds',
    icon: '⚗️', // Flask or generic icon
    subSubjects: [
        {
            id: 'carbonyls-intro',
            section: 'Basics',
            name: 'Reactivity Principles',
            content: `
### The Carbonyl Group (C=O)
The carbonyl carbon is **electrophilic** because the oxygen is electronegative and pulls electron density away from it.

### Reactivity Order (Acyl Substitution)
The reactivity of carboxylic acid derivatives toward nucleophilic substitution depends on the quality of the **leaving group**. Better leaving group = More reactive.

**Most Reactive → Least Reactive**:
1.  **Acyl Chloride** (R-COCl): Cl⁻ is a great leaving group.
2.  **Acid Anhydride**: Carboxylate ion is a decent leaving group.
3.  **Ester** (R-COOR') ≈ **Carboxylic Acid** (R-COOH): RO⁻ and HO⁻ are strong bases (poor leaving groups).
4.  **Amide** (R-CONH₂): NH₂⁻ is a very strong base (terrible leaving group).
            `,
            examples: [],
            rules: [
                {
                    id: 'carbonyl-suffix-aldehyde',
                    name: 'Aldehyde Suffix',
                    smarts: '[CX3H1]=O',
                    description: 'Aldehydes use the suffix -al.',
                    logicType: 'check_suffix_aldehyde',
                    unlocked: true
                },
                {
                    id: 'carbonyl-suffix-ketone',
                    name: 'Ketone Suffix',
                    smarts: '[#6][CX3](=[OX1])[#6]',
                    description: 'Ketones use the suffix -one.',
                    logicType: 'check_suffix_ketone',
                    unlocked: true
                },
                {
                    id: 'carbonyl-suffix-acid',
                    name: 'Acid Suffix',
                    smarts: '[CX3](=O)[OX2H1]',
                    description: 'Carboxylic acids use the suffix -oic acid.',
                    logicType: 'check_suffix_acid',
                    unlocked: true
                }
            ]
        },
        {
            id: 'carboxylic-acids',
            section: 'Carboxylic Acids',
            name: 'Reactions of Acids',
            content: `
### Preparation
-   Oxidation of Primary Alcohols (Jones).
-   Hydrolysis of Nitriles, Esters, or Amides.
-   Grignard reaction with CO₂.

### Conversion to Acid Chlorides
Carboxylic acids are not very reactive. To use them in synthesis, we often convert them into **Acyl Chlorides** using Thionyl Chloride (SOCl₂).
-   R-COOH + SOCl₂ → R-COCl + SO₂ + HCl
            `,
            reactionExamples: [
                {
                    id: 'acid_to_acyl_chloride',
                    reactants: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid' },
                        { smiles: 'OS(Cl)Cl', name: 'Thionyl Chloride' }
                    ],
                    products: [
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride', yield: 100 }
                    ],
                    conditions: 'SOCl2'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'acyl-chlorides',
            section: 'Acyl Chlorides',
            name: 'Reactions of Acyl Chlorides',
            content: `
### Reactivity
Acyl chlorides are the most reactive derivatives. They don't need a catalyst!

1.  **Hydrolysis**: React with water → **Carboxylic Acid**.
2.  **Alcoholysis**: React with alcohol → **Ester**.
3.  **Aminolysis**: React with amine (2 equivalents) → **Amide**.
            `,
            reactionExamples: [
                {
                    id: 'acyl_chloride_hydrolysis',
                    reactants: [
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride' },
                        { smiles: 'O', name: 'Water' }
                    ],
                    products: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 100 }
                    ],
                    conditions: ''
                },
                {
                    id: 'acyl_chloride_alcoholysis',
                    reactants: [
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride' },
                        { smiles: 'CO', name: 'Methanol' }
                    ],
                    products: [
                        { smiles: 'CC(=O)OC', name: 'Methyl Acetate', yield: 100 }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'esters',
            section: 'Esters',
            name: 'Reactions of Esters',
            content: `
### Preparation: Fischer Esterification
Carboxylic Acid + Alcohol → Ester + Water
-   This reaction is reversible. Use excess alcohol to drive it forward.

### Hydrolysis
1.  **Acidic Hydrolysis**: Reversible. Reforms Acid + Alcohol.
2.  **Basic Hydrolysis (Saponification)**: React with NaOH. Forms **Carboxylate Ion** + Alcohol. Irreversible.

### Reduction
-   **LiAlH4**: Reduces esters to **Primary Alcohols** (cleaves the C-O bond).
-   **Grignard**: Reacts twice to form a **Tertiary Alcohol**.
            `,
            reactionExamples: [
                {
                    id: 'fischer_esterification',
                    reactants: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid' },
                        { smiles: 'CCO', name: 'Ethanol' },
                        { smiles: '[H+]', name: 'Acid' }
                    ],
                    products: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate', yield: 100 }
                    ],
                    conditions: 'Acid, Heat'
                },
                {
                    id: 'saponification',
                    reactants: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate' },
                        { smiles: '[OH-]', name: 'Hydroxide' }
                    ],
                    products: [
                        { smiles: 'CC(=O)[O-]', name: 'Acetate Ion', yield: 100 },
                        { smiles: 'CCO', name: 'Ethanol', yield: 100 }
                    ],
                    conditions: 'Base'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'amides',
            section: 'Amides',
            name: 'Reactions of Amides',
            content: `
### Hydrolysis
Amides are very stable (think of peptide bonds in proteins). They require **strong acid or base** and **heat** to break.

-   **Acidic**: Forms Carboxylic Acid + Ammonium (NH₄⁺).
-   **Basic**: Forms Carboxylate Ion + Ammonia (NH₃).
            `,
            reactionExamples: [],
            examples: [],
            rules: []
        }
    ]
};
