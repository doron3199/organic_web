
// Static data definitions for reactions
// No dependencies on RDKit service or browser globals

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
    // --- SUBSTITUTION & ELIMINATION ---
    {
        id: 'elimination_substitution',
        name: 'Elimination Substitution',
        curriculum_subsubject_id: 'elimination-substitution',
        reactionSmarts: '',
        reactantsSmarts: ['[CX4][F,Cl,Br,I]', '[*]'], // Alkyl Halide + Nucleophile
        matchExplanation: 'Elimination Substitution',
        description: 'Elimination Substitution',
        conditions: [new Set()],
    }
]
