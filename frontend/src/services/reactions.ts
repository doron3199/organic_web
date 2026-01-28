import { ReactionRule } from './rdkit'

// Extended reaction rules based on organic chemistry curriculum
export const reactionRules: ReactionRule[] = [
    // --- ALKANES ---
    {
        id: 'alkane_halogenation_br',
        name: 'Free Radical Bromination',
        smarts: '[C;H1,H2,H3,H4:1]>>[C:1][Br]', // Simplified: Replace H with Br (Logic engine will need to filter for selectivity 3>2>1)
        description: 'Selective substitution of Hydrogen with Bromine at the most substituted carbon.',
        conditions: ['Br2', 'hv (Light) or \u0394 (Heat)']
    },
    {
        id: 'alkane_halogenation_cl',
        name: 'Free Radical Chlorination',
        smarts: '[C;H1,H2,H3,H4:1]>>[C:1][Cl]', // Non-selective
        description: 'Substitution of Hydrogen with Chlorine (Low selectivity).',
        conditions: ['Cl2', 'hv (Light) or \u0394 (Heat)']
    },

    // --- ALKENES ---
    {
        id: 'alkene_hydrohalogenation',
        name: 'Hydrohalogenation (Hydrobromination)',
        // Markovnikov addition: H adds to less substituted, X to more substituted
        // SMARTS: [C:1]=[C:2] -> [H][C:1]-[C:2][Br] generic.
        // We will rely on RDKit or specific patterns for Markovnikov if possible, or multiple rules.
        // Simplified generic addition for now:
        smarts: '[C:1]=[C:2]>>[C:1]([Br])[C:2]',
        description: 'Addition of H-Br across a double bond (Markovnikov).',
        conditions: ['HBr']
    },
    {
        id: 'alkene_hydration',
        name: 'Acid-Catalyzed Hydration',
        smarts: '[C:1]=[C:2]>>[C:1]([OH])[C:2]',
        description: 'Addition of water to form an alcohol (Markovnikov).',
        conditions: ['H2O', 'H2SO4 (Cat.)']
    },
    {
        id: 'alkene_hydroboration',
        name: 'Hydroboration-Oxidation',
        smarts: '[C:1]=[C:2]>>[C:1][C:2]([OH])', // Needs logic to ensure Anti-Markovnikov
        description: 'Addition of H-OH with Anti-Markovnikov regioselectivity.',
        conditions: ['1. BH3, THF', '2. H2O2, NaOH']
    },
    {
        id: 'alkene_halogenation',
        name: 'Halogenation (Bromination)',
        smarts: '[C:1]=[C:2]>>[C:1]([Br])[C:2]([Br])',
        description: 'Anti-addition of Br2 to form a vicinal dibromide.',
        conditions: ['Br2', 'CH2Cl2 (Solvent)']
    },
    {
        id: 'alkene_halohydrin',
        name: 'Halohydrin Formation',
        smarts: '[C:1]=[C:2]>>[C:1]([OH])[C:2]([Br])', // OH on more sub, Br on less
        description: 'Addition of OH and Br (OH to more substituted Carbon).',
        conditions: ['Br2', 'H2O']
    },
    {
        id: 'alkene_hydrogenation',
        name: 'Hydrogenation',
        smarts: '[C:1]=[C:2]>>[C:1][C:2]', // Adds H implied
        description: 'Reduction of double bond to single bond.',
        conditions: ['H2', 'Pd/C or Pt']
    },
    {
        id: 'alkene_epoxidation',
        name: 'Epoxidation',
        smarts: '[C:1]=[C:2]>>[C:1]1[O][C:2]1',
        description: 'Formation of an epoxide ring.',
        conditions: ['mCPBA (Peroxyacid)']
    },
    {
        id: 'alkene_ozonolysis',
        name: 'Ozonolysis (Reductive)',
        smarts: '[C:1]=[C:2]>>[C:1]=[O].[C:2]=[O]', // Cleavage
        description: 'Cleavage of double bond to form Carbonyls.',
        conditions: ['1. O3', '2. Zn/H2O or DMS']
    },
    {
        id: 'alkene_hydroxylation',
        name: 'Syn-Hydroxylation',
        smarts: '[C:1]=[C:2]>>[C:1]([OH])[C:2]([OH])',
        description: 'Formation of a cis-diol.',
        conditions: ['KMnO4 (Cold) or OsO4']
    },

    // --- ALKYNES ---
    {
        id: 'alkyne_hydrohalogenation_1eq',
        name: 'Hydrohalogenation (1 eq.)',
        smarts: '[C:1]#[C:2]>>[C:1]([Br])=[C:2]',
        description: 'Addition of 1 equivalent of HBr to form Vinyl Halide.',
        conditions: ['HBr (1 eq.)']
    },
    {
        id: 'alkyne_hydrohalogenation_2eq',
        name: 'Hydrohalogenation (Excess)',
        smarts: '[C:1]#[C:2]>>[C:1]([Br])([Br])[C:2]',
        description: 'Addition of excess HBr to form Geminal Dihalide.',
        conditions: ['HBr (Excess)']
    },
    {
        id: 'alkyne_halogenation_1eq',
        name: 'Halogenation (1 eq.)',
        smarts: '[C:1]#[C:2]>>[C:1]([Br])=[C:2]([Br])',
        description: 'Addition of 1 eq. Br2 to form Dihaloalkene.',
        conditions: ['Br2 (1 eq.)']
    },
    {
        id: 'alkyne_hydration_acid',
        name: 'Acid-Catalyzed Hydration',
        smarts: '[C:1]#[C:2]>>[C:1](=O)[C:2]', // Keto-enol tautomerism implied to Ketone
        description: 'Hydration to form a Ketone (Markovnikov).',
        conditions: ['H2O', 'H2SO4', 'HgSO4']
    },
    {
        id: 'alkyne_hydroboration',
        name: 'Hydroboration-Oxidation',
        smarts: '[C:1]#[CH1:2]>>[C:1][C:2]=O', // Anti-Markovnikov to Aldehyde if terminal
        description: 'Hydration to form Aldehyde (Terminal) or Ketone (Internal).',
        conditions: ['1. R2BH', '2. H2O2, NaOH']
    },
    {
        id: 'alkyne_reduction_complete',
        name: 'Complete Reduction',
        smarts: '[C:1]#[C:2]>>[C:1][C:2]',
        description: 'Reduction to Alkane.',
        conditions: ['H2', 'Pd/C']
    },
    {
        id: 'alkyne_reduction_trans',
        name: 'Dissolving Metal Reduction',
        smarts: '[C:1]#[C:2]>>[C:1]/[C]=[C]/[C:2]', // Trans alkene
        description: 'Reduction to Trans-Alkene.',
        conditions: ['Na', 'NH3 (l)']
    },
    {
        id: 'alkyne_reduction_cis',
        name: 'Lindlar Reduction',
        smarts: '[C:1]#[C:2]>>[C:1]/[C]=[C]\\[C:2]', // Cis alkene
        description: 'Reduction to Cis-Alkene.',
        conditions: ['H2', 'Lindlar Catalyst']
    },
    {
        id: 'alkyne_alkylation',
        name: 'Alkylation of Acetylide',
        // This is a 2-step process. 1. Deprotonate [C]#[CH] -> [C]#[C:-] 2. Attack R-X
        // Only representing the net result if we can't do multi-step easily yet.
        // Let's assume the user selects "NaNH2" then "R-Br".
        smarts: '[C:1]#[CH1]>>[C:1]#[C][C]', // Adds a Carbon (generic)
        description: 'Deprotonation followed by Nucleophilic Attack on Alkyl Halide.',
        conditions: ['1. NaNH2', '2. R-X']
    }
]

// Helper function to get reaction by ID
export function getReactionById(id: string): ReactionRule | undefined {
    return reactionRules.find(rule => rule.id === id)
}

// Helper function to get all reaction names
export function getAllReactionNames(): { id: string; name: string }[] {
    return reactionRules.map(rule => ({ id: rule.id, name: rule.name }))
}

// Get reaction mechanism description
export function getReactionMechanism(reactionId: string): string {
    const reaction = getReactionById(reactionId)
    return reaction ? reaction.description : 'Mechanism details not available'
}

// Find matched reactions based on selected conditions
export function findMatchingReactions(selectedConditions: string[]): ReactionRule[] {
    if (selectedConditions.length === 0) {
        return reactionRules
    }

    return reactionRules.filter(rule => {
        const ruleConds = rule.conditions.join(' ').toLowerCase()
        return selectedConditions.every(cond => {
            // Note: In UI we map IDs to search terms, but here we assume 'cond' passes the raw ID or term?
            // The UI logic had specific mappings (e.g. 'heat' -> 'heat' or '\u0394').
            // Ideally we should move that mapping here too or pass processed terms.
            // Let's implement the mapping here to encompass the logic fully.

            // Map IDs to search terms (Logic copied from ReactionPanel)
            if (cond === 'heat') return ruleConds.includes('heat') || ruleConds.includes('\u0394')
            if (cond === 'light') return ruleConds.includes('light') || ruleConds.includes('hv')
            if (cond === 'acid') return ruleConds.includes('acid') || ruleConds.includes('h+') || ruleConds.includes('h2so4')
            if (cond === 'base') return ruleConds.includes('base') || ruleConds.includes('oh-') || ruleConds.includes('nanh2') || ruleConds.includes('naoh')

            // Fallback for direct matches
            return ruleConds.includes(cond)
        })
    })
}
