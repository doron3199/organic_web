import { Subject } from '../types';

export const chirality: Subject = {
    id: 'chirality',
    name: 'Isomerism & Chirality',
    icon: '🧭',
    subSubjects: [
        {
            id: 'chirality-isomers-classification',
            section: 'Foundations',
            name: 'Isomers and Their Classification',
            content: `
### What is an Isomer?
**Isomers** are compounds with the same molecular formula but different structures.

### Main Categories
1. **Constitutional Isomers**: Different atom connectivity.
2. **Stereoisomers**: Same connectivity, different 3D arrangement.

### Constitutional Isomer Examples
- Ethanol vs dimethyl ether (C₂H₆O)
- 1-chlorobutane vs 2-chlorobutane
- Acetone vs propionaldehyde

### Stereoisomer Subtypes
- **Conformational isomers**: interconvert by rotation about single bonds.
- **Configurational isomers**: fixed arrangement; need bond-breaking to interconvert.
            `,
            examples: [
                { smiles: 'CCO', name: 'Ethanol' },
                { smiles: 'COC', name: 'Dimethyl ether' },
                { smiles: 'CCC(C)Cl', name: '2-Chlorobutane' }
            ],
        },
        {
            id: 'chirality-cis-trans-ez',
            section: 'Stereoisomerism',
            name: 'Cis-Trans and E/Z Isomerism',
            content: `
### Why Geometric Isomers Exist
Rotation is restricted in:
1. **Rings**
2. **Double bonds**

### Ring Systems
- **Cis**: substituents on the same side
- **Trans**: substituents on opposite sides

### Alkenes
- **Z (Zusammen)**: higher-priority groups on same side
- **E (Entgegen)**: higher-priority groups on opposite sides

Use CIP priority rules to assign E/Z when substituents are complex.
            `,
            examples: [
                { smiles: 'CC/C=C/CC', name: 'trans-3-Pentene (E)' },
                { smiles: 'CC/C=C\\CC', name: 'cis-3-Pentene (Z)' },
            ],
        },
        {
            id: 'chirality-chiral-vs-achiral',
            section: 'Chirality',
            name: 'Chiral vs Achiral Molecules',
            content: `
### Chiral Objects
A **chiral** object has a non-superimposable mirror image (like your hands).

### Achiral Objects
An **achiral** object is superimposable on its mirror image.

### Chiral Carbon (Asymmetric Center)
A carbon is often chiral when bonded to **four different groups**.

### Example
2-bromobutane is chiral because the stereocenter is attached to:
- H
- Br
- CH₃
- CH₂CH₃

The two mirror-image stereoisomers are **enantiomers**.
            `,
            examples: [
                { smiles: 'CC[C@H](C)Br', name: '2-Bromobutane (one enantiomer)' },
                { smiles: 'CC[C@@H](C)Br', name: '2-Bromobutane (mirror enantiomer)' },
                { smiles: 'CC(C)Br', name: '2-Bromopropane (achiral)' }
            ],
        },
        {
            id: 'chirality-rs-naming',
            section: 'Configuration',
            name: 'Assigning R/S Configuration',
            content: `
### R/S Assignment Workflow
1. **Prioritize substituents** by atomic number (highest = 1, lowest = 4).
2. Orient so priority 4 points **away**.
3. Trace **1 → 2 → 3**.

- Clockwise = **R** (Rectus)
- Counterclockwise = **S** (Sinister)

> If group 4 points toward you, reverse the observed result.

### Workbench Tip
Use the **Chiral Detector** in the workbench to identify chiral carbons and assign R/S automatically.
            `,
            examples: [
                { smiles: 'F[C@](Cl)(Br)I', name: 'Single stereocenter (R/S depends on arrangement)' },
                { smiles: 'N[C@H](C)C(=O)O', name: 'Alanine stereocenter' }
            ],
        },
        {
            id: 'chirality-optical-activity',
            section: 'Properties',
            name: 'Optical Activity and Polarimetry',
            content: `
### Optical Activity
Chiral molecules can rotate plane-polarized light.

- **(+) / dextrorotatory**: rotates clockwise
- **(-) / levorotatory**: rotates counterclockwise

These are experimental properties and do **not** directly equal R/S.

### Important Distinction
- R/S = absolute configuration
- (+)/(-) = observed optical rotation
            `,
            examples: [
                { smiles: 'CC[C@H](C)Br', name: 'Chiral molecule (optically active)' },
                { smiles: 'CC(C)Br', name: 'Achiral molecule (optically inactive)' }
            ],
        },
        {
            id: 'chirality-multiple-centers',
            section: 'Advanced',
            name: 'Multiple Stereocenters and Diastereomers',
            content: `
### Maximum Number of Stereoisomers
For **n** stereocenters, up to **2ⁿ** stereoisomers are possible.

### Enantiomers vs Diastereomers
- **Enantiomers**: non-superimposable mirror images
- **Diastereomers**: stereoisomers that are not mirror images

Diastereomers typically have different physical and chemical properties.
            `,
            examples: [
                { smiles: 'CC(O)C(Cl)C', name: '3-Chloro-2-butanol scaffold' },
                { smiles: 'C[C@H](O)[C@H](Cl)C', name: 'One diastereomer' },
                { smiles: 'C[C@H](O)[C@@H](Cl)C', name: 'Another diastereomer' }
            ],
        },
        {
            id: 'chirality-meso-compounds',
            section: 'Advanced',
            name: 'Meso Compounds',
            content: `
### Meso Definition
A **meso compound** contains stereocenters but is overall achiral due to an internal symmetry element.

### Key Consequences
- Has stereocenters
- Superimposable on mirror image
- Optically inactive

This reduces the total count of unique stereoisomers below 2ⁿ.
            `,
            examples: [
                { smiles: 'C[C@@]([H])([C@@]([H])(C)O)O', name: 'Meso' },
                { smiles: 'C1C[C@H](Br)[C@H](Br)CC1', name: 'Meso' },
                { smiles: 'C[C@](O)([C@@](O)(C)[H])[H]', name: 'not Meso' },
                { smiles: 'C1CC[C@H](Br)[C@@H](Br)C1', name: 'not Meso' }
            ],
        }
    ]
};
