import { Subject } from '../types';

export const alcohols: Subject = {
    id: 'alcohols',
    name: 'Alcohols, Ethers, and Epoxides',
    icon: '🍺',
    subSubjects: [
        {
            id: 'alcohols-naming',
            section: 'Nomenclature',
            name: 'Naming & Properties',
            content: `
### Naming Alcohols
Identify the functional group (-OH). Replace the "-e" of the parent hydrocarbon with **-ol**.
-   **Methanol**: CH₃OH
-   **Ethanol**: CH₃CH₂OH
-   **Propan-2-ol**: OH on carbon 2 of a 3-carbon chain.
-   **Cyclohexanol**: OH on a cyclohexane ring.

**Priority**: The alcohol group gets priority over double bonds and halogens when numbering.

### Naming Ethers
-   **Common Names**: Name the two alkyl groups followed by "ether" (e.g., Ethyl methyl ether).
-   **Systematic Names**: Treat the smaller alkoxy group as a substituent (e.g., Methoxyethane).

### Thiols
Sulfur analogs of alcohols (R-SH). Add the suffix **-thiol** to the parent alkane name (e.g., Ethanethiol).
            `,
            examples: [
                { smiles: 'CO', name: 'Methanol' },
                { smiles: 'CCO', name: 'Ethanol' },
                { smiles: 'CC(O)C', name: 'Propan-2-ol' },
                { smiles: 'COC', name: 'Dimethyl ether' },
                { smiles: 'CCS', name: 'Ethanethiol' }
            ],
            rules: [
                {
                    id: 'alcohol-suffix',
                    name: 'Alcohol Suffix',
                    smarts: '[OX2H]',
                    description: 'Change the parent suffix to -ol.',
                    logicType: 'check_suffix_alcohol',
                    unlocked: true
                },
                {
                    id: 'alcohol-priority',
                    name: 'Alcohol Priority',
                    smarts: '',
                    description: 'The -OH group gets priority over double bonds and halogens in numbering.',
                    logicType: 'check_functional_priority',
                    unlocked: true
                }
            ]
        },
        {
            id: 'alcohols-preparation',
            section: 'Preparation',
            name: 'Preparation of Alcohols',
            content: `
### From Alkenes
-   **Hydration**: Acid-catalyzed addition of water (Markovnikov).
-   **Hydroboration-Oxidation**: Anti-Markovnikov addition of water.

### From Reduction of Carbonyls
-   **Aldehydes/Ketones**: Reduced by Sodium Borohydride (NaBH₄) or Lithium Aluminum Hydride (LiAlH₄).
    -   Aldehyde → Primary Alcohol
    -   Ketone → Secondary Alcohol
-   **Esters/Carboxylic Acids**: Require the stronger reducing agent LiAlH₄ to form Primary Alcohols.

### From Grignard Reagents (R-MgBr)
Nucleophilic attack on carbonyls.
-   Formaldehyde → Primary Alcohol.
-   Aldehyde → Secondary Alcohol.
-   Ketone/Ester → Tertiary Alcohol.
            `,
            reactionExamples: [],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-activation',
            section: 'Reactions',
            name: 'Conversion to Alkyl Halides',
            content: `
### Activation of Alcohols
The OH group is a bad leaving group (strong base). We must turn it into a good leaving group (H₂O, etc.) to substitute it.

#### 1. Reaction with HX (HCl, HBr, HI)
-   **Tertiary/Secondary**: SN1 Mechanism (Carbocation intermediate). Heat normally not required.
-   **Primary**: SN2 Mechanism (backside attack). Heat required.

#### 2. Thionyl Chloride (SOCl₂) or PBr₃
Best for converting Primary/Secondary alcohols to Chlorides/Bromides.
-   **Mechanism**: SN2 (Inversion of configuration).
-   **Advantage**: No carbocation rearrangements!
            `,
            reactionExamples: [
                {
                    id: 'alcohol_activation_hx_sn1',
                    reactants: [
                        { smiles: 'CC(C)(O)C', name: 'tert-Butanol' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CC(C)(Br)C', name: 'tert-Butyl Bromide', yield: 100 }
                    ],
                    conditions: 'None'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-oxidation',
            section: 'Reactions',
            name: 'Oxidation of Alcohols',
            content: `
### Oxidation
Removing hydrogens from the carbinol carbon to form C=O bonds.

-   **Primary Alcohols**:
    -   With **PCC** (mild): Oxidize to **Aldehyde**.
    -   With **Jones Reagent** (H₂CrO₄): Oxidize all the way to **Carboxylic Acid**.
-   **Secondary Alcohols**: Oxidize to **Ketones** (with any oxidizing agent).
-   **Tertiary Alcohols**: **Cannot** be oxidized (no H on the central carbon to remove).
            `,
            reactionExamples: [
                {
                    id: 'alcohol_oxidation_pcc',
                    reactants: [
                        { smiles: 'CCCO', name: 'Propan-1-ol' },
                        { smiles: '[PyH+][CrO3Cl-]', name: 'PCC' }
                    ],
                    products: [
                        { smiles: 'CCC=O', name: 'Propanal', yield: 100 }
                    ],
                    conditions: 'PCC'
                },
                {
                    id: 'alcohol_oxidation_jones',
                    reactants: [
                        { smiles: 'CCCO', name: 'Propan-1-ol' },
                        { smiles: '[Cr](=O)(=O)(O)O', name: 'H2CrO4 (Jones)' }
                    ],
                    products: [
                        { smiles: 'CCC(=O)O', name: 'Propanoic Acid', yield: 100 }
                    ],
                    conditions: 'Jones'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'ethers-epoxides',
            section: 'Reactions',
            name: 'Ethers & Epoxides',
            content: `
### Williamson Ether Synthesis
Reaction of an alkoxide ion (R-O⁻) with a primary alkyl halide (R-X) via SN2 to form an ether.

### Epoxide Ring Opening
Epoxides are 3-membered rings with high ring strain, making them reactive.
-   **Acidic Conditions**: Nucleophile attacks the **more substituted** carbon (partial positive charge character).
-   **Basic Conditions**: Nucleophile attacks the **less hindered** carbon (SN2-like).
            `,
            reactionExamples: [
                {
                    id: 'williamson_ether_synthesis',
                    reactants: [
                        { smiles: 'CC[O-]', name: 'Ethoxide' },
                        { smiles: 'CCI', name: 'Iodomethane' }
                    ],
                    products: [
                        { smiles: 'CCOC', name: 'Ethyl methyl ether', yield: 100 }
                    ],
                    conditions: 'SN2'
                },
                {
                    id: 'epoxide_opening_acid',
                    reactants: [
                        { smiles: 'C1OC1C', name: '2-Methyloxirane' },
                        { smiles: 'O', name: 'H2O' },
                        { smiles: '[H+]', name: 'Acid' }
                    ],
                    products: [
                        { smiles: 'CC(O)CO', name: 'Propane-1,2-diol', yield: 100 }
                    ],
                    conditions: 'Acid'
                }
            ],
            examples: [],
            rules: []
        }
    ]
};
