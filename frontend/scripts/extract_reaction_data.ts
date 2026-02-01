
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
import { reactionRules } from '../src/services/reaction_definitions';
// @ts-ignore
import { QUICK_ADD_MOLECULES } from '../src/services/conditions';
// @ts-ignore
import { alkanes } from '../src/data/curriculum/subjects/alkanes';
// @ts-ignore
import { alkenes } from '../src/data/curriculum/subjects/alkenes';
// @ts-ignore
import { alkynes } from '../src/data/curriculum/subjects/alkynes';

// Aggregate all subjects
const subjects = [alkanes, alkenes, alkynes];

// Helper function to parse conditions and extract quick-add molecules
// Adds molecules that are either isCondition: true (actual reactants like mCPBA/KMnO4/O3)
// or isCondition: false (reagents like H2SO4) that are referenced in the conditions string
function getConditionMolecules(conditions: string | undefined): string[] {
    if (!conditions) return [];

    const molecules: string[] = [];
    const condLower = conditions.toLowerCase();

    Object.entries(QUICK_ADD_MOLECULES).forEach(([key, molecule]: [string, any]) => {
        // Check against key (e.g., 'kmno4', 'mcpba', 'o3', 'h2so4')
        const keyMatch = condLower.includes(key.toLowerCase());
        // Check against label (e.g., 'KMnO₄', 'mCPBA', 'H₂SO₄')
        const labelPlain = molecule.label.replace(/^[^\w\d\s]+/, '').trim();
        const labelMatch = conditions.includes(labelPlain) || conditions.includes(molecule.label);

        if (keyMatch || labelMatch) {
            molecules.push(molecule.smiles);
        }
    });

    return molecules;
}

// Collect all examples
const examples: any[] = [];

subjects.forEach(subject => {
    // Iterate through subSubjects sections to find reactionExamples
    if (subject.subSubjects) {
        subject.subSubjects.forEach((sub: any) => {
            if (sub.reactionExamples) {
                console.log(`Found ${sub.reactionExamples.length} examples in ${sub.id}`);
                examples.push(...sub.reactionExamples);
            }
        });
    } else {
        console.log(`No subSubjects in ${subject?.id}`);
    }
});

// Map rules to simplified object with reactionSmarts and autoAdd
const smarts: Record<string, any> = {};
reactionRules.forEach((rule: any) => {
    if (rule.reactionSmarts) {
        smarts[rule.id] = {
            reactionSmarts: rule.reactionSmarts,
            autoAdd: rule.autoAdd || []
        };
    }
});

const output = {
    examples: examples.map(ex => {
        const conditionMolecules = getConditionMolecules(ex.conditions);
        return {
            id: ex.id,
            reactants: ex.reactants.map((r: any) => r.smiles),
            expected_products: ex.products.map((p: any) => p.smiles),
            conditionMolecules: conditionMolecules.length > 0 ? conditionMolecules : undefined
        };
    }),
    smarts: smarts
};

const outputPath = path.join(process.cwd(), 'reaction_data_extracted.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 4));
console.log(`Extracted data written to ${outputPath}`);
