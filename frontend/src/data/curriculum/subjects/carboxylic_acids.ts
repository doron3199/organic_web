import { Subject } from '../types';

export const carboxylicAcids: Subject = {
    id: 'carboxylic-acids',
    name: 'Carbonyl Compounds & Carboxylic Acids',
    icon: '🧪',
    subSubjects: [
        // ─── INTRODUCTION ───────────────────────────────────────────────
        {
            id: 'carbonyl-intro',
            section: 'Introduction',
            name: 'The Carboxyl Group',
            content: `
### The Carboxyl Group
A carboxyl group consists of a central carbon atom that is **double-bonded to an oxygen** atom and **single-bonded to a hydroxyl** (−OH) group. It is abbreviated as **−COOH** or **−CO₂H**.

### Polarity & Reactivity
The carbonyl group (C=O) is **polar**. Oxygen pulls electrons toward itself, gaining a partial negative charge (δ⁻) and leaving the carbon with a partial positive charge (δ⁺). This makes the carbon an **electrophile** — a site that attracts electron-rich molecules (nucleophiles).
            `,
            examples: [
                { smiles: 'CC(=O)O', name: 'Acetic Acid (CH₃COOH)' },
                { smiles: 'C(=O)O', name: 'Formic Acid (HCOOH)' },
                { smiles: 'CCC(=O)O', name: 'Propanoic Acid' },
            ],
        },
        {
            id: 'carbonyl-types',
            section: 'Introduction',
            name: 'Types of Carbonyl Compounds',
            content: `
### Carbonyl Compounds — Two Categories

**1. Can undergo nucleophilic substitution** (have a leaving group):
-   **Carboxylic Acids** — leaving group: −OH
-   **Esters** — leaving group: −OR
-   **Acyl Chlorides** — leaving group: −Cl
-   **Amides** — leaving group: −NH₂ / −NHR / −NR₂

**2. Cannot undergo nucleophilic substitution** (no leaving group):
-   **Aldehydes** — bonded to −H
-   **Ketones** — bonded to −R

### Mechanism of Nucleophilic Acyl Substitution
1.  A nucleophile attacks the electrophilic carbonyl carbon.
2.  The C=O double bond breaks, forming a **tetrahedral intermediate**.
3.  For substitution to occur, the incoming nucleophile must be a **stronger base** than the leaving group.
4.  The weakest base is **eliminated**, and the double bond reforms.
            `,
            examples: [
                { smiles: 'CC(=O)O', name: 'Carboxylic Acid (−OH)' },
                { smiles: 'CC(=O)OCC', name: 'Ester (−OR)' },
                { smiles: 'CC(=O)Cl', name: 'Acyl Chloride (−Cl)' },
                { smiles: 'CC(=O)N', name: 'Amide (−NH₂)' },
                { smiles: 'CC=O', name: 'Aldehyde (−H)' },
                { smiles: 'CC(=O)C', name: 'Ketone (−R)' },
            ],
        },
        {
            id: 'carbonyl-reactivity',
            section: 'Introduction',
            name: 'Relative Reactivity & Basicity',
            content: `
### Relative Reactivity of Carboxylic Acid Derivatives
Reactivity depends on how **weak a base** the leaving group is. The weaker the base → the better the leaving group → the **more reactive** the compound.

**Basicity (weakest → strongest):**
Cl⁻ < −OR ≈ −OH < −NH₂

**Reactivity (most → least):**
Acyl Chlorides > Acid Anhydrides > Esters ≈ Carboxylic Acids > Amides

> A more reactive derivative can always be converted **down** the series (e.g., acyl chloride → ester), but not up without activation.
            `,
            examples: [
                { smiles: 'CC(=O)Cl', name: 'Acyl Chloride (most reactive)' },
                { smiles: 'CC(=O)OC(=O)C', name: 'Acetic Anhydride' },
                { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate' },
                { smiles: 'CC(=O)O', name: 'Acetic Acid' },
                { smiles: 'CC(=O)N', name: 'Acetamide (least reactive)' },
            ],
        },
        // ─── PREPARATION OF CARBOXYLIC ACIDS ────────────────────────────
        {
            id: 'carboxylic-prep-oxidation',
            section: 'Preparation',
            name: 'Oxidation of Primary Alcohols',
            content: `
### Oxidation of a Primary Alcohol
Reacting a primary alcohol with **chromic acid (H₂CrO₄)** first produces an aldehyde, which then further oxidizes to a **carboxylic acid**.

R−CH₂OH → R−CHO → R−COOH
            `,
            reactionExamples: [
                {
                    id: 'carboxylic_prep_oxidation',
                    name: 'Oxidation of 1-Propanol',
                    reactants: [
                        { smiles: 'CCCO', name: 'Propan-1-ol' },
                    ],
                    products: [
                        { smiles: 'CCC(=O)O', name: 'Propanoic Acid', yield: 100 }
                    ],
                    conditions: 'H₂CrO₄'
                }
            ],
            examples: [],
        },
        {
            id: 'carboxylic-prep-ozonolysis',
            section: 'Preparation',
            name: 'Ozonolysis of Double Bonds',
            content: `
### Ozonolysis of a C=C Double Bond
Breaking a carbon-carbon double bond using **ozone (O₃)** under oxidative work-up conditions yields carboxylic acids.

For example, cleaving **oleic acid** (a C₁₈ fatty acid with one double bond) produces two smaller carboxylic acid fragments.
            `,
            reactionExamples: [
                {
                    id: 'carboxylic_prep_ozonolysis',
                    name: 'Oxidative Ozonolysis',
                    reactants: [
                        { smiles: 'CC=CC', name: '2-Butene' },
                    ],
                    products: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 50 },
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 50 },
                    ],
                    conditions: 'cold, 1. O₃, 2. H₂O₂'
                }
            ],
            examples: [],
        },
        {
            id: 'carboxylic-prep-grignard',
            section: 'Preparation',
            name: 'Grignard Reaction with CO₂',
            content: `
### Grignard Reaction with CO₂
A **Grignard reagent** (R−MgX, a powerful carbon nucleophile) reacts with **carbon dioxide (CO₂)**. After acidic work-up (H₃O⁺), a carboxylic acid is formed.

The product has **one more carbon** than the original Grignard reagent.
            `,
            reactionExamples: [
                {
                    id: 'carboxylic_prep_grignard',
                    name: 'Grignard + CO₂',
                    reactants: [
                        { smiles: 'CC[Mg]Br', name: 'Ethylmagnesium Bromide' },
                        { smiles: 'O=C=O', name: 'Carbon Dioxide' },
                    ],
                    products: [
                        { smiles: 'CCC(=O)O', name: 'Propanoic Acid', yield: 100 }
                    ],
                    conditions: 'H₃O⁺',
                    autoAddMolecules: [
                        { smiles: '[OH3+]', name: 'H₃O⁺' },
                    ]
                }
            ],
            examples: [],
        },
        // ─── ESTERS ─────────────────────────────────────────────────────
        {
            id: 'esters-hydrolysis',
            section: 'Esters',
            name: 'Hydrolysis of Esters',
            content: `
### Hydrolysis of Esters
Breaking down an ester with water restores the original **carboxylic acid** and **alcohol**.

-   **Acidic hydrolysis**: Uses acid catalyst (H₃O⁺). Reversible.
-   **Basic hydrolysis (Saponification)**: Uses NaOH. Irreversible — drives to completion.
            `,
            reactionExamples: [
                {
                    id: 'ester_acid_hydrolysis',
                    name: 'Acidic Hydrolysis',
                    reactants: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate' },
                        { smiles: 'O', name: 'Water' },
                    ],
                    products: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 50 },
                        { smiles: 'CCO', name: 'Ethanol', yield: 50 },
                    ],
                    conditions: 'HCl',
                    isEquilibrium: true
                }
            ],
            examples: [],
        },
        {
            id: 'esters-transesterification',
            section: 'Esters',
            name: 'Transesterification',
            content: `
### Transesterification
Reacting an ester with a **different alcohol** to swap the alcohol groups, forming a **new ester**.

R−COOR' + R''−OH ⇌ R−COOR'' + R'−OH

### Medical Application — Aspirin
**Aspirin (Acetylsalicylic acid)** works by **transesterification**: it transfers its acetyl ester group to the active enzyme **cyclooxygenase (COX)**, turning it into an inactive enzyme. This blocks the production of prostaglandins, reducing fever and pain.
            `,
            reactionExamples: [
                {
                    id: 'ester_transesterification',
                    name: 'Transesterification',
                    reactants: [
                        { smiles: 'CC(=O)OC', name: 'Methyl Acetate' },
                        { smiles: 'CCO', name: 'Ethanol' },
                    ],
                    products: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate', yield: 50 },
                        { smiles: 'CO', name: 'Methanol', yield: 50 },
                    ],
                    conditions: 'Acid catalyst',
                    isEquilibrium: true
                }
            ],
            examples: [
                { smiles: 'CC(=O)Oc1ccccc1C(=O)O', name: 'Aspirin (Acetylsalicylic Acid)' },
            ],
        },
        {
            id: 'esters-aminolysis',
            section: 'Esters',
            name: 'Aminolysis of Esters',
            content: `
### Aminolysis
Reacting an ester with an **amine** and heat to create an **amide** and an alcohol.

R−COOR' + R''−NH₂ → R−CONHR'' + R'−OH
            `,
            reactionExamples: [
                {
                    id: 'ester_aminolysis',
                    name: 'Aminolysis of Ethyl Acetate',
                    reactants: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate' },
                        { smiles: 'CN', name: 'Methylamine' },
                    ],
                    products: [
                        { smiles: 'CC(=O)NC', name: 'N-Methylacetamide', yield: 50 },
                        { smiles: 'CCO', name: 'Ethanol', yield: 50 },
                    ],
                    conditions: 'heat'
                }
            ],
            examples: [],
        },
        {
            id: 'esters-grignard',
            section: 'Esters',
            name: 'Esters + Grignard Reagents',
            content: `
### Reaction of Esters with Grignard Reagents
An ester reacts with **two equivalents** of a Grignard reagent:
1.  The first addition produces a **ketone** intermediate.
2.  The second addition produces a **tertiary alcohol**.
            `,
            reactionExamples: [
                {
                    id: 'ester_grignard',
                    name: 'Ester + 2 eq. Grignard',
                    reactants: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate' },
                        { smiles: 'C[Mg]Br', name: 'MeMgBr' },
                        { smiles: 'C[Mg]Br', name: 'MeMgBr' },
                    ],
                    products: [
                        { smiles: 'CC(C)(C)O', name: 'tert-Butanol', yield: 50 },
                        { smiles: 'CCO', name: 'Ethanol', yield: 50 },
                    ],
                    conditions: 'H₃O⁺',
                    autoAddMolecules: [
                        { smiles: '[OH3+]', name: 'H₃O⁺' },
                    ]
                }
            ],
            examples: [],
        },
        // ─── ACYL CHLORIDES ─────────────────────────────────────────────
        {
            id: 'acyl-chlorides-prep',
            section: 'Acyl Chlorides',
            name: 'Preparation of Acyl Chlorides',
            content: `
### Acyl Chlorides
Contain a carbonyl carbon bonded to a **chlorine atom**. They are the **most reactive** carboxylic acid derivative.

### Preparation
Carboxylic acids are activated into acyl chlorides by reacting with:
-   **Thionyl chloride (SOCl₂)**
-   **Phosphorus trichloride (PCl₃)**
            `,
            reactionExamples: [
                {
                    id: 'acyl_chloride_socl2',
                    name: 'Acyl Chloride from SOCl₂',
                    reactants: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid' },
                    ],
                    products: [
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride', yield: 100 },
                    ],
                    conditions: 'SOCl₂'
                },
                {
                    id: 'acyl_chloride_pcl3',
                    name: 'Acyl Chloride from PCl₃',
                    reactants: [
                        { smiles: 'CCC(=O)O', name: 'Propanoic Acid' },
                    ],
                    products: [
                        { smiles: 'CCC(=O)Cl', name: 'Propanoyl Chloride', yield: 100 },
                    ],
                    conditions: 'PCl₃'
                }
            ],
            examples: [],
        },
        {
            id: 'acyl-chlorides-reactions',
            section: 'Acyl Chlorides',
            name: 'Reactions of Acyl Chlorides',
            content: `
### Reactions of Acyl Chlorides
Because they are the **most reactive** derivative, acyl chlorides readily react with:

**1. With Alcohols → Ester + HCl**

**2. With Water → Carboxylic Acid + HCl**

**3. With Amines → Amide**
> ⚠️ This reaction requires **two equivalents** of the amine:
> -   One acts as the **nucleophile** to form the amide.
> -   The other acts as a **base** to absorb the HCl, forming an ammonium chloride salt.
            `,
            reactionExamples: [
                {
                    id: 'acyl_chloride_alcohol',
                    name: 'Acyl Chloride + Alcohol → Ester',
                    reactants: [
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride' },
                        { smiles: 'CCO', name: 'Ethanol' },
                    ],
                    products: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate', yield: 100 },
                        { smiles: 'Cl', name: 'HCl', isByproduct: true },
                    ],
                    conditions: ''
                },
                {
                    id: 'acyl_chloride_water',
                    name: 'Acyl Chloride + Water → Acid',
                    reactants: [
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride' },
                        { smiles: 'O', name: 'Water' },
                    ],
                    products: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 100 },
                        { smiles: 'Cl', name: 'HCl', isByproduct: true },
                    ],
                    conditions: ''
                },
                {
                    id: 'acyl_chloride_amine',
                    name: 'Acyl Chloride + Amine → Amide',
                    reactants: [
                        { smiles: 'CC(=O)Cl', name: 'Acetyl Chloride' },
                        { smiles: 'CCN', name: 'Ethylamine' },
                        { smiles: 'CCN', name: 'Ethylamine (2nd eq., base)' },
                    ],
                    products: [
                        { smiles: 'CC(=O)NCC', name: 'N-Ethylacetamide', yield: 100 },
                        { smiles: 'CC[NH3+].[Cl-]', name: 'Ethylamine·HCl salt', isByproduct: true },
                    ],
                    conditions: ''
                }
            ],
            examples: [],
        },
        // ─── AMIDES ─────────────────────────────────────────────────────
        {
            id: 'amides-intro',
            section: 'Amides',
            name: 'Structure & Reactivity',
            content: `
### Amides
Contain a carbonyl carbon bonded to a **nitrogen atom**. They are the **least reactive** of all carboxylic acid derivatives.

Because of their low reactivity, amides **do not react** directly with:
-   Chloride ions
-   Water (at room temperature)
-   Alcohols (at room temperature)

All amide reactions require **catalysts** and/or **heat**.
            `,
            examples: [
                { smiles: 'CC(=O)N', name: 'Acetamide' },
                { smiles: 'CC(=O)NC', name: 'N-Methylacetamide' },
                { smiles: 'CC(=O)N(C)C', name: 'N,N-Dimethylacetamide' },
            ],
        },
        {
            id: 'amides-hydrolysis',
            section: 'Amides',
            name: 'Hydrolysis of Amides',
            content: `
### Hydrolysis of Amides

**1. Acidic Hydrolysis**
Amide + H₂O + acid catalyst + heat → **Carboxylic Acid** + **Ammonium Ion**

**2. Basic Hydrolysis**
Amide + NaOH + heat → **Carboxylate Ion** (−COO⁻) + **Amine** (e.g., NH₃ gas)
            `,
            reactionExamples: [
                {
                    id: 'amide_acid_hydrolysis',
                    name: 'Acidic Hydrolysis of Amide',
                    reactants: [
                        { smiles: 'CC(=O)N', name: 'Acetamide' },
                        { smiles: 'O', name: 'Water' },
                    ],
                    products: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 50 },
                        { smiles: '[NH4+]', name: 'Ammonium Ion', yield: 50, isByproduct: true },
                    ],
                    conditions: 'H₃O⁺, heat'
                },
                {
                    id: 'amide_basic_hydrolysis',
                    name: 'Basic Hydrolysis of Amide',
                    reactants: [
                        { smiles: 'CC(=O)N', name: '' },
                        { smiles: 'O', name: '' },
                        { smiles: '[OH-]', name: '' },
                    ],
                    products: [
                        { smiles: 'CC(=O)[O-]', name: '', yield: 50 },
                        { smiles: 'N', name: '', yield: 50, isByproduct: true },
                    ],
                    conditions: ''
                }
            ],
            examples: [],
        },
        {
            id: 'amides-alcoholysis',
            section: 'Amides',
            name: 'Amides + Alcohols',
            content: `
### Amides with Alcohols
Reacting an amide with an alcohol under **acid catalysis** and **heat** converts the amide into an **ester** and releases an ammonium salt.
            `,
            reactionExamples: [
                {
                    id: 'amide_alcoholysis',
                    name: 'Amide + Alcohol → Ester',
                    reactants: [
                        { smiles: 'CC(=O)N', name: 'Acetamide' },
                        { smiles: 'CCO', name: 'Ethanol' },
                    ],
                    products: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate', yield: 50 },
                        { smiles: '[NH4+]', name: 'Ammonium', yield: 50, isByproduct: true },
                    ],
                    conditions: 'H⁺, heat'
                }
            ],
            examples: [],
        },
        // ─── ACID ANHYDRIDES ────────────────────────────────────────────
        {
            id: 'anhydrides-prep',
            section: 'Acid Anhydrides',
            name: 'Preparation of Anhydrides',
            content: `
### Acid Anhydrides
Molecules consisting of **two carbonyl groups** connected by a single bridging **oxygen atom**. They are highly reactive, sitting just **below acyl chlorides** in reactivity.

### Preparation
1.  **Dehydration**: Heating two carboxylic acids together drives off a molecule of water.
    2 R−COOH → R−CO−O−CO−R + H₂O

2.  **From a carboxylic acid + acyl chloride**: In the presence of a base (NaOH).
    R−COOH + R'−COCl → R−CO−O−CO−R' + HCl
            `,
            reactionExamples: [
                {
                    id: 'anhydride_dehydration',
                    name: 'Dehydration of Acetic Acid',
                    reactants: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid' },
                        { smiles: 'CC(=O)O', name: 'Acetic Acid' },
                    ],
                    products: [
                        { smiles: 'CC(=O)OC(=O)C', name: 'Acetic Anhydride', yield: 100 },
                        { smiles: 'O', name: 'Water', isByproduct: true },
                    ],
                    conditions: 'heat'
                },
                {
                    id: 'anhydride_mixed',
                    name: 'Mixed Anhydride Formation',
                    reactants: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid' },
                        { smiles: 'CCC(=O)Cl', name: 'Propanoyl Chloride' },
                    ],
                    products: [
                        { smiles: 'CC(=O)OC(=O)CC', name: 'Acetic Propanoic Anhydride', yield: 100 },
                        { smiles: 'Cl', name: 'HCl', isByproduct: true },
                    ],
                    conditions: 'NaOH'
                }
            ],
            examples: [
                { smiles: 'CC(=O)OC(=O)C', name: 'Acetic Anhydride' },
            ],
        },
        {
            id: 'anhydrides-reactions',
            section: 'Acid Anhydrides',
            name: 'Reactions of Anhydrides',
            content: `
### Reactions of Acid Anhydrides

**1. With Alcohol → Ester + Carboxylic Acid**

**2. With Water → Two Carboxylic Acids**

**3. With Amines (2 equivalents) → Amide + Amine salt of a carboxylic acid**
> One equivalent acts as the nucleophile, the other as a base.
            `,
            reactionExamples: [
                {
                    id: 'anhydride_alcohol',
                    name: 'Anhydride + Alcohol → Ester',
                    reactants: [
                        { smiles: 'CC(=O)OC(=O)C', name: 'Acetic Anhydride' },
                        { smiles: 'CCO', name: 'Ethanol' },
                    ],
                    products: [
                        { smiles: 'CC(=O)OCC', name: 'Ethyl Acetate', yield: 50 },
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 50 },
                    ],
                    conditions: ''
                },
                {
                    id: 'anhydride_water',
                    name: 'Anhydride + Water → 2 Acids',
                    reactants: [
                        { smiles: 'CC(=O)OC(=O)C', name: 'Acetic Anhydride' },
                        { smiles: 'O', name: 'Water' },
                    ],
                    products: [
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 50 },
                        { smiles: 'CC(=O)O', name: 'Acetic Acid', yield: 50 },
                    ],
                    conditions: ''
                },
                {
                    id: 'anhydride_amine',
                    name: 'Anhydride + Amine → Amide',
                    reactants: [
                        { smiles: 'CC(=O)OC(=O)C', name: 'Acetic Anhydride' },
                        { smiles: 'CCN', name: 'Ethylamine' },
                        { smiles: 'CCN', name: 'Ethylamine (2nd eq.)' },
                    ],
                    products: [
                        { smiles: 'CC(=O)NCC', name: 'N-Ethylacetamide', yield: 100 },
                        { smiles: 'CC(=O)[O-].CC[NH3+]', name: 'Ethylammonium Acetate', isByproduct: true },
                    ],
                    conditions: ''
                }
            ],
            examples: [],
        },
    ]
};
