
import { LogicEngine } from './logicEngine';
import { GraphUtils } from './GraphUtils';
import Graph from 'graphology';
import { SubSubject } from '../data/curriculum';

// Mock helpers
function createGraph(nodes: { id: number; el: string }[], edges: [number, number][]): Graph {
    const g = new Graph({ type: 'undirected' });
    nodes.forEach(n => g.addNode(n.id.toString(), { id: n.id, element: n.el }));
    edges.forEach((e, i) => g.addEdge(e[0].toString(), e[1].toString(), { type: 1 }));
    return g;
}

// Mock SubSubject
const mockSubjectAcyclic: SubSubject = {
    id: 'test',
    name: 'Test',
    content: '',
    examples: [],
    rules: [
        { id: '1', name: 'Longest Chain', logicType: 'longest_chain', unlocked: true, smarts: '', description: '' },
        { id: '2', name: 'Identify Halogens', logicType: 'identify_substituents', unlocked: true, smarts: '[F,Cl,Br,I]', description: '' },
        { id: '3', name: 'Lowest Numbering', logicType: 'lowest_numbering', unlocked: true, smarts: '', description: '' },
        { id: '4', name: 'Alphabetical', logicType: 'alphabetical_order', unlocked: true, smarts: '', description: '' }
    ]
};

// Mock SubSubject Cyclic
const mockSubjectCyclic: SubSubject = {
    id: 'test-cycle',
    name: 'Test Cycle',
    content: '',
    examples: [],
    rules: [
        { id: '1', name: 'Longest Chain', logicType: 'longest_chain', unlocked: true, smarts: '', description: '' },
        { id: '2', name: 'Identify Subs', logicType: 'identify_substituents', unlocked: true, smarts: '', description: '' },
        { id: '3', name: 'Lowest Numbering', logicType: 'lowest_numbering', unlocked: true, smarts: '', description: '' },
        { id: '5', name: 'Cyclo Naming', logicType: 'check_cyclo_naming', unlocked: true, smarts: '', description: '' }
    ]
};

// Override parseMolecule
const originalParse = GraphUtils.parseMolecule;

async function runTests() {
    console.log("--- Starting Reproduction Tests ---");

    // TEST 1: 2-Chloropentane
    // C0-C1-C2-C3-C4. Cl5 attached to C1.
    // 2-Chloropentane.
    GraphUtils.parseMolecule = () => {
        return createGraph(
            [
                { id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' },
                { id: 5, el: 'Cl' }
            ],
            [
                [0, 1], [1, 2], [2, 3], [3, 4], // Chain
                [1, 5] // Cl on C1 (position 2)
            ]
        );
    };

    const res1 = LogicEngine.analyzeMolecule("CC(Cl)CCC", mockSubjectAcyclic);
    console.log("\nTest 1: 2-Chloropentane");
    console.log("Name:", res1.name);
    console.log("Logs:", res1.logs.map(l => l.detail));
    console.log("Parts:", res1.nameParts);

    // TEST 2: Cyclopropylcyclohexane
    // Ring 6: 0-1-2-3-4-5-0.
    // Ring 3: 6-7-8-6.
    // Bond 0-6.
    GraphUtils.parseMolecule = () => {
        return createGraph(
            [
                { id: 0, el: 'C' }, { id: 1, el: 'C' }, { id: 2, el: 'C' }, { id: 3, el: 'C' }, { id: 4, el: 'C' }, { id: 5, el: 'C' },
                { id: 6, el: 'C' }, { id: 7, el: 'C' }, { id: 8, el: 'C' }
            ],
            [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], // Cyclohexane
                [6, 7], [7, 8], [8, 6], // Cyclopropane
                [0, 6] // Connection
            ]
        );
    };

    const res2 = LogicEngine.analyzeMolecule("C1CCCCC1C2CC2", mockSubjectCyclic);
    console.log("\nTest 2: Cyclopropylcyclohexane");
    console.log("Name:", res2.name);
    console.log("Logs:", res2.logs.map(l => l.detail));
    console.log("Parts:", res2.nameParts);

}

runTests().catch(console.error);
