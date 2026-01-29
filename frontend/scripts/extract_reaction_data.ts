
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
import { reactionRules } from '../src/services/reaction_definitions';
// @ts-ignore
import { alkanes } from '../src/data/curriculum/subjects/alkanes';
// @ts-ignore
import { alkenes } from '../src/data/curriculum/subjects/alkenes';
// @ts-ignore
import { alkynes } from '../src/data/curriculum/subjects/alkynes';

// Aggregate all subjects
const subjects = [alkanes, alkenes, alkynes];

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

// Map rules to simplified object
const smarts: Record<string, any> = {};
reactionRules.forEach(rule => {
    if (rule.reactionSmarts) {
        smarts[rule.id] = rule.reactionSmarts;
    }
});

const output = {
    examples: examples.map(ex => ({
        id: ex.id,
        reactants: ex.reactants.map((r: any) => r.smiles), // Assuming reactant object has smiles
        expected_products: ex.products.map((p: any) => p.smiles) // Assuming product object has smiles
    })),
    smarts: smarts
};

const outputPath = path.join(process.cwd(), 'reaction_data_extracted.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 4));
console.log(`Extracted data written to ${outputPath}`);
