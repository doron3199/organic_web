import { ReactionRule } from './rdkit'

// Common organic chemistry reaction rules
export const reactionRules: ReactionRule[] = [
    {
        id: 'sn2',
        name: 'SN2 Nucleophilic Substitution',
        smarts: '[C:1][Cl,Br,I:2].[OH-,O-]>>[C:1][OH]',
        description: 'Nucleophile attacks carbon, displacing leaving group',
        conditions: ['Primary or secondary carbon', 'Good leaving group', 'Strong nucleophile']
    },
    {
        id: 'e2',
        name: 'E2 Elimination',
        smarts: '[C:1][C:2]([Cl,Br,I])>>[C:1]=[C:2]',
        description: 'Base removes proton, forms double bond',
        conditions: ['Strong base', 'Good leaving group', 'Anti-periplanar geometry']
    },
    {
        id: 'acid_base',
        name: 'Acid-Base Reaction',
        smarts: '[C:1](=[O:2])[OH:3]>>[C:1](=[O:2])[O-:3]',
        description: 'Proton transfer between acid and base',
        conditions: ['Carboxylic acid', 'Base present']
    },
    {
        id: 'esterification',
        name: 'Fischer Esterification',
        smarts: '[C:1](=[O:2])[OH:3].[C:4][OH:5]>>[C:1](=[O:2])[O:5][C:4]',
        description: 'Carboxylic acid reacts with alcohol to form ester',
        conditions: ['Carboxylic acid', 'Alcohol', 'Acid catalyst', 'Heat']
    },
    {
        id: 'hydration',
        name: 'Alkene Hydration',
        smarts: '[C:1]=[C:2]>>[C:1]([OH:3])[C:2]',
        description: 'Water adds across double bond',
        conditions: ['Alkene', 'Acid catalyst', 'Follows Markovnikov\'s rule']
    },
    {
        id: 'oxidation_alcohol',
        name: 'Alcohol Oxidation',
        smarts: '[C:1][CH2:2][OH:3]>>[C:1][C:2]=[O:3]',
        description: 'Primary alcohol oxidized to aldehyde or carboxylic acid',
        conditions: ['Primary or secondary alcohol', 'Oxidizing agent (PCC, KMnO₄)']
    },
    {
        id: 'reduction_carbonyl',
        name: 'Carbonyl Reduction',
        smarts: '[C:1]=[O:2]>>[C:1][OH:2]',
        description: 'Carbonyl reduced to alcohol',
        conditions: ['Reducing agent (NaBH₄, LiAlH₄)']
    },
    {
        id: 'aldol',
        name: 'Aldol Condensation',
        smarts: '[C:1]=[O:2].[C:3]=[O:4]>>[C:1][C:3]=[C:4]',
        description: 'Two carbonyl compounds condense',
        conditions: ['Base catalyst', 'Enolizable carbonyl', 'Heat for dehydration']
    },
    {
        id: 'grignard',
        name: 'Grignard Reaction',
        smarts: '[C:1]=[O:2]>>[C:1]([C:3])[OH:2]',
        description: 'Grignard reagent adds to carbonyl',
        conditions: ['Grignard reagent (RMgX)', 'Anhydrous conditions', 'Quench with H₃O⁺']
    },
    {
        id: 'halogenation',
        name: 'Alkene Halogenation',
        smarts: '[C:1]=[C:2]>>[C:1]([Br:3])[C:2][Br:4]',
        description: 'Halogen adds across double bond',
        conditions: ['Br₂ or Cl₂', 'Anti addition']
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

// Mock function to predict products (simplified version)
export function predictProducts(reactantSMILES: string, reactionId: string): string[] {
    const reaction = getReactionById(reactionId)
    if (!reaction) return []

    // Mock product predictions for common reactions
    const predictions: Record<string, Record<string, string[]>> = {
        'CCO': {
            'oxidation_alcohol': ['CC=O', 'CC(=O)O'], // Acetaldehyde, Acetic acid
            'acid_base': ['CC[O-]'] // Ethoxide
        },
        'CC=C': {
            'hydration': ['CC(O)C'], // Propan-2-ol (Markovnikov)
            'halogenation': ['CC(Br)C(Br)'] // Dibromopropane
        },
        'CC(=O)O': {
            'esterification': ['CC(=O)OCC'], // Ethyl acetate (with ethanol)
            'acid_base': ['CC(=O)[O-]'] // Acetate ion
        },
        'CC(=O)C': {
            'reduction_carbonyl': ['CC(O)C'], // Propan-2-ol
            'grignard': ['CC(C)(O)C'] // tert-butanol (with CH3MgBr)
        }
    }

    return predictions[reactantSMILES]?.[reactionId] || ['Product formation in progress...']
}

// Get reaction mechanism description
export function getReactionMechanism(reactionId: string): string {
    const mechanisms: Record<string, string> = {
        'sn2': '1. Nucleophile approaches from backside\n2. Concerted bond formation/breaking\n3. Walden inversion occurs',
        'e2': '1. Base abstracts β-hydrogen\n2. C-H bond breaks as C=C forms\n3. Leaving group departs simultaneously',
        'acid_base': '1. Base attacks acidic proton\n2. Proton transfer occurs\n3. Conjugate base formed',
        'esterification': '1. Protonation of carbonyl oxygen\n2. Nucleophilic attack by alcohol\n3. Proton transfer and water elimination',
        'grignard': '1. Nucleophilic attack on carbonyl\n2. Tetrahedral intermediate forms\n3. Protonation upon aqueous workup'
    }

    return mechanisms[reactionId] || 'Mechanism details not available'
}
