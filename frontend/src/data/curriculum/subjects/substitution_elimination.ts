
import { Subject } from '../types';

export const substitutionElimination: Subject = {
    id: 'substitution-elimination',
    name: 'Substitution & Elimination',
    icon: '⇄',
    subSubjects: [
        {
            id: 'substitution-elimination-intro',
            section: 'Basics',
            name: 'General Definitions',
            content: `
### General Definitions
*   **Substitution Reaction**: An electronegative group (the leaving group) is replaced by another group (the nucleophile).
*   **Elimination Reaction**: The electronegative group is removed along with a hydrogen atom from an adjacent carbon, resulting in the formation of a double bond (alkene).
            `,
            examples: [],
        },
        {
            id: 'sn2-reaction',
            section: 'Substitution',
            name: 'SN2 Reaction',
            content: `
### Sɴ2 Reaction (Substitution Nucleophilic Bimolecular)

**Mechanism and Characteristics:**
*   **Mechanism**: This is a one-step reaction where the bond to the leaving group breaks at the same time the bond to the nucleophile forms.
*   **Back-Side Attack**: The nucleophile approaches the back side of the tetrahedral carbon. As the nucleophile approaches, the Carbon-Hydrogen bonds move away, and in the transition state, the carbon is pentacoordinate (partially bonded to five atoms) with the bonds in a planar arrangement.
*   **Stereochemistry (Walden Inversion)**: The nucleophile attacks from the **back side** of the carbon, causing complete **inversion** of configuration (R → S, S → R). If the starting material is a single enantiomer, only one enantiomer of the product is formed.
*   **Kinetics**: It is a bimolecular reaction, meaning the rate depends on the concentration of both the alkyl halide and the nucleophile.

**Reactivity and Conditions:**
*   **Alkyl Halide Reactivity**: Methyl > Primary > Secondary. Tertiary alkyl halides are too unreactive to undergo Sɴ2 due to steric hindrance (the large size of groups blocks the back-side attack).
*   **Leaving Group**: The rate is affected by the leaving group, with the weakest bases making the best leaving groups (I⁻ > Br⁻ > Cl⁻ > F⁻). Alkyl fluorides are essentially too unreactive.
*   **Nucleophile Strength**: Generally, a stronger base is a better nucleophile (e.g., HO⁻ is better than H₂O). However, steric hindrance in the nucleophile decreases the rate; for example, tert-butoxide is a strong base but a poor nucleophile because it is bulky.

**When to Perform:**
*   Use Sɴ2 for primary and secondary alkyl halides when a substitution product is desired.
*   This reaction is useful for synthesizing alcohols, ethers, thiols, amines, nitriles, and alkynes by varying the nucleophile.
            `,
            reactionExamples: [
                {
                    id: 'sn2_reaction',
                    reactants: [
                        { smiles: 'CC[C@]([H])(C)Br', name: '2-Bromopropane' },
                        { smiles: '[OH-]', name: 'Hydroxide' }
                    ],
                    products: [
                        { smiles: 'CC[C@H](O)C', name: 'Propan-1-ol', selectivity: 'major', yield: 100 }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
        },
        {
            id: 'sn1-reaction',
            section: 'Substitution',
            name: 'SN1 Reaction',
            content: `
### Sɴ1 Reaction (Substitution Nucleophilic Unimolecular)

**Mechanism and Characteristics:**
*   **Mechanism**: This is a two-step reaction involving a carbocation intermediate.
    1.  **Slow Step**: The leaving group departs, breaking the Carbon-Halogen bond and forming a carbocation.
    2.  **Fast Step**: The nucleophile adds to the carbocation.
*   **Solvolysis**: Most Sɴ1 reactions are solvolysis reactions where the solvent acts as the nucleophile (e.g., water or alcohol).
*   **Stereochemistry (Racemization)**: The planar carbocation intermediate can be attacked by the nucleophile from **both faces**. This produces a **racemic mixture** — equal amounts of R and S enantiomers. If the starting material is a single enantiomer, the product is a 50/50 mixture of both enantiomers.

**Reactivity and Conditions:**
*   **Alkyl Halide Reactivity**: Tertiary > Secondary. Primary alkyl halides generally do not undergo Sɴ1 reactions. The rate depends on the stability of the carbocation formed.
*   **Nucleophile**: The strength or concentration of the nucleophile does not affect the rate of the reaction, as it is not involved in the rate-determining step.
*   **Reversibility**: The reaction of a tertiary alkyl halide with a poor nucleophile is surprisingly fast.

**When to Perform:**
*   This reaction occurs primarily with tertiary alkyl halides in the presence of a weak base/nucleophile (solvolysis conditions).
*   Secondary alkyl halides may undergo Sɴ1 but also compete with Sɴ2.
            `,
            reactionExamples: [
                {
                    id: 'sn1_reaction',
                    reactants: [
                        { smiles: 'C(C)C(CCC)(Cl)C', name: '' },
                        { smiles: 'O', name: 'Water' }
                    ],
                    products: [
                        { smiles: 'CCC[C@](CC)(O)C', name: '', selectivity: 'equal', yield: 50 },
                        { smiles: 'CCC[C@@](CC)(O)C', name: '', selectivity: 'equal', yield: 50 }
                    ],
                    conditions: 'solvolysis'
                }
            ],
            examples: [],
        },
        {
            id: 'e2-reaction',
            section: 'Elimination',
            name: 'E2 Reaction',
            content: `
### E2 Reaction (Elimination Bimolecular)

**Mechanism and Characteristics:**
*   **Definition**: Also known as dehydrohalogenation, a base removes a proton from a β-carbon (adjacent to the halogen-bearing carbon) while the halogen leaves, forming a double bond.
*   **Mechanism**: A one-step, concerted reaction.
*   **Stereochemistry**: Anti elimination is preferred. The hydrogen being removed and the leaving group must be on opposite sides (anti) to allow for back-side attack and avoid repulsion between the electron-rich base and the leaving group. This requires the molecule to be in a staggered conformation.

**Regioselectivity (Zaitsev’s Rule):**
*   The reaction is regioselective. The major product is the most stable alkene.
*   The most stable alkene is generally the one that is most substituted (bonded to the fewest hydrogens on the double-bond carbons).
*   To achieve this, the hydrogen is removed from the β-carbon that is bonded to the fewest hydrogens.
*   **Exception**: If the base and the alkyl halide are both bulky, the base will remove the more accessible hydrogen (steric factor), leading to the formation of the less stable alkene as the major product.

**Reactivity and Conditions:**
*   **Alkyl Halide Reactivity**: Tertiary > Secondary > Primary.
*   **Conditions**: Favored by a high concentration of a strong base.
*   **Temperature**: High temperatures favor elimination over substitution because elimination results in greater entropy (producing three product molecules compared to two in substitution).
            `,
            reactionExamples: [
                {
                    id: 'e2_reaction',
                    reactants: [
                        { smiles: 'CC(Br)C', name: '2-Bromopropane' },
                        { smiles: '[OH-]', name: 'Hydroxide' }
                    ],
                    products: [
                        { smiles: 'CC=C', name: 'Propene', selectivity: 'major', yield: 100 }
                    ],
                    conditions: 'strong_base'
                },
                {
                    id: 'e2_zaitsev_product',
                    name: 'E2 – Zaitsev Product (Normal Base)',
                    reactants: [
                        { smiles: 'CCC(C)(Br)C', name: '2-Bromo-2-methylbutane' },
                        { smiles: '[O-]CC', name: 'Ethoxide' }
                    ],
                    products: [
                        { smiles: 'CC=C(C)C', name: '2-Methyl-2-butene (trisubstituted)', selectivity: 'major', yield: 70 },
                        { smiles: 'C=C(C)CC', name: '2-Methyl-1-butene (disubstituted)', selectivity: 'minor', yield: 30 }
                    ],
                    conditions: 'strong_base'
                },
                {
                    id: 'e2_hofmann_product',
                    name: 'E2 – Hofmann Product (Bulky Base)',
                    reactants: [
                        { smiles: 'CCC(C)(Br)C', name: '2-Bromo-2-methylbutane' },
                        { smiles: 'CC(C)(C)[O-]', name: 'tert-Butoxide' }
                    ],
                    products: [
                        { smiles: 'C=C(C)CC', name: '2-Methyl-1-butene (less substituted)', selectivity: 'major', yield: 72 },
                        { smiles: 'CC=C(C)C', name: '2-Methyl-2-butene (more substituted)', selectivity: 'minor', yield: 28 }
                    ],
                    conditions: 'strong_base'
                }
            ],
            examples: [],
        },
        {
            id: 'e1-reaction',
            section: 'Elimination',
            name: 'E1 Reaction',
            content: `
### E1 Reaction (Elimination Unimolecular)

**Mechanism and Characteristics:**
*   **Mechanism**: A two-step elimination sharing the first step with the Sɴ1 mechanism.
    1.  **Slow Step**: The alkyl halide dissociates to form a carbocation.
    2.  **Fast Step**: A base removes a proton from a β-carbon, forming a double bond.
*   Only the alkyl halide is involved in the transition state of the rate-limiting step.

**Regioselectivity:**
*   Like E2, the E1 reaction is regioselective and follows Zaitsev's rule: the major product is the more stable alkene (obtained by removing a hydrogen from the β-carbon with the fewest hydrogens).

**When to Perform:**
*   This occurs in tertiary alkyl halides with weak bases.
*   E1 reactions compete with Sɴ1 reactions.
            `,
            reactionExamples: [
                {
                    id: 'e1_reaction',
                    reactants: [
                        { smiles: 'CC(C)(Br)C', name: 'tert-Butyl bromide' },
                        { smiles: 'O', name: 'Water' }
                    ],
                    products: [
                        { smiles: 'CC(C)=C', name: 'Isobutylene', selectivity: 'minor', yield: 20 },
                        { smiles: 'CC(C)(O)C', name: 'tert-Butyl alcohol', selectivity: 'major', yield: 80 }
                    ],
                    conditions: 'weak_base'
                },
                {
                    id: 'e1_zaitsev_selectivity',
                    name: 'E1 – Zaitsev Selectivity',
                    reactants: [
                        { smiles: 'CCC(C)(Br)C', name: '2-Bromo-2-methylbutane' },
                        { smiles: 'O', name: 'Water' }
                    ],
                    products: [
                        { smiles: 'CC=C(C)C', name: '2-Methyl-2-butene (trisubstituted)', selectivity: 'major', yield: 70 },
                        { smiles: 'C=C(C)CC', name: '2-Methyl-1-butene (disubstituted)', selectivity: 'minor', yield: 30 }
                    ],
                    conditions: 'weak_base'
                }
            ],
            examples: [],
        },
        {
            id: 'elimination-selectivity-zaitsev',
            section: 'Elimination',
            name: "Zaitsev's Rule",
            content: `
### Zaitsev's Rule — The Primary Selectivity Rule

In both E1 and E2 reactions, when multiple β-carbons are available, the **major product** is generally the **most stable alkene**.

**Degree of Substitution:**
*   Alkene stability increases with the number of alkyl groups attached to the double-bonded carbons.
*   **Hierarchy**: Tetrasubstituted > Trisubstituted > Disubstituted > Monosubstituted.
*   **The Rule**: Remove a hydrogen from the **β-carbon bonded to the fewest hydrogens** → this gives the most substituted (most stable) alkene.

**Example**: In the reaction of 2-bromo-2-methylbutane with ethoxide (a non-bulky strong base):
*   The **trisubstituted** 2-methyl-2-butene (~70%) is favored over the **disubstituted** 2-methyl-1-butene (~30%).
            `,
            reactionExamples: [
                {
                    id: 'zaitsev_product_normal_base',
                    name: 'Zaitsev Product (Normal Base)',
                    reactants: [
                        { smiles: 'CCC(C)(Br)C', name: '2-Bromo-2-methylbutane' },
                        { smiles: '[O-]CC', name: 'Ethoxide (non-bulky)' }
                    ],
                    products: [
                        { smiles: 'CC=C(C)C', name: '2-Methyl-2-butene (trisubstituted)', selectivity: 'major', yield: 70 },
                        { smiles: 'C=C(C)CC', name: '2-Methyl-1-butene (disubstituted)', selectivity: 'minor', yield: 30 }
                    ],
                    conditions: 'strong_base'
                }
            ],
            examples: [],
        },
        {
            id: 'elimination-selectivity-ez',
            section: 'Elimination',
            name: 'E/Z Stereoselectivity',
            content: `
### Stereoselectivity — E vs Z Isomers

When multiple geometric (E/Z) isomers of the product alkene are possible, the reaction favors the isomer with **less steric strain**.

*   **The Rule**: The **E isomer** (trans) is the major product because the largest substituents are on **opposite sides** of the double bond, minimizing repulsion.
*   The **Z isomer** (cis) is the minor product due to steric interactions between groups on the same side.
            `,
            reactionExamples: [
                {
                    id: 'ez_stereoselectivity_e_isomer_favored',
                    name: 'E/Z Stereoselectivity – E Isomer Favored',
                    reactants: [
                        { smiles: 'CCC(Br)CC', name: '3-Bromopentane' },
                        { smiles: '[OH-]', name: 'Hydroxide' }
                    ],
                    products: [
                        { smiles: 'C/C=C/CC', name: 'E-2-Pentene (trans)', selectivity: 'major' },
                        { smiles: 'C/C=C\\CC', name: 'Z-2-Pentene (cis)', selectivity: 'minor' }
                    ],
                    conditions: 'strong_base'
                }
            ],
            examples: [],
        },
        {
            id: 'elimination-selectivity-hofmann',
            section: 'Elimination',
            name: 'Hofmann Product (Bulky Bases)',
            content: `
### The Exception: Hofmann Product (Bulky Bases)

Zaitsev's Rule can be overruled when steric factors prevent the base from reaching the more substituted β-carbon.

**When Does This Happen?**
*   When a **bulky base** (e.g., tert-butoxide, (CH₃)₃CO⁻) is used.
*   The bulky base cannot easily access the more hindered, internal β-hydrogens.
*   Instead, it removes the **more accessible hydrogen** from the **less substituted** β-carbon.

**The Result**: The **less substituted alkene** (the "Hofmann product") becomes the **major product**.

**Example**: 2-Bromo-2-methylbutane with tert-butoxide:
*   The **less substituted** 2-methyl-1-butene (~72%) becomes the major product.
*   The **more substituted** 2-methyl-2-butene (~28%) becomes the minor product.
            `,
            reactionExamples: [
                {
                    id: 'hofmann_product_bulky_base',
                    name: 'Hofmann Product (Bulky Base)',
                    reactants: [
                        { smiles: 'CCC(C)(Br)C', name: '2-Bromo-2-methylbutane' },
                        { smiles: 'CC(C)(C)[O-]', name: 'tert-Butoxide (bulky)' }
                    ],
                    products: [
                        { smiles: 'C=C(C)CC', name: '2-Methyl-1-butene (less substituted)', selectivity: 'major', yield: 72 },
                        { smiles: 'CC=C(C)C', name: '2-Methyl-2-butene (more substituted)', selectivity: 'minor', yield: 28 }
                    ],
                    conditions: 'strong_base'
                }
            ],
            examples: [],
        },
        {
            id: 'intramolecular-substitution',
            section: 'Substitution',
            name: 'Intramolecular Substitution',
            content: `
### Intramolecular Substitution (Cyclization)

**Mechanism and Characteristics:**
*   **Definition**: An intramolecular reaction occurs when the nucleophile and the leaving group are in the same molecule.
*   **Cyclization**: This results in the formation of a ring (cyclic compound).
*   **Favorability**: This reaction is highly favored when a **5-membered** or **6-membered** ring can be formed. These ring sizes are stable due to low angle strain and favorable entropy (the two groups are tethered close together).
*   **Mechanism**: It typically follows an Sɴ2 mechanism where the internal nucleophile attacks the carbon bearing the leaving group from the back side.

**Requirements:**
1.  **Nucleophile**: The molecule must have a nucleophilic atom (e.g., -O⁻, -NH₂, -S⁻).
2.  **Leaving Group**: The molecule must have a good leaving group (e.g., -Cl, -Br, -I) at a suitable distance.
3.  **Chain Length**: Ideally 4 or 5 carbons between the nucleophile and the leaving group carbon to form 5- or 6-membered rings.
            `,
            reactionExamples: [
                {
                    id: 'intramolecular_substitution',
                    reactants: [
                        { smiles: '[O-]CCCCCCl', name: '5-Chloropentan-1-olate' }
                    ],
                    products: [
                        { smiles: 'C1CCOCC1', name: 'Tetrahydropyran', selectivity: 'major', yield: 100 }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
        },
        {
            id: 'substitution-elimination-summary',
            section: 'Summary',
            name: 'Reaction Summary',
            content: `
### Summary of When to Perform Which Reaction

**By Alkyl Halide Type:**

1.  **Primary Alkyl Halides**:
    *   **Standard Condition**: Primarily undergo Sɴ2 substitution.
    *   **Exception (Steric Hindrance)**: If there is steric hindrance in the alkyl halide (e.g., branching) or if the nucleophile is bulky (sterically hindered), E2 elimination is favored.
    *   **Prohibition**: Cannot undergo Sɴ1 or E1 reactions.

2.  **Secondary Alkyl Halides**:
    *   **Competition**: Can undergo both substitution (Sɴ2) and elimination (E2).
    *   **Favouring Elimination**: A stronger, bulkier base and higher temperatures favor elimination (E2).
    *   **Weak Bases**: Under solvolysis conditions (weak base/nucleophile), they may undergo Sɴ1 mechanisms, but this is less common than for tertiary halides.

3.  **Tertiary Alkyl Halides**:
    *   **Standard Condition**: Cannot undergo Sɴ2 reactions due to steric hindrance.
    *   **With Strong Base**: Undergo only elimination (E2).
    *   **With Weak Base (Sɴ1/E1 conditions)**: Undergo both substitution (Sɴ1) and elimination (E1), but substitution is favored.

**Intramolecular Reactions:**
*   An intramolecular reaction (reaction within the same molecule) is favored when a five- or six-membered ring can be formed. For example, a molecule containing both a nucleophilic group and a leaving group can cyclize.

**Synthesis Applications:**
*   Sɴ2 reactions are irreversible when a weak base displaces a strong base, allowing for the synthesis of specific target molecules.
*   In synthesis design (Retrosynthetic Analysis), one works backward from the target molecule to identify the necessary alkyl halide and nucleophile.
            `,
            examples: [],
        },
        {
            id: 'interactive-prediction',
            section: 'Interactive',
            name: 'Reaction Predictor',
            content: `
### Interactive Reaction Prediction

Use the tool below to predict whether an Sɴ1, Sɴ2, E1, or E2 reaction will occur based on the substrate and conditions.
            `,
            examples: [],
            widgetType: 'sn_e_predictor'
        }
    ]
};
