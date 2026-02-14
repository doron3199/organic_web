import { Rule } from '../data/curriculum';
import { GraphUtils, MoleculeGraph } from './GraphUtils';
import { rdkitService } from './rdkit';

export interface AcidComparisonResult {
    winner: 'A' | 'B' | 'tie';
    summary: string;
    rules: Rule[];
    appliedRuleIds: string[];
    ruleResults: Record<string, string>;
    scoreA: number;
    scoreB: number;
}

interface AcidEvaluation {
    valid: boolean;
    reason?: string;
    baseGroup: string;
    basePka: number;
    acidicElement: string;
    acidAtomId?: number;
    resonance: boolean;
    inductiveScore: number;
    hybridization?: 'sp' | 'sp2' | 'sp3';
    sizeOrEnScore: number;
    score: number;
}

const ACID_COMPARISON_RULES: Rule[] = [
    {
        id: 'acid-compare-resonance',
        name: 'Resonance',
        smarts: '',
        description: 'Delocalization stabilizes the conjugate base and strengthens the acid.',
        unlocked: true
    },
    {
        id: 'acid-compare-inductive',
        name: 'Inductive Effects',
        smarts: '',
        description: 'Nearby electron-withdrawing atoms stabilize the conjugate base.',
        unlocked: true
    },
    {
        id: 'acid-compare-atom-trend',
        name: 'Atom Trend',
        smarts: '',
        description: 'Electronegativity (row) and size (column) trends affect acidity.',
        unlocked: true
    },
    {
        id: 'acid-compare-hybrid',
        name: 'Hybridization',
        smarts: '',
        description: 'For C-H acids, more s-character (sp > sp2 > sp3) increases acidity.',
        unlocked: true
    }
];

const HALOGEN_PKA: Record<string, number> = {
    F: 3.2,
    Cl: -7,
    Br: -9,
    I: -10
};

const ELECTRONEGATIVITY_SCORE: Record<string, number> = {
    H: 2.20,
    Cl: 3.16,
    Br: 2.96,
    I: 2.66,
    C: 2.55,
    N: 3.04,
    O: 3.44,
    F: 3.98
};

const SIZE_SCORE: Record<string, number> = {
    F: 0,
    Cl: 1,
    Br: 2,
    I: 3
};

const ELECTRON_WITHDRAWING_ATOMS = new Set(['F', 'Cl', 'Br', 'I', 'O', 'N', 'S']);
const ELECTRON_WITHDRAWING_STRENGTH: Record<string, number> = {
    F: 2.2,
    Cl: 1.5,
    Br: 1.3,
    I: 1.1,
    O: 1.5,
    N: 1.2,
    S: 1.1
};
const WINNER_THRESHOLD = 0.1;

export function compareAcids(smilesA: string, smilesB: string): AcidComparisonResult {
    const evalA = evaluateAcid(smilesA);
    const evalB = evaluateAcid(smilesB);

    const ruleResults: Record<string, string> = {};

    if (!evalA.valid || !evalB.valid) {
        const reason = [
            !evalA.valid ? `A invalid: ${evalA.reason || 'invalid SMILES'}` : '',
            !evalB.valid ? `B invalid: ${evalB.reason || 'invalid SMILES'}` : ''
        ].filter(Boolean).join(' | ');

        return {
            winner: 'tie',
            summary: `Could not compare. ${reason}`,
            rules: ACID_COMPARISON_RULES,
            appliedRuleIds: ACID_COMPARISON_RULES.map(r => r.id),
            ruleResults,
            scoreA: 0,
            scoreB: 0
        };
    }

    ruleResults['acid-compare-resonance'] = evalA.resonance === evalB.resonance
        ? (evalA.resonance ? 'Tie: both resonance-stabilized' : 'Tie: no resonance')
        : evalA.resonance
            ? 'Resonance-stabilized: A'
            : 'Resonance-stabilized: B';

    ruleResults['acid-compare-inductive'] = evalA.inductiveScore === evalB.inductiveScore
        ? 'Tie: same inductive effect'
        : evalA.inductiveScore > evalB.inductiveScore
            ? 'Stronger inductive effect: A'
            : 'Stronger inductive effect: B';

    ruleResults['acid-compare-atom-trend'] = buildAtomTrendMessage(evalA, evalB);

    ruleResults['acid-compare-hybrid'] = buildHybridMessage(evalA, evalB);

    // Only include rules where there's a meaningful difference
    const appliedRuleIds = ACID_COMPARISON_RULES
        .filter(r => !ruleResults[r.id]?.startsWith('Tie'))
        .map(r => r.id);

    const diff = evalA.score - evalB.score;
    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (Math.abs(diff) >= WINNER_THRESHOLD) {
        winner = diff > 0 ? 'A' : 'B';
    }

    const summary = buildSummary(winner, evalA, evalB);

    return {
        winner,
        summary,
        rules: ACID_COMPARISON_RULES,
        appliedRuleIds,
        ruleResults,
        scoreA: evalA.score,
        scoreB: evalB.score
    };
}

function evaluateAcid(smiles: string): AcidEvaluation {
    if (!smiles) {
        return {
            valid: false,
            reason: 'empty input',
            baseGroup: 'Unknown',
            basePka: 50,
            acidicElement: 'C',
            resonance: false,
            inductiveScore: 0,
            sizeOrEnScore: 0,
            score: 0
        };
    }

    if (!rdkitService.isValidSMILES(smiles)) {
        return {
            valid: false,
            reason: 'invalid SMILES',
            baseGroup: 'Unknown',
            basePka: 50,
            acidicElement: 'C',
            resonance: false,
            inductiveScore: 0,
            sizeOrEnScore: 0,
            score: 0
        };
    }

    let graph: MoleculeGraph;
    try {
        graph = GraphUtils.parseMolecule(smiles);
    } catch (e) {
        return {
            valid: false,
            reason: 'parse failed',
            baseGroup: 'Unknown',
            basePka: 50,
            acidicElement: 'C',
            resonance: false,
            inductiveScore: 0,
            sizeOrEnScore: 0,
            score: 0
        };
    }

    const site = findMostAcidicSite(graph);
    const inductiveScore = site.acidAtomId !== undefined ? computeInductiveScore(graph, site.acidAtomId) : 0;
    const hybridization = site.acidicElement === 'C' && site.acidAtomId !== undefined ? getHybridization(graph, site.acidAtomId) : undefined;
    const sizeOrEnScore = getAtomTrendScore(site.acidicElement, site.baseGroup);

    const baseStrength = 100 - site.basePka;
    const resonanceScore = site.resonance ? 3 : 0;
    const hybridScore = hybridization === 'sp' ? 2 : hybridization === 'sp2' ? 1 : 0;

    const score = baseStrength + resonanceScore + inductiveScore + sizeOrEnScore + hybridScore;

    return {
        valid: true,
        baseGroup: site.baseGroup,
        basePka: site.basePka,
        acidicElement: site.acidicElement,
        acidAtomId: site.acidAtomId,
        resonance: site.resonance,
        inductiveScore,
        hybridization,
        sizeOrEnScore,
        score
    };
}

function buildAtomTrendMessage(a: AcidEvaluation, b: AcidEvaluation): string {
    const aElement = a.acidicElement;
    const bElement = b.acidicElement;

    // Determine the period (row) of each element to distinguish size vs EN
    const PERIOD: Record<string, number> = { H: 1, C: 2, N: 2, O: 2, F: 2, S: 3, Cl: 3, Br: 4, I: 5 };
    const aPeriod = PERIOD[aElement] ?? 2;
    const bPeriod = PERIOD[bElement] ?? 2;

    if (aPeriod !== bPeriod) {
        // Different periods → size is the dominant factor (bigger atom = weaker bond = stronger acid)
        if (aPeriod === bPeriod) return 'Tie: same size';
        return aPeriod > bPeriod
            ? `Bigger atom: A`
            : `Bigger atom: B`;
    } else {
        // Same period → electronegativity is the factor
        const aEN = ELECTRONEGATIVITY_SCORE[aElement] ?? 0;
        const bEN = ELECTRONEGATIVITY_SCORE[bElement] ?? 0;
        if (aEN === bEN) return 'Tie: same electronegativity';
        return aEN > bEN
            ? `More electronegative: A`
            : `More electronegative: B`;
    }
}

function buildHybridMessage(a: AcidEvaluation, b: AcidEvaluation): string {
    if (!a.hybridization && !b.hybridization) return 'Tie: not applicable';
    if (a.hybridization === b.hybridization) return `Tie: both ${a.hybridization}`;

    const hybOrder: Record<string, number> = { sp: 3, sp2: 2, sp3: 1 };
    const aVal = a.hybridization ? hybOrder[a.hybridization] || 0 : 0;
    const bVal = b.hybridization ? hybOrder[b.hybridization] || 0 : 0;

    if (aVal === bVal) return 'Tie: same hybridization';
    return aVal > bVal
        ? `More s-character (${a.hybridization}): A`
        : `More s-character (${b.hybridization}): B`;
}

function buildSummary(winner: 'A' | 'B' | 'tie', a: AcidEvaluation, b: AcidEvaluation): string {
    if (winner === 'tie') {
        return 'Both acids are predicted to be similar in strength by these rules.';
    }

    const winnerEval = winner === 'A' ? a : b;
    const loserEval = winner === 'A' ? b : a;

    const resonanceNote = winnerEval.resonance && !loserEval.resonance ? 'resonance stabilization' : 'baseline acidity';
    return `Stronger acid: Molecule ${winner}. Primary drivers: ${resonanceNote} and functional group strength.`;
}

function findMostAcidicSite(graph: MoleculeGraph): {
    baseGroup: string;
    basePka: number;
    acidicElement: string;
    acidAtomId?: number;
    resonance: boolean;
} {
    const candidates: {
        baseGroup: string;
        basePka: number;
        acidicElement: string;
        acidAtomId?: number;
        resonance: boolean;
    }[] = [];

    const nodes = graph.nodes();

    if (nodes.length === 1) {
        const element = graph.getNodeAttributes(nodes[0]).element;
        if (HALOGEN_PKA[element] !== undefined) {
            candidates.push({
                baseGroup: 'Hydrogen halide',
                basePka: HALOGEN_PKA[element],
                acidicElement: element,
                acidAtomId: parseInt(nodes[0], 10),
                resonance: false
            });
        }
    }

    nodes.forEach(nodeId => {
        const attr = graph.getNodeAttributes(nodeId);
        const element = attr.element;
        const id = parseInt(nodeId, 10);

        if (element === 'S') {
            const oNeighbors = getNeighborsByElement(graph, id, 'O');
            if (oNeighbors.length >= 3) {
                const hasOh = oNeighbors.some(n => graph.degree(n.toString()) === 1);
                if (hasOh) {
                    const ohId = oNeighbors.find(n => graph.degree(n.toString()) === 1);
                    candidates.push({
                        baseGroup: 'Sulfonic acid',
                        basePka: -1,
                        acidicElement: 'O',
                        acidAtomId: ohId,
                        resonance: true
                    });
                }
            }
        }

        if (element === 'C') {
            const oNeighbors = getNeighborsByElement(graph, id, 'O');
            if (oNeighbors.length >= 2) {
                const doubleO = oNeighbors.find(n => getBondType(graph, id, n) === 2);
                const singleO = oNeighbors.find(n => getBondType(graph, id, n) === 1 && graph.degree(n.toString()) === 1);
                if (doubleO !== undefined && singleO !== undefined) {
                    candidates.push({
                        baseGroup: 'Carboxylic acid',
                        basePka: 4.8,
                        acidicElement: 'O',
                        acidAtomId: singleO,
                        resonance: true
                    });
                }
            }
        }

        if (element === 'O') {
            if (graph.degree(nodeId) === 1) {
                const neighbor = getFirstNeighbor(graph, id);
                if (neighbor !== undefined) {
                    const neighborAttr = graph.getNodeAttributes(neighbor.toString());
                    if (neighborAttr.element === 'C') {
                        const isAromatic = hasAromaticBond(graph, neighbor);
                        candidates.push({
                            baseGroup: isAromatic ? 'Phenol' : 'Alcohol',
                            basePka: isAromatic ? 10 : 16,
                            acidicElement: 'O',
                            acidAtomId: id,
                            resonance: isAromatic
                        });
                    }
                }
            }
            // Water: isolated O with no neighbors (or degree 0 after H-stripping)
            if (graph.degree(nodeId) === 0) {
                candidates.push({
                    baseGroup: 'Water',
                    basePka: 15.7,
                    acidicElement: 'O',
                    acidAtomId: id,
                    resonance: false
                });
            }
        }

        if (element === 'S') {
            if (graph.degree(nodeId) === 1) {
                const neighbor = getFirstNeighbor(graph, id);
                if (neighbor !== undefined) {
                    const neighborAttr = graph.getNodeAttributes(neighbor.toString());
                    if (neighborAttr.element === 'C') {
                        candidates.push({
                            baseGroup: 'Thiol',
                            basePka: 10.5,
                            acidicElement: 'S',
                            acidAtomId: id,
                            resonance: false
                        });
                    }
                }
            }
        }

        if (element === 'C') {
            const neighbors = getNeighbors(graph, id);
            if (neighbors.length === 1) {
                const neighborId = neighbors[0];
                if (getBondType(graph, id, neighborId) === 3) {
                    candidates.push({
                        baseGroup: 'Terminal alkyne',
                        basePka: 25,
                        acidicElement: 'C',
                        acidAtomId: id,
                        resonance: false
                    });
                }
            }
        }
    });

    if (candidates.length === 0) {
        const carbonCandidate = findBestCarbonAcidSite(graph);
        if (carbonCandidate) return carbonCandidate;
        return {
            baseGroup: 'Unknown acid',
            basePka: 50,
            acidicElement: 'C',
            resonance: false
        };
    }

    candidates.sort((a, b) => a.basePka - b.basePka);
    return candidates[0];
}

function findBestCarbonAcidSite(graph: MoleculeGraph): {
    baseGroup: string;
    basePka: number;
    acidicElement: string;
    acidAtomId?: number;
    resonance: boolean;
} | undefined {
    let best: {
        baseGroup: string;
        basePka: number;
        acidicElement: string;
        acidAtomId?: number;
        resonance: boolean;
    } | undefined;

    graph.nodes().forEach(nodeId => {
        const attr = graph.getNodeAttributes(nodeId);
        if (attr.element !== 'C') return;
        const id = parseInt(nodeId, 10);
        const hybridization = getHybridization(graph, id);
        const basePka = hybridization === 'sp' ? 25 : hybridization === 'sp2' ? 44 : 50;
        const baseGroup = hybridization === 'sp'
            ? 'Alkyne C-H'
            : hybridization === 'sp2'
                ? 'Alkene C-H'
                : 'Alkane C-H';

        if (!best || basePka < best.basePka) {
            best = {
                baseGroup,
                basePka,
                acidicElement: 'C',
                acidAtomId: id,
                resonance: false
            };
        }
    });

    return best;
}

function getNeighborsByElement(graph: MoleculeGraph, nodeId: number, element: string): number[] {
    const neighbors: number[] = [];
    graph.forEachNeighbor(nodeId.toString(), (neighbor: string) => {
        const attr = graph.getNodeAttributes(neighbor);
        if (attr.element === element) {
            neighbors.push(parseInt(neighbor, 10));
        }
    });
    return neighbors;
}

function getNeighbors(graph: MoleculeGraph, nodeId: number): number[] {
    const neighbors: number[] = [];
    graph.forEachNeighbor(nodeId.toString(), (neighbor: string) => {
        neighbors.push(parseInt(neighbor, 10));
    });
    return neighbors;
}

function getFirstNeighbor(graph: MoleculeGraph, nodeId: number): number | undefined {
    let found: number | undefined;
    graph.forEachNeighbor(nodeId.toString(), (neighbor: string) => {
        if (found === undefined) {
            found = parseInt(neighbor, 10);
        }
    });
    return found;
}

function getBondType(graph: MoleculeGraph, a: number, b: number): number | undefined {
    const edge = graph.edge(a.toString(), b.toString());
    if (!edge) return undefined;
    const attr = graph.getEdgeAttributes(edge);
    return attr.type;
}

function hasAromaticBond(graph: MoleculeGraph, nodeId: number): boolean {
    let aromatic = false;
    graph.forEachNeighbor(nodeId.toString(), (neighbor: string) => {
        const bondType = getBondType(graph, nodeId, parseInt(neighbor, 10));
        if (bondType === 4) {
            aromatic = true;
        }
    });
    return aromatic;
}

function computeInductiveScore(graph: MoleculeGraph, acidAtomId: number): number {
    const visited = new Set<number>();
    const queue: { id: number; dist: number }[] = [{ id: acidAtomId, dist: 0 }];
    let score = 0;
    const maxDist = 5;
    const distWeights: Record<number, number> = { 1: 1.4, 2: 1.0, 3: 0.6, 4: 0.3, 5: 0.15 };

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        if (current.dist > 0) {
            const element = graph.getNodeAttributes(current.id.toString()).element;
            if (ELECTRON_WITHDRAWING_ATOMS.has(element)) {
                const elementStrength = ELECTRON_WITHDRAWING_STRENGTH[element] ?? 1;
                const distWeight = distWeights[current.dist] ?? 0;
                score += elementStrength * distWeight;
            }
        }

        if (current.dist >= maxDist) continue;

        graph.forEachNeighbor(current.id.toString(), (neighbor: string) => {
            const nextId = parseInt(neighbor, 10);
            if (!visited.has(nextId)) {
                queue.push({ id: nextId, dist: current.dist + 1 });
            }
        });
    }

    return score;
}

function getHybridization(graph: MoleculeGraph, atomId: number): 'sp' | 'sp2' | 'sp3' {
    let maxBondType = 1;
    graph.forEachNeighbor(atomId.toString(), (neighbor: string) => {
        const bondType = getBondType(graph, atomId, parseInt(neighbor, 10)) || 1;
        if (bondType > maxBondType) maxBondType = bondType;
    });

    if (maxBondType === 3) return 'sp';
    if (maxBondType === 2) return 'sp2';
    return 'sp3';
}

function getAtomTrendScore(element: string, baseGroup: string): number {
    // For halide vs halide (same column), size dominates
    if (baseGroup === 'Hydrogen halide') {
        return SIZE_SCORE[element] ?? 0;
    }

    // For everything else, use electronegativity
    if (ELECTRONEGATIVITY_SCORE[element] !== undefined) {
        return ELECTRONEGATIVITY_SCORE[element];
    }

    return 0;
}
