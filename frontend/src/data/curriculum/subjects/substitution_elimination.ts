
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
            rules: []
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
*   **Stereochemistry**: The product has an inverted configuration relative to the reactant (similar to an umbrella turning inside out).
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
                        { smiles: 'CCCBr', name: '1-Bromopropane' },
                        { smiles: '[OH-]', name: 'Hydroxide' }
                    ],
                    products: [
                        { smiles: 'CCCO', name: 'Propan-1-ol', selectivity: 'major', yield: 100 }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
            rules: []
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
*   **Stereochemistry**: Because the carbocation intermediate allows attack from either side, the product is formed as a pair of enantiomers (both inverted and retained configurations), resulting in racemization.

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
                        { smiles: 'CC(C)(Cl)C', name: 'tert-Butyl chloride' },
                        { smiles: 'O', name: 'Water' }
                    ],
                    products: [
                        { smiles: 'CC(C)(O)C', name: 'tert-Butyl alcohol', selectivity: 'major', yield: 100 }
                    ],
                    conditions: 'solvolysis'
                }
            ],
            examples: [],
            rules: []
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
                }
            ],
            examples: [],
            rules: []
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
                }
            ],
            examples: [],
            rules: []
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
            rules: []
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
            rules: []
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
            rules: [],
            widgetType: 'sn_e_predictor'
        }
    ]
};
