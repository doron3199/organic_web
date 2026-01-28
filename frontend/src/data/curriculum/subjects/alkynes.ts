import { Subject } from '../types';

export const alkynes: Subject = {
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
            name: 'Reactions of Alkynes',
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
}