
import { test } from 'vitest';
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


test('extract reaction data', () => {
    // Aggregate all subjects
    const subjects = [alkanes, alkenes, alkynes];

    // Collect all examples
    const examples: any[] = [];

    subjects.forEach(subject => {
        // @ts-ignore
        if (subject.reactionExamples) {
            // @ts-ignore
            examples.push(...subject.reactionExamples);
        }
    });

    // Map rules to simplified object
    const smarts: Record<string, any> = {};
    reactionRules.forEach((rule: any) => {
        if (rule.reactionSmarts) {
            smarts[rule.id] = rule.reactionSmarts;
        }
    });

    const output = {
        examples: examples.map(ex => ({
            id: ex.id,
            reactants: ex.reactants.map((r: any) => r.smiles),
            expected_products: ex.products.map((p: any) => p.smiles)
        })),
        smarts: smarts
    };

    // Write to file
    // Use process.cwd() which corresponds to the project root when running via npm script
    const outPath = path.resolve(process.cwd(), 'reaction_data_extracted.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 4));
    console.log(`Wrote extracted data to ${outPath}`);

    // Check if file exists
    if (fs.existsSync(outPath)) {
        console.log("File successfully created.");
    }
});
