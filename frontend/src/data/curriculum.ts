export type RuleLogicType = 'longest_chain' | 'identify_substituents' | 'lowest_numbering' | 'alphabetical_order' | 'check_longest_chain' | 'check_lowest_locants' | 'check_alphabetical' | 'check_cyclo_naming' | 'check_halogens'

export interface Rule {
    id: string
    name: string
    smarts: string
    description: string
    unlocked: boolean
    errorMessage?: string
    logicType?: RuleLogicType
}


export type Selectivity = 'major' | 'minor' | 'trace' | 'equal';

export interface ReactionProduct {
    smiles: string;
    name: string;
    selectivity?: Selectivity;
    yield?: number; // Optional numeric yield (98, 2, 50)
}

export interface ReactionExample {
    reactants: { smiles: string; name?: string }[];
    products: ReactionProduct[];
    conditions: string;
}

export interface SubSubject {
    id: string
    name: string
    rules: Rule[]
    content: string // Markdown or HTML content
    examples: { smiles: string; name: string }[]
    reactionExamples?: ReactionExample[];
    isCompleted?: boolean
    section?: string
}

export interface Subject {
    id: string
    name: string
    subSubjects: SubSubject[]
    icon?: string
}

export const initialCurriculum: Subject[] = [
    {
        id: 'alkanes',
        name: 'Alkanes',
        icon: '🔗',
        subSubjects: [
            {
                id: 'alkanes-nomenclature-main-chain',
                section: 'Nomenclature',
                name: 'Step 1: Find the Longest Chain',
                content: `
The foundation of naming any alkane is finding the "Parent Chain". This is the longest continuous line of carbon atoms you can trace without lifting your pen.

### Reference: Carbon Count Names
Memorize these prefixes! They tell you how many carbons are in the chain.

| # Carbons | Prefix | Alkane Name |
| :--- | :--- | :--- |
| 1 | Meth- | Methane |
| 2 | Eth- | Ethane |
| 3 | Prop- | Propane |
| 4 | But- | Butane |
| 5 | Pent- | Pentane |
| 6 | Hex- | Hexane |
| 7 | Hept- | Heptane |
| 8 | Oct- | Octane |
| 9 | Non- | Nonane |
| 10 | Dec- | Decane |

### How to Apply
1. Count carbon atoms in every possible path.
2. The longest path determines the base name (e.g., 5 carbons = **Pent**ane).
3. If there are two chains of equal length, choose the one with more branches (we'll see this later!).

### Examples
Below are simple straight-chain alkanes. Notice how the name changes with length.
                `,
                examples: [
                    { smiles: 'CCCCC', name: 'Pentane (5 Carbons)' },
                    { smiles: 'CCCCCCC', name: 'Heptane (7 Carbons)' }
                ],
                rules: [
                    {
                        id: 'rule_longest_chain',
                        name: 'Longest Chain Rule',
                        smarts: '[C][C]', // used for general pattern but logicType drives the algorithm
                        description: 'Identify the longest continuous carbon chain.',
                        unlocked: true,
                        logicType: 'longest_chain'
                    },
                    {
                        id: 'validate_longest_chain',
                        name: 'Check: Longest Chain',
                        smarts: '',
                        description: 'Validate that the root name matches the longest chain length.',
                        unlocked: true,
                        logicType: 'check_longest_chain'
                    }
                ]
            },
            {
                id: 'alkanes-step2-substituents',
                section: 'Nomenclature',
                name: 'Step 2: Identify Substituents',
                content: `
Often, you'll find carbon groups or other atoms branching off the main chain. These are called **substituents**.

### 1. Alkyl Groups (Carbon Branches)
- **Methyl**: A 1-carbon branch (-CH3)
- **Ethyl**: A 2-carbon branch (-CH2CH3)
- **Propyl**: A 3-carbon branch (-CH2CH2CH3)

### 2. Halogens
Halogens are treated exactly like alkyl substituents. They have no special priority over carbon branches.
- **F**: Fluoro-
- **Cl**: Chloro-
- **Br**: Bromo-
- **I**: Iodo-

### Naming Structure
The branch name is added as a prefix to the parent name.
- Methyl + Pentane = **Methylpentane**
- Chloro + Pentane = **Chloropentane**
                `,
                examples: [
                    { smiles: 'CC(C)CCC', name: '2-Methylpentane' },
                    { smiles: 'CCC(CC)CCC', name: '3-Ethylhexane' },
                    { smiles: 'CC(Cl)CCC', name: '2-Chloropentane' }
                ],
                rules: [
                    {
                        id: 'rule_longest_chain',
                        name: 'Longest Chain Rule',
                        smarts: '[C][C]',
                        description: 'Identify the longest continuous carbon chain.',
                        unlocked: true,
                        logicType: 'longest_chain'
                    },
                    {
                        id: 'rule_subs',
                        name: 'Substituents',
                        smarts: '',
                        description: '',
                        unlocked: true,
                        logicType: 'identify_substituents'
                    },
                ]
            },
            {
                id: 'alkanes-step3-numbering',
                section: 'Nomenclature',
                name: 'Step 3: Numbering the Chain',
                content: `
You must tell us *where* the branch is! 

### The Low Number Rule
Number the carbon atoms in the parent chain starting from the end **closest** to the first branch (whether it is an alkyl group or a halogen). This ensures the locant (the number) is as small as possible.

- **Correct**: 2-Methylpentane
- **Incorrect**: 5-Methylpentane (counting from the wrong side!)
                `,
                examples: [
                    { smiles: 'CC(C)CCCC', name: '2-Methylhexane' },
                    { smiles: 'CCCC(C)CC', name: '3-Methylhexane' },
                    { smiles: 'CC(Br)CCCC', name: '2-Bromohexane' }
                ],
                rules: [
                    {
                        id: 'rule_longest_chain',
                        name: 'Longest Chain Rule',
                        smarts: '[C][C]',
                        description: 'Identify the longest continuous carbon chain.',
                        unlocked: true,
                        logicType: 'longest_chain'
                    },
                    {
                        id: 'rule_identify_substituents',
                        name: 'Identify Substituents',
                        smarts: '[C]([C])[C]',
                        description: 'Identify branches attached to the main chain.',
                        unlocked: true,
                        logicType: 'identify_substituents'
                    },

                    {
                        id: 'rule_lowest_numbering',
                        name: 'Lowest Numbering',
                        smarts: 'custom_numbering_logic',
                        description: 'Number the chain to give substituents (alkyls & halogens) the lowest possible numbers.',
                        unlocked: true,
                        logicType: 'lowest_numbering'
                    },
                    {
                        id: 'validate_lowest_locants',
                        name: 'Check: Lowest Locants',
                        smarts: '',
                        description: 'Validate that the numbering used gives the lowest possible locants.',
                        unlocked: true,
                        logicType: 'check_lowest_locants'
                    }
                ]
            },
            {
                id: 'alkanes-step4-alphabetical',
                section: 'Nomenclature',
                name: 'Step 4: Alphabetical Order',
                content: `
When a molecule has more than one type of substituent, list them **alphabetically**.

### Sorting Rules
1. **Alphabetical**: Ethyl < Methyl. Bromo < Chloro. Bromo < Methyl.
2. **Ignore Prefixes**: Ignore prefixes like *di-*, *tri-*, *tetra-*, *sec-*, *tert-* when sorting.
   - Example: **E**thyl comes before **D**imethyl (compare **e** vs **m**).
3. **Halogens Mixed**: Halogens are alphabetized just like alkyl groups.
   - **2-Bromo-3-chlorobutane** (B before C).
   - **3-Ethyl-2-methylpentane** (E before M).

### Example
**4-Ethyl-2,3-dimethylheptane**
                `,
                examples: [
                    { smiles: 'CCC(CC)C(C)CC', name: '3-Ethyl-4-methylhexane' },
                    { smiles: 'CC(C)C(C)C(CC)CCC', name: '4-Ethyl-2,3-dimethylheptane' },
                    { smiles: 'CC(Cl)C(Br)CC', name: '3-Bromo-2-chloropentane' }
                ],
                rules: [
                    {
                        id: 'rule_longest_chain',
                        name: 'Longest Chain',
                        smarts: '',
                        description: '',
                        unlocked: true,
                        logicType: 'longest_chain'
                    },
                    {
                        id: 'rule_subs',
                        name: 'Substituents',
                        smarts: '',
                        description: '',
                        unlocked: true,
                        logicType: 'identify_substituents'
                    },

                    {
                        id: 'rule_numbering',
                        name: 'Numbering',
                        smarts: '',
                        description: '',
                        unlocked: true,
                        logicType: 'lowest_numbering'
                    },
                    {
                        id: 'validate_alphabetical',
                        name: 'Check: Alphabetical Order',
                        smarts: '',
                        description: 'Validate substituents are listed alphabetically.',
                        unlocked: true,
                        logicType: 'check_alphabetical'
                    }
                ]
            },
            {
                id: 'alkanes-step5-cyclo',
                section: 'Nomenclature',
                name: 'Step 5: Cycloalkanes',
                content: `
Carbon chains can form rings! These are called **cycloalkanes**.

### Naming Rules
1. **Prefix**: Add **cyclo-** to the parent name (e.g., Cyclohexane).
2. **Mono-substituted**: If there is only ONE branch, do **not** use a number. The position is always assumed to be 1.
   - Correct: Methylcyclohexane
   - Incorrect: 1-Methylcyclohexane
3. **Multi-substituted**: If there are multiple branches, number them to get the lowest possible set of locants, prioritizing alphabetical order if ties exist.

### Examples
- **Cyclopropane**: A 3-carbon ring (triangle).
- **Cyclohexane**: A 6-carbon ring (hexagon).
                `,
                examples: [
                    { smiles: 'C1CCCCC1', name: 'Cyclohexane' },
                    { smiles: 'CC1CCCCC1', name: 'Methylcyclohexane' },
                    { smiles: 'CC1(C)CCCCC1', name: '1,1-Dimethylcyclohexane' },
                    { smiles: 'IC1CCCCC1', name: 'Iodocyclohexane' },
                    { smiles: 'CCC1CCCC(C)C1', name: '1-Ethyl-3-methylcyclohexane' }
                ],
                rules: [
                    {
                        id: 'rule_longest_chain',
                        name: 'Longest Chain',
                        smarts: '',
                        description: 'Identify the longest continuous carbon chain (or ring).',
                        unlocked: true,
                        logicType: 'longest_chain'
                    },
                    {
                        id: 'rule_subs',
                        name: 'Substituents',
                        smarts: '',
                        description: 'Identify substituents attached to the ring.',
                        unlocked: true,
                        logicType: 'identify_substituents'
                    },

                    {
                        id: 'rule_numbering',
                        name: 'Numbering',
                        smarts: '',
                        description: 'Number the ring to give substituents lowest locants.',
                        unlocked: true,
                        logicType: 'lowest_numbering'
                    },
                    {
                        id: 'rule_alphabetical',
                        name: 'Alphabetical Order',
                        smarts: '',
                        description: 'Sort substituents alphabetically (ignoring prefixes like di-, tri-).',
                        unlocked: true,
                        logicType: 'alphabetical_order'
                    },
                    {
                        id: 'validate_longest_chain',
                        name: 'Check: Parent Structure',
                        smarts: '',
                        description: 'Validate parent ring size and name.',
                        unlocked: true,
                        logicType: 'check_longest_chain'
                    },
                    {
                        id: 'validate_lowest_locants',
                        name: 'Check: Lowest Locants',
                        smarts: '',
                        description: 'Validate that the numbering used gives the lowest possible locants.',
                        unlocked: true,
                        logicType: 'check_lowest_locants'
                    },
                    {
                        id: 'validate_alphabetical',
                        name: 'Check: Alphabetical Order',
                        smarts: '',
                        description: 'Validate substituents are listed alphabetically.',
                        unlocked: true,
                        logicType: 'check_alphabetical'
                    },
                    {
                        id: 'validate_cyclo',
                        name: 'Check: Cyclo Naming',
                        smarts: '',
                        description: 'Validate cyclo- prefix and numbering rules for rings.',
                        unlocked: true,
                        logicType: 'check_cyclo_naming'
                    }
                ]
            },
            {
                id: 'alkanes-reactions',
                section: 'Reactions',
                name: 'Step 6: Reactions of Alkanes',
                content: `
### Free Radical Substitution
Alkanes are generally unreactive due to strong sigma bonds and a lack of partial charges, but they undergo halogenation under specific conditions.

#### Halogenation (Chlorination/Bromination)
Alkanes react with Cl\u2082 or Br\u2082 in the presence of **heat (\u0394)** or **light (h\u03BD)** to form alkyl halides and hydrogen halides.

- **Mechanism**: Proceeds via a radical chain reaction:
  1. **Initiation**: Homolytic cleavage of the halogen.
  2. **Propagation**: Radical transfer.
  3. **Termination**: Radicals combine.

- **Selectivity**:
  - **Bromine (Br\u2082)**: Highly selective. Preferentially reacts with tertiary carbons over primary ones (3\u00B0 > 2\u00B0 > 1\u00B0) due to radical stability.
  - **Chlorine (Cl\u2082)**: Less selective, yields mixtures of products.

- **Limitations**: Fluorine reacts too violently; Iodine is too unreactive.
                `,
                reactionExamples: [
                    {
                        reactants: [
                            { smiles: 'CC(C)C', name: 'Isobutane' },
                            { smiles: 'BrBr', name: 'Bromine' }
                        ],
                        products: [
                            { smiles: 'CC(C)(Br)C', name: 'tert-Butyl bromide', selectivity: 'major', yield: 99 },
                            { smiles: 'CC(C)CBr', name: 'Isobutyl bromide', selectivity: 'minor', yield: 1 }
                        ],
                        conditions: 'hν or Δ'
                    },
                    {
                        reactants: [
                            { smiles: 'CC(C)C', name: 'Isobutane' },
                            { smiles: 'ClCl', name: 'Chlorine' }
                        ],
                        products: [
                            { smiles: 'CC(C)(Cl)C', name: 'tert-Butyl chloride', selectivity: 'equal', yield: 64 },
                            { smiles: 'CC(C)CCl', name: 'Isobutyl chloride', selectivity: 'equal', yield: 36 }
                        ],
                        conditions: 'hν or Δ'
                    }
                ],
                examples: [],
                rules: []
            }
        ]
    },
    {
        id: 'alkenes',
        name: 'Alkenes',
        icon: '═',
        subSubjects: [
            {
                id: 'alkenes-step1-intro',
                section: 'Basics',
                name: 'Step 1: The Double Bond',
                content: `
Alkenes are hydrocarbons that contain at least one **Carbon-Carbon Double Bond (C=C)**. Because they have fewer hydrogens than alkanes, they are called "unsaturated".

### Naming Change
The suffix of the parent name changes from **-ane** to **-ene**.
- Ethane (C-C) → **Ethene** (C=C)
- Propane → **Propene**

### Locators
If the double bond can be in more than one position, you must use a number to say where it starts.
- **But-1-ene**: C=C-C-C
- **But-2-ene**: C-C=C-C
                `,
                examples: [
                    { smiles: 'C=C', name: 'Ethene' },
                    { smiles: 'CC=C', name: 'Propene' },
                    { smiles: 'CC=CC', name: 'But-2-ene' }
                ],
                rules: [
                    {
                        id: 'rule_longest_chain_alkene',
                        name: 'Parent Chain',
                        smarts: '',
                        description: 'The parent chain MUST contain the double bond, even if shorter than other chains.',
                        unlocked: true,
                        logicType: 'longest_chain'
                    },
                    {
                        id: 'rule_numbering_alkene',
                        name: 'Lowest Numbering',
                        smarts: '',
                        description: 'Number the chain to give the Double Bond the lowest possible number.',
                        unlocked: true,
                        logicType: 'lowest_numbering'
                    }
                ]
            },

            {
                id: 'alkenes-step2-complex',
                section: 'Advanced',
                name: 'Step 2: Multiple Double Bonds & Rings',
                content: `
### Multiple Double Bonds (Dienes, Trienes)
If there is more than one double bond:
1.  **Suffix**: Change to **-diene**, **-triene**, etc.
2.  **Epenthesis**: An 'a' is often added to the root for pronunciation (e.g., *Buta*-1,3-diene instead of *But*-1,3-diene).
3.  **Numbering**: Indicate the position of **every** double bond.

### Cycloalkenes
In a ring:
1.  The double bond is **always** at positions 1 and 2.
2.  Number to give the lowest locants to substituents.
3.  You typically don't state the double bond locant "1" for simple cycloalkenes (e.g., Cyclohexene, not Cyclohex-1-ene).

### Examples
-   **Buta-1,3-diene**: Double bonds at 1 and 3.
-   **Cyclopenta-1,3-diene**: Two double bonds in a 5-ring.
-   **3-Methylcyclohexene**: Number 1 and 2 are the double bond; methyl is at 3.
                `,
                examples: [
                    { smiles: 'C=CC=C', name: 'Buta-1,3-diene' },
                    { smiles: 'C1=CCC=C1', name: 'Cyclopenta-1,3-diene' },
                    { smiles: 'CC1=CCCCC1', name: '1-Methylcyclohexene' },
                    { smiles: 'CC1CCCC=C1', name: '3-Methylcyclohexene' },
                    { smiles: 'C/C(C)=C/CC', name: '2-Methylpent-2-ene' }
                ],
                rules: [
                    {
                        id: 'rule_polyenes',
                        name: 'Polyenes',
                        smarts: '',
                        description: 'Use diene/triene suffixes and locate all bonds.',
                        unlocked: true,
                        logicType: 'check_longest_chain'
                    }
                ]
            },
            {
                id: 'alkenes-cis-trans',
                section: 'Stereochemistry',
                name: 'Step 3: Cis vs Trans',
                content: `
**Cis/Trans** notation is used when there are **identical groups** relative to the double bond (often Hydrogens).

### How to Find the Groups
1.  Look at the two carbons of the double bond.
2.  Do they share a common group/atom? (e.g. both have a Hydrogen, or both have a Methyl group).
3.  These are your reference groups.

### The Rule
-   **Cis**: The identical groups are on the **same side** of the double bond.
-   **Trans**: The identical groups are on **opposite sides**.

### Stability
**Trans** isomers are generally more stable than cis isomers because the bulky groups are farther apart (less "steric hindrance").
                `,
                examples: [
                    { smiles: 'C/C=C\\C', name: 'cis-But-2-ene' },
                    { smiles: 'C/C=C/C', name: 'trans-But-2-ene' }
                ],
                rules: []
            },
            {
                id: 'alkenes-e-z',
                section: 'Stereochemistry',
                name: 'Step 4: E vs Z (Priority)',
                content: `
When all four groups attached to the double bond are different, Cis/Trans is ambiguous. We use the **E/Z system**.

### How to Find the Groups (CIP Rules)
We assign a **Priority** to the two groups on *each* carbon atom individually using the **Cahn-Ingold-Prelog** rules:
1.  **Atomic Number**: The atom with the higher atomic number gets **High Priority (1)**.
    -   *Example*: Br (35) > Cl (17) > F (9) > O (8) > C (6) > H (1).
2.  **Tie-Breaker**: If the first atoms are identical, move to the next atoms attached to them until you find a difference.
3.  **Multiple Bonds**: Double bonds count as if the atom were bonded to the same atom **twice**. Triple bonds count **three times**.
    -   *Example*: A Carbon bonded to Oxygen (C=O) counts as being bonded to **two** Oxygens.

### The Rule
Once you have identified the High Priority group on Carbon A and Carbon B:
-   **Z (Zusammen)**: The High Priority groups are on the **same side**. ("Zame Side")
-   **E (Entgegen)**: The High Priority groups are on **opposite sides**.
                `,
                examples: [
                    { smiles: 'F/C(Br)=C(/I)Cl', name: '(Z)-2-Bromo-1-chloro-2-fluoro-1-iodoethene' },
                    { smiles: 'F/C(Br)=C(\\Cl)I', name: '(E)-2-Bromo-1-chloro-2-fluoro-1-iodoethene' }
                ],
                rules: []
            },
            {
                id: 'alkenes-reactions',
                section: 'Reactions',
                name: 'Step 5: Reactions of Alkenes',
                content: `
### Electrophilic Addition
Alkenes are electron-rich nucleophiles (due to the \u03C0 bond) that react with electrophiles. The \u03C0 bond breaks to form two new \u03C3 bonds.

#### 1. Addition via Carbocation Intermediates
Subject to **Markovnikov\u2019s Rule** and rearrangements (3\u00B0 > 2\u00B0 > 1\u00B0).

- **Hydrohalogenation (HX)**: Alkene + HCl/HBr \u2192 Alkyl Halide. H adds to the side with more H's (Markovnikov).
- **Acid-Catalyzed Hydration**: Alkene + H\u2082O (H\u208A) \u2192 Alcohol.
- **Addition of Alcohols**: Alkene + ROH (H\u208A) \u2192 Ether.

#### 2. Addition without Rearrangement
- **Hydroboration-Oxidation**: Alkene + 1) BH\u2083 2) H\u2082O\u2082, OH\u207B \u2192 Alcohol. **Anti-Markovnikov** addition of OH. Syn addition.
- **Halogenation**: Alkene + Br\u2082/Cl\u2082 \u2192 Vicinal Dihalide. Anti addition via cyclic halonium ion.
- **Halogenation (Halohydrin)**: Alkene + Br\u2082 + H\u2082O \u2192 Halohydrin (OH and Br). OH adds to the more substituted carbon.

#### 3. Oxidation and Reduction
- **Hydrogenation**: Alkene + H\u2082 (Pd/C) \u2192 Alkane. Syn addition.
- **Epoxidation**: Alkene + RCOOOH (mCPBA) \u2192 Epoxide.
- **Ozonolysis**: 1) O\u2083 2) Zn/DMS \u2192 Cleaves double bond to form Ketones/Aldehydes.
- **Hydroxylation**: KMnO\u2084 or OsO\u2084 \u2192 Syn-diol.
                `,
                reactionExamples: [
                    {
                        reactants: [
                            { smiles: 'CC=C', name: 'Propene' },
                            { smiles: 'Br', name: 'HBr' }
                        ],
                        products: [
                            { smiles: 'CC(Br)C', name: '2-Bromopropane', selectivity: 'major', yield: 95 },
                            { smiles: 'CCCBr', name: '1-Bromopropane', selectivity: 'minor', yield: 5 }
                        ],
                        conditions: ''
                    },
                    {
                        reactants: [
                            { smiles: 'CC=C', name: 'Propene' },
                            { smiles: 'B', name: 'BH3' }
                        ],
                        products: [
                            { smiles: 'CCCO', name: 'Propan-1-ol', selectivity: 'major', yield: 99 }
                        ],
                        conditions: '1) BH3, 2) H2O2, NaOH'
                    },
                    {
                        reactants: [
                            { smiles: 'C=C', name: 'Ethene' },
                            { smiles: 'BrBr', name: 'Bromine' }
                        ],
                        products: [
                            { smiles: 'BrCCBr', name: '1,2-Dibromoethane', selectivity: 'major', yield: 100 }
                        ],
                        conditions: ''
                    }
                ],
                examples: [],
                rules: []
            }
        ]
    },
    {
        id: 'alkynes',
        name: 'Alkynes',
        icon: '≡',
        subSubjects: [
            {
                id: 'alkynes-intro',
                section: 'Basics',
                name: 'Triple Bonds',
                content: `
Alkynes contain a **Carbon-Carbon Triple Bond (C≡C)**. 

### Naming
Change suffix to **-yne**.
- Ethane → **Ethyne** (commonly called Acetylene)
- Propane → **Propyne**

### Priority
Like alkenes, the triple bond gets priority for the lowest number.
- **But-1-yne**: C≡C-C-C
- **But-2-yne**: C-C≡C-C
                `,
                examples: [
                    { smiles: 'C#C', name: 'Ethyne' },
                    { smiles: 'CC#C', name: 'Propyne' },
                    { smiles: 'CC#CC', name: 'But-2-yne' },
                    { smiles: 'CC(C)C#C', name: '3-Methylbut-1-yne' }
                ],
                rules: [
                    {
                        id: 'rule_longest_chain_alkyne',
                        name: 'Parent Chain',
                        smarts: '',
                        description: 'The parent chain MUST contain the triple bond.',
                        unlocked: true,
                        logicType: 'longest_chain'
                    },
                    {
                        id: 'rule_numbering_alkyne',
                        name: 'Lowest Numbering',
                        smarts: '',
                        description: 'Number the chain to give the Triple Bond the lowest possible number.',
                        unlocked: true,
                        logicType: 'lowest_numbering'
                    }
                ]
            },
            {
                id: 'enynes-intro',
                section: 'Advanced',
                name: 'Enynes (Double & Triple)',
                content: `
What if a molecule has **both** a double and a triple bond?

1.  **Parent Chain**: Must contain both bonds.
2.  **Numbering Priority**: 
    -   Generally, number to give the *set* of unsaturations the lowest locants.
    -   **Tie Breaker**: If locants are identical either way, the **Double Bond** gets the lower number over the Triple bond.
3.  **Naming Order**: The "ene" suffix comes before "yne". The "e" at the end of "ene" is dropped to avoid two vowels.
    -   Format: **alk-x-en-y-yne**.

### Example
-   **Pent-1-en-4-yne**: (C=C-C-C#C). Number from double bond (1, 4) vs triple (1, 4). Tie -> Double bond gets 1.
                `,
                examples: [
                    { smiles: 'C=CC#C', name: 'But-1-en-3-yne (Vinylacetylene)' },
                    { smiles: 'C=CCCC#C', name: 'Hex-1-en-5-yne' },
                    { smiles: 'C=CC(CC)C#C', name: '3-Ethylpent-1-en-4-yne' }
                ],
                rules: [
                    {
                        id: 'rule_enyne_priority',
                        name: 'Enyne Priority',
                        smarts: '',
                        description: 'Double bonds win ties against Triple bonds, but lowest set rule comes first.',
                        unlocked: true,
                        logicType: 'lowest_numbering'
                    }
                ]
            },
            {
                id: 'alkynes-reactions',
                section: 'Reactions',
                name: 'Step 3: Reactions of Alkynes',
                content: `
### Reactions of Alkynes
Alkynes have two \u03C0 bonds and can undergo addition twice.

#### Addition Reactions
- **Hydrohalogenation (HX)**:
  - 1 eq: Vinyl Halide.
  - Excess: Geminal Dihalide.
- **Halogenation (X\u2082)**:
  - 1 eq: Dihaloalkene.
  - Excess: Tetrahaloalkane.

#### Hydration (Ketone/Aldehyde Synthesis)
- **Acid-Catalyzed (HgSO\u2084)**: Forms **Ketones** (Markovnikov). Enol intermediate tautomerizes to ketone.
- **Hydroboration-Oxidation**:
  - Terminal Alkyne \u2192 **Aldehyde** (Anti-Markovnikov).
  - Internal Alkyne \u2192 Ketone.

#### Reduction
- **Complete**: H\u2082 + Pd/C \u2192 Alkane.
- **Partial (Cis)**: H\u2082 + Lindlar's Catalyst \u2192 Cis-Alkene.
- **Partial (Trans)**: Na/NH\u2083(l) \u2192 Trans-Alkene.

#### Acetylide Ion Chemistry
Terminal alkynes are acidic (pKa \u2248 25).
- **Alkylation**: R-C\u2261C-H + NaNH\u2082 \u2192 R-C\u2261C\u207B (Acetylide).
- This nucleophile attacks primary alkyl halides (R'-X) to form a longer carbon chain: R-C\u2261C-R'.
                `,
                reactionExamples: [
                    {
                        reactants: [
                            { smiles: 'CC#C', name: 'Propyne' },
                            { smiles: 'O', name: 'H2O' }
                        ],
                        products: [
                            { smiles: 'CC(=O)C', name: 'Acetone', selectivity: 'major', yield: 100 }
                        ],
                        conditions: 'HgSO4, H2O, H+'
                    },
                    {
                        reactants: [
                            { smiles: 'CC#C', name: 'Propyne' },
                            { smiles: 'CI', name: 'CH3I' }
                        ],
                        products: [
                            { smiles: 'CCC#C', name: 'But-1-yne', selectivity: 'major', yield: 100 }
                        ],
                        conditions: '1) NaNH2, 2) CH3I'
                    }
                ],
                examples: [],
                rules: []
            }
        ]
    },
]
