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
            id: 'alkynes-addition',
            section: 'Reactions',
            name: 'Addition to Alkynes',
            content: `
### Addition of HX and X₂
Alkynes have two π bonds and can undergo addition reactions twice.

- **Hydrohalogenation (HX)**:
  - **1 Equivalent**: Forms a **vinyl halide**.
  - **Excess**: Forms a **geminal dihalide** (both halogens on the same carbon).
- **Halogenation (X₂)**:
  - **1 Equivalent**: Forms a **dihaloalkene** (usually trans).
  - **Excess**: Forms a **tetrahaloalkane**.
            `,
            reactionExamples: [
                {
                    id: 'alkyne_hydrohalogenation_1eq',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CC(Br)=C', name: '2-Bromopropene', selectivity: 'major' }
                    ],
                    conditions: '1 eq.'
                },
                {
                    id: 'alkyne_hydrohalogenation_2eq',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: 'Br', name: 'HBr' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CC(Br)(Br)C', name: '2,2-Dibromopropane', selectivity: 'major' }
                    ],
                    conditions: 'Excess'
                },
                {
                    id: 'alkyne_halogenation_1eq',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: 'BrBr', name: 'Bromine' }
                    ],
                    products: [
                        { smiles: 'CC(Br)=C(Br)', name: '1,2-Dibromopropene', selectivity: 'major' }
                    ],
                    conditions: '1 eq.'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkynes-hydration',
            section: 'Reactions',
            name: 'Hydration (Ketones & Aldehydes)',
            content: `
### Hydration of Alkynes
Addition of H₂O across the triple bond forms an **enol**, which rapidly tautomerizes to a stable carbonyl group (Ketone or Aldehyde).

#### 1. Acid-Catalyzed (Markovnikov)
Using HgSO₄ and H₂SO₄. 
- Result: **Ketone** (Markovnikov addition of OH).

#### 2. Hydroboration-Oxidation (Anti-Markovnikov)
Using R₂BH (like Disiamylborane) followed by H₂O₂/NaOH.
- Result: **Aldehyde** (from terminal alkyne).
            `,
            reactionExamples: [
                {
                    id: 'alkyne_hydration_acid',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: 'O', name: 'H2O' }
                    ],
                    products: [
                        { smiles: 'CC(=O)C', name: 'Acetone', selectivity: 'major' }
                    ],
                    conditions: 'HgSO4, H+, H2O'
                },
                {
                    id: 'alkyne_hydroboration',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: 'B', name: 'R2BH' }
                    ],
                    products: [
                        { smiles: 'CCC=O', name: 'Propanal', selectivity: 'major' }
                    ],
                    conditions: '1) R2BH, 2) H2O2, NaOH'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkynes-reduction',
            section: 'Reactions',
            name: 'Reduction of Alkynes',
            content: `
### Complete and Partial Reduction
You can control whether you reduce an alkyne all the way to an alkane or stop at an alkene.

- **To Alkane**: Use H₂ with Pd/C or Pt.
- **To Cis-Alkene**: Use H₂ and **Lindlar's Catalyst** (a "poisoned" catalyst).
- **To Trans-Alkene**: Use **Sodium in Liquid Ammonia** (Na/NH₃(l)).
            `,
            reactionExamples: [
                {
                    id: 'alkyne_reduction_complete',
                    reactants: [
                        { smiles: 'CC#CC', name: 'But-2-yne' },
                        { smiles: '[H][H]', name: 'H2' },
                        { smiles: '[H][H]', name: 'H2' }
                    ],
                    products: [
                        { smiles: 'CCCC', name: 'Butane', selectivity: 'major' }
                    ],
                    conditions: 'Pd/C'
                },
                {
                    id: 'alkyne_reduction_cis',
                    reactants: [
                        { smiles: 'CC#CC', name: 'But-2-yne' },
                        { smiles: '[H][H]', name: 'H2' }
                    ],
                    products: [
                        { smiles: 'C/C=C\\C', name: 'cis-But-2-ene', selectivity: 'major' }
                    ],
                    conditions: 'Lindlar Catalyst'
                },
                {
                    id: 'alkyne_reduction_trans',
                    reactants: [
                        { smiles: 'CC#CC', name: 'But-2-yne' },
                        { smiles: '[H][H]', name: 'H2' }
                    ],
                    products: [
                        { smiles: 'C/C=C/C', name: 'trans-But-2-ene', selectivity: 'major' }
                    ],
                    conditions: 'Na, NH3(l)'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkynes-alkylation',
            section: 'Reactions',
            name: 'Acetylide Chemistry',
            content: `
### Formation of Acetylide Ions
Terminal alkynes are unusually acidic (pKa ≈ 25). Strong bases like **NaNH₂** can deprotonate them to form an **Acetylide Ion** (R-C≡C⁻).

### Carbon-Carbon Bond Formation
The acetylide ion is a powerful nucleophile. It reacts with **primary alkyl halides** to form a new $C-C$ bond, effectively lengthening the carbon chain.
            `,
            reactionExamples: [
                {
                    id: 'alkyne_alkylation',
                    reactants: [
                        { smiles: 'C#C', name: 'Ethyne' },
                        { smiles: 'CI', name: 'Methyl Iodide' }
                    ],
                    products: [
                        { smiles: 'CC#C', name: 'Propyne', selectivity: 'major' },
                        { smiles: 'I', name: 'HI', isByproduct: true }
                    ],
                    conditions: '1) NaNH2, 2) CH3I'
                }
            ],
            examples: [],
            rules: []
        }
    ]
}