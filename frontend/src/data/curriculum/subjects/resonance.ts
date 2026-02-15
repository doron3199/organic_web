import { Subject } from '../types';

export const resonance: Subject = {
    id: 'resonance',
    name: 'Resonance',
    icon: '↔',
    subSubjects: [
        {
            id: 'resonance-intro',
            section: 'Basics',
            name: 'What Is Resonance?',
            content: `
### Delocalized Electrons
Electrons in π bonds (double bonds) or lone pairs can spread out over multiple atoms, stabilizing the molecule. This phenomenon is called **resonance** (or **delocalization**).

A molecule that exhibits resonance cannot be accurately described by a single Lewis structure. Instead, it is represented by two or more **resonance contributors** (or resonance structures) connected by a double-headed arrow (↔).

### The Resonance Hybrid
The actual molecule is a **Resonance Hybrid** — a blend (weighted average) of all valid resonance structures. No single contributor is the "real" structure; the true electron distribution is somewhere in between.

> **Important**: Resonance structures are NOT equilibrium structures. The molecule doesn't flip between them — it exists as one single hybrid.
            `,
            examples: [
                { smiles: 'C/C=C/[CH+]C', name: 'Allyl Cation' },
                { smiles: '[O-][N+](=O)c1ccccc1', name: 'Nitrobenzene' },
                { smiles: 'C(=O)[O-]', name: 'Formate Ion' }
            ],
            rules: []
        },
        {
            id: 'resonance-rules',
            section: 'Basics',
            name: 'Rules for Drawing Resonance',
            content: `
### Rules for Drawing Resonance Contributors

1. **Only electrons move** — specifically π electrons and lone pairs. **Atoms never move**.
2. Electrons generally move toward **sp² or sp hybridized** atoms (atoms involved in double/triple bonds or with positive charges). They **cannot move to sp³ carbons** (which are saturated/full).
3. The total number of electrons must remain the same in each contributor.
4. The molecular framework (sigma bonds) stays constant.

### Curved Arrow Notation
- A **full curved arrow** (↷) shows the movement of **two electrons** (a pair).
- A **fishhook arrow** (⇀) shows the movement of **one electron** (radical chemistry).

### Common Resonance Patterns
| Pattern | Description |
|---------|-------------|
| **Allylic** | π bond adjacent to a cation/radical/anion |
| **Lone pair → π** | Heteroatom lone pair delocalizes into adjacent π system |
| **Conjugated** | Alternating single–double bonds allow electron flow across chain |
| **Aromatic** | Cyclic conjugation following Hückel's rule |
            `,
            examples: [
                { smiles: '[CH2+]C=C', name: 'Allyl Cation' },
                { smiles: 'C=C[O-]', name: 'Enolate (lone pair → π)' },
                { smiles: 'C=CC=CC=C', name: '1,3,5-Hexatriene (Conjugated)' }
            ],
            rules: []
        },
        {
            id: 'resonance-stability',
            section: 'Stability',
            name: 'Evaluating Resonance Stability',
            content: `
### Which Resonance Contributor Is More Stable?
Not all resonance structures contribute equally. The **most stable contributor** is the one with:

1. **Complete octets** for all atoms (especially C, N, O).
2. **Minimal charge separation** — fewer formal charges (+/−) is better.
3. **Negative charges on electronegative atoms** — a negative charge on O is more stable than on C.
4. **Positive charges on electropositive atoms** — a positive charge on C is better than on O.

### How Resonance Affects Stability
- **More resonance contributors** generally means **greater stabilization**.
- **Equivalent contributors** (like in carboxylate or benzene) provide the most stabilization.
- The actual hybrid is **always more stable** than any single contributor.

### Resonance Energy
Benzene's resonance energy is approximately **36 kcal/mol** — this is the extra stability gained from delocalization beyond what a hypothetical "cyclohexatriene" would have.
            `,
            examples: [
                { smiles: 'c1ccccc1', name: 'Benzene (3 equivalent resonance pairs)' },
                { smiles: 'CC(=O)[O-]', name: 'Acetate Ion (2 equivalent contributors)' },
                { smiles: 'C(=O)(O)O', name: 'Carbonic Acid' }
            ],
            rules: []
        },
        {
            id: 'resonance-functional-groups',
            section: 'Applications',
            name: 'Resonance in Common Functional Groups',
            content: `
### Carboxylate Ions & Carboxylic Acids
The carboxylate anion (RCOO⁻) has **two equivalent resonance structures**, distributing the negative charge equally over both oxygens. This makes it far more stable than an alkoxide (RO⁻).

### Amides
In amides (RCONH₂), the nitrogen lone pair delocalizes into the carbonyl, creating partial double-bond character in the C–N bond. This is why amides are:
- Planar around nitrogen
- Poor bases compared to amines
- Rigid (restricted rotation around C–N)

### Enolates
Enolates are formed by deprotonating the α-carbon of a carbonyl. The resulting anion is stabilized by resonance:
- **C=C–O⁻** ↔ **⁻C–C=O** (charge delocalized from carbon to oxygen)

### Phenol vs. Cyclohexanol
Phenol (ArOH) is ~10⁶ times more acidic than cyclohexanol because the phenoxide ion (ArO⁻) has extensive resonance stabilization with the aromatic ring — the negative charge spreads across 4 atoms in the ring.
            `,
            examples: [
                { smiles: 'CC(=O)[O-]', name: 'Acetate Ion' },
                { smiles: 'CC(=O)N', name: 'Acetamide' },
                { smiles: 'Oc1ccccc1', name: 'Phenol' },
                { smiles: 'OC1CCCCC1', name: 'Cyclohexanol (no resonance)' }
            ],
            rules: []
        },
        {
            id: 'resonance-and-acidity',
            section: 'Applications',
            name: 'Resonance and Acidity',
            content: `
### How Resonance Affects Acid Strength
The more the conjugate base is stabilized by resonance, the stronger the acid.

**Ranking by Resonance Stabilization:**

| Acid | Conjugate Base Resonance | Relative Acidity |
|------|--------------------------|-----------------|
| Carboxylic Acid (RCOOH) | 2 equivalent structures | Strong organic acid |
| Phenol (ArOH) | 5 contributors | Moderate |
| Alcohol (ROH) | No resonance | Weak |

### Inductive vs. Resonance Effects
- **Inductive effects**: Operate through σ bonds (weaken with distance).
- **Resonance effects**: Operate through π systems (can be felt over longer distances).
- When they conflict, **resonance usually dominates** for atoms directly attached to the π system.
            `,
            examples: [
                { smiles: 'CC(=O)O', name: 'Acetic Acid (pKa ≈ 4.75)' },
                { smiles: 'Oc1ccccc1', name: 'Phenol (pKa ≈ 10)' },
                { smiles: 'CCO', name: 'Ethanol (pKa ≈ 16)' }
            ],
            rules: []
        }
    ]
};
