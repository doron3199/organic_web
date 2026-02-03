import { Subject } from '../types';

export const aromatics: Subject = {
    id: 'aromatics',
    name: 'Aromatic Compounds',
    icon: '⌬', // Benzene ring unicode or similar
    subSubjects: [
        {
            id: 'aromatics-intro',
            section: 'Basics',
            name: 'Aromaticity & Hückel\'s Rule',
            content: `
### Rules for Aromaticity
For a compound to be considered **aromatic**, it must meet the following criteria:

1.  **Cyclic and Planar**: The structure must be a flat ring.
2.  **Uninterrupted π Cloud**: Every atom in the ring must have a p orbital (sp² or sp hybridized).
3.  **Hückel's Rule**: The π cloud must contain an **odd number of pairs** of π electrons (4n + 2 electrons, where n is an integer).
    -   **Benzene**: 6 π electrons (3 pairs) → Aromatic.
    -   **Cyclobutadiene**: 4 π electrons (2 pairs) → Anti-aromatic (very unstable).

### Why "Aromatic"?
Originally named for their smell, these compounds are chemically unique because they are **exceptionally stable**. They do not undergo addition reactions like alkenes but instead prefer **substitution** to preserve their stable ring system.
            `,
            examples: [
                { smiles: 'c1ccccc1', name: 'Benzene (Aromatic)' },
                { smiles: 'c1cc[nH]c1', name: 'Pyrrole (Aromatic)' },
                { smiles: 'C1=CC=C1', name: 'Cyclobutadiene (Anti-aromatic)' }
            ],
            rules: [
                {
                    id: 'aromatics-huckel',
                    name: 'Hückel\'s Rule',
                    smarts: '',
                    description: 'Checks if the molecule follows Hückel\'s rule (4n + 2 π electrons).',
                    logicType: 'check_aromaticity',
                    unlocked: true
                }
            ]
        },
        {
            id: 'aromatics-naming',
            section: 'Nomenclature',
            name: 'Naming Benzenes',
            content: `
### Monosubstituted Benzenes
Often named by adding the substituent name to "benzene".
-   **Bromobenzene**: Benzene with a Br.
-   **Nitrobenzene**: Benzene with a NO₂ group.

#### Common Names to Memorize
Many benzenes have special names that are IUPAC accepted:
-   **Toluene**: Methyl group (-CH₃)
-   **Phenol**: Hydroxyl group (-OH)
-   **Aniline**: Amino group (-NH₂)
-   **Benzoic Acid**: Carboxyl group (-COOH)
-   **Benzaldehyde**: Aldehyde group (-CHO)
-   **Styrene**: Vinyl group (-CH=CH₂)
-   **Anisole**: Methoxy group (-OCH₃)

### Disubstituted Benzenes
When there are two substituents, their relative position is crucial.
-   **Ortho (o-)**: 1,2 relationship (Adjacent).
-   **Meta (m-)**: 1,3 relationship (Separated by one carbon).
-   **Para (p-)**: 1,4 relationship (Opposite ends).

*Naming Convention*: List substituents alphabetically. Give the lowest possible numbers.
            `,
            examples: [
                { smiles: 'Cc1ccccc1', name: 'Toluene' },
                { smiles: 'Oc1ccccc1', name: 'Phenol' },
                { smiles: 'Nc1ccccc1', name: 'Aniline' },
                { smiles: 'COc1ccccc1', name: 'Anisole' },
                { smiles: 'CC1=C(C)C=CC=C1', name: 'Ortho-DiMethylbenzene (1,2-dimethylbenzene)' },
                { smiles: 'CC1=CC(C)=CC=C1', name: 'Meta-DiMethylbenzene (1,3-dimethylbenzene)' },
                { smiles: 'CC1=CC=C(C)C=C1', name: 'Para-DiMethylbenzene (1,4-dimethylbenzene)' }
            ],
            rules: [
                {
                    id: 'aromatics-naming-benzene',
                    name: 'Benzene Parent',
                    smarts: 'c1ccccc1',
                    description: 'The benzene ring is treated as the parent structure.',
                    logicType: 'check_aromatic_naming',
                    unlocked: true
                },
                {
                    id: 'aromatics-numbering',
                    name: 'Lowest Numbering',
                    smarts: '',
                    description: 'Give substituents the lowest possible numbers.',
                    logicType: 'check_lowest_locants',
                    unlocked: true
                }
            ]
        },
        {
            id: 'aromatics-eas-intro',
            section: 'Reactions',
            name: 'Electrophilic Aromatic Substitution (EAS)',
            content: `
### Electrophilic Aromatic Substitution (EAS)
Benzene is unusually stable and does not undergo addition reactions. Instead, it undergoes **substitution**, where a hydrogen atom is replaced by an electrophile (E⁺).

#### General Mechanism
1.  **Attack**: The π electrons of the ring attack the strong electrophile, forming a resonance-stabilized carbocation (Sigma Complex). This step **breaks aromaticity** and is the rate-determining step.
2.  **Restoration**: A base removes a proton from the carbon bonded to the electrophile, reforming the double bond and **restoring aromaticity**.

**Key Concept**: You need a very strong electrophile to break the stability of the benzene ring.
            `,
            reactionExamples: [],
            examples: [],
            rules: []
        },
        {
            id: 'aromatics-halogenation',
            section: 'Reactions',
            name: 'Halogenation',
            content: `
### Halogenation (Bromination/Chlorination)
Replaces a Hydrogen with a Halogen (Br or Cl).

-   **Reagents**: Br₂ with FeBr₃ OR Cl₂ with FeCl₃.
-   **Catalyst**: The Lewis Acid catalyst (FeBr₃) is required to make the halogen a stronger electrophile.
-   **Electrophile**: Complexed halogen (Br-Br-FeBr₃) acts like Br⁺.
            `,
            reactionExamples: [
                {
                    id: 'benzene_bromination',
                    reactants: [
                        { smiles: 'c1ccccc1', name: 'Benzene' },
                        { smiles: 'BrBr', name: 'Bromine' },
                        { smiles: '[Fe](Br)(Br)Br', name: 'FeBr3' }
                    ],
                    products: [
                        { smiles: 'Brc1ccccc1', name: 'Bromobenzene', yield: 100 }
                    ],
                    conditions: 'FeBr3'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'aromatics-nitration',
            section: 'Reactions',
            name: 'Nitration',
            content: `
### Nitration
Replaces a Hydrogen with a Nitro group (NO₂).

-   **Reagents**: Nitric Acid (HNO₃) and Sulfuric Acid (H₂SO₄).
-   **Electrophile**: Nitronium Ion (NO₂⁺).
    -   Sulfuric acid protonates Nitric acid, causing water to leave and forming the highly reactive nitronium ion.
-   **Product**: Nitrobenzene.
-   **Utility**: The nitro group can be reduced to an amine (NH₂) later.
            `,
            reactionExamples: [
                {
                    id: 'benzene_nitration',
                    reactants: [
                        { smiles: 'c1ccccc1', name: 'Benzene' },
                        { smiles: '[N+](=O)([O-])O', name: 'HNO3' },
                        { smiles: 'OS(=O)(=O)O', name: 'H2SO4' }
                    ],
                    products: [
                        { smiles: '[N+](=O)([O-])c1ccccc1', name: 'Nitrobenzene', yield: 100 }
                    ],
                    conditions: 'H2SO4'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'aromatics-sulfonation',
            section: 'Reactions',
            name: 'Sulfonation',
            content: `
### Sulfonation
Replaces a Hydrogen with a Sulfonic Acid group (SO₃H).

-   **Reagents**: Fuming Sulfuric Acid (H₂SO₄ with excess SO₃).
-   **Electrophile**: Sulfur Trioxide (SO₃) or protonated SO₃H⁺.
-   **Reversibility**: This reaction is **reversible**. Heating benzenesulfonic acid in dilute acid can remove the group.
            `,
            reactionExamples: [
                {
                    id: 'benzene_sulfonation',
                    reactants: [
                        { smiles: 'c1ccccc1', name: 'Benzene' },
                        { smiles: 'OS(=O)(=O)O', name: 'H2SO4' }
                    ],
                    products: [
                        { smiles: 'OS(=O)(=O)c1ccccc1', name: 'Benzenesulfonic acid', yield: 100 }
                    ],
                    conditions: 'Fuming, Heat'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'aromatics-fc-alkylation',
            section: 'Reactions',
            name: 'Friedel-Crafts Alkylation',
            content: `
### Friedel-Crafts Alkylation
Places an alkyl group on the ring.

-   **Reagents**: Alkyl Halide (R-Cl) and Aluminum Chloride (AlCl₃).
-   **Electrophile**: Carbocation (R⁺) formed when AlCl₃ strips the halogen.
-   **Mechanism Note**: Since a free carbocation is formed, **rearrangements** (hydride/methyl shifts) can occur!
    -   *Example*: Reacting Propyl Chloride often gives Isopropylbenzene (major product) due to rearrangement.
            `,
            reactionExamples: [
                {
                    id: 'friedel_crafts_alkylation',
                    reactants: [
                        { smiles: 'c1ccccc1', name: 'Benzene' },
                        { smiles: 'CC(Cl)C', name: 'Isopropyl Chloride' },
                        { smiles: '[Al](Cl)(Cl)Cl', name: 'AlCl3' }
                    ],
                    products: [
                        { smiles: 'CC(c1ccccc1)C', name: 'Isopropylbenzene', yield: 100 }
                    ],
                    conditions: 'AlCl3'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'aromatics-fc-acylation',
            section: 'Reactions',
            name: 'Friedel-Crafts Acylation',
            content: `
### Friedel-Crafts Acylation
Places an **acyl group** (R-C=O) on the ring to form a ketone.

-   **Reagents**: Acyl Chloride (R-COCl) and AlCl₃.
-   **Electrophile**: Acylium Ion (R-C≡O⁺). This resonance-stabilized cation does **NOT** rearrange.
-   **Utility**: A great way to add straight carbon chains without rearrangement (use Acylation → Reduction).
            `,
            reactionExamples: [
                {
                    id: 'friedel_crafts_acylation',
                    reactants: [
                        { smiles: 'c1ccccc1', name: 'Benzene' },
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride' },
                        { smiles: '[Al](Cl)(Cl)Cl', name: 'AlCl3' }
                    ],
                    products: [
                        { smiles: 'CC(=O)c1ccccc1', name: 'Acetophenone', yield: 100 }
                    ],
                    conditions: 'AlCl3'
                }
            ],
            examples: [],
            rules: []
        }
    ]
};
