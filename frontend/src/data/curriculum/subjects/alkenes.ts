import { Subject } from '../types';

export const alkenes: Subject = {
    id: 'alkenes',
    name: 'Alkenes',
    icon: '═',
    subSubjects: [
        {
            id: 'alkenes-step1-intro',
            section: 'Basics',
            name: 'The Double Bond',
            content: `
Alkenes are hydrocarbons that contain at least one **Carbon-Carbon Double Bond (C=C)**. Because they have fewer hydrogens than alkanes, they are called "unsaturated".

### Naming Change
The suffix of the parent name changes from **-ane** to **-ene**.
- Ethane (C-C) → **Ethene** (C=C)
- Propane → **Propene**

### Locators
If the double bond is in the first position, you don't need to use a number.
If the double bond is not in the first position, you must use a number to say where it starts.
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
            name: 'Multiple Double Bonds & Rings',
            content: `
### Multiple Double Bonds (Dienes, Trienes)
If there is more than one double bond:
1.  **Suffix**: Change to **-diene**, **-triene**, etc.
2.  **Epenthesis**: An 'a' is often added to the root for pronunciation (e.g., *Buta*-1,3-diene instead of *But*-1,3-diene).
3.  **Numbering**: You must include every double bond in the parent chain.

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
            name: 'Cis vs Trans',
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

### Cycloalkenes (Rings)
In cyclic alkenes, the double bond is **always** in the **cis** configuration for rings smaller than 8 carbons (like cyclopentene or cyclohexene).
- The ring is too small and rigid to allow the carbons to "twist" into a trans configuration.
- Starting from **Cyclooctene** (8 carbons), the ring is large enough to accommodate a trans double bond.
            `,
            examples: [
                { smiles: 'C/C=C\\C', name: 'cis-But-2-ene' },
                { smiles: 'C/C=C/C', name: 'trans-But-2-ene' },
                { smiles: 'C1C=CCC1', name: 'Cyclopentene (cis)' },
                { smiles: 'C1CC=CCC1', name: 'Cyclohexene (cis)' },
                { smiles: 'C1CCC/C=C\\CC1', name: 'cis-Cyclooctene' },
                {
                    smiles: 'C1CCC/C=C/CC1',
                    name: 'trans-Cyclooctene (edit not supported)',
                    customSvgUrl: '/assets/trans_cyclooctane.svg'
                }
            ],
            rules: []
        },
        {
            id: 'alkenes-e-z',
            section: 'Stereochemistry',
            name: 'E vs Z (Priority)',
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
            id: 'alkenes-hydrohalogenation',
            section: 'Reactions',
            name: 'Hydrohalogenation (HX)',
            content: `
### Hydrohalogenation (HX)
Addition of H-F, H-Cl, H-Br, or H-I across the double bond to form a haloalkane.

- **Mechanism**: 
  1. **Protonation**: The π bond attacks H⁺, forming the more stable carbocation intermediate.
  2. **Nucleophilic Attack**: The halide ion (X⁻) attacks the carbocation.

### Markovnikov's Rule
The hydrogen atom adds to the carbon with more hydrogens ("The rich get richer"), while the halogen adds to the more substituted carbon.

#### Relative Stabilities of Carbocations
The stability of the carbocation intermediate determines the major product. **Hyperconjugation** and inductive effects stabilize the positive charge by donating electron density from adjacent C-C or C-H bonds.

**Stability Order:**

| Tertiary (3°) | Secondary (2°) | Primary (1°) | Methyl |
| :---: | :---: | :---: | :---: |
| ![Tertiary](/assets/tertiary_carbocation.svg) | ![Secondary](/assets/secondary_carbocation.svg) | ![Primary](/assets/primary_carbocation.svg) | ![Methyl](/assets/methyl_carbocation.svg) |
| **Most Stable** | | | **Least Stable** |
            `,
            reactionExamples: [
                {
                    id: 'alkene_hydrohalogenation_hbr',
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
                    id: 'alkene_hydrohalogenation_hcl',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'Cl', name: 'HCl' }
                    ],
                    products: [
                        { smiles: 'CC(Cl)C', name: '2-Chloropropane', selectivity: 'major', yield: 90 },
                        { smiles: 'CCCCl', name: '1-Chloropropane', selectivity: 'minor', yield: 10 }
                    ],
                    conditions: ''
                },
                {
                    id: 'alkene_hydrohalogenation_hi',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'I', name: 'HI' }
                    ],
                    products: [
                        { smiles: 'CC(I)C', name: '2-Iodopropane', selectivity: 'major', yield: 98 },
                        { smiles: 'CCCI', name: '1-Iodopropane', selectivity: 'minor', yield: 2 }
                    ],
                    conditions: ''
                },
                {
                    id: 'alkene_hydrohalogenation_hf',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'F', name: 'HF' }
                    ],
                    products: [
                        { smiles: 'CC(F)C', name: '2-Fluoropropane', selectivity: 'major' },
                        { smiles: 'CCCF', name: '1-Fluoropropane', selectivity: 'minor' }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-hydration',
            section: 'Reactions',
            name: 'Acid-Catalyzed Hydration',
            content: `
### Acid-Catalyzed Hydration
Addition of water (H₂O) in the presence of an acid catalyst (like H₂SO₄) to form an alcohol.

- **Mechanism**:
  1. **Protonation**: The π bond attacks H⁺ (from the acid), forming a carbocation.
  2. **Nucleophilic Attack**: Water attacks the carbocation.
  3. **Deprotonation**: A second water molecule removes a proton to yield the neutral alcohol.

Like hydrohalogenation, this reaction follows **Markovnikov's Rule** and involves carbocation intermediates, meaning rearrangements are possible.
            `,
            reactionExamples: [
                {
                    id: 'alkene_hydration',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'O', name: 'H₂O' }
                    ],
                    products: [
                        { smiles: 'CC(O)C', name: 'Propan-2-ol', selectivity: 'major', yield: 90 },
                        { smiles: 'CCCO', name: 'Propan-1-ol', selectivity: 'minor', yield: 10 }
                    ],
                    conditions: 'H+'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-alcohol-addition',
            section: 'Reactions',
            name: 'Acid-Catalyzed Addition of Alcohols',
            content: `
### Addition of Alcohols (Ether Formation)
Alcohols ($R-OH$) can add to alkenes in the presence of an acid catalyst to form **ethers**. This reaction is mechanistically identical to hydration, but using an alcohol instead of water.

- **Outcome**: The $OR$ group adds to the more substituted carbon (**Markovnikov**).
- **Product**: An ether (e.g., Methyl Propyl Ether).

- **Reaction**: 
  $Alkene + Alcohol \\xrightarrow{H^+} Ether$
            `,
            reactionExamples: [
                {
                    id: 'alkene_alcohol_addition_methanol',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'CO', name: 'Methanol' },
                        { smiles: 'CO', name: 'Methanol' }
                    ],
                    products: [
                        { smiles: 'CC(OC)C', name: '2-Methoxypropane', selectivity: 'major' },
                        { smiles: 'CCCOC', name: '1-Methoxypropane', selectivity: 'minor' }
                    ],
                    conditions: 'H+'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-rearrangements',
            section: 'Special Mechanisms',
            name: 'Carbocation Rearrangements',
            content: `
### Rearrangements: Hydride & Alkyl Shifts
Whenever a reaction involves a carbocation intermediate (like Hydration or HX addition), the intermediate may **rearrange** to form a more stable carbocation before the nucleophile attacks.

#### 1. 1,2-Hydride Shift
A Hydrogen atom and its electrons move from an adjacent carbon to the carbocation. This only happens if it creates a **more stable** carbocation (e.g., from secondary to tertiary).

#### 2. 1,2-Alkyl Shift (Carbon Switch)
A methyl or other alkyl group moves to the carbocation. This often happens next to quaternary carbons.

#### Stability Re-cap:
Tertiary (3°) > Secondary (2°) > Primary (1°).
            `,
            reactionExamples: [
                {
                    id: 'alkene_rearrangement_hx',
                    reactants: [
                        { smiles: 'CC(C)C=C', name: '3-Methylbut-1-ene' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CC(C)(Br)CC', name: '2-Bromo-2-methylbutane', selectivity: 'major', yield: 60 },
                        { smiles: 'CC(C)C(Br)C', name: '2-Bromo-3-methylbutane', selectivity: 'minor', yield: 40 }
                    ],
                    conditions: 'No Rearrangement vs Rearrangement'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-hydroboration',
            section: 'Reactions',
            name: 'Hydroboration-Oxidation',
            content: `
### Hydroboration-Oxidation
A two-step method to convert an alkene into an alcohol with **Anti-Markovnikov** regioselectivity and **Syn** stereochemistry.

- **Mechanism**:
  1. **Hydroboration**: BH₃ adds across the double bond in a single concerted step. The Boron adds to the less hindered (less substituted) carbon.
  2. **Oxidation**: H₂O₂ and NaOH replace the Boron with an OH group, retaining stereochemistry.

- **Outcome**: The $OH$ group ends up on the *less* substituted carbon.
            `,
            reactionExamples: [
                {
                    id: 'alkene_hydroboration',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'B', name: 'BH3' }
                    ],
                    products: [
                        { smiles: 'CCCO', name: 'Propan-1-ol', selectivity: 'major', yield: 99 }
                    ],
                    conditions: '1) BH3, 2) H2O2, NaOH'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-halogenation',
            section: 'Reactions',
            name: 'Halogenation (Anti-Addition)',
            content: `
### Halogenation (X₂)
Addition of Cl₂ or Br₂ to form vicinal dihalides.

- **Mechanism**:
  1. **Halonium Ion**: Formation of a cyclic bridged ion (e.g., bromonium ion).
  2. **Anti-Attack**: The second halogen atom attacks from the **opposite side** (Trans/Anti addition).

#### Halohydrin Formation
If the reaction is done in **water**, H₂O acts as the nucleophile in the second step, adding OH to the **more substituted** carbon.
            `,
            reactionExamples: [
                {
                    id: 'alkene_halogenation',
                    reactants: [
                        { smiles: 'C=C', name: 'Ethene' },
                        { smiles: 'BrBr', name: 'Bromine' }
                    ],
                    products: [
                        { smiles: 'BrCCBr', name: '1,2-Dibromoethane', selectivity: 'major', yield: 100 }
                    ],
                    conditions: 'CH2Cl2'
                },
                {
                    id: 'alkene_halohydrin',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'BrBr', name: 'Bromine' },
                        { smiles: 'O', name: 'H2O' }
                    ],
                    products: [
                        { smiles: 'CC(O)CBr', name: '1-Bromopropan-2-ol', selectivity: 'major', yield: 80 },
                        { smiles: 'Br', name: 'HBr', isByproduct: true }
                    ],
                    conditions: 'H2O'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-hydrogenation',
            section: 'Reactions',
            name: 'Hydrogenation (Reduction)',
            content: `
### Catalytic Hydrogenation
Addition of H₂ across a double bond to form an alkane. 

- **Mechanism**: Occurs on the surface of a metal catalyst (e.g., Pd/C). Both hydrogen atoms add to the **same side** of the double bond (**Syn addition**).
- **Result**: Converts an alkene into its corresponding alkane.
            `,
            reactionExamples: [
                {
                    id: 'alkene_hydrogenation',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: '[H][H]', name: 'H2' }
                    ],
                    products: [
                        { smiles: 'CCC', name: 'Propane', selectivity: 'major', yield: 100 }
                    ],
                    conditions: 'Pd/C'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-epoxidation',
            section: 'Reactions',
            name: 'Epoxidation & Hydroxylation',
            content: `
### Epoxidation
Reaction with a peroxyacid (like **mCPBA**) to form an **epoxide** (a three-membered cyclic ether). The mechanism is concerted, meaning bonds break and form at the same time.

### Syn-Hydroxylation
Addition of two OH groups across the double bond to form a **cis-diol**.
- **Reagents**: Cold KMnO₄ or OsO₄/H₂O₂.
- **Stereochemistry**: **Syn addition** (both OH groups add to the same face).
            `,
            reactionExamples: [
                {
                    id: 'alkene_epoxidation',
                    reactants: [
                        { smiles: 'C1=CCCCC1', name: 'Cyclohexene' }
                    ],
                    products: [
                        { smiles: 'O1[C@@H]2CCCC[C@H]12', name: 'Cyclohexene oxide', selectivity: 'major' }
                    ],
                    conditions: 'mCPBA'
                },
                {
                    id: 'alkene_hydroxylation',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' }
                    ],
                    products: [
                        { smiles: 'CC(O)CO', name: 'Propane-1,2-diol', selectivity: 'major' }
                    ],
                    conditions: 'OsO4'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alkenes-ozonolysis',
            section: 'Reactions',
            name: 'Ozonolysis (Oxidative Cleavage)',
            content: `
### Ozonolysis
A powerful reaction that **cleaves** the C=C double bond completely.

- **Mechanism**:
  1. **Ozonide Formation**: Ozone (O₃) adds to the double bond.
  2. **Reduction**: A reducing agent like **DMS** or **Zn/H₂O** cleaves the intermediate ozonide.
- **Outcome**: Each carbon of the original double bond ends up as a C=O carbonyl group. Aldehydes and Ketones are formed depending on the substitution of the original alkene.
            `,
            reactionExamples: [
                {
                    id: 'alkene_ozonolysis',
                    reactants: [
                        { smiles: 'CC(C)=CC', name: '2-Methylbut-2-ene' }
                    ],
                    products: [
                        { smiles: 'CC(C)=O', name: 'Acetone', selectivity: 'major' },
                        { smiles: 'CC=O', name: 'Acetaldehyde', selectivity: 'major' }
                    ],
                    conditions: '1) O3, 2) DMS'
                }
            ],
            examples: [],
            rules: []
        }
    ]
}