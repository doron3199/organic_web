
import { LogicEngine } from './logicEngine';
import { GraphUtils } from './GraphUtils';
import Graph from 'graphology';
import { SubSubject, initialCurriculum } from '../data/curriculum';

// --- MOCKING ---

// Mock helpers for Graph Creation
function createGraph(nodes: { id: number; el: string }[], edges: [number, number][]): Graph {
    const g = new Graph({ type: 'undirected' });
    nodes.forEach(n => g.addNode(n.id.toString(), { id: n.id, element: n.el }));
    edges.forEach((e, i) => g.addEdge(e[0].toString(), e[1].toString(), { type: 1 }));
    return g;
}

// Override parseMolecule to handle our test cases
const originalParse = GraphUtils.parseMolecule;
const MOCK_MOLS: Record<string, () => Graph> = {};

GraphUtils.parseMolecule = (smiles: string) => {
    if (MOCK_MOLS[smiles]) {
        return MOCK_MOLS[smiles]();
    }
    throw new Error(`Mock graph not defined for: ${smiles}`);
};

// --- DATA ---
// We will use the real curriculum but ensure rules are unlocked for testing
const fullSubject = JSON.parse(JSON.stringify(initialCurriculum[0])); // Deep copy Alkanes
fullSubject.subSubjects.forEach((sub: any) => {
    sub.rules.forEach((r: any) => r.unlocked = true);
});

// Helper to get specific rule set (SubSubject)
const getSubSubject = (id: string) => {
    // Find the subsubject where we expect this logic to pass
    // For testing "logicEngine" fully, we can just use the final subsubject (Halogens) which has ALL rules unlocked?
    // Actually, logic checks specific rules.
    // Let's use the 'Halogens' subSubject which includes all previous rules usually.
    return fullSubject.subSubjects.find((s: any) => s.id === 'alkanes-step6-halogens')!;
}


// --- TESTS ---

const tests = [
    // 1. SIMPLE ALKANE: Pentane
    {
        name: "Pentane",
        smiles: "CCCCC",
        setup: () => createGraph(
            [{ id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }],
            [[0, 1], [1, 2], [2, 3], [3, 4]]
        ),
        expectedName: "Pentane"
    },
    // 2. BRANCHED ALKANE: 2-Methylpentane
    {
        name: "2-Methylpentane",
        smiles: "CC(C)CCC",
        setup: () => createGraph(
            [{ id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }, { id: 5, el: 'C' }],
            [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5]] // 5 is Methyl on 1 (pos 2)
        ),
        expectedName: "2-Methylpentane"
    },
    // 3. HALOGEN: 2-Chloropentane
    {
        name: "2-Chloropentane",
        smiles: "CC(Cl)CCC",
        setup: () => createGraph(
            [{ id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }, { id: 5, el: 'Cl' }],
            [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5]]
        ),
        expectedName: "2-Chloropentane"
    },
    // 4. CYCLO: Cyclohexane
    {
        name: "Cyclohexane",
        smiles: "C1CCCCC1",
        setup: () => createGraph(
            [{ id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }, { id: 5, el: 'C' }],
            [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]
        ),
        expectedName: "Cyclohexane"
    },
    // 5. CYCLO W/ BRANCH: Methylcyclohexane
    // Should be "Methylcyclohexane" (no number)
    {
        name: "Methylcyclohexane",
        smiles: "CC1CCCCC1",
        setup: () => createGraph(
            [{ id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }, { id: 5, el: 'C' }, { id: 6, el: 'C' }],
            [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6]]
        ),
        expectedName: "Methylcyclohexane"
    },
    // 6. CYCLIC SUBSTITUENT: Cyclopropylcyclohexane
    // Main ring 6, branch ring 3. "Cyclopropylcyclohexane".
    {
        name: "Cyclopropylcyclohexane",
        smiles: "C1CCCCC1C2CC2",
        setup: () => createGraph(
            [
                { id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }, { id: 5, el: 'C' }, // Hex
                { id: 6, el: 'C' }, { id: 7, el: 'C' }, { id: 8, el: 'C' } // Prop
            ],
            [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
                [6, 7], [7, 8], [8, 6],
                [0, 6] // Connection
            ]
        ),
        expectedName: "Cyclopropylcyclohexane"
    },
    // 7. ALPHABETICAL: 3-Ethyl-2-methylpentane (Wait, 2-Methyl-3-ethyl... NO. Ethyl (E) < Methyl (M).
    // Numbering? 2-Methyl... vs 3-Ethyl...
    // 1-2-3-4-5.
    // If Left-Right: 2-Methyl, 3-Ethyl. Locants: 2, 3.
    // If Right-Left: 3-Ethyl, 4-Methyl. Locants: 3, 4.
    // 2,3 < 3,4. So numbering starts from left.
    // Name: 3-Ethyl-2-methylpentane (Alphabetical list).
    {
        name: "3-Ethyl-2-methylpentane",
        smiles: "CC(C)C(CC)CC", // C-C(Me)-C(Et)-C-C
        setup: () => createGraph(
            [
                { id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }, // Chain
                { id: 5, el: 'C' }, // Me on 1
                { id: 6, el: 'C' }, { id: 7, el: 'C' } // Et on 2
            ],
            [
                [0, 1], [1, 2], [2, 3], [3, 4],
                [1, 5],
                [2, 6], [6, 7]
            ]
        ),
        expectedName: "3-Ethyl-2-methylpentane"
    }

];

async function runSuite() {
    console.log("--- Starting Comprehensive IUPAC Test Suite ---");
    let passed = 0;

    // Setup Mocks
    tests.forEach(t => {
        MOCK_MOLS[t.smiles] = t.setup;
    });

    const ctx = getSubSubject('alkanes-step6-halogens');

    tests.forEach(test => {
        console.log(`\nTesting: ${test.name}`);
        try {
            const result = LogicEngine.analyzeMolecule(test.smiles, ctx);

            if (result.name === test.expectedName) {
                console.log(`✅ PASS: ${result.name}`);
                passed++;
            } else {
                console.log(`❌ FAIL: Expected "${test.expectedName}", Got "${result.name}"`);
                console.log("Logs:", result.logs.filter(l => l.status === 'failed' || l.status === 'success').map(l => `${l.step}: ${l.detail}`));
            }
        } catch (e) {
            console.log(`❌ FAIL (Exception): ${e}`);
            console.error(e);
        }
    });

    console.log(`\nSummary: ${passed}/${tests.length} tests passed.`);
}

runSuite().catch(console.error);
