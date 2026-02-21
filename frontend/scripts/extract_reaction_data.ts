
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
// {reactionRules} import removed
// import { reactionRules } from '../src/services/reaction_definitions';
// @ts-ignore
// @ts-ignore
import { QUICK_ADD_MOLECULES, AVAILABLE_CONDITIONS } from '../src/services/conditions';
// @ts-ignore
import { alkanes } from '../src/data/curriculum/subjects/alkanes';
// @ts-ignore
import { alkenes } from '../src/data/curriculum/subjects/alkenes';
// @ts-ignore
import { alkynes } from '../src/data/curriculum/subjects/alkynes';
// @ts-ignore
import { alcohols } from '../src/data/curriculum/subjects/alcohols';
// @ts-ignore
import { aromatics } from '../src/data/curriculum/subjects/aromatics';
// @ts-ignore
import { substitutionElimination } from '../src/data/curriculum/subjects/substitution_elimination';
// @ts-ignore
import { carboxylicAcids } from '../src/data/curriculum/subjects/carboxylic_acids';

// Aggregate all subjects
const subjects = [
    alkanes,
    alkenes,
    alkynes,
    alcohols,
    aromatics,
    substitutionElimination,
    carboxylicAcids
];

// Helper to extract condition IDs (e.g. 'heat', 'light') from text
function getConditionsList(conditions: string | undefined): string[] {
    if (!conditions) return [];

    const found: string[] = [];
    const condLower = conditions.toLowerCase();

    AVAILABLE_CONDITIONS.forEach((cond: any) => {
        // Check for ID match or Label match
        // Simple heuristic: check if label (minus emoji) or id is present
        const labelPlain = cond.label.replace(/^[^\w\d\s]+/, '').trim().toLowerCase();

        if (condLower.includes(cond.id) || condLower.includes(labelPlain)) {
            found.push(cond.id);
        }

        // Special mappings/synonyms
        if (cond.id === 'light' && (condLower.includes('hv') || conditions.includes('ν'))) found.push('light');
        if (cond.id === 'heat' && (condLower.includes('delta') || conditions.includes('Δ'))) found.push('heat');
    });

    return [...new Set(found)];
}

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
            // Split by dot and add each part
            molecule.smiles.split('.').forEach((s: string) => {
                if (!molecules.includes(s)) {
                    molecules.push(s);
                }
            });
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

// reactionRules import removed as it is now handled by the backend
// const smarts logic referenced below will be removed/emptied

// Map rules to simplified object with reactionSmarts and autoAdd - REMOVED (Handled in Python)
const smarts: Record<string, any> = {};

const output = {
    examples: examples.map(ex => {
        const conditionMolecules = getConditionMolecules(ex.conditions);
        const conditionsList = getConditionsList(ex.conditions);
        return {
            id: ex.id,
            reactants: ex.reactants.flatMap((r: any) => r.smiles.split('.')),
            expected_products: ex.products.flatMap((p: any) => p.smiles.split('.')),
            conditionMolecules: conditionMolecules.length > 0 ? conditionMolecules : undefined,
            conditions: conditionsList.length > 0 ? conditionsList : undefined
        };
    }),
    smarts: smarts
};

const outputPath = path.join(process.cwd(), 'reaction_data_extracted.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 4));
console.log(`Extracted data written to ${outputPath}`);
