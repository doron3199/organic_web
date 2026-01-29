
// Static data definitions for reactions
// No dependencies on RDKit service or browser globals

export interface ReactionRule {
    id: string
    name: string
    description: string
    curriculum_subsubject_id: string
    reactionSmarts: string | string[] // The actual transformation SMARTS (can be multiple steps)
    reactant1Smarts: string // SMARTS to identify first reactant (e.g. Substrate)
    reactant2Smarts: string // SMARTS to identify second reactant (e.g. Reagent like Br2)
    matchExplanation?: string // Explanation of why this reaction is selected (e.g. "Alkane + Br2")
    conditions: Set<string>[] // Required conditions (list of sets for OR logic)
    selectivity?: {
        type: 'rank' | 'explicit',
        rules: { smarts: string; label: 'major' | 'minor' | 'trace' | 'equal' }[]
    }
}

// Helper to create OR condition sets
const or = (...conds: string[]): Set<string>[] => {
    const sets: Set<string>[] = []
    // Get all non-empty subsets of conds
    const n = conds.length
    for (let i = 1; i < (1 << n); i++) {
        const s = new Set<string>()
        for (let j = 0; j < n; j++) {
            if ((i >> j) & 1) s.add(conds[j])
        }
        sets.push(s)
    }
    return sets
}

// Extended reaction rules based on organic chemistry curriculum
export const reactionRules: ReactionRule[] = [
    // --- ALKANES ---
    {
        id: 'alkane_halogenation_br',
        name: 'Free Radical Bromination',
        curriculum_subsubject_id: 'alkanes-reactions',
        reactionSmarts: '[C;H1,H2,H3,H4:1].[Br][Br]>>[C:1][Br].[Br]',
        reactant1Smarts: '[#6;H1,H2,H3,H4]', // Generic Alkane Carbon
        reactant2Smarts: '[Br][Br]', // Br2
        matchExplanation: 'Alkane + Br2',
        description: 'Selective substitution of Hydrogen with Bromine at the most substituted carbon.',
        conditions: or('light', 'heat'),
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D4][Br]', label: 'major' }, // Tertiary (3 C + 1 Br = 4 heavy neighbors)
                { smarts: '[C;D3][Br]', label: 'minor' }, // Secondary (2 C + 1 Br = 3 heavy neighbors)
                { smarts: '[C;D2][Br]', label: 'minor' }, // Primary (1 C + 1 Br = 2 heavy neighbors)
                { smarts: '[C;D1][Br]', label: 'minor' }  // Methyl (0 C + 1 Br = 1 heavy neighbor)
            ]
        }
    },
    {
        id: 'alkane_halogenation_cl',
        name: 'Free Radical Chlorination',
        curriculum_subsubject_id: 'alkanes-reactions',
        reactionSmarts: '[C;H1,H2,H3,H4:1].[Cl][Cl]>>[C:1][Cl].[Cl]', // Non-selective
        reactant1Smarts: '[#6;H1,H2,H3,H4]',
        reactant2Smarts: '[Cl][Cl]', // Cl2
        matchExplanation: 'Alkane + Cl2',
        description: 'Substitution of Hydrogen with Chlorine (Low selectivity).',
        conditions: or('light', 'heat')
    },

    // --- ALKENES ---
    {
        id: 'alkene_hydrohalogenation',
        name: 'Hydrohalogenation (HX)',
        curriculum_subsubject_id: 'alkenes-hydrohalogenation',
        reactionSmarts: [
            '[C:1]=[C:2].[F,Cl,Br,I:3]>>[C:1][C+:2].[F,Cl,Br,I:3]', // Step 1: Protonation (X- is spectator)
            '[C+:1].[F,Cl,Br,I:2]>>[C:1][F,Cl,Br,I:2]' // Step 2: Nucleophilic Attack
        ],
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[F,Cl,Br,I]', // Matches HF (F), HCl (Cl), HBr (Br), HI (I)
        matchExplanation: 'Alkene + HX (X=F, Cl, Br, I)',
        description: 'Addition of H-X across a double bond (Markovnikov).',
        conditions: [new Set()],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D4][F,Cl,Br,I]', label: 'major' }, // Tertiary
                { smarts: '[C;D3][F,Cl,Br,I]', label: 'major' }, // Secondary
                { smarts: '[C;D2][F,Cl,Br,I]', label: 'minor' }  // Primary
            ]
        }
    },
    {
        id: 'alkene_hydration',
        name: 'Acid-Catalyzed Hydration',
        curriculum_subsubject_id: 'alkenes-hydration',
        reactionSmarts: [
            '[C:1]=[C:2].[OH2:3]>>[C:1][C+:2].[OH2:3]', // Step 1: Protonation (H2O is spectator)
            '[C+:1].[OH2:2]>>[C:1][O+:2]', // Step 2: Water attack
            '[O+:1].[OH2:2]>>[O+0:1].[OH2:2]' // Step 3: Deprotonation (simplified)
        ],
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[OH2]', // H2O
        matchExplanation: 'Alkene + H2O',
        description: 'Addition of water to form an alcohol (Markovnikov).',
        conditions: [new Set(['acid'])],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D4][OH]', label: 'major' }, // Tertiary
                { smarts: '[C;D3][OH]', label: 'major' }, // Secondary
                { smarts: '[C;D2][OH]', label: 'minor' }  // Primary
            ]
        }
    },
    {
        id: 'alkene_alcohol_addition',
        name: 'Acid-Catalyzed Alcohol Addition',
        curriculum_subsubject_id: 'alkenes-alcohol-addition',
        reactionSmarts: [
            '[C:1]=[C:2].[O:3][C:4]>>[C:1][C+:2].[O:3][C:4]', // Step 1: Protonation
            '[C+:1].[O:2][C:3]>>[C:1][O+:2][C:3]', // Step 2: Alcohol attack
            '[O+:1].[O:2][C:3]>>[O+0:1].[O:2][C:3]' // Step 3: Deprotonation
        ],
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[O;H1][C]', // Alcohol
        matchExplanation: 'Alkene + Alcohol',
        description: 'Addition of an alcohol to form an ether (Markovnikov).',
        conditions: [new Set(['acid'])],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D4]OC', label: 'major' }, // Tertiary
                { smarts: '[C;D3]OC', label: 'major' }, // Secondary
                { smarts: '[C;D2]OC', label: 'minor' }  // Primary
            ]
        }
    },
    {
        id: 'alkene_hydroboration',
        name: 'Hydroboration-Oxidation',
        curriculum_subsubject_id: 'alkenes-hydroboration',
        reactionSmarts: '[C:1]=[C:2]>>[C:1][C:2]([OH])',
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[OH2]',
        matchExplanation: 'Alkene (Hydroboration)',
        description: 'Addition of H-OH with Anti-Markovnikov regioselectivity.',
        conditions: [new Set(['base'])] // Simplified representation of 2nd step
    },
    {
        id: 'alkene_halogenation',
        name: 'Halogenation (Bromination)',
        curriculum_subsubject_id: 'alkenes-halogenation',
        reactionSmarts: '[C:1]=[C:2].[Br:3][Br:4]>>[C:1]([Br:3])[C:2]([Br:4])',
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[Br][Br]',
        matchExplanation: 'Alkene + Br2',
        description: 'Anti-addition of Br2 to form a vicinal dibromide.',
        conditions: [new Set()]
    },
    {
        id: 'alkene_halohydrin',
        name: 'Halohydrin Formation',
        curriculum_subsubject_id: 'alkenes-halogenation',
        reactionSmarts: '[C:1]=[C:2].[Br:3][Br:4].[OH2:5]>>[C:1]([OH:5])[C:2]([Br:3]).[Br:4]', // OH on more sub, Br on less
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[Br][Br]',
        matchExplanation: 'Alkene + Br2 + H2O',
        description: 'Addition of OH and Br (OH to more substituted Carbon).',
        conditions: [new Set(['h2o'])]
    },
    {
        id: 'alkene_hydrogenation',
        name: 'Hydrogenation',
        curriculum_subsubject_id: 'alkenes-hydrogenation',
        reactionSmarts: '[C:1]=[C:2].[H][H]>>[C:1][C:2]', // Adds H implied
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[H][H]',
        matchExplanation: 'Alkene + H2',
        description: 'Reduction of double bond to single bond.',
        conditions: [new Set(['pd_c'])]
    },
    {
        id: 'alkene_epoxidation',
        name: 'Epoxidation',
        curriculum_subsubject_id: 'alkenes-epoxidation',
        reactionSmarts: '[C:1]=[C:2]>>[C:1]1[O][C:2]1',
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[O]',
        matchExplanation: 'Alkene + Peroxyacid (mCPBA)',
        description: 'Formation of an epoxide ring.',
        conditions: [new Set(['acid'])] // mCPBA is an acid
    },
    {
        id: 'alkene_ozonolysis',
        name: 'Ozonolysis (Reductive)',
        curriculum_subsubject_id: 'alkenes-ozonolysis',
        reactionSmarts: '[C:1]=[C:2]>>[C:1]=[O].[C:2]=[O]', // Cleavage
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[O]',
        matchExplanation: 'Alkene (Ozonolysis)',
        description: 'Cleavage of double bond to form Carbonyls.',
        conditions: [new Set(['h2o'])] // 2nd step Zinc/H2O
    },
    {
        id: 'alkene_hydroxylation',
        name: 'Syn-Hydroxylation',
        curriculum_subsubject_id: 'alkenes-epoxidation',
        reactionSmarts: '[C:1]=[C:2]>>[C:1]([OH])[C:2]([OH])',
        reactant1Smarts: '[C]=[C]',
        reactant2Smarts: '[O]',
        matchExplanation: 'Alkene (Hydroxylation)',
        description: 'Formation of a cis-diol.',
        conditions: or('heat', 'base') // Hot KMnO4 (heat/base) or OsO4
    },

    // --- ALKYNES ---
    {
        id: 'alkyne_hydrohalogenation_1eq',
        name: 'Hydrohalogenation (1 eq.)',
        curriculum_subsubject_id: 'alkynes-addition',
        reactionSmarts: '[C:1]#[C:2].[F,Cl,Br,I:3]>>[C:1]([F,Cl,Br,I:3])=[C:2]',
        reactant1Smarts: '[C]#[C]',
        reactant2Smarts: '[F,Cl,Br,I]',
        matchExplanation: 'Alkyne + HX (1 eq., X=F, Cl, Br, I)',
        description: 'Addition of 1 equivalent of HX to form Vinyl Halide.',
        conditions: [new Set()]
    },
    {
        id: 'alkyne_hydrohalogenation_2eq',
        name: 'Hydrohalogenation (Excess)',
        curriculum_subsubject_id: 'alkynes-addition',
        reactionSmarts: '[C:1]#[C:2].[F,Cl,Br,I:3].[F,Cl,Br,I:4]>>[C:1]([F,Cl,Br,I:3])([F,Cl,Br,I:4])[C:2]',
        reactant1Smarts: '[C]#[C]',
        reactant2Smarts: '[F,Cl,Br,I]',
        matchExplanation: 'Alkyne + HX (Excess, X=F, Cl, Br, I)',
        description: 'Addition of excess HX to form Geminal Dihalide.',
        conditions: [new Set()]
    },
    {
        id: 'alkyne_halogenation_1eq',
        name: 'Halogenation (1 eq.)',
        curriculum_subsubject_id: 'alkynes-addition',
        reactionSmarts: '[C:1]#[C:2].[Br:3][Br:4]>>[C:1]([Br:3])=[C:2]([Br:4])',
        reactant1Smarts: '[C]#[C]',
        reactant2Smarts: '[Br][Br]',
        matchExplanation: 'Alkyne + Br2 (1 eq.)',
        description: 'Addition of 1 eq. Br2 to form Dihaloalkene.',
        conditions: [new Set()]
    },
    {
        id: 'alkyne_hydration_acid',
        name: 'Acid-Catalyzed Hydration',
        curriculum_subsubject_id: 'alkynes-hydration',
        reactionSmarts: '[C:1]#[C:2].[OH2:3]>>[C:1](=[O:3])[C:2]', // Keto-enol tautomerism implied to Ketone
        reactant1Smarts: '[C]#[C]',
        reactant2Smarts: '[OH2]',
        matchExplanation: 'Alkyne + H2O',
        description: 'Hydration to form a Ketone (Markovnikov).',
        conditions: [new Set(['acid'])]
    },
    {
        id: 'alkyne_hydroboration',
        name: 'Hydroboration-Oxidation',
        curriculum_subsubject_id: 'alkynes-hydration',
        reactionSmarts: '[C:1]#[CH1:2].[B:3]>>[C:1][C:2]=O', // Anti-Markovnikov to Aldehyde if terminal
        reactant1Smarts: '[C]#[CH1]',
        reactant2Smarts: '[O]',
        matchExplanation: 'Terminal Alkyne (Hydroboration)',
        description: 'Hydration to form Aldehyde (Terminal) or Ketone (Internal).',
        conditions: [new Set(['h2o', 'base'])]
    },
    {
        id: 'alkyne_reduction_complete',
        name: 'Complete Reduction',
        curriculum_subsubject_id: 'alkynes-reduction',
        reactionSmarts: '[C:1]#[C:2].[H][H].[H][H]>>[C:1][C:2]',
        reactant1Smarts: '[C]#[C]',
        reactant2Smarts: '[H][H]',
        matchExplanation: 'Alkyne + H2',
        description: 'Reduction to Alkane.',
        conditions: [new Set(['pd_c'])]
    },
    {
        id: 'alkyne_reduction_trans',
        name: 'Dissolving Metal Reduction',
        curriculum_subsubject_id: 'alkynes-reduction',
        reactionSmarts: '[#6:3][#6:1]#[#6:2][#6:4].[H][H]>>[#6:3]/[#6:1]=[#6:2]/[#6:4]', // Trans alkene
        reactant1Smarts: '[C]#[C]',
        reactant2Smarts: '[H][H]',
        matchExplanation: 'Alkyne (Na/NH3)',
        description: 'Reduction to Trans-Alkene.',
        conditions: [new Set(['base'])] // NH3/Na is basic
    },
    {
        id: 'alkyne_reduction_cis',
        name: 'Lindlar Reduction',
        curriculum_subsubject_id: 'alkynes-reduction',
        reactionSmarts: '[#6:3][#6:1]#[#6:2][#6:4].[H][H]>>[#6:3]/[#6:1]=[#6:2]\\[#6:4]', // Cis alkene
        reactant1Smarts: '[C]#[C]',
        reactant2Smarts: '[H][H]',
        matchExplanation: 'Alkyne + H2 (Lindlar)',
        description: 'Reduction to Cis-Alkene.',
        conditions: [new Set(['lindlar'])]
    },
    {
        id: 'alkyne_alkylation',
        name: 'Alkylation of Acetylide',
        curriculum_subsubject_id: 'alkynes-alkylation',
        reactionSmarts: '[C:1]#[CH1].[#6:2][Br,Cl,I:3]>>[C:1]#[C][#6:2].[Br,Cl,I:3]',
        reactant1Smarts: '[C]#[CH1]',
        reactant2Smarts: '[#6][Br,Cl,I]', // Alkyl Halide
        matchExplanation: 'Terminal Alkyne (Alkylation)',
        description: 'Deprotonation followed by Nucleophilic Attack on Alkyl Halide.',
        conditions: [new Set(['base'])]
    }
]
