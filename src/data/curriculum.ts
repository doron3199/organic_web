export type RuleLogicType = 'longest_chain' | 'identify_substituents' | 'lowest_numbering'

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
                    }
                ]
            },
            {
                id: 'alkanes-step2-substituents',
                section: 'Nomenclature',
                name: 'Step 2: Identify Substituents',
                content: `
Often, you'll find carbon groups branching off the main chain. These are called **substituents** or "alkyl groups".

### Naming Branches
- **Methyl**: A 1-carbon branch (-CH3)
- **Ethyl**: A 2-carbon branch (-CH2CH3)
- **Propyl**: A 3-carbon branch (-CH2CH2CH3)

### Structure
The branch is just a prefix added to the parent name. For example, a methyl group on a pentane chain is a "Methylpentane".
                `,
                examples: [
                    { smiles: 'CC(C)CCC', name: '2-Methylpentane' },
                    { smiles: 'CCC(CC)CCC', name: '3-Ethylhexane' }
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
                        smarts: '[C]([C])[C]', // Matches branching pattern
                        description: 'Identify branches attached to the main chain.',
                        unlocked: true,
                        logicType: 'identify_substituents'
                    }
                ]
            },
            {
                id: 'alkanes-step3-numbering',
                section: 'Nomenclature',
                name: 'Step 3: Numbering the Chain',
                content: `
You must tell us *where* the branch is! 

### The Low Number Rule
Number the carbon atoms in the parent chain starting from the end **closest** to the first branch. This ensures the locant (the number) is as small as possible.

- **Correct**: 2-Methylpentane
- **Incorrect**: 4-Methylpentane (counting from the wrong side!)
                `,
                examples: [
                    { smiles: 'CC(C)CCCC', name: '2-Methylhexane' },
                    { smiles: 'CCCCC(C)C', name: '2-Methylhexane (flipped)' }
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
                        description: 'Number the chain to give substituents the lowest possible numbers.',
                        unlocked: true,
                        logicType: 'lowest_numbering'
                    }
                ]
            }
        ]
    },
]
