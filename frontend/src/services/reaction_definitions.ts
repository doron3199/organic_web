
// Static data definitions for reactions
// No dependencies on RDKit service or browser globals
const BENZENE_SMARTS = 'c1ccccc1'

const BENZENE_STEPS = [
    '[CH]1({XXX})[C+][CH]=[CH][CH]=[CH]1>>[C]1({XXX})[C]=[CH][C+][CH]=[CH]1',
    '[C]1({XXX})[C]=[CH][C+][CH]=[CH]1>>[C]1({XXX})[CH]=[CH][CH]=[CH][C+]1',
    '[C]1({XXX})[CH]=[CH][CH]=[CH][C+]1>>[c]1({XXX})[cH][cH][cH][cH][cH]1'
]

export interface ReactionRule {
    id: string
    name: string
    description: string
    curriculum_subsubject_id: string
    reactionSmarts: string | string[] // The actual transformation SMARTS (can be multiple steps)
    reactantsSmarts: string[] // SMARTS to identify reactants (e.g. [Substrate, Reagent])
    matchExplanation?: string // Explanation of why this reaction is selected (e.g. "Alkane + Br2")
    conditions: Set<string>[] // Required conditions (list of sets for OR logic)
    autoAdd?: (string | Record<string, never>)[] // Optional: molecules to auto-add at each step (SMILES string or empty object for no addition)
    selectivity?: {
        type: 'rank' | 'explicit',
        rules: { smarts: string; label: 'major' | 'minor' | 'trace' | 'equal' }[]
    }
    rank?: number // Priority ranking for competing reactions (Higher = Major, Lower = Minor). Default 1.
    append_reaction?: string // ID of another reaction to append to this one (chains the SMARTS and applies target selectivity)
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
        reactantsSmarts: ['[#6;H1,H2,H3,H4]', '[Br][Br]'], // Generic Alkane Carbon, Br2
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
        reactantsSmarts: ['[#6;H1,H2,H3,H4]', '[Cl][Cl]'], // Generic Alkane Carbon, Cl2
        matchExplanation: 'Alkane + Cl2',
        description: 'Substitution of Hydrogen with Chlorine (Low selectivity).',
        conditions: or('light', 'heat')
    },

    // --- ALKENES ---
    {
        id: 'alkene_hydrohalogenation',
        name: 'Hydrohalogenation (HX)',
        rank: 20,
        curriculum_subsubject_id: 'alkenes-hydrohalogenation',
        reactionSmarts: [
            '[C:1]=[C:2].[F,Cl,Br,I:3]>>[C:1][C+:2].[F-,Cl-,Br-,I-:3]', // Step 1: Protonation (X- is spectator)
            '[C+:1].[F-,Cl-,Br-,I-:2]>>[C+0:1][*+0:2]' // Step 2: Nucleophilic Attack
        ],
        reactantsSmarts: ['[C]=[C]', '[F,Cl,Br,I]'], // Matches HF (F), HCl (Cl), HBr (Br), HI (I)
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
        rank: 20,
        curriculum_subsubject_id: 'alkenes-hydration',
        reactionSmarts: [
            '[C:1]=[C:2].[OX2H1:3][SX4:4] >> [C+:1]-[C:2].[O-H0:3][SX4:4]', // Step 1: Protonation (H2O is spectator)
            '[C+:1].[OH2:5] >> [C+0:1]-[OH2+:5]', // Step 2: Water attack
            '[C:1]-[OH2+:2].[O-:3][S:4][OH:5] >> [C:1]-[O+0H:2].[O+0H:3][S:4][OH:5]' // Step 3: Deprotonation (simplified)
        ],
        reactantsSmarts: ['[C]=[C]', '[OH2]', '[$([SX4](=[OX1])(=[OX1])[OX2H1])]'], // H2O
        matchExplanation: 'Alkene + H2O',
        description: 'Addition of water to form an alcohol (Markovnikov).',
        conditions: [new Set()],
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
        rank: 20,
        curriculum_subsubject_id: 'alkenes-alcohol-addition',
        reactionSmarts: [
            '[C:1]=[C:2].[OX2H1:3][SX4:4] >> [C+:1]-[C:2].[O-H0:3][SX4:4]', // Step 1: Protonation (H2O is spectator)
            '[C+:1].[OH:5][C:2] >> [C+0:1]-[OH+:5][C:2]', // Step 2: Water attack
            '[C:1][OH1:2][C:3].[O-:4][S:5][OH:6] >>  [C:1][O+0H0:2][C:3].[O+0H:4][S:5][OH:6]' // Step 3: Deprotonation (simplified)
        ],
        reactantsSmarts: ['[C]=[C]', '[O;H1][C]', '[$([SX4](=[OX1])(=[OX1])[OX2H1])]'], // Alcohol
        matchExplanation: 'Alkene + Alcohol',
        description: 'Addition of an alcohol to form an ether (Markovnikov).',
        conditions: [new Set()],
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
        reactionSmarts: [
            '([C;H2,H1:1]=[C;H1,H0:2]).[BH3:3]>>[C:1]([H])([BH2:3])[C:2]([H])', // Step 1: Hydroboration (syn-addition, anti-Markovnikov)
            '[C:1][BH2:2].[OH-:3].[OH2:5].[O:6][O:7]>>[C:1][OH].[BH2:2][O+0H1:3]' // Step 2: Oxidation (BR2 replaced by OH)
        ],
        reactantsSmarts: ['[C]=[C]', '[B]'], // Alkene + Borane
        matchExplanation: 'Alkene + BH₃ (Hydroboration)',
        autoAdd: ['', '[OH-].OO.O'],
        description: 'Addition of H-OH with Anti-Markovnikov regioselectivity via hydroboration-oxidation.',
        conditions: [new Set('')],
        rank: 20
    },
    {
        id: 'alkene_halogenation',
        name: 'Halogenation',
        rank: 20,
        curriculum_subsubject_id: 'alkenes-halogenation',
        reactionSmarts: ['[C:1]=[C:2].[Br,Cl:3][Br,Cl:4]>>[C:1]1[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]', '[C:1]1[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]>>[C:1]([Br+0,Cl+0:4])[C:2]([Br+0,Cl+0:3])'],
        reactantsSmarts: ['[C]=[C]', '[Br,Cl][Br,Cl]'],
        matchExplanation: 'Alkene + Halogen (Br2 or Cl2)',
        description: 'Anti-addition of Halogen to form a vicinal dihalide.',
        conditions: [new Set()]
    },
    {
        id: 'alkene_halohydrin',
        name: 'Halohydrin Formation',
        rank: 21, // Major over normal Halogenation
        curriculum_subsubject_id: 'alkenes-halogenation',
        reactionSmarts: ['[C:1]=[C:2].[Br,Cl:3][Br,Cl:4]>>[C:1]1[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]', '[C:1]1[C:2][Br+,Cl+:3]1.[OH2:5]>>[C:1]([O+H2:5])[C:2]([Br+0,Cl+0:3])', '[C:1]([O+H2:5])[C:2]([Br,Cl:3]).[O:6]>>[C:1]([O+0H1:5])[C:2]([Br,Cl:3]).[O+:6]', '[OH3:8].[Br-,Cl-:7]>>[O+0H2:8].[Br+0,Cl+0:7]'], // OH on more sub, Br on less
        reactantsSmarts: ['[C]=[C]', '[Br,Cl][Br,Cl]', '[OH2]'],
        matchExplanation: 'Alkene + Halogen + H2O',
        autoAdd: ['', '', 'O', ''],
        description: 'Addition of OH and Halogen (OH to more substituted Carbon).',
        conditions: [new Set()],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D4][OH]', label: 'major' }, // Tertiary Alcohol
                { smarts: '[C;D3][OH]', label: 'major' }, // Secondary Alcohol
                { smarts: '[C;D2][OH]', label: 'minor' }  // Primary Alcohol
            ]
        },
    },
    {
        id: 'alkene_hydrogenation',
        name: 'Hydrogenation',
        curriculum_subsubject_id: 'alkenes-hydrogenation',
        reactionSmarts: '[C:1]=[C:2].[HH]>>[C:1][C:2]', // Adds H implied
        reactantsSmarts: ['[C]=[C]', '[HH]'],
        matchExplanation: 'Alkene + H2 (or H source)',
        description: 'Reduction of double bond to single bond.',
        conditions: [new Set(['pd_c'])]
    },
    {
        id: 'alkene_epoxidation',
        name: 'Epoxidation',
        rank: 20,
        curriculum_subsubject_id: 'alkenes-epoxidation',
        reactionSmarts: '[C:1]=[C:2].[CX3:3](=[OX1:4])[OX2:5][OX2H1:6] >> [C:1]1[OX2:6][C:2]1.[CX3:3](=[OX1:4])[OX2H1:5]',
        reactantsSmarts: ['[C]=[C]', '[CX3](=[OX1])[OX2][OX2H1]'],
        matchExplanation: 'Alkene + Peroxyacid (mCPBA)',
        description: 'Formation of an epoxide ring.',
        conditions: [new Set()] // mCPBA is an acid
    },
    {
        id: 'alkene_ozonolysis',
        name: 'Ozonolysis (Reductive)',
        rank: 20,
        curriculum_subsubject_id: 'alkenes-ozonolysis',
        reactionSmarts: '[C:1]=[C:2].[O-][O+]=O>>[C:1]=[O].[C:2]=[O]', // Cleavage
        reactantsSmarts: ['[C]=[C]', '[O-][O+]=O'],
        matchExplanation: 'Alkene (Ozonolysis)',
        description: 'Cleavage of double bond to form Carbonyls.',
        conditions: [new Set(['cold'])] // 2nd step Zinc/H2O
    },
    {
        id: 'alkene_hydroxylation',
        name: 'Syn-Hydroxylation',
        rank: 20,
        curriculum_subsubject_id: 'alkenes-hydroxylation',
        reactionSmarts: [
            '[C:1]=[C:2].[O-][Mn](=O)(=O)=O>>[C:1]1[O][Mn](=O)([O-])[O][C:2]1', // Step 1: Syn-addition to form cyclic manganate ester
            '[C:1]1[O][Mn](=O)([O-])[O][C:2]1.[OH2:3]>>[C:1]([OH])[C:2]([OH])'    // Step 2: Hydrolysis to cis-diol
        ],
        reactantsSmarts: ['[C]=[C]', '[O-][Mn](=O)(=O)=O'],
        matchExplanation: 'Alkene + KMnO4 (Syn-Hydroxylation)',
        autoAdd: ['', 'O.O'], // Add water for the second step
        description: 'Formation of a cis-diol via cyclic manganate ester.',
        conditions: [new Set()] // Fallback match or KMnO4 as reagent
    },

    // --- ALKYNES ---
    {
        id: 'alkyne_hydrohalogenation_1eq',
        name: 'Hydrohalogenation (1 eq.)',
        curriculum_subsubject_id: 'alkynes-addition',
        reactionSmarts: ['[C:1]#[C:2].[F,Cl,Br,I:3]>>[C+:1]=[C:2].[F,Cl,Br,I:3]', '[C+:1]=[C:2].[F,Cl,Br,I:3]>>[C+0:1]=[C:2]([F,Cl,Br,I:3])'],
        reactantsSmarts: ['[C]#[C]', '[F,Cl,Br,I;H1]'],
        matchExplanation: 'Alkyne + HX (1 eq., X=F, Cl, Br, I)',
        description: 'Addition of 1 equivalent of HX to form Vinyl Halide.',
        conditions: [new Set()],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D3][F,Cl,Br,I]', label: 'major' }, // Halogen on more substituted (internal) carbon
                { smarts: '[C;D2][F,Cl,Br,I]', label: 'minor' }  // Halogen on less substituted (terminal) carbon
            ]
        }
    },
    {
        id: 'alkyne_hydrohalogenation_2eq',
        name: 'Hydrohalogenation (Excess)',
        curriculum_subsubject_id: 'alkynes-addition',
        reactionSmarts: ['[C:1]#[C:2].[F,Cl,Br,I:3]>>[C+:1]=[C:2].[F-,Cl-,Br-,I-:3]', '[C+:1]=[C:2].[F-,Cl-,Br-,I-:3]>>[C+0:1]=[C:2]([F+0,Cl+0,Br+0,I+0:3])'],
        append_reaction: 'alkene_hydrohalogenation',
        reactantsSmarts: ['[C]#[C]', '[F,Cl,Br,I;H1]', '[F,Cl,Br,I;H1]'],
        matchExplanation: 'Alkyne + HX (Excess, X=F, Cl, Br, I)',
        description: 'Addition of excess HX to form Geminal Dihalide.',
        conditions: [new Set()],
    },
    {
        id: 'alkyne_halogenation_1eq',
        name: 'Halogenation (1 eq.)',
        curriculum_subsubject_id: 'alkynes-addition',
        reactionSmarts: ['[C:1]#[C:2].[Br,Cl:3][Br,Cl:4]>>[C:1]1=[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]', '[C:1]1=[C:2][Br,Cl+:3]1.[Br-,Cl-:4]>>[C:1]([Br+0,Cl+0:4])=[C:2]([Br+0,Cl+0:3])'],
        reactantsSmarts: ['[C]#[C]', '[Br,Cl][Br,Cl]'],
        matchExplanation: 'Alkyne + Br2 (1 eq.)',
        description: 'Addition of 1 eq. Br2 to form Dihaloalkene.',
        conditions: [new Set()]
    },
    {
        id: 'alkyne_halogenation_2eq',
        name: 'Halogenation (Excess)',
        curriculum_subsubject_id: 'alkynes-addition',
        reactionSmarts: ['[C:1]#[C:2].[Br,Cl:3][Br,Cl:4]>>[C:1]1=[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]', '[C:1]1=[C:2][Br,Cl+:3]1.[Br-,Cl-:4]>>[C:1]([Br+0,Cl+0:4])=[C:2]([Br+0,Cl+0:3])'],
        reactantsSmarts: ['[C]#[C]', '[Br,Cl][Br,Cl]', '[Br,Cl][Br,Cl]'],
        append_reaction: 'alkene_halogenation',
        matchExplanation: 'Alkyne + Br2 (Excess)',
        description: 'Addition of excess Br2 to form Tetrahaloalkane.',
        conditions: [new Set()]
    },
    {
        id: 'alkyne_hydration_acid',
        name: 'Acid-Catalyzed Hydration',
        curriculum_subsubject_id: 'alkynes-hydration-acid',
        // reactionSmarts: '[C:1]#[C:2].[OH2:3]>>[C:1](=[O:3])[C:2]', // Keto-enol tautomerism implied to Ketone
        // reactantsSmarts: ['[C]#[C]', '[OH2]', '[$([SX4](=[OX1])(=[OX1])[OX2H1])]'],
        reactionSmarts: [
            '[C:1]#[C:2].[OX2H1:3][SX4:4] >> [C+:1]=[C:2].[O-H0:3][SX4:4]', // Step 1: Protonation (H2O is spectator)
            '[C+:1].[OH2:5] >> [C+0:1]-[OH2+:5]', // Step 2: Water attack
            '[C:1]-[OH2+:2].[O-:3][S:4][OH:5] >> [C:1]-[O+0H:2].[O+0H:3][S:4][OH:5]', // Step 3: Deprotonation (simplified)
            '[C:1]=[C:2]-[OH1:3] >> [C:1]-[C:2]=[OH0:3]' // Step 4: tautomerization
        ],
        reactantsSmarts: ['[C]#[C]', '[OH2]', '[$([SX4](=[OX1])(=[OX1])[OX2H1])]'], // H2O
        matchExplanation: 'Alkyne + H2O',
        description: 'Hydration to form a Ketone (Markovnikov).',
        conditions: [new Set()],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D3]=O', label: 'major' }, // Ketone (Internal C=O)
                { smarts: '[C;D2]=O', label: 'minor' }  // Aldehyde (Terminal C=O)
            ]
        }
    },
    {
        id: 'alkyne_hydroboration',
        name: 'Hydroboration-Oxidation',
        curriculum_subsubject_id: 'alkynes-hydration',
        reactionSmarts: [
            '([C;H2,H1:1]#[C;H1,H0:2]).[BH3:3]>>[C:1]([H])([BH2:3])=[C:2]([H])', // Step 1: Hydroboration (syn-addition, anti-Markovnikov)
            '[C:1][BH2:2].[OH-:3].[OH2:5].[O:6][O:7]>>[C:1][OH].[BH2:2][O+0H1:3]',
            '[C:1]=[C:2]-[OH1:3] >> [C:1]-[C:2]=[OH0:3]' // Step 4: tautomerization
        ],
        reactantsSmarts: ['[C]#[C]', '[B]'],
        autoAdd: ['', '[OH-].OO.O'],
        matchExplanation: 'Terminal Alkyne (Hydroboration)',
        description: 'Addition of H-OH with Anti-Markovnikov regioselectivity via hydroboration-oxidation.',
        conditions: [new Set()]
    },
    {
        id: 'alkyne_reduction_complete',
        name: 'Complete Reduction',
        curriculum_subsubject_id: 'alkynes-reduction',
        reactionSmarts: '[C:1]#[C:2].[HH].[HH]>>[C:1][C:2]',
        reactantsSmarts: ['[C]#[C]', '[HH]', '[HH]'],
        matchExplanation: 'Alkyne + H2',
        description: 'Reduction to Alkane.',
        conditions: [new Set(['pd_c'])]
    },
    {
        id: 'alkyne_reduction_cis',
        name: 'Lindlar Reduction',
        curriculum_subsubject_id: 'alkynes-reduction',
        reactionSmarts: '[#6:3][#6:1]#[#6:2][#6:4].[HH]>>[#6:3]/[#6:1]=[#6:2]\\[#6:4]', // Cis alkene
        reactantsSmarts: ['[C]#[C]', '[HH]'],
        matchExplanation: 'Alkyne + H2 (Lindlar)',
        description: 'Reduction to Cis-Alkene.',
        conditions: [new Set(['lindlar'])]
    },
    {
        id: 'alkyne_deprotonation',
        name: 'Alkyne Deprotonation',
        curriculum_subsubject_id: 'alkynes-alkylation',
        reactionSmarts: '[C:1]#[C;H1:2].[NH2-]>>[C:1]#[C-:2].[NH3]',
        reactantsSmarts: ['[C]#[C;H1]', '[N-H2]'],
        matchExplanation: 'Terminal Alkyne + Strong Base (NaNH2)',
        description: 'Deprotonation of terminal alkyne to form acetylide ion.',
        conditions: [new Set()]
    },
    {
        id: 'acetylide_alkylation',
        name: 'Acetylide Alkylation',
        curriculum_subsubject_id: 'alkynes-alkylation',
        reactionSmarts: '[C:1]#[C-:2].[C:3][F,Cl,Br,I:4]>>[C:1]#[C+0:2][C:3].[F-,Cl-,Br-,I-:4]',
        reactantsSmarts: ['[C]#[C-]', '[C][F,Cl,Br,I]'],
        matchExplanation: 'Acetylide Ion + Alkyl Halide',
        description: 'SN2 attack of acetylide on alkyl halide to form new C-C bond.',
        conditions: [new Set()],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C]#[C][C]', label: 'major' }, // Success
            ]
        }
    },
    // --- CARBONYLS ---
    {
        id: 'acid_to_acyl_chloride',
        name: 'Formation of Acyl Chloride',
        curriculum_subsubject_id: 'carboxylic-acids',
        reactionSmarts: '[C:1](=[O:2])[OH]>>[C:1](=[O:2])[Cl]',
        reactantsSmarts: ['[C](=[O])[OH]', '[$([S](=O)(Cl)Cl)]'], // Acid + SOCl2
        matchExplanation: 'Carboxylic Acid + SOCl2',
        description: 'Conversion to Acyl Chloride using Thionyl Chloride.',
        conditions: [new Set(['socl2'])]
    },
    {
        id: 'acyl_chloride_hydrolysis',
        name: 'Acyl Chloride Hydrolysis',
        curriculum_subsubject_id: 'acyl-chlorides',
        reactionSmarts: '[C:1](=[O:2])[Cl].[OH2:3]>>[C:1](=[O:2])[OH:3]',
        reactantsSmarts: ['[C](=[O])[Cl]', '[OH2]'],
        matchExplanation: 'Acyl Chloride + Water',
        description: 'Vigorous hydrolysis to Carboxylic Acid.',
        conditions: [new Set()]
    },
    {
        id: 'acyl_chloride_alcoholysis',
        name: 'Acyl Chloride Alcoholysis',
        curriculum_subsubject_id: 'acyl-chlorides',
        reactionSmarts: '[C:1](=[O:2])[Cl].[C:3][OH:4]>>[C:1](=[O:2])[O:4][C:3]',
        reactantsSmarts: ['[C](=[O])[Cl]', '[C][OH]'],
        matchExplanation: 'Acyl Chloride + Alcohol',
        description: 'Formation of Ester.',
        conditions: [new Set()]
    },
    {
        id: 'acyl_chloride_aminolysis',
        name: 'Acyl Chloride Aminolysis',
        curriculum_subsubject_id: 'acyl-chlorides',
        reactionSmarts: '[C:1](=[O:2])[Cl].[N;H2,H1:3]>>[C:1](=[O:2])[N:3]',
        reactantsSmarts: ['[C](=[O])[Cl]', '[N;H2,H1]'],
        matchExplanation: 'Acyl Chloride + Amine',
        description: 'Formation of Amide.',
        conditions: [new Set()]
    },
    {
        id: 'fischer_esterification',
        name: 'Fischer Esterification',
        curriculum_subsubject_id: 'esters',
        reactionSmarts: '[C:1](=[O:2])[OH].[C:3][OH:4]>>[C:1](=[O:2])[O:4][C:3]',
        reactantsSmarts: ['[C](=[O])[OH]', '[C][OH]'],
        matchExplanation: 'Carboxylic Acid + Alcohol + Acid',
        description: 'Reversible formation of Ester.',
        conditions: [new Set(['acid', 'heat']), new Set(['h2so4'])]
    },
    {
        id: 'saponification',
        name: 'Saponification',
        curriculum_subsubject_id: 'esters',
        reactionSmarts: '[C:1](=[O:2])[O][C:3]>>[C:1](=[O:2])[O-].[C:3][OH]',
        reactantsSmarts: ['[C](=[O])[O][C]', '[OH-]'],
        matchExplanation: 'Ester + Base (Hydroxide)',
        description: 'Basic hydrolysis to Carboxylate and Alcohol.',
        conditions: [new Set(['base']), new Set(['oh-'])]
    },

    // --- AROMATIC COMPOUNDS ---
    {
        id: 'benzene_bromination',
        name: 'Bromination (EAS)',
        curriculum_subsubject_id: 'aromatics-halogenation',
        reactionSmarts: [
            '[Br][Br].[Fe](Br)(Br)Br>>[Br][Br+][Fe-](Br)(Br)Br',
            '[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[Br][Br+][Fe-](Br)(Br)Br>>[CH:1]1(Br)[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Fe-](Br)(Br)(Br)Br',
            '[CH]1(Br)[C+][CH]=[CH][CH]=[CH]1>>[C]1(Br)[C]=[CH][C+][CH]=[CH]1',
            '[C]1(Br)[C]=[CH][C+][CH]=[CH]1>>[C]1(Br)[CH]=[CH][CH]=[CH][C+]1',
            '[C]1(Br)[CH]=[CH][CH]=[CH][C+]1.[N]>>[c]1(Br)[cH][cH][cH][cH][cH]1.[N+]',
            '[N+].[Fe-](Br)(Br)(Br)Br>>[N].Br.[Fe](Br)(Br)Br'
        ],
        reactantsSmarts: ['[Br][Br]', '[c;H1]', '[Fe](Br)(Br)Br'],
        autoAdd: ['', '', '', '', 'N'],
        matchExplanation: 'Benzene + Br2 (FeBr3)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Br.',
        conditions: [new Set()]
    },
    {
        id: 'benzene_chlorination',
        name: 'Chlorination (EAS)',
        curriculum_subsubject_id: 'aromatics-halogenation',
        reactionSmarts: [
            '[Cl][Cl].[Fe](Cl)(Cl)Cl>>[Cl][Cl+][Fe-](Cl)(Cl)Cl',
            '[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[Cl][Cl+][Fe-](Cl)(Cl)Cl>>[CH:1]1(Cl)[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Fe-](Cl)(Cl)(Cl)Cl',
            '[CH]1(Cl)[C+][CH]=[CH][CH]=[CH]1>>[C]1(Cl)[C]=[CH][C+][CH]=[CH]1',
            '[C]1(Cl)[C]=[CH][C+][CH]=[CH]1>>[C]1(Cl)[CH]=[CH][CH]=[CH][C+]1',
            '[C]1(Cl)[CH]=[CH][CH]=[CH][C+]1.[N]>>[c]1(Cl)[cH][cH][cH][cH][cH]1.[N+]',
            '[N+].[Fe-](Cl)(Cl)(Cl)Cl>>[N].Cl.[Fe](Cl)(Cl)Cl'
        ], reactantsSmarts: ['[c;H1]', '[Cl][Cl]', '[Fe](Cl)(Cl)Cl'],
        autoAdd: ['', '', '', '', 'N'],
        matchExplanation: 'Benzene + Cl2 (FeCl3)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Cl.',
        conditions: [new Set()]
    },
    {
        id: 'benzene_nitration',
        name: 'Nitration',
        curriculum_subsubject_id: 'aromatics-nitration',
        reactionSmarts: [
            '[N+](=O)([O-])[OH].[S](=O)(=O)([OH])[OH]>>[N+](=O)([O-])[O+H2].[S](=O)(=O)([O-])[OH]',
            '[N+](=O)([O-])[OH2].[S](=O)(=O)([O-])[OH]>>[N+](=O)=O.[S](=O)(=O)([O-])[OH].[OH2]',
            '[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[N+](=O)=O>>[CH:1]1([N+](=O)[O-])[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1',
            '[CH]1([N+](=O)[O-])[C+][CH]=[CH][CH]=[CH]1>>[C]1([N+](=O)[O-])[C]=[CH][C+][CH]=[CH]1',
            '[C]1([N+](=O)[O-])[C]=[CH][C+][CH]=[CH]1>>[C]1([N+](=O)[O-])[CH]=[CH][CH]=[CH][C+]1',
            '[C]1([N+](=O)[O-])[CH]=[CH][CH]=[CH][C+]1.[S](=O)(=O)([O-])[OH]>>[c]1([N+](=O)[O-])[cH][cH][cH][cH][cH]1.[S](=O)(=O)([OH])[OH]',
        ],
        reactantsSmarts: ['[c;H1]', '[N+](=O)([O-])O', '[S](=O)(=O)(O)O'],
        matchExplanation: 'Benzene + HNO3 (H2SO4)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Nitro group.',
        conditions: [new Set()]
    },
    {
        id: 'benzene_sulfonation',
        name: 'Sulfonation',
        curriculum_subsubject_id: 'aromatics-sulfonation',
        reactionSmarts: [
            '[S](=O)(=O)([OH])[OH].[S](=O)(=O)([OH])[OH]>>[S](=O)(=O)([OH])[O+H2].[S](=O)(=O)([OH])[O-]',
            '[S](=O)(=O)([OH])[O+H2]>>[S+](=O)(=O)([OH]).[OH2]',
            '[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[S+](=O)(=O)([OH])>>[CH:1]1([S](=O)(=O)([OH]))[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1',
            '[CH]1([S](=O)(=O)([OH]))[C+][CH]=[CH][CH]=[CH]1>>[C]1([S](=O)(=O)([OH]))[C]=[CH][C+][CH]=[CH]1',
            '[C]1([S](=O)(=O)([OH]))[C]=[CH][C+][CH]=[CH]1>>[C]1([S](=O)(=O)([OH]))[CH]=[CH][CH]=[CH][C+]1',
            '[C]1([S](=O)(=O)([OH]))[CH]=[CH][CH]=[CH][C+]1.[S](=O)(=O)([O-])[OH]>>[c]1([S](=O)(=O)([OH]))[cH][cH][cH][cH][cH]1.[S](=O)(=O)([OH])[OH]',
        ],
        reactantsSmarts: ['[c;H1]', '[S](=O)(=O)(O)O', '[S](=O)(=O)(O)O'],
        matchExplanation: 'Benzene + SO3 (H2SO4)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Sulfonic Acid.',
        conditions: [new Set()]
    },
    {
        id: 'friedel_crafts_alkylation',
        name: 'Friedel-Crafts Alkylation',
        curriculum_subsubject_id: 'aromatics-fc-alkylation',
        reactionSmarts: [
            '[C:1][Cl].[Al](Cl)(Cl)Cl>>[C:1][Cl+][Al-](Cl)(Cl)Cl',
            '[C:1][Cl+][Al-](Cl)(Cl)Cl>>[C+:1].[Al-](Cl)(Cl)(Cl)Cl',
            '[cH:2]1[cH:3][cH:4][cH:5][cH:6][cH:7]1.[C+:1]>>[CH:2]1([C+0:1])[C+:3][CH:4]=[CH:5][CH:6]=[CH:7]1',
            '[CH]1([C:1])[C+][CH]=[CH][CH]=[CH]1>>[CH]1([C:1])[CH]=[CH][CH+][CH]=[CH]1',
            '[CH]1([C:1])[CH]=[CH][CH+][CH]=[CH]1>>[CH]1([C:1])[CH]=[CH][CH]=[CH][CH+]1',
            '[CH]1([C:1])[CH]=[CH][CH]=[CH][CH+]1.[Al-](Cl)(Cl)(Cl)Cl>>[c]1([C:1])[cH][cH][cH][cH][cH]1.[Al](Cl)(Cl)Cl.Cl',
        ],
        reactantsSmarts: ['[c;H1]', '[CX4][Cl]', '[Al](Cl)(Cl)Cl'],
        matchExplanation: 'Benzene + Alkyl Chloride (AlCl3)',
        description: 'Alkylation of the aromatic ring. Rearrangements possible.',
        conditions: [new Set()]
    },
    {
        id: 'friedel_crafts_acylation', // TODO: add acid anhydride support
        name: 'Friedel-Crafts Acylation',
        curriculum_subsubject_id: 'aromatics-fc-acylation',
        reactionSmarts: [
            '[C:1](=[O:2])[Cl].[Al](Cl)(Cl)Cl>>[C:1](=[O:2])[Cl+][Al-](Cl)(Cl)Cl',
            '[C:1](=[O:2])[Cl+][Al-](Cl)(Cl)Cl>>[C+:1]=[O:2].[Al-](Cl)(Cl)(Cl)Cl',
            '[cH:3]1[cH:4][cH:5][cH:6][cH:7][cH:8]1.[C+:1]=[O:2]>>[CH:3]1([C+0:1]=[O:2])[C+:4][CH:5]=[CH:6][CH:7]=[CH:8]1',
            '[CH]1([C:1]=[O:2])[C+][CH]=[CH][CH]=[CH]1>>[CH]1([C:1]=[O:2])[CH]=[CH][CH+][CH]=[CH]1',
            '[CH]1([C:1]=[O:2])[CH]=[CH][CH+][CH]=[CH]1>>[CH]1([C:1]=[O:2])[CH]=[CH][CH]=[CH][CH+]1',
            '[CH]1([C:1]=[O:2])[CH]=[CH][CH]=[CH][CH+]1.[Al-](Cl)(Cl)(Cl)Cl>>[c]1([C:1]=[O:2])[cH][cH][cH][cH][cH]1.[Al](Cl)(Cl)Cl.Cl'
        ],
        reactantsSmarts: ['[c;H1]', '[C](=[O])[Cl]', '[Al](Cl)(Cl)Cl'],
        matchExplanation: 'Benzene + Acyl Chloride (AlCl3)',
        description: 'Acylation of the aromatic ring (No rearrangement).',
        conditions: [new Set()]
    },
    {
        id: 'intramolecular_friedel_crafts_acylation_5',
        name: 'Intramolecular Friedel-Crafts (5-ring)',
        curriculum_subsubject_id: 'aromatics-fc-acylation',
        reactionSmarts: '[c;H1:1]:[c:2]-[C:3]-[C:4]-[C:5](=[O:6])[Cl].[Al](Cl)(Cl)Cl>>[c:1]1:[c:2]-[C:3]-[C:4]-[C:5]1=[O:6].[Cl].[Al](Cl)(Cl)Cl',
        reactantsSmarts: ['[c;H1]:[c]-[C]-[C]-[C](=[O])[Cl]', '[Al](Cl)(Cl)Cl'],
        matchExplanation: 'Intramolecular Acylation (5-ring)',
        description: 'Formation of 5-membered ring via intramolecular Friedel-Crafts Acylation.',
        conditions: [new Set()]
    },
    {
        id: 'intramolecular_friedel_crafts_acylation_6',
        name: 'Intramolecular Friedel-Crafts (6-ring)',
        curriculum_subsubject_id: 'aromatics-fc-acylation',
        reactionSmarts: '[c;H1:1]:[c:2]-[C:3]-[C:4]-[C:7]-[C:5](=[O:6])[Cl].[Al](Cl)(Cl)Cl>>[c:1]1:[c:2]-[C:3]-[C:4]-[C:7]-[C:5]1=[O:6].[Cl].[Al](Cl)(Cl)Cl',
        reactantsSmarts: ['[c;H1]:[c]-[C]-[C]-[C]-[C](=[O])[Cl]', '[Al](Cl)(Cl)Cl'],
        matchExplanation: 'Intramolecular Acylation (6-ring)',
        description: 'Formation of 6-membered ring via intramolecular Friedel-Crafts Acylation.',
        conditions: [new Set()]
    },

    // --- ALCOHOLS & ETHERS ---
    {
        id: 'reduction_of_aldehyde_and_ketone_with_hydride_ion',
        name: 'Reduction of Aldehyde and Ketone with hydride ion',
        curriculum_subsubject_id: 'alcohols-preparation-reduction-carbonyls',
        reactionSmarts: [
            '[C:1](=[O:2]).[Na+].[BH4-].[OH3+]>>[C:1]([O:2])[H]',
        ],
        reactantsSmarts: ['[C](=[O])', '[Na+]', '[BH4-]', '[OH3+]'],
        matchExplanation: 'Reduction of Aldehyde or Ketone with hydride ion',
        description: 'Reduction of Aldehyde or Ketone to Alcohol.',
        conditions: [new Set()]
    },
    {
        id: 'ester_reduction_lialh4',
        name: 'Reduction of Ester with LiAlH4',
        curriculum_subsubject_id: 'alcohols-preparation-reduction-acids',
        reactionSmarts: [
            '[CX3:1](=[OX1:2])[OX2:3][#6:4].[Li+].[AlH4-].[OH3+]>>[C:1][OH:2].[#6:4][OH:3]',
        ],
        reactantsSmarts: ['[CX3](=[OX1])[OX2][#6]', '[Li+]', '[AlH4-]', '[OH3+]'],
        matchExplanation: 'Reduction of Ester with LiAlH4',
        description: 'Reduction of Ester to Primary Alcohol and Alcohol.',
        conditions: [new Set()]
    },
    {
        id: 'carboxylic_acids_with_hydride_ion',
        name: 'Reduction of Carboxylic Acid with Hydride Ion',
        curriculum_subsubject_id: 'alcohols-preparation-reduction-acids',
        reactionSmarts: [
            '[CX3:1](=[OX1:2])[OX2:3].[Li+].[AlH4-].[OH3+]>>[C:1][OH:2]',
        ],
        reactantsSmarts: ['[CX3](=[OX1])[OX2]', '[Li+]', '[AlH4-]', '[OH3+]'],
        matchExplanation: 'Reduction of Carboxylic Acid with Hydride Ion',
        description: 'Reduction of Carboxylic Acid to Primary Alcohol.',
        conditions: [new Set()]
    },
    {
        id: 'grignard_formation',
        name: 'Formation of Grignard Reagent',
        curriculum_subsubject_id: 'alcohols-grignard',
        reactionSmarts: '[C:1][Cl,Br,I:2].[Mg].[C][C][O][C][C] >> [C:1][Mg][Cl,Br,I:2]',
        reactantsSmarts: ['[C][Cl,Br,I]', '[Mg]', '[C][C][O][C][C]'],
        matchExplanation: 'Alkyl Halide + Mg',
        description: 'Formation of Grignard reagent from alkyl halide and magnesium metal.',
        conditions: [new Set()]
    },
    {
        id: 'grignard_reaction_with_aldehyde',
        name: 'Aldehyde Grignard',
        curriculum_subsubject_id: 'alcohols-preparation-grignard',
        reactionSmarts: [
            '[C:1](=[O:2]).[C:3][Mg][Cl,Br,I] >> [C:1](-[C:3])(-[O:2]-[Mg]-[Cl,Br,I])',
            '[O:2]-[Mg]-[Cl,Br,I].[OH3+:4] >> [O:2]'
        ],
        autoAdd: ['', '[OH3+]'],
        reactantsSmarts: ['[C](=[O])', '[C][Mg][Cl,Br,I]'],
        matchExplanation: 'Aldehyde Grignard',
        description: 'Aldehyde Grignard.',
        conditions: [new Set()]
    },

    {
        id: 'alcohol_activation_socl2',
        name: 'Activation with Thionyl Chloride',
        curriculum_subsubject_id: 'alcohols-activation-socl2',
        reactionSmarts: '[C:1][OH].[S](=O)([Cl])[Cl] >> [C:1][Cl]',
        reactantsSmarts: ['[C;D1,D2][OH]', '[$([S](=O)(Cl)Cl)]'], // Primary/Secondary only
        matchExplanation: 'Alcohol + SOCl2',
        description: 'Conversion to Alkyl Chloride (SN2).',
        conditions: [new Set()]
    },
    {
        id: 'alcohol_activation_pbr3',
        name: 'Activation with PBr3',
        curriculum_subsubject_id: 'alcohols-activation-pbr3',
        reactionSmarts: '[C:1][OH].[P](Br)(Br)Br >> [C:1][Br]',
        reactantsSmarts: ['[C;D1,D2][OH]', '[$([P](Br)(Br)Br)]'], // Primary/Secondary only
        matchExplanation: 'Alcohol + PBr3',
        description: 'Conversion to Alkyl Bromide (SN2).',
        conditions: [new Set()]
    },
    {
        id: 'alcohol_activation_pbcl',
        name: 'Activation with PCl3',
        curriculum_subsubject_id: 'alcohols-activation-pbcl',
        reactionSmarts: '[C:1][OH].[P](Cl)(Cl)Cl >> [C:1][Cl]',
        reactantsSmarts: ['[C;D1,D2][OH]', '[$([P](Cl)(Cl)Cl)]'], // Primary/Secondary only
        matchExplanation: 'Alcohol + PCl3',
        description: 'Conversion to Alkyl Chloride (SN2).',
        conditions: [new Set()]
    },
    {
        id: 'alcohol_dehydration',
        name: 'Dehydration (E1)',
        curriculum_subsubject_id: 'alcohols-activation', // Usually taught with activation or alkenes
        reactionSmarts: [
            '[C:1][C:2][OH:3].[H+]>>[C:1][C:2][OH2+:3]', // Protonation
            '[C:1][C:2][OH2+:3]>>[C:1][C+:2].[OH2:3]', // Carbocation formation
            '[C:1][C+:2]>>[C:1]=[C:2]' // Elimination (Zaitsev) - simplified here
        ],
        reactantsSmarts: ['[C][C][OH]', '[$([#1+]),$([S](=O)(=O))]'], // Alcohol + Acid
        matchExplanation: 'Alcohol + Acid + Heat',
        description: 'Elimination of water to form an alkene.',
        conditions: [new Set(['heat'])]
    },
    {
        id: 'alcohol_oxidation_pcc',
        name: 'Oxidation (PCC)',
        curriculum_subsubject_id: 'alcohols-oxidation',
        // Primary Alcohol -> Aldehyde
        // Secondary Alcohol -> Ketone
        reactionSmarts: '[C:1][OH]>>[C:1]=[O]',
        reactantsSmarts: ['[C;H1,H2][OH]', '[$([#7+1]1:[c]:[c]:[c]:[c]:[c]1)]'], // PCC pyridinium match roughly
        matchExplanation: 'Alcohol + PCC',
        description: 'Oxidation to Aldehyde (from Primary) or Ketone (from Secondary).',
        conditions: [new Set(['pcc'])]
    },
    {
        id: 'alcohol_oxidation_jones',
        name: 'Oxidation (Jones)',
        curriculum_subsubject_id: 'alcohols-oxidation',
        // Primary Alcohol -> Carboxylic Acid
        reactionSmarts: '[C;H2:1][OH]>>[C:1](=[O])[OH]',
        reactantsSmarts: ['[C;H2][OH]', '[$([Cr](=O)(=O))]'], // Chromic source
        matchExplanation: 'Primary Alcohol + Jones Reagent',
        description: 'Strong oxidation to Carboxylic Acid.',
        conditions: [new Set(['jones'])]
    },
    {
        id: 'alcohol_oxidation_pcc',
        name: 'Oxidation (PCC)',
        curriculum_subsubject_id: 'alcohols-oxidation',
        reactionSmarts: '[C;H2:1][OH].[nH+]1ccccc1.[O-][Cr](Cl)(=O)=O>>[C:1]=[O]',
        reactantsSmarts: ['[C;H2][OH]', '[nH+]1ccccc1', '[O-][Cr](Cl)(=O)=O'], // Chromic source
        matchExplanation: 'Alcohol + PCC',
        description: 'Oxidation to Ketone.',
        conditions: [new Set()]
    },
    {
        id: 'alcohol_oxidation_h2cro4',
        name: 'Oxidation',
        curriculum_subsubject_id: 'alcohols-oxidation',
        // Secondary Alcohol -> Ketone
        reactionSmarts: [
            '[C;H2:1][OH].O[Cr](O)(=O)=O>>[C:1]=[O].O[Cr](O)(=O)=O',
            '[C:1]=[O]>>[C:1](=[O])[OH]',
        ],
        reactantsSmarts: ['[C;H2][OH]', 'O[Cr](O)(=O)=O'], // Chromic source
        matchExplanation: 'Alcohol + H2CRO4',
        description: 'Oxidation to carboxylic acid.',
        conditions: [new Set()]
    },
    {
        id: 'alcohol_oxidation_h2cro4_2',
        name: 'Oxidation',
        curriculum_subsubject_id: 'alcohols-oxidation',
        // Secondary Alcohol -> Ketone
        reactionSmarts: '[C;H1:1][OH].O[Cr](O)(=O)=O>>[C:1]=[O].O[Cr](O)(=O)=O',
        reactantsSmarts: ['[C;H1][OH]', 'O[Cr](O)(=O)=O'], // Chromic source
        matchExplanation: 'Alcohol + H2CRO4',
        description: 'Oxidation to carboxylic acid.',
        conditions: [new Set()]
    },
    {
        id: 'williamson_ether_synthesis',
        name: 'Williamson Ether Synthesis',
        curriculum_subsubject_id: 'ethers-epoxides',
        reactionSmarts: '[C:1][O-].[C:2][F,Cl,Br,I]>>[C:1][O][C:2].[F-,Cl-,Br-,I-]',
        reactantsSmarts: ['[C][O-]', '[C;D1][F,Cl,Br,I]'], // Alkoxide + Primary Alkyl Halide
        matchExplanation: 'Alkoxide + Alkyl Halide',
        description: 'SN2 formation of an ether.',
        conditions: [new Set()]
    },
    {
        id: 'epoxide_creation',
        name: 'Epoxide Creation',
        curriculum_subsubject_id: 'ethers-epoxides',
        reactionSmarts: [
            '[O:1][C:2][C:3][Cl,Br,I:4].[Na]>>[O-:1][C:2][C:3][Cl,Br,I:4]',
            '[O-:1][C:2][C:3][Cl,Br,I:4]>>[O+0:1]1[C:2][C:3]1'
        ],
        reactantsSmarts: ['OCC[Cl,Br,I]', '[NaH]'], // Alkoxide + Primary Alkyl Halide
        matchExplanation: 'Alkoxide + Alkyl Halide',
        description: 'SN2 formation of an ether.',
        conditions: [new Set()]
    },
    {
        id: 'epoxide_opening_acid',
        name: 'Epoxide Opening (Acid)',
        curriculum_subsubject_id: 'ethers-epoxides',
        // Ring opening at more substituted carbon
        reactionSmarts: [
            '[C:1]1[O:2][C:3]1.[H+]>>[C:1]1[O+:2][C:3]1', // Protonation
            '[C:1]1[O+:2][C:3]1.[O:4]>>[C:1]([O:4])[C:3][O+0:2]' // Attack by nucleophile (water in this case) on C:1
        ],
        reactantsSmarts: ['[C]1[O][C]1', '[H+]', '[O]'], // Epoxide, acid, nuc
        matchExplanation: 'Epoxide + Acid + Nucleophile',
        description: 'Ring opening at the more substituted carbon.',
        conditions: [new Set()],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D4][O;D2]', label: 'major' }, // Tertiary Ether
                { smarts: '[C;D3][O;D2]', label: 'major' }, // Secondary Ether
                { smarts: '[C;D2][O;D2]', label: 'minor' }  // Primary Ether
            ]
        }
    },
    {
        id: 'epoxide_opening_basic',
        name: 'Epoxide Opening (Basic)',
        curriculum_subsubject_id: 'ethers-epoxides',
        // Ring opening at less substituted carbon
        reactionSmarts: [
            '[O-,N:4].[C;H2:1]1[O:2][C:3]1>>[O+0,N+:4][C:1][C:3][O-:2]', // Attack by nucleophile on C:1
            '[O-,N+:2].[H+]>>[O+0,N+0:2]' // Protonation
        ],
        reactantsSmarts: ['[C]1[O][C]1', '[O-,N]'], // Epoxide, Base (Alkoxide)
        matchExplanation: 'Epoxide + Strong Nucleophile (Basic)',
        description: 'Attack at the less substituted carbon (Sterics).',
        autoAdd: ['', '[H+]'],
        conditions: [new Set()],
        selectivity: {
            type: 'rank',
            rules: [
                { smarts: '[C;D4][O:4]', label: 'minor' }, // Tertiary
                { smarts: '[C;D3][O:4]', label: 'minor' }, // Secondary
                { smarts: '[C;D2][O:4]', label: 'major' }  // Primary
            ]
        }
    },
    {
        id: 'thiol_oxidation_disulfide',
        name: 'Oxidation to Disulfide',
        curriculum_subsubject_id: 'thiols-sulfides',
        reactionSmarts: '[S;H1:1].[S;H1:2]>>[S:1][S:2]',
        reactantsSmarts: ['[S;H1]', '[S;H1]'],
        matchExplanation: 'Thiol + Thiol (Oxidation)',
        description: 'Mild oxidation of thiols to form a disulfide.',
        conditions: [new Set([])]
    },
    {
        id: 'amine_protonation',
        name: 'Amine Protonation (Base)',
        curriculum_subsubject_id: 'amines-intro',
        reactionSmarts: '[N;H3,H2,H1:1].[F,Cl,Br,I:2]>>[N+:1].[F,Cl,Br,I-:2]',
        reactantsSmarts: ['[N;H3,H2,H1]', '[F,Cl,Br,I]'],
        matchExplanation: 'Amine + HX',
        description: 'Amine acts as a base, accepting a proton from an acid to form an ammonium salt.',
        conditions: [new Set()]
    },
    {
        id: 'elimination_substitution',
        name: 'Elimination Substitution',
        curriculum_subsubject_id: 'elimination-substitution',
        reactionSmarts: '',
        reactantsSmarts: ['[CX4][F,Cl,Br,I,O]', '[*]'], // Alkyl Halide + Nucleophile
        matchExplanation: 'Elimination Substitution',
        description: 'Elimination Substitution',
        conditions: [new Set(), new Set(['heat'])],
    },
    {
        id: 'intramolecular_substitution',
        name: 'Intramolecular Substitution',
        curriculum_subsubject_id: 'intramolecular-substitution',
        reactionSmarts: '',
        reactantsSmarts: ['[CX4][F,Cl,Br,I]'], // Alkyl Halide + Nucleophile
        matchExplanation: 'Intramolecular Substitution',
        description: 'Intramolecular Substitution',
        conditions: [new Set()],
    }
]
