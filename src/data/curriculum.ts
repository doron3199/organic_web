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


export interface SubSubject {
    id: string
    name: string
    rules: Rule[]
    content: string // Markdown or HTML content
    examples: { smiles: string; name: string }[]
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
            }
        ]
    },
]
