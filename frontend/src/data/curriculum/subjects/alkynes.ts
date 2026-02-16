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
        },
        {
            id: 'alkynes-addition-hx',
            section: 'Reactions',
            name: 'Addition of HX',
            content: `
### Hydrohalogenation (HX)
Alkynes contain two π bonds and can react with hydrogen halides (like HBr, HCl) twice.

- **1 Equivalent**: Forms a **vinyl halide**.
  - Follows **Markovnikov's Rule**: H adds to the less substituted carbon to form the more stable vinyl cation.
- **Excess**: Forms a **geminal dihalide** (both halogens on the same carbon).

#### Relative Stabilities of Carbocations
The stability of the carbocation intermediate determines the major product. **Hyperconjugation** and inductive effects stabilize the positive charge by donating electron density from adjacent C-C or C-H bonds.

**Stability Order:**

| Tertiary (3°) | Secondary (2°) | 2° Vinylic | Primary (1°) | 1° Vinylic | Methyl | Vinyl |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| ![Tertiary](/assets/tertiary_carbocation.svg) | ![Secondary](/assets/secondary_carbocation.svg) | ![2° Vinylic](/assets/secondary_vinylic_cation.svg) | ![Primary](/assets/primary_carbocation.svg) | ![1° Vinylic](/assets/primary_vinylic_cation.svg) | ![Methyl](/assets/methyl_carbocation.svg) | ![Vinyl](/assets/vinyl_cation.svg) |
| **Most Stable** | | | | | | **Least Stable** |
            `,
            reactionExamples: [
                {
                    id: 'alkyne_hydrohalogenation_1eq',
                    reactants: [
                        { smiles: 'CC#CC', name: 'but-2-yne' },
                        { smiles: 'Cl', name: 'HCl' }
                    ],
                    products: [
                        { smiles: 'CC(Cl)=CC', name: '2-Chlorobut-2-ene', selectivity: 'major' }
                    ],
                    conditions: ''
                },
                {
                    id: 'alkyne_hydrohalogenation_2eq',
                    reactants: [
                        { smiles: 'CC#CCC', name: 'Pent-2-yne' },
                        { smiles: 'Br', name: 'HBr' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CC(Br)(Br)CCC', name: '2,2-Dibromopentane', selectivity: 'equal' },
                        { smiles: 'CCC(CC)(Br)Br', name: '3,3-Dibromopentane', selectivity: 'equal' }
                    ],
                    conditions: 'Excess'
                }
            ],
            examples: [],
        },
        {
            id: 'alkynes-addition-x2',
            section: 'Reactions',
            name: 'Addition of X₂',
            content: `
### Halogenation (X₂)
Alkynes react with halogens (X₂ = Cl₂, Br₂).

- **1 Equivalent**: Forms a **dihaloalkene**.
  - Usually occurs with **anti-addition** (trans stereochemistry).
- **Excess**: Forms a **tetrahaloalkane**.

#### Relative Reactivity
Alkene > Alkyne > Halo-substituted Alkene

| Alkene | | Alkyne | | Halo-substituted Alkene |
| :---: | :---: | :---: | :---: | :---: |
| ![Alkene](/assets/alkene_flat.svg) | **>** | ![Alkyne](/assets/alkyne_flat.svg) | **>** | ![Halo](/assets/halo_substituted_alkene.svg) |
| **Most Reactive** | | | | **Least Reactive** |
            `,
            reactionExamples: [
                {
                    id: 'alkyne_halogenation_1eq',
                    reactants: [
                        { smiles: 'CC#CC', name: 'But-2-yne' },
                        { smiles: 'BrBr', name: 'Bromine' }
                    ],
                    products: [
                        { smiles: 'C/C(=C(\Br)/C)/Br', name: '2,3-DiBromobut-2-ene', selectivity: 'major' }
                    ],
                    conditions: ''
                },
                {
                    id: 'alkyne_halogenation_2eq',
                    reactants: [
                        { smiles: 'CC#CC', name: 'But-2-yne' },
                        { smiles: 'BrBr', name: 'Bromine' },
                        { smiles: 'BrBr', name: 'Bromine' }
                    ],
                    products: [
                        { smiles: 'CC(C(Br)(Br)C)(Br)Br', name: '2,2,3,3-TetraBromoButane', selectivity: 'major' }
                    ],
                    conditions: 'Excess'
                }
            ],
            examples: [],
        },
        {
            id: 'alkynes-hydration-acid',
            section: 'Reactions',
            name: 'Acid-Catalyzed Hydration',
            content: `
### Acid-Catalyzed Hydration
Alkynes react with water in the presence of acid (H₂SO₄) and a mercury catalyst (HgSO₄) to form ketones.

- **Mechanism**:
  1. **Enol Formation**: Water adds to the triple bond (Markovnikov addition) to form a vinyl alcohol (Enol).
  2. **Tautomerization**: The unstable enol rapidly rearranges (tautomerizes) via proton transfer to form the more stable **Ketone**.

#### Markovnikov's Rule
The OH group adds to the **more substituted** carbon. For terminal alkynes, this always yields a **Methyl Ketone**.
            `,
            reactionExamples: [
                {
                    id: 'alkyne_hydration_acid',
                    reactants: [
                        { smiles: 'CC#CC', name: 'But-2-yne' },
                        { smiles: 'O', name: 'H2O' }
                    ],
                    products: [
                        { smiles: 'CCC(=O)C', name: '2-MethylButanal', selectivity: 'major' }
                    ],
                    conditions: 'H₂SO₄'
                }
            ],
            examples: [],
        },
        {
            id: 'alkynes-hydration-hydroboration',
            section: 'Reactions',
            name: 'Hydroboration-Oxidation',
            content: `
### Hydroboration-Oxidation
To convert a terminal alkyne into an **Aldehyde** (Anti-Markovnikov product), we use hydroboration-oxidation.

- **Reagents**: A bulky borane like **Disiamylborane (Sia₂BH)** or **9-BBN** is often used to stop addition at the alkene stage.
- **Mechanism**:
  1. **Hydroboration**: Boron adds to the **less hindered** terminal carbon (Anti-Markovnikov).
  2. **Oxidation**: Basic Hydrogen Peroxide (H₂O₂, NaOH) converts the C-B bond to a C-OH enol.
  3. **Tautomerization**: The enol rearranges to form an **Aldehyde**.
            `,
            reactionExamples: [
                {
                    id: 'alkyne_hydroboration',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: 'B', name: 'R2BH' }
                    ],
                    products: [
                        { smiles: 'CCC=O', name: 'Propanal', selectivity: 'major' }
                    ],
                    conditions: '',
                    autoAddMolecules: [
                        { smiles: '[OH-]', name: 'OH⁻' },
                        { smiles: 'OO', name: 'H₂O₂' },
                        { smiles: 'O', name: 'H₂O' }
                    ]
                }
            ],
            examples: [],
        },
        {
            id: 'alkynes-reduction-complete',
            section: 'Reactions',
            name: 'Complete Reduction',
            content: `
### Catalytic Hydrogenation
Alkynes can be reduced completely to **Alkanes** by adding two equivalents of hydrogen gas (H₂).

- **Reagents**: H₂ gas with a metal catalyst (Pt, Pd, Ni).
- **Process**: The reaction is difficult to stop at the alkene stage with standard catalysts, so it proceeds all the way to the alkane.
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
                }
            ],
            examples: [],
        },
        {
            id: 'alkynes-reduction-cis',
            section: 'Reactions',
            name: 'Reduction to Cis-Alkene',
            content: `
### Lindlar's Reduction
To stop the hydrogenation at the alkene stage, a **Poisoned Catalyst** is used.

- **Reagent**: H₂ + **Lindlar's Catalyst** (Pd/CaCO₃ deactivated with lead acetate or quinoline).
- **Stereochemistry**: **Syn-Addition**. Both hydrogen atoms add to the same face of the alkene (surface catalysis).
- **Result**: A **Cis-Alkene** (Z-Alkene).
            `,
            reactionExamples: [
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
                }
            ],
            examples: [],
        },
        {
            id: 'alkynes-alkylation',
            section: 'Synthesis',
            name: 'Alkylation of Acetylide Ions',
            content: `
### Formation of C-C Bonds
One of the most useful reactions of alkynes is the **Alkylation** of terminal alkynes. This allows us to extend the carbon chain and synthesize larger alkynes from smaller ones.

#### Step 1: Deprotonation
Terminal alkynes are weakly acidic (pKa ≈ 25). A **very strong base** like **Sodium Amide (NaNH₂)** is required to remove the proton from the terminal carbon, forming an **Acetylide Ion**.
- *Note*: Hydroxide ion (OH⁻, pKa ≈ 15.7) is **not** strong enough to deprotonate an alkyne. We need the amide ion (NH₂⁻, pKa ≈ 38 for NH₃).

#### Step 2: Alkylation
The resulting Acetylide Ion is a strong nucleophile.

            `,
            reactionExamples: [
                {
                    id: 'alkyne_deprotonation',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: '[NH2-]', name: 'NH2' }
                    ],
                    products: [
                        { smiles: 'CC#[C-]', name: 'Propyne Acetylide', selectivity: 'major' }
                    ],
                    conditions: ''
                },
                {
                    id: 'acetylide_alkylation',
                    reactants: [
                        { smiles: 'CC#[C-]', name: 'Propyne Acetylide' },
                        { smiles: 'CCBr', name: 'Ethyl Bromide' }
                    ],
                    products: [
                        { smiles: 'CC#CCC', name: 'Pent-2-yne', selectivity: 'major' }
                    ],
                    conditions: ''
                },
                {
                    id: 'carbon_carbon_addition',
                    reactants: [
                        { smiles: 'CC#C', name: 'Propyne' },
                        { smiles: '[NH2-]', name: 'NH2' },
                        { smiles: 'CCBr', name: 'Ethyl Bromide' }
                    ],
                    products: [
                        { smiles: 'CC#CCC', name: 'Pent-2-yne', selectivity: 'major' }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
        }
    ]
}