import { Subject } from '../types';

export const acidBase: Subject = {
    id: 'acid_base',
    name: 'Acids and Bases',
    icon: '⚗️',
    subSubjects: [
        {
            id: 'acid-base-ph-scale',
            section: 'Foundations',
            name: 'Introduction to the pH Scale',
            content: `
### The pH Scale (0 to 14)
- **Acids (pH 0-6):** strong to weak acids.
- **Neutral (pH 7):** pure water.
- **Bases (pH 8-14):** weak to strong bases.

Every step on the pH scale represents a tenfold change in acidity.
            `,
            examples: [],
            rules: []
        },
        {
            id: 'acid-base-proton-transfer',
            section: 'Foundations',
            name: 'Acids and Bases (Proton Transfer)',
            content: `
### Bronsted-Lowry Definition
- **Acid:** a proton (H+) donor.
- **Base:** a proton (H+) acceptor.

**Example reaction:**
HCl + H2O ⇌ Cl- + H3O+

- HCl donates a proton (acid).
- H2O accepts a proton (base).

**Reversibility:**
- **Reversible:** A + B ⇌ C + D (most acid-base reactions).
- **Irreversible:** A + B → C + D.
            `,
            examples: [],
            rules: []
        },
        {
            id: 'acid-base-conjugates',
            section: 'Foundations',
            name: 'Conjugate Acid-Base Pairs',
            content: `
### Conjugate Pairs
When an acid donates a proton, it becomes its **conjugate base**.
When a base accepts a proton, it becomes its **conjugate acid**.

**Key rule:** The stronger the acid, the weaker its conjugate base.
            `,
            examples: [],
            rules: []
        },
        {
            id: 'acid-base-strength',
            section: 'Strength and pKa',
            name: 'Acid Strength and pKa',
            content: `
### Strong vs Weak Acids
- **Strong acids:** equilibrium favors products (full dissociation).
- **Weak acids:** equilibrium favors reactants (partial dissociation).

### Ka and pKa
- **Ka:** larger Ka means stronger acid.
- **pKa:** pKa = -log(Ka). Smaller pKa means stronger acid.

### pH
pH = -log[H+]
            `,
            examples: [],
            rules: []
        },
        {
            id: 'acid-base-amphoteric',
            section: 'Strength and pKa',
            name: 'Amphoteric Compounds',
            content: `
### Amphoteric Behavior
Some molecules can act as both acids and bases.

**Alcohols:**
- As acids: O-H can donate a proton.
- As bases: O can accept a proton.

**Amines:**
- As acids: N-H can donate a proton.
- As bases: N can accept a proton.
            `,
            examples: [],
            rules: []
        },
        {
            id: 'acid-base-equilibrium-direction',
            section: 'Strength and pKa',
            name: 'Predicting Equilibrium Direction',
            content: `
### Equilibrium Rule
Acid-base equilibria favor formation of the **weaker acid** (higher pKa).

**Example:**
If reactant acid pKa = 4.8 and product acid pKa = 9.4,
then equilibrium favors products (the weaker acid).
            `,
            examples: [],
            rules: []
        },
        {
            id: 'acid-base-strength-factors',
            section: 'Strength Factors',
            name: 'Factors That Determine Acid Strength',
            content: `
### Core Principle
**Acid strength is determined by the stability of its conjugate base.**

### Main Factors
1. **Electronegativity (Row Trend):** C < N < O < F.
2. **Hybridization:** sp > sp2 > sp3 (more s-character = stronger acid).
3. **Atomic Size (Column Trend):** F < Cl < Br < I (larger = stronger acid).
4. **Inductive Withdrawal:** electron-withdrawing groups stabilize the base.
5. **Resonance:** delocalization stabilizes the conjugate base.
            `,
            examples: [],
            compareExamples: [
                {
                    id: 'acid-base-electronegativity',
                    name: 'Electronegativity',
                    left: {
                        smiles: 'F',
                    },
                    right: {
                        smiles: 'O',
                    },
                    note: 'More electronegative atoms stabilize the conjugate base more effectively.'
                },
                {
                    id: 'acid-base-size',
                    name: 'Atomic Size',
                    left: {
                        smiles: 'I',
                    },
                    right: {
                        smiles: 'F',
                    },
                    note: 'Larger atoms better stabilize negative charge down a group.'
                },
                {
                    id: 'acid-base-inductive-distance',
                    name: 'Inductive Effect: Distance Matters',
                    left: {
                        smiles: 'CCC(Br)C(=O)O',
                    },
                    right: {
                        smiles: 'BrCCCC(=O)O',
                    },
                    note: 'A closer halogen withdraws more electron density and increases acidity.'
                },
                {
                    id: 'acid-base-inductive-halogen',
                    name: 'Inductive Effect: Halogen Electronegativity',
                    left: {
                        smiles: 'FCC(=O)O',
                    },
                    right: {
                        smiles: 'BrCC(=O)O',
                    },
                    note: 'More electronegative halogens stabilize the conjugate base more strongly.'
                },
                {
                    id: 'acid-base-hybridization',
                    name: 'Hybridization: sp vs sp3',
                    left: {
                        smiles: 'C#C',
                    },
                    right: {
                        smiles: 'CC',
                    },
                    note: 'Higher s-character stabilizes negative charge and strengthens acidity.'
                },
                {
                    id: 'acid-base-resonance',
                    name: 'Resonance Stabilization',
                    left: {
                        smiles: 'CCC(=O)O',
                    },
                    right: {
                        smiles: 'CCCO',
                    },
                    note: 'Resonance stabilization increases conjugate base stability.'
                }
            ],
            rules: [
                {
                    id: 'acid-rule-electronegativity',
                    name: 'Electronegativity',
                    smarts: '',
                    description: 'More electronegative atoms stabilize the conjugate base in a row trend.',
                    unlocked: true
                },
                {
                    id: 'acid-rule-hybridization',
                    name: 'Hybridization',
                    smarts: '',
                    description: 'sp > sp2 > sp3: more s-character increases acidity.',
                    unlocked: true
                },
                {
                    id: 'acid-rule-atomic-size',
                    name: 'Atomic Size',
                    smarts: '',
                    description: 'Larger atoms better stabilize negative charge down a group.',
                    unlocked: true
                },
                {
                    id: 'acid-rule-inductive',
                    name: 'Inductive Effects',
                    smarts: '',
                    description: 'Electron-withdrawing groups stabilize the conjugate base.',
                    unlocked: true
                },
                {
                    id: 'acid-rule-resonance',
                    name: 'Resonance',
                    smarts: '',
                    description: 'Delocalization of charge increases conjugate base stability.',
                    unlocked: true
                }
            ]
        },
        {
            id: 'acid-base-lewis',
            section: 'Extensions',
            name: 'Lewis Acids and Bases',
            content: `
### Lewis Definition
- **Lewis Acid:** accepts an electron pair.
- **Lewis Base:** donates an electron pair.

Note: In organic chemistry, "acid" usually means a proton donor unless stated as Lewis acid.
            `,
            examples: [],
            rules: []
        }
    ]
};
