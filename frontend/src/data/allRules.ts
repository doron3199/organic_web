import { Rule } from './curriculum';

export const ALL_RULES: Rule[] = [
        { id: 'rule-longest-chain', name: 'Longest Chain', logicType: 'longest_chain', unlocked: true, smarts: '', description: 'Identify the longest continuous carbon chain.', subSubjectId: 'alkanes-nomenclature-main-chain' },
        { id: 'rule-identify-substituents', name: 'Identify Substituents', logicType: 'identify_substituents', unlocked: true, smarts: '', description: 'Identify alkyl and halogen substituents.', subSubjectId: 'alkanes-step2-substituents' },
        { id: 'rule-lowest-numbering', name: 'Lowest Numbering', logicType: 'lowest_numbering', unlocked: true, smarts: '', description: 'Number the chain to give substituents the lowest possible locants.', subSubjectId: 'alkanes-step3-numbering' },
        { id: 'rule-alphabetical-order', name: 'Alphabetical Order', logicType: 'alphabetical_order', unlocked: true, smarts: '', description: 'List substituents in alphabetical order.', subSubjectId: 'alkanes-step4-alphabetical' },
        { id: 'rule-cyclo-naming', name: 'Cyclo Naming', logicType: 'check_cyclo_naming', unlocked: true, smarts: '', description: 'Apply rules for cyclic compounds.', subSubjectId: 'alkanes-step5-cyclo' },
        { id: 'rule-suffix-alcohol', name: 'Alcohol Suffix', logicType: 'check_suffix_alcohol', unlocked: true, smarts: '[OX2H]', description: 'Change the parent suffix to -ol.', subSubjectId: 'alcohols-naming' },
        { id: 'rule-suffix-thiol', name: 'Thiol Suffix', logicType: 'check_suffix_thiol', unlocked: true, smarts: '[SX2H]', description: 'Change the parent suffix to -thiol.', subSubjectId: 'thiols-sulfides' },
        { id: 'rule-func-priority', name: 'Functional Group Priority', logicType: 'check_functional_priority', unlocked: true, smarts: '', description: 'Prioritize functional groups in numbering.', subSubjectId: 'alcohols-naming' },
        { id: 'acid-compare-site', name: 'Most Acidic Site', unlocked: true, smarts: '', description: 'Identify the most acidic functional group and baseline pKa.', subSubjectId: 'acid-base-strength-factors' },
        { id: 'acid-compare-resonance', name: 'Resonance', unlocked: true, smarts: '', description: 'Delocalization stabilizes the conjugate base and strengthens the acid.', subSubjectId: 'acid-base-strength-factors' },
        { id: 'acid-compare-inductive', name: 'Inductive Effects', unlocked: true, smarts: '', description: 'Nearby electron-withdrawing atoms stabilize the conjugate base.', subSubjectId: 'acid-base-strength-factors' },
        { id: 'acid-compare-atom-trend', name: 'Atom Trend', unlocked: true, smarts: '', description: 'Electronegativity and size trends affect acidity.', subSubjectId: 'acid-base-strength-factors' },
        { id: 'acid-compare-hybrid', name: 'Hybridization', unlocked: true, smarts: '', description: 'For C-H acids, more s-character increases acidity.', subSubjectId: 'acid-base-strength-factors' }
];
