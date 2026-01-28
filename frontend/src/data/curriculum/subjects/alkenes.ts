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
            name: 'Multiple Double Bonds & Rings',
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
            id: 'alkenes-reactions',
            section: 'Reactions',
            name: 'Reactions of Alkenes',
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
}