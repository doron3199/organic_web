import { Subject } from '../types';

export const alcohols: Subject = {
    id: 'alcohols',
    name: 'Alcohols, Ethers, and Epoxides',
    icon: '🍺',
    subSubjects: [
        {
            id: 'alcohols-naming',
            section: 'Nomenclature',
            name: 'Naming & Properties',
            content: `
### Naming Alcohols
Identify the functional group (-OH). Replace the "-e" of the parent hydrocarbon with **-ol**.
-   **Methanol**: CH₃OH
-   **Ethanol**: CH₃CH₂OH
-   **Propan-2-ol**: OH on carbon 2 of a 3-carbon chain.
-   **Cyclohexanol**: OH on a cyclohexane ring.

**Priority**: The alcohol group gets priority over double bonds and halogens when numbering.

### Naming Ethers
-   **Common Names**: Name the two alkyl groups followed by "ether" (e.g., Ethyl methyl ether).
-   **Systematic Names**: Treat the smaller alkoxy group as a substituent (e.g., Methoxyethane).

### Thiols
Sulfur analogs of alcohols (R-SH). Add the suffix **-thiol** to the parent alkane name (e.g., Ethanethiol).
            `,
            examples: [
                { smiles: 'CO', name: 'Methanol' },
                { smiles: 'CCO', name: 'Ethanol' },
                { smiles: 'CC(O)C', name: 'Propan-2-ol' },
                { smiles: 'COC', name: 'Dimethyl ether' },
                { smiles: 'CCS', name: 'Ethanethiol' }
            ],
            rules: [
                {
                    id: 'alcohol-suffix',
                    name: 'Alcohol Suffix',
                    smarts: '[OX2H]',
                    description: 'Change the parent suffix to -ol.',
                    logicType: 'check_suffix_alcohol',
                    unlocked: true
                },
                {
                    id: 'alcohol-priority',
                    name: 'Alcohol Priority',
                    smarts: '',
                    description: 'The -OH group gets priority over double bonds and halogens in numbering.',
                    logicType: 'check_functional_priority',
                    unlocked: true
                }
            ]
        },
        {
            id: 'alcohols-preparation-alkenes',
            section: 'Preparation',
            name: 'Preparation from Alkenes',
            content: `
### From Alkenes
-   **Hydration**: Acid-catalyzed addition of water (Markovnikov).
-   **Hydroboration-Oxidation**: Anti-Markovnikov addition of water.
            `,
            reactionExamples: [
                {
                    id: 'alcohol_prep_hydration',
                    name: 'Acid-Catalyzed Hydration',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'O', name: 'H₂O' }
                    ],
                    products: [
                        { smiles: 'CC(O)C', name: 'Propan-2-ol', selectivity: 'major', yield: 90 },
                        { smiles: 'CCCO', name: 'Propan-1-ol', selectivity: 'minor', yield: 10 }
                    ],
                    conditions: 'H₂SO₄'
                },
                {
                    id: 'alcohol_prep_hydroboration',
                    name: 'Hydroboration-Oxidation',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'B', name: 'BH3' }
                    ],
                    products: [
                        { smiles: 'CCCO', name: 'Propan-1-ol', selectivity: 'major', yield: 100 }
                    ],
                    conditions: '1. BH₃, 2. H₂O₂, NaOH'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-preparation-substitution',
            section: 'Preparation',
            name: 'Preparation from Substitution',
            content: `
### From Substitution of Alkyl Halides
-   **Hydrolysis**: Reaction of alkyl halides with water or hydroxide.
    -   **SN1**: Tertiary substrates react with weak nucleophiles (H₂O).
    -   **SN2**: Primary substrates react with strong nucleophiles (OH⁻).
            `,
            reactionExamples: [
                {
                    id: 'alcohol_prep_hydrolysis_sn1',
                    name: 'SN1 Hydrolysis of tert-Butyl Bromide',
                    reactants: [
                        { smiles: 'CC(C)(Br)C', name: 'tert-Butyl Bromide' },
                        { smiles: 'O', name: 'H₂O' }
                    ],
                    products: [
                        { smiles: 'CC(C)(O)C', name: 'tert-Butyl Alcohol', yield: 100 },
                        { smiles: 'Br', name: 'HBr', isByproduct: true }
                    ],
                    conditions: 'Solvolysis'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-preparation-reduction-carbonyls',
            section: 'Preparation',
            name: 'Reduction of Aldehydes & Ketones',
            content: `
### Reduction of Aldehydes & Ketones
-   **Aldehydes/Ketones**: Reduced by Sodium Borohydride (NaBH₄) or Lithium Aluminum Hydride (LiAlH₄).
    -   Aldehyde → Primary Alcohol
    -   Ketone → Secondary Alcohol
            `,
            reactionExamples: [
                {
                    id: 'alcohol_prep_red_aldehyde',
                    name: 'Reduction of Aldehyde',
                    reactants: [
                        { smiles: 'CCC=O', name: 'Propanal' },
                    ],
                    products: [
                        { smiles: 'CCCO', name: 'Propan-1-ol', yield: 100 }
                    ],
                    conditions: 'NaBH₄, H₃O⁺'
                },
                {
                    id: 'alcohol_prep_red_ketone',
                    name: 'Reduction of Ketone',
                    reactants: [
                        { smiles: 'CC(=O)C', name: 'Acetone' },
                    ],
                    products: [
                        { smiles: 'CC(O)C', name: 'Propan-2-ol', yield: 100 }
                    ],
                    conditions: 'NaBH₄, H₃O⁺'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-preparation-reduction-acids',
            section: 'Preparation',
            name: 'Reduction of Carboxylic Acids',
            content: `
### Reduction of Carboxylic Acids & Esters
-   **Esters/Carboxylic Acids**: Require the stronger reducing agent LiAlH₄ to form Primary Alcohols.
            `,
            reactionExamples: [
                {
                    id: 'alcohol_prep_red_acid',
                    name: 'Reduction of Carboxylic Acid',
                    reactants: [
                        { smiles: 'CCC(=O)OC', name: 'Methyl Propanoate' },
                        { smiles: '[Li+].[AlH4-]', name: 'LiAlH₄' },
                        { smiles: '[Li+].[AlH4-]', name: 'LiAlH₄' },
                    ],
                    products: [
                        { smiles: 'CCCO', name: 'Propan-1-ol', yield: 100 },
                        { smiles: 'CO', name: 'Methanol', yield: 100 }
                    ],
                    conditions: 'H₃O⁺'
                },
                {
                    id: 'carboxylic_Acids_with_hydride_ion',
                    name: 'Reduction of Carboxylic Acid with Hydride Ion',
                    reactants: [
                        { smiles: 'CCC(=O)O', name: 'Methanoic Acid' },
                        { smiles: '[Li+].[AlH4-]', name: 'LiAlH₄' },
                    ],
                    products: [
                        { smiles: 'CCCO', name: '1-Propanol', yield: 100 },
                    ],
                    conditions: 'H₃O⁺'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-preparation-grignard',
            section: 'Preparation',
            name: 'Grignard Reagents',
            content: `
### Creation of Grignard Reagents
Reaction of an alkyl halide with Magnesium metal in ether.
-   R-X + Mg → R-Mg-X

### Reaction with Carbonyls
Nucleophilic attack on carbonyls.
-   Formaldehyde → Primary Alcohol.
-   Aldehyde → Secondary Alcohol.
-   Ketone/Ester → Tertiary Alcohol.
            `,
            reactionExamples: [
                {
                    id: 'grignard_formation',
                    name: 'Formation of Grignard Reagent',
                    reactants: [
                        { smiles: 'CCBr', name: 'Ethyl Bromide' },
                        { smiles: '[Mg]', name: 'Magnesium' }
                    ],
                    products: [
                        { smiles: 'CC[Mg]Br', name: 'Ethylmagnesium Bromide', yield: 100 }
                    ],
                    conditions: 'Ether'
                },
                {
                    id: 'alcohol_prep_grignard_formal',
                    name: 'Grignard + Formaldehyde (Primary Alcohol)',
                    reactants: [
                        { smiles: 'C=O', name: 'Formaldehyde' },
                        { smiles: 'C[Mg]Br', name: 'MeMgBr' }
                    ],
                    products: [
                        { smiles: 'CCO', name: 'Ethanol', yield: 100 }
                    ],
                    conditions: '',
                    autoAddMolecules: [
                        { smiles: '[OH3+]', name: 'H₃O⁺' },
                    ]
                },
                {
                    id: 'alcohol_prep_grignard_aldehyde',
                    name: 'Grignard + Aldehyde (Secondary Alcohol)',
                    reactants: [
                        { smiles: 'CC=O', name: 'Acetaldehyde' },
                        { smiles: 'C[Mg]Br', name: 'MeMgBr' }
                    ],
                    products: [
                        { smiles: 'CC(O)C', name: 'Propan-2-ol', yield: 100 }
                    ],
                    conditions: '',
                    autoAddMolecules: [
                        { smiles: '[OH3+]', name: 'H₃O⁺' },
                    ]
                },
                {
                    id: 'alcohol_prep_grignard_ketone',
                    name: 'Grignard + Ketone (Tertiary Alcohol)',
                    reactants: [
                        { smiles: 'CC(=O)C', name: 'Acetone' },
                        { smiles: 'C[Mg]Br', name: 'MeMgBr' }
                    ],
                    products: [
                        { smiles: 'CC(C)(O)C', name: 'tert-Butanol', yield: 100 }
                    ],
                    conditions: '',
                    autoAddMolecules: [
                        { smiles: '[OH3+]', name: 'H₃O⁺' },
                    ]
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-activation-hx',
            section: 'Reactions',
            name: 'Reaction with HX',
            content: `
### Activation with HX
The OH group is a bad leaving group (strong base). We must turn it into a good leaving group (H₂O, etc.) to substitute it.

#### Reaction with HX (HCl, HBr, HI)
-   **Tertiary/Secondary**: SN1 Mechanism (Carbocation intermediate). Heat normally not required.
-   **Primary**: SN2 Mechanism (backside attack). Heat required.
            `,
            reactionExamples: [
                {
                    id: 'alcohol_activation_hx_sn1',
                    reactants: [
                        { smiles: 'CC(C)(O)C', name: 'tert-Butanol' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CC(C)(Br)C', name: 'tert-Butyl Bromide', yield: 100 },
                        { smiles: 'O', name: 'Water', yield: 100 }
                    ],
                    conditions: ''
                },
                {
                    id: 'alcohol_activation_hx_sn2',
                    reactants: [
                        { smiles: 'CCO', name: 'Ethanol' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CCBr', name: 'Ethyl Bromide', yield: 100 },
                        { smiles: 'O', name: 'Water', yield: 100 }
                    ],
                    conditions: 'heat'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-activation-socl2',
            section: 'Reactions',
            name: 'Thionyl Chloride (SOCl₂)',
            content: `
### Thionyl Chloride (SOCl₂)
Best for converting Primary/Secondary alcohols to Chlorides.
-   **Mechanism**: SN2 (Inversion of configuration).
-   **Advantage**: No carbocation rearrangements!
            `,
            reactionExamples: [
                {
                    id: 'alcohol_activation_socl2',
                    name: 'Reaction with SOCl₂',
                    reactants: [
                        { smiles: 'CCO', name: 'Ethanol' },
                    ],
                    products: [
                        { smiles: 'CCCl', name: 'Chloroethane', yield: 100 }
                    ],
                    conditions: 'SOCl₂'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-activation-pbcl',
            section: 'Reactions',
            name: 'Phosphorus Trichloride (PCl₃)',
            content: `
### Phosphorus Trichloride (PCl₃)
Best for converting Primary/Secondary alcohols to Chlorides.
-   **Mechanism**: SN2 (Inversion of configuration).
-   **Advantage**: No carbocation rearrangements!
            `,
            reactionExamples: [
                {
                    id: 'alcohol_activation_pbcl',
                    name: 'Reaction with PCl₃',
                    reactants: [
                        { smiles: 'CCO', name: 'Ethanol' },
                    ],
                    products: [
                        { smiles: 'CCCl', name: 'Chloroethane', yield: 100 }
                    ],
                    conditions: 'PCl₃'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-activation-pbr3',
            section: 'Reactions',
            name: 'Phosphorus Tribromide (PBr₃)',
            content: `
### Phosphorus Tribromide (PBr₃)
Best for converting Primary/Secondary alcohols to Bromides.
-   **Mechanism**: SN2 (Inversion of configuration).
-   **Advantage**: No carbocation rearrangements!
            `,
            reactionExamples: [
                {
                    id: 'alcohol_activation_pbr3',
                    name: 'Reaction with PBr₃',
                    reactants: [
                        { smiles: 'CCO', name: 'Ethanol' },
                    ],
                    products: [
                        { smiles: 'CCBr', name: 'Bromoethane', yield: 100 }
                    ],
                    conditions: 'PBr₃'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-dehydration',
            section: 'Reactions',
            name: 'Acid-Catalyzed Dehydration',
            content: `
### Acid-Catalyzed Dehydration of Alcohols
*   **Reaction Type:** Dehydration is an elimination reaction where an alcohol loses water to form an alkene.
*   **Reversibility:** The reaction is reversible (hydration vs. dehydration). To drive the reaction toward the alkene product, water or the alkene is removed as it forms.
*   **Mechanism:**
    *   **Secondary and Tertiary Alcohols:** Proceed via an **E1 mechanism** involving a carbocation intermediate.
    *   **Primary Alcohols:** Proceed via an **E2 mechanism** because primary carbocations are too unstable to form.
*   **Reactivity Order:** Tertiary alcohols dehydrate easiest, followed by secondary, then primary (Hardest). This rate depends on the ease of carbocation formation.
*   **Rearrangements:** Since secondary and tertiary alcohols form carbocations, **rearrangements** (like 1,2-methyl shifts or 1,2-hydride shifts) can occur to form more stable carbocations.
*   **Competition:** Elimination competes with substitution ($S_N2$) reactions; high temperatures favor elimination.
            `,
            reactionExamples: [
                {
                    id: 'alcohol_dehydration_cyclohexanol',
                    name: 'Dehydration of Cyclohexanol',
                    reactants: [
                        { smiles: 'C1CCCCC1O', name: 'Cyclohexanol' }
                    ],
                    products: [
                        { smiles: 'C1=CCCCC1', name: 'Cyclohexene', yield: 100 },
                        { smiles: 'O', name: 'Water', isByproduct: true }
                    ],
                    conditions: 'H₂SO₄, Δ',
                    isEquilibrium: true
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'alcohols-oxidation',
            section: 'Reactions',
            name: 'Oxidation of Alcohols',
            content: `
### Oxidation of Alcohols
*   **Primary Alcohols:**
    *   React with chromic acid ($H_2CrO_4$) to form an aldehyde, which then rapidly oxidizes further to a **carboxylic acid**.
    *   To stop the oxidation at the **aldehyde** stage, a milder reagent like **PCC** (Pyridinium chlorochromate) must be used.
*   **Secondary Alcohols:** Oxidize to **ketones** using reagents like $Na_2Cr_2O_7$ with $H_2SO_4$ or $H_2CrO_4$.
*   **Tertiary Alcohols:** Cannot be oxidized to carbonyl compounds because the carbon bearing the hydroxyl group is not bonded to a hydrogen atom.
            `,
            reactionExamples: [
                {
                    id: 'alcohol_oxidation_pcc',
                    reactants: [
                        { smiles: 'CCCO', name: 'Propan-1-ol' },
                    ],
                    products: [
                        { smiles: 'CCC=O', name: 'Propanal', yield: 100 }
                    ],
                    conditions: 'PCC'
                },
                {
                    id: 'alcohol_oxidation_jones',
                    reactants: [
                        { smiles: 'CCCO', name: 'Propan-1-ol' },
                    ],
                    products: [
                        { smiles: 'CCC(=O)O', name: 'Propanoic Acid', yield: 100 }
                    ],
                    conditions: 'H2CrO4'
                },
                {
                    id: 'alcohol_oxidation_secondary',
                    name: 'Oxidation of Secondary Alcohol',
                    reactants: [
                        { smiles: 'CCC(O)C', name: 'Butan-2-ol' }
                    ],
                    products: [
                        { smiles: 'CCC(=O)C', name: 'Butanone', yield: 100 }
                    ],
                    conditions: 'H2CrO4'
                }
            ],
            examples: [
                { smiles: '[nH+]1ccccc1.[O-][Cr](=O)(=O)Cl', name: 'PCC' },
                { smiles: 'O[Cr](=O)(=O)O', name: 'Chromic Acid' }
            ],
            rules: []
        },
        {
            id: 'ethers-structure',
            section: 'Ethers & Epoxides',
            name: 'Ethers',
            content: `
### Ethers
*   **Structure:** Compounds with an oxygen bonded to two alkyl or aryl groups (R-O-R for symmetrical, R-O-R' for unsymmetrical).
*   **Properties:** Similar basicity to alcohols; they must be activated (e.g., protonated) to act as leaving groups.
*   **Nomenclature:** Substituents are listed in alphabetical order (e.g., ethyl methyl ether).
*   **Synthesis Methods:**
    1.  **Dehydration of Alcohols:** Heating primary alcohols with acid (approx. 140°C) to form symmetric ethers ($2 ROH \to ROR + H_2O$).
    2.  **Williamson Ether Synthesis:** Reaction of an alkyl halide ($R-Br$) with an alkoxide ion ($R-O^-$).
    3.  Acid-catalyzed addition of an alcohol to an alkene.
    4.  Solvolysis.
*   **Crown Ethers:** Cyclic polyethers that specifically bind metal ions (like $K^+$, $Na^+$, $Li^+$) depending on the ring's cavity size. The oxygen lone pairs point inward to interact with the cation.
    *   *Example:* **Nonactin** is a naturally occurring antibiotic that acts as a crown ether, transporting potassium ions out of bacteria to disrupt electrolyte balance and kill the cell.
            `,
            reactionExamples: [
                {
                    id: 'alcohol_dehydration_ether',
                    name: 'Bimolecular Dehydration',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'BrBr', name: 'Bromine' },
                        { smiles: 'O', name: 'Water' }
                    ],
                    products: [
                        { smiles: 'CC(CO)Br', name: '2-Bromopropan-1-ol', yield: 10 },
                        { smiles: 'CC(CBr)O', name: '1-Bromopropan-2-ol', yield: 90 },
                    ],
                    conditions: ''
                },
                {
                    id: 'williamson_ether_synthesis',
                    reactants: [
                        { smiles: 'CC[O-]', name: 'Ethoxide' },
                        { smiles: 'CCI', name: 'Iodomethane' }
                    ],
                    products: [
                        { smiles: 'CCOC', name: 'Ethyl methyl ether', yield: 100 }
                    ],
                    conditions: 'SN2'
                },
                {
                    id: 'alkene_alcohol_addition',
                    name: 'Acid-Catalyzed Addition to Alkene',
                    reactants: [
                        { smiles: 'CC=C', name: 'Propene' },
                        { smiles: 'CO', name: 'Methanol' }
                    ],
                    products: [
                        { smiles: 'CC(OC)C', name: '2-Methoxypropane', yield: 100 }
                    ],
                    conditions: 'H₂SO₄'
                },
                {
                    id: 'ether_formation_solvolysis',
                    name: 'Solvolysis of tert-Alkyl Halide',
                    reactants: [
                        { smiles: 'CCC(C)(Br)C', name: '2-Bromo-2-methylbutane' },
                        { smiles: 'CO', name: 'Methanol' }
                    ],
                    products: [
                        { smiles: 'CCC(C)(OC)C', name: '2-Methoxy-2-methylbutane', yield: 100 },
                        { smiles: 'Br', name: 'HBr', isByproduct: true }
                    ],
                    conditions: 'Solvolysis'
                },
                {
                    id: 'intramolecular_ether_5',
                    name: 'Intramolecular Williamson Synthesis',
                    reactants: [
                        { smiles: 'OCCCCBr', name: '4-Bromobutanol' },
                        { smiles: '[OH-]', name: 'Hydroxide' }
                    ],
                    products: [
                        { smiles: 'C1CCOC1', name: 'Tetrahydrofuran', yield: 100 },
                        { smiles: 'Br', name: 'Bromide', isByproduct: true }
                    ],
                    conditions: 'Base'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'epoxides-preparation',
            section: 'Ethers & Epoxides',
            name: 'Preparation of Epoxides',
            content: `
### Epoxides
*   **Definition:** Ethers containing a three-membered ring (oxiranes).
### Preparation of Epoxides
1.  **From Alkenes (Peroxyacids):**
    *   Alkenes react with peroxyacids ($RCO_3H$, like mCPBA) to form epoxides in a concerted *syn*-addition.
    *   **Stereochemistry:** The stereochemistry of the alkene is retained (cis alkene $\to$ cis epoxide).

2.  **From Halohydrins:**
    *   **Step 1:** Halohydrin formation (Alkene + $X_2$ + $H_2O$).
    *   **Step 2:** Intramolecular $S_N2$ reaction. A base removes the proton from the alcohol, and the resulting alkoxide back-attacks the carbon bearing the halogen, forming the epoxide.
            `,
            reactionExamples: [
                {
                    id: 'epoxide_prep_halohydrin',
                    name: 'Epoxide from Halohydrin',
                    reactants: [
                        { smiles: 'ClC1CCCCC1O', name: '2-Chlorocyclohexanol' },
                        { smiles: '[NaH]', name: 'Sodium Hydride' }
                    ],
                    products: [
                        { smiles: 'C1CCC2OC2C1', name: 'Cyclohexene oxide', yield: 100 }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'epoxides-reactions',
            section: 'Ethers & Epoxides',
            name: 'Reactions of Epoxides',
            content: `
### Reactions of Epoxides (Ring Opening)
Epoxides are highly reactive due to **ring strain**. They undergo ring-opening reactions with various nucleophiles.

#### 1. Acidic Conditions
*   **Conditions:** Acid catalyst ($H_2SO_4$, $H^+$) and a weak nucleophile ($H_2O$, $ROH$).
*   **Mechanism:** Protonation of the epoxide oxygen activates the ring.
*   **Regioselectivity:** The nucleophile attacks the **more substituted** carbon (which better supports partial positive charge).
*   **Stereochemistry:** Backside attack (Inversion of configuration).

#### 2. Basic/Neutral Conditions
*   **Conditions:** Strong nucleophile ($HO^-$, $RO^-$, $CN^-$, $RMgX$).
*   **Mechanism:** Direct $S_N2$ attack.
*   **Regioselectivity:** The nucleophile attacks the **less sterically hindered** carbon.
*   **Stereochemistry:** Backside attack (Inversion of configuration).

#### 3. With Grignard Reagents
*   Reaction with Grignard reagents ($R-MgX$) extends the carbon chain. Attack occurs at the less substituted carbon.
            `,
            reactionExamples: [
                {
                    id: 'epoxide_opening_acid',
                    name: 'Acid-Catalyzed Ring Opening',
                    reactants: [
                        { smiles: 'C1OC1C', name: '2-Methyloxirane' },
                        { smiles: 'CO', name: 'Methanol' },
                        { smiles: '[H+]', name: 'Acid' }
                    ],
                    products: [
                        { smiles: 'CC(OC)CO', name: '2-Methoxypropan-1-ol', yield: 90 }, // Attack at More Substituted (Secondary)
                        { smiles: 'CC(O)COC', name: '2-Methoxypropan-1-ol', yield: 10 }
                    ],
                    conditions: ''
                },
                {
                    id: 'epoxide_opening_basic',
                    name: 'Basic Ring Opening',
                    reactants: [
                        { smiles: 'C1OC1C', name: '2-Methyloxirane' },
                        { smiles: '[O-]C', name: 'Methoxide' },
                        { smiles: '[Na+]', name: 'Sodium' }
                    ],
                    products: [
                        { smiles: 'CC(O)COC', name: '1-Methoxypropan-2-ol', yield: 100 } // Attack at Less Substituted (Primary)
                    ],
                    conditions: 'Basic'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'thiols-sulfides',
            section: 'Special Topics',
            name: 'Thiols and Sulfides',
            content: `
### Thiols and Sulfides
*   **Thiols (R-SH):** Sulfur analogs of alcohols.
    *   **Properties:** Lower boiling points than alcohols; stronger acids ($pK_a \approx 10$) than alcohols ($pK_a \approx 15$).
    *   **Reactivity:** Good nucleophiles. They react with alkyl halides to form **thioethers** (sulfides).
    *   **Oxidation:** Mild oxidation (e.g., with $Br_2$ and base) converts thiols into **disulfides** ($R-S-S-R$).
*   **Biological Significance:**
    *   **Cysteine:** An amino acid with a thiol group. Oxidation forms **cystine** (two cysteines linked by a disulfide bond).
    *   **Hair Structure:** Disulfide bridges between keratin proteins determine hair shape. "Perms" work by reducing these bridges (breaking them), reshaping the hair, and then oxidizing them back to form new bridges that hold the new shape.
            `,
            reactionExamples: [
                {
                    id: 'thiol_sn2_example',
                    name: 'Thiolate as Nucleophile',
                    reactants: [
                        { smiles: 'C[S-]', name: 'Methanethiolate' },
                        { smiles: 'CCBr', name: 'Bromoethane' },
                        { smiles: 'CO', name: 'Methanol' }
                    ],
                    products: [
                        { smiles: 'CCSC', name: 'Ethyl methyl sulfide', yield: 100 },
                        { smiles: '[Br-]', name: 'Bromide', isByproduct: true }
                    ],
                    conditions: ''
                },
                {
                    id: 'sulfide_sn2_example',
                    name: 'Thioether as Nucleophile',
                    reactants: [
                        { smiles: 'CSC', name: 'Dimethyl sulfide' },
                        { smiles: 'CI', name: 'Iodomethane' }
                    ],
                    products: [
                        { smiles: 'C[S+](C)C', name: 'Trimethylsulfonium', yield: 100 },
                        { smiles: '[I-]', name: 'Iodide', isByproduct: true }
                    ],
                    conditions: ''
                },
                {
                    id: 'cysteine_oxidation',
                    name: 'Oxidation of Cysteine',
                    reactants: [
                        { smiles: 'NC(CS)C(=O)O', name: 'Cysteine' },
                        { smiles: 'NC(CS)C(=O)O', name: 'Cysteine' }
                    ],
                    products: [
                        { smiles: 'NC(C(=O)O)CSSCC(N)C(=O)O', name: 'Cystine', yield: 100 }
                    ],
                    conditions: 'Mild Oxidation'
                },
                {
                    id: 'thiol_oxidation_general',
                    name: 'General Thiol Oxidation',
                    reactants: [
                        { smiles: 'CCS', name: 'Ethanethiol' },
                        { smiles: 'CCS', name: 'Ethanethiol' }
                    ],
                    products: [
                        { smiles: 'CCSSCC', name: 'Diethyl Disulfide', yield: 100 }
                    ],
                    conditions: 'Mild Oxidation'
                }
            ],
            examples: [],
            rules: []
        },
        {
            id: 'amines-intro',
            section: 'Special Topics',
            name: 'Amines',
            content: `
### Amines
*   **Classification:** Classified as primary ($RNH_2$), secondary ($R_2NH$), or tertiary ($R_3N$) based on the number of organic groups attached to the nitrogen.
*   **Reactivity:** Amines act as both **bases** (accepting protons) and **nucleophiles** (attacking electrophiles like alkyl halides or epoxides).
*   **Antihistamines:**
    *   **Histamine:** A monoamine that causes allergic responses (vasodilation, muscle contraction).
    *   **Antihistamines:** Drugs (like diphenhydramine) that block histamine receptors to prevent allergic reactions.
            `,
            reactionExamples: [
                {
                    id: 'amine_protonation_example',
                    name: 'Amine as a Base',
                    reactants: [
                        { smiles: 'CCCN', name: 'Propylamine' },
                        { smiles: 'Br', name: 'HBr' }
                    ],
                    products: [
                        { smiles: 'CCC[NH3+]', name: 'Propylammonium', yield: 100 },
                        { smiles: '[Br-]', name: 'Bromide', isByproduct: true }
                    ],
                    conditions: ''
                },
                {
                    id: 'amine_salt_formation',
                    name: 'Formation of Ammonium Salt',
                    reactants: [
                        { smiles: 'CCCN', name: 'Propylamine' },
                        { smiles: 'CBr', name: 'Methyl bromide' }
                    ],
                    products: [
                        { smiles: 'CCC[NH2+]C', name: 'Methylpropylammonium', yield: 100 },
                        { smiles: '[Br-]', name: 'Bromide', isByproduct: true }
                    ],
                    conditions: ''
                },
                {
                    id: 'amine_alkylation_example',
                    name: 'Amine as Nucleophile (SN2)',
                    reactants: [
                        { smiles: 'CCBr', name: 'Ethyl bromide' },
                        { smiles: 'CN', name: 'Methylamine' }
                    ],
                    products: [
                        { smiles: 'CCN(C)', name: 'Ethylmethylamine', yield: 100 },
                        { smiles: 'Br', name: 'HBr', isByproduct: true }
                    ],
                    conditions: ''
                },
                {
                    id: 'amine_epoxide_opening',
                    name: 'Amine Opening an Epoxide',
                    reactants: [
                        { smiles: 'C1OC1C', name: '2-Methyloxirane' },
                        { smiles: 'CN', name: 'Methylamine' }
                    ],
                    products: [
                        { smiles: 'CC(O)CN(C)', name: '1-(Methylamino)propan-2-ol', yield: 100 }
                    ],
                    conditions: ''
                }
            ],
            examples: [],
            rules: []
        }
    ]
};
