import { SubSubject } from './curriculum';

export const ALL_RULES: SubSubject = {
    id: 'all_rules',
    name: 'All Rules',
    content: '',
    examples: [],
    rules: [
        { id: '1', name: 'Longest Chain', logicType: 'longest_chain', unlocked: true, smarts: '', description: 'Identify the longest continuous carbon chain.' },
        { id: '3', name: 'Identify Substituents', logicType: 'identify_substituents', unlocked: true, smarts: '', description: 'Identify alkyl and halogen substituents.' },
        { id: '4', name: 'Lowest Numbering', logicType: 'lowest_numbering', unlocked: true, smarts: '', description: 'Number the chain to give substituents the lowest possible locants.' },
        { id: '5', name: 'Alphabetical Order', logicType: 'alphabetical_order', unlocked: true, smarts: '', description: 'List substituents in alphabetical order.' },
        { id: '6', name: 'Cyclo Naming', logicType: 'check_cyclo_naming', unlocked: true, smarts: '', description: 'Apply rules for cyclic compounds.' }
    ]
};
