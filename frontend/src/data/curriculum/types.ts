export type RuleLogicType = 'longest_chain' | 'identify_substituents' | 'lowest_numbering' | 'alphabetical_order' | 'check_longest_chain' | 'check_lowest_locants' | 'check_alphabetical' | 'check_cyclo_naming' | 'check_halogens'

export interface Rule {
    id: string
    name: string
    smarts: string
    description: string
    unlocked: boolean
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
    reactants: { smiles: string; name?: string }[];
    products: ReactionProduct[];
    conditions: string;
}

export interface SubSubject {
    id: string
    name: string
    rules: Rule[]
    content: string // Markdown or HTML content
    examples: { smiles: string; name: string; customSvg?: string; customSvgUrl?: string }[]
    reactionExamples?: ReactionExample[];
    isCompleted?: boolean
    section?: string
}

export interface Subject {
    id: string
    name: string
    subSubjects: SubSubject[]
    icon?: string
}
