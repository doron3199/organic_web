import { SubSubject } from './curriculum';

export const ALL_RULES: SubSubject = {
    id: 'all_rules',
    name: 'All Rules',
    content: '',
    examples: [],
    rules: [
        { id: 'rule-longest-chain', name: 'Longest Chain', logicType: 'longest_chain', unlocked: true, smarts: '', description: 'Identify the longest continuous carbon chain.' },
        { id: 'rule-identify-substituents', name: 'Identify Substituents', logicType: 'identify_substituents', unlocked: true, smarts: '', description: 'Identify alkyl and halogen substituents.' },
        { id: 'rule-lowest-numbering', name: 'Lowest Numbering', logicType: 'lowest_numbering', unlocked: true, smarts: '', description: 'Number the chain to give substituents the lowest possible locants.' },
        { id: 'rule-alphabetical-order', name: 'Alphabetical Order', logicType: 'alphabetical_order', unlocked: true, smarts: '', description: 'List substituents in alphabetical order.' },
        { id: 'rule-cyclo-naming', name: 'Cyclo Naming', logicType: 'check_cyclo_naming', unlocked: true, smarts: '', description: 'Apply rules for cyclic compounds.' },
        { id: 'rule-suffix-alcohol', name: 'Alcohol Suffix', logicType: 'check_suffix_alcohol', unlocked: true, smarts: '[OX2H]', description: 'Change the parent suffix to -ol.' },
        { id: 'rule-func-priority', name: 'Functional Group Priority', logicType: 'check_functional_priority', unlocked: true, smarts: '', description: 'Prioritize functional groups in numbering.' }
    ]
};
