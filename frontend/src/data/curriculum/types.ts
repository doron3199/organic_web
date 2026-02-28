export type RuleLogicType = 'longest_chain' | 'identify_substituents' | 'lowest_numbering' | 'alphabetical_order' | 'check_longest_chain' | 'check_lowest_locants' | 'check_alphabetical' | 'check_cyclo_naming' | 'check_halogens' | 'check_aromaticity' | 'check_aromatic_naming' | 'check_functional_priority' | 'check_suffix_alcohol' | 'check_suffix_aldehyde' | 'check_suffix_ketone' | 'check_suffix_acid' | 'check_suffix_ester' | 'check_suffix_amide' | 'check_suffix_thiol' | 'check_suffix_amine'

export interface Rule {
    id: string
    name: string
    smarts: string
    description: string
    unlocked: boolean
    subSubjectId?: string
    errorMessage?: string
    logicType?: RuleLogicType
}


export type Selectivity = 'major' | 'minor' | 'trace' | 'equal';

export interface ReactionProduct {
    smiles: string;
    name: string;
    selectivity?: Selectivity;
    yield?: number; // Optional numeric yield (98, 2, 50)
    isByproduct?: boolean;
}

export interface ReactionExample {
    id?: string; // Links to global reaction rule ID (e.g. 'alkane_halogenation_br')
    name?: string;
    reactants: { smiles: string; name?: string }[];
    products: ReactionProduct[];
    conditions: string;
    autoAddMolecules?: { smiles: string; name: string }[];  // Molecules auto-added during reaction (e.g., oxidation reagents)
    isEquilibrium?: boolean;
}

export interface CompareExample {
    id?: string;
    name: string;
    left: { smiles: string; name?: string };
    right: { smiles: string; name?: string };
    note?: string;
}

export interface SubSubject {
    id: string
    name: string
    content: string // Markdown or HTML content
    examples: { smiles: string; name: string; customSvg?: string; customSvgUrl?: string }[]
    reactionExamples?: ReactionExample[];
    compareExamples?: CompareExample[];
    isCompleted?: boolean
    section?: string
    widgetType?: string
}

export interface Subject {
    id: string
    name: string
    subSubjects: SubSubject[]
    icon?: string
}
