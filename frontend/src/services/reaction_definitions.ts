
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
        // Step 1: Formation of sigma complex (simplified as direct substitution for now, or we can show intermediate)
        // [cH:1] matches aromatic C-H
        reactionSmarts: [
            '[c;H1:1].[Br][Br]>>[c:1][Br].[Br]' // Simplified global transformation
        ],
        reactantsSmarts: ['[c;H1]', '[Br][Br]'],
        matchExplanation: 'Benzene + Br2 (FeBr3)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Br.',
        conditions: [new Set(['febr3']), new Set(['alcl3'])] // Lewis acid required
    },
    {
        id: 'benzene_chlorination',
        name: 'Chlorination (EAS)',
        curriculum_subsubject_id: 'aromatics-halogenation',
        reactionSmarts: '[c;H1:1].[Cl][Cl]>>[c:1][Cl].[Cl]',
        reactantsSmarts: ['[c;H1]', '[Cl][Cl]'],
        matchExplanation: 'Benzene + Cl2 (FeCl3)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Cl.',
        conditions: [new Set(['fecl3']), new Set(['alcl3'])]
    },
    {
        id: 'benzene_nitration',
        name: 'Nitration',
        curriculum_subsubject_id: 'aromatics-nitration',
        reactionSmarts: [
            // Generation of NO2+ is usually implied, we start with attack
            '[c;H1:1].[N+:2](=[O:3])([O-:4])[O:5]>>[c:1][N+:2](=[O:3])[O-:4]' // Matches HNO3 structure roughly
        ],
        reactantsSmarts: ['[c;H1]', '[$([N+](=O)([O-])O)]'], // HNO3
        matchExplanation: 'Benzene + HNO3 (H2SO4)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Nitro group.',
        conditions: [new Set(['h2so4'])]
    },
    {
        id: 'benzene_sulfonation',
        name: 'Sulfonation',
        curriculum_subsubject_id: 'aromatics-sulfonation',
        reactionSmarts: '[c;H1:1].[S:2](=[O:3])(=[O:4])([O:5])>>[c:1][S:2](=[O:3])(=[O:4])[O]',
        // Matches H2SO4 or SO3. Simplified transformation to SO3H
        reactantsSmarts: ['[c;H1]', '[$([S](=O)(=O))]'], // Matches SO3 or H2SO4 source
        matchExplanation: 'Benzene + H2SO4 (Fuming)',
        description: 'Electrophilic Aromatic Substitution: H replaced by Sulfonic Acid.',
        conditions: [new Set(['heat'])]
    },
    {
        id: 'friedel_crafts_alkylation',
        name: 'Friedel-Crafts Alkylation',
        curriculum_subsubject_id: 'aromatics-fc-alkylation',
        // R-Cl + AlCl3 -> R+ -> Attack
        // Ideally we show the carbocation intermediate to allow rearrangement
        reactionSmarts: [
            // Step 1: Alkyl Halide becomes Carbocation (Lewis Acid abstraction)
            '[CX4:1][F,Cl,Br,I]>>[C+:1]',
            // Step 2: Attack on Ring
            '[c;H1:2].[C+:1]>>[c:2][C:1]'
        ],
        reactantsSmarts: ['[c;H1]', '[CX4][F,Cl,Br,I]'],
        matchExplanation: 'Benzene + Alkyl Halide (AlCl3)',
        description: 'Alkylation of the aromatic ring. Rearrangements possible.',
        conditions: [new Set(['alcl3']), new Set(['febr3'])]
    },
    {
        id: 'friedel_crafts_acylation',
        name: 'Friedel-Crafts Acylation',
        curriculum_subsubject_id: 'aromatics-fc-acylation',
        // R-COCl -> R-C=O+ -> Attack
        reactionSmarts: [
            '[C:1](=[O:2])[Cl]>>[C+:1]#[O:2]', // Acylium ion formation
            '[c;H1:3].[C+:1]#[O:2]>>[c:3][C:1]=[O:2]'
        ],
        reactantsSmarts: ['[c;H1]', '[C](=[O])[Cl]'],
        matchExplanation: 'Benzene + Acyl Chloride (AlCl3)',
        description: 'Acylation of the aromatic ring (No rearrangement).',
        conditions: [new Set(['alcl3'])]
    },

    // --- ALCOHOLS & ETHERS ---
    {
        id: 'alcohol_activation_hx_sn1',
        name: 'Alcohol Activation (SN1)',
        curriculum_subsubject_id: 'alcohols-activation',
        // Step 1: Protonation
        // Step 2: Loss of water (Carbocation)
        // Step 3: Attack
        reactionSmarts: [
            '[C:1][OH:2].[Br,Cl,I:3]>>[C:1][OH2+:2].[Br-,Cl-,I-:3]', // Protonation usually implied but we can show it
            '[C:1][OH2+:2]>>[C+:1].[OH2:2]', // Loss of LG
            '[C+:1].[Br-,Cl-,I-:3]>>[C:1][Br+0,Cl+0,I+0:3]' // Attack
        ],
        reactantsSmarts: ['[C;D3][OH]', '[Br,Cl,I]'], // Tertiary Alcohols match this pathway better
        matchExplanation: 'Tertiary Alcohol + HX (SN1)',
        description: 'Conversion to Alkyl Halide via SN1 (Carbocation).',
        conditions: [new Set()]
    },
    {
        id: 'alcohol_activation_hx_sn2',
        name: 'Alcohol Activation (SN2)',
        curriculum_subsubject_id: 'alcohols-activation',
        // Concerted displacement of protonated alcohol
        reactionSmarts: [
            '[C:1][OH:2].[Br,Cl,I:3]>>[C:1][OH2+:2].[Br-,Cl-,I-:3]', // Protonation
            '[C:1][OH2+:2].[Br-,Cl-,I-:3]>>[C:1][Br+0,Cl+0,I+0:3].[OH2:2]' // Backside attack
        ],
        reactantsSmarts: ['[C;D1,D2][OH]', '[Br,Cl,I]'], // Primary/Methyl
        matchExplanation: 'Primary Alcohol + HX (SN2)',
        description: 'Conversion to Alkyl Halide via SN2.',
        conditions: [new Set(['heat'])]
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
        id: 'epoxide_opening_acid',
        name: 'Epoxide Opening (Acid)',
        curriculum_subsubject_id: 'ethers-epoxides',
        // Ring opening at more substituted carbon
        reactionSmarts: [
            '[C:1]1[O:2][C:3]1.[H+]>>[C:1]1[O+:2][C:3]1', // Protonation
            '[C:1]1[O+:2][C:3]1.[O:4]>>[C:1]([O:4])[C:3][OH:2]' // Attack by nucleophile (water in this case) on C:1 (assume more sub) - Needs rank/selectivity
        ],
        reactantsSmarts: ['[C]1[O][C]1', '[H+]', '[O]'], // Epoxide, acid, nuc
        matchExplanation: 'Epoxide + Acid + Nucleophile',
        description: 'Ring opening at the more substituted carbon.',
        conditions: [new Set()]
    },

    {
        id: 'elimination_substitution',
        name: 'Elimination Substitution',
        curriculum_subsubject_id: 'elimination-substitution',
        reactionSmarts: '',
        reactantsSmarts: ['[CX4][F,Cl,Br,I]', '[*]'], // Alkyl Halide + Nucleophile
        matchExplanation: 'Elimination Substitution',
        description: 'Elimination Substitution',
        conditions: [new Set()],
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
