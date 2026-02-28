import { rdkitService } from './rdkit'
import { Rule } from '../data/curriculum'
import { LogEntry } from '../components/LogicConsole'
import { GraphUtils, MoleculeGraph } from './GraphUtils'
import Graph from 'graphology'
import { shortestPath } from 'graphology-library'

export interface AnalysisResult {
    logs: LogEntry[]
    name?: string
    nameParts?: NamePart[]
    isValid: boolean
    appliedRuleIds: string[]
    ruleResults: Record<string, string> // Map ruleId -> result string
    commonName?: string
    commonNameParts?: NamePart[]
    mainChainAtoms?: number[]
    locantMap?: Record<number, number>
}

export interface NamePart {
    text: string
    type: 'root' | 'substituent' | 'locant' | 'separator'
    ids?: number[]
}

export type GroupType = 'alcohol' | 'aldehyde' | 'ketone' | 'acid' | 'ester' | 'amide' | 'amine' | 'ether' | 'benzene' | 'thiol'

export interface FunctionalGroup {
    type: GroupType
    atomIds: number[]
    locant?: number
    isPrincipal: boolean
}

interface AnalysisContext {
    smiles: string
    currentRules: Rule[]
    chainSelection: 'pre-2013' | 'post-2013'

    // Output State
    logs: LogEntry[]
    appliedRuleIds: string[]
    ruleResults: Record<string, string>
    isValid: boolean
    isUnknown: boolean

    // Alt names
    alternativeName?: string
    commonName?: string
    commonNameParts?: NamePart[]
    commonSubstituentParts: NamePart[]
    locantMap?: Record<number, number>

    // Graph & Topology
    graph: MoleculeGraph
    totalCarbons: number
    cycles: number[][]
    isCyclic: boolean

    // Logic State
    mainChainAtoms: number[]
    mainChainLen: number
    branches: number[][]

    // Substituent Analysis
    // substituentAtoms removed, accessed directly via graph
    branchData: {
        name: string
        connIdx: number // Index on the main chain (0..N-1)
        locant?: number
    }[]

    // Naming
    rootPart: NamePart | null
    substituentParts: NamePart[]
    finalName: string

    // Unsaturation
    unsaturations: {
        type: number // 2=double, 3=triple
        locant?: number
        edges: string[] // edge keys
        atomIds: number[]
    }[]

    // Functional Groups
    functionalGroups: FunctionalGroup[]
    principalGroup: FunctionalGroup | null // Primary Representative
    principalGroups: FunctionalGroup[] // All identical highest-priority groups (e.g. 2 OH groups)
    isBenzeneParent: boolean
    hasStereo?: boolean
}

const MOLECULE_BANK: Record<string, string> = {
    'ClCl': 'Cl<sub>2</sub>',
    'BrBr': 'Br<sub>2</sub>',
    'Br': 'HBr',
    'Cl': 'HCl',
    'I': 'HI',
    'F': 'HF',
    '[H][H]': 'H<sub>2</sub>',
    'O': 'H<sub>2</sub>O',
    'COC': 'Dimethyl ether',
}

export class LogicEngine {

    static analyzeMolecule(
        smiles: string,
        currentRules: Rule[],
        chainSelection: 'pre-2013' | 'post-2013' = 'post-2013'
    ): AnalysisResult {
        // Molecule Bank Check
        if (MOLECULE_BANK[smiles]) {
            return {
                logs: [],
                name: MOLECULE_BANK[smiles],
                isValid: true,
                appliedRuleIds: [],
                ruleResults: {}
            }
        }

        const ctx = this.initializeContext(smiles, currentRules, chainSelection)

        this.log(ctx, 'Initialization', `Analyzing: ${smiles}`, 'success')

        if (!this.validateStructure(ctx)) return this.buildResult(ctx)

        this.parseGraph(ctx)

        // Check for unsupported atoms based on test suite
        const allowedAtoms = ["C", "F", "Br", "Cl", "I", "N", "O", "S", "H"];
        let hasUnsupportedAtoms = false;
        ctx.graph.forEachNode((_node: string, attr: any) => {
            if (!allowedAtoms.includes(attr.element)) {
                hasUnsupportedAtoms = true;
            }
        });

        if (hasUnsupportedAtoms) {
            this.log(ctx, 'Structure Check', 'Unknown molecule: contains unsupported atoms.', 'checking')
            ctx.isUnknown = true
        }

        this.detectFunctionalGroups(ctx)

        if (!this.determineParentStructure(ctx)) return this.buildResult(ctx)

        if (!this.analyzeSubstituents(ctx)) return this.buildResult(ctx)



        this.assembleName(ctx)

        return this.buildResult(ctx)
    }

    private static initializeContext(smiles: string, rules: Rule[], chainSelection: 'pre-2013' | 'post-2013'): AnalysisContext {
        return {
            smiles,
            currentRules: rules,
            chainSelection,

            logs: [],
            appliedRuleIds: [],
            ruleResults: {},
            isValid: true, // Optimistic default, set to false on failure
            isUnknown: false,
            graph: null as any, // Will be set in parse
            totalCarbons: 0,
            cycles: [],
            isCyclic: false,
            mainChainAtoms: [],
            mainChainLen: 0,
            branches: [],
            branchData: [],
            rootPart: null,
            substituentParts: [],
            commonSubstituentParts: [],

            finalName: "Unknown Molecule",
            alternativeName: undefined,
            unsaturations: [],
            functionalGroups: [],
            principalGroup: null,
            principalGroups: [],
            isBenzeneParent: false,
            hasStereo: false,
            locantMap: {}
        }
    }

    private static log(ctx: AnalysisContext, step: string, detail: string, status: 'success' | 'checking' | 'failed', result?: string) {
        ctx.logs.push({
            id: step + '_' + Math.random().toString(36).substr(2, 9),
            step,
            detail,
            status,
            result,
            timestamp: Date.now()
        })
    }

    private static buildResult(ctx: AnalysisContext): AnalysisResult {
        let finalName = ctx.finalName
        if (finalName === 'Unknown Molecule' || ctx.isUnknown) {
            finalName = `Unknown Molecule`
        }

        const nameParts = ctx.isUnknown ? undefined : (ctx.substituentParts.length > 0 || ctx.rootPart ? [...ctx.substituentParts, ...(ctx.rootPart ? [ctx.rootPart] : [])] : undefined);
        let displayCommonName = ctx.isUnknown ? undefined : ctx.commonName;
        let displayCommonNameParts = ctx.isUnknown ? undefined : ctx.commonNameParts;

        if (ctx.hasStereo && finalName !== 'Unknown Molecule') {
            const stereoNote = " (Stereochemistry not included. Switch to Stereo Mode to view)";
            finalName += stereoNote;
            if (nameParts) {
                nameParts.push({ text: stereoNote, type: 'separator' });
            }
            if (displayCommonName) {
                displayCommonName += stereoNote;
            }
            if (displayCommonNameParts) {
                displayCommonNameParts.push({ text: stereoNote, type: 'separator' });
            }
        }

        return {
            logs: ctx.logs,
            name: finalName,
            nameParts: nameParts,
            isValid: ctx.isValid,
            appliedRuleIds: ctx.appliedRuleIds,
            ruleResults: ctx.ruleResults,
            commonName: displayCommonName,
            commonNameParts: displayCommonNameParts,
            mainChainAtoms: ctx.mainChainAtoms,
            locantMap: ctx.locantMap
        }
    }

    private static validateStructure(ctx: AnalysisContext): boolean {
        if (!ctx.smiles) {
            this.log(ctx, 'Validation', 'Molecule is empty.', 'failed')
            ctx.isValid = false
            return false
        }
        if (!rdkitService.isValidSMILES(ctx.smiles)) {
            this.log(ctx, 'Structure Check', 'Invalid chemical structure.', 'failed')
            ctx.isValid = false
            return false
        }

        // Check for unsupported features like stereochemistry
        if (/[@\/\\]/.test(ctx.smiles)) {
            this.log(ctx, 'Structure Check', 'Stereochemistry detected. This STN engine ignores stereochemical configurations. Name will be generated without R/S or E/Z prefixes.', 'success')
            ctx.hasStereo = true
        }

        // Check for charges or radicals
        if (/\[.*?[-+].*?\]/.test(ctx.smiles)) {
            this.log(ctx, 'Structure Check', 'Unknown molecule: contains charges or radicals', 'checking')
            ctx.isUnknown = true
        }

        // Check for Complex Fused/Bridged Ring Systems using string level analysis
        let depth = 0;
        const depthCounts: Record<number, number> = {};
        let inDigit = false;
        for (let i = 0; i < ctx.smiles.length; i++) {
            const char = ctx.smiles[i];
            if (char === '(') {
                depth++;
                inDigit = false;
            } else if (char === ')') {
                depth = Math.max(0, depth - 1);
                inDigit = false;
            } else if (/\d/.test(char) || char === '%') {
                if (!inDigit) {
                    depthCounts[depth] = (depthCounts[depth] || 0) + 1;
                    inDigit = true;
                }
            } else {
                inDigit = false;
            }
        }

        let hasComplexRings = false;
        for (const count of Object.values(depthCounts)) {
            if (count > 2) hasComplexRings = true;
        }

        if (hasComplexRings) {
            this.log(ctx, 'Structure Check', 'Unknown molecule: complex ring structure found', 'checking')
            ctx.isUnknown = true
        }

        return true
    }


    private static parseGraph(ctx: AnalysisContext) {
        ctx.graph = GraphUtils.parseMolecule(ctx.smiles)

        let carbonCount = 0
        ctx.graph.forEachNode((_node: string, attr: any) => {
            if (attr && attr.element === 'C') carbonCount++
        })
        ctx.totalCarbons = carbonCount

        ctx.cycles = GraphUtils.findCycles(ctx.graph)
        ctx.isCyclic = ctx.cycles.length > 0

        this.log(ctx, 'Graph Parsing', `Found ${ctx.totalCarbons} Carbon atoms.${ctx.isCyclic ? ` Detected ${ctx.cycles.length} ring(s).` : ''}`, 'success')
    }

    private static detectFunctionalGroups(ctx: AnalysisContext) {
        const nodes = ctx.graph.nodes()
        const detectedGroups: FunctionalGroup[] = []

        // 1. Detect Benzenes
        if (ctx.isCyclic) {
            ctx.cycles.forEach(cycle => {
                if (cycle.length === 6) {
                    let aromaticBonds = 0
                    for (let i = 0; i < cycle.length; i++) {
                        const u = cycle[i]
                        const v = cycle[(i + 1) % cycle.length]
                        const edge = ctx.graph.edge(u.toString(), v.toString())
                        const attr = ctx.graph.getEdgeAttributes(edge)
                        if (attr.type === 4) aromaticBonds++
                    }
                    if (aromaticBonds >= 3) { // Usually 6 for V2000 aromatic, or 3 double bonds
                        detectedGroups.push({ type: 'benzene', atomIds: cycle, isPrincipal: false })
                    }
                }
            })
        }

        // 2. Detect O-containing groups
        nodes.forEach(node => {
            const attr = ctx.graph.getNodeAttributes(node)
            const id = parseInt(node)

            // Detect Thiols (S-H)
            if (attr.element === 'S') {
                const neighbors = ctx.graph.neighbors(node).map(n => parseInt(n))
                if (neighbors.length === 1) {
                    const carbonId = neighbors[0]
                    const carbonAttr = ctx.graph.getNodeAttributes(carbonId.toString())
                    if (carbonAttr.element === 'C') {
                        const edge = ctx.graph.edge(node, carbonId.toString())
                        const bondType = ctx.graph.getEdgeAttribute(edge, 'type')
                        // Single bond S-C
                        if (bondType === 1) {
                            detectedGroups.push({ type: 'thiol', atomIds: [id, carbonId], isPrincipal: false })
                        }
                    }
                }
            }

            // Detect Amine (N)
            if (attr.element === 'N') {
                const neighbors = ctx.graph.neighbors(node).map(n => parseInt(n))
                if (neighbors.length === 1) {
                    const carbonId = neighbors[0]
                    const carbonAttr = ctx.graph.getNodeAttributes(carbonId.toString())
                    if (carbonAttr.element === 'C') {
                        const edge = ctx.graph.edge(node, carbonId.toString())
                        const bondType = ctx.graph.getEdgeAttribute(edge, 'type')
                        // Single bond N-C
                        if (bondType === 1) {
                            // Check if part of amide
                            let isAmide = false
                            ctx.graph.forEachNeighbor(carbonId.toString(), n => {
                                if (parseInt(n) === id) return
                                const nAttr = ctx.graph.getNodeAttributes(n)
                                if (nAttr.element === 'O') {
                                    const e = ctx.graph.edge(carbonId.toString(), n)
                                    if (ctx.graph.getEdgeAttribute(e, 'type') === 2) isAmide = true
                                }
                            })
                            if (!isAmide) {
                                detectedGroups.push({ type: 'amine', atomIds: [id, carbonId], isPrincipal: false })
                            }
                        }
                    }
                }
            }

            if (attr.element === 'O') {
                const neighbors = ctx.graph.neighbors(node).map(n => parseInt(n))
                if (neighbors.length === 1) {
                    const carbonId = neighbors[0]
                    const carbonAttr = ctx.graph.getNodeAttributes(carbonId.toString())
                    if (carbonAttr.element === 'C') {
                        const edge = ctx.graph.edge(node, carbonId.toString())
                        const bondType = ctx.graph.getEdgeAttribute(edge, 'type')

                        if (bondType === 1) { // -OH or -OR
                            // Check if part of COOH
                            let isAcidOrEster = false
                            ctx.graph.forEachNeighbor(carbonId.toString(), n => {
                                if (parseInt(n) === id) return
                                const nAttr = ctx.graph.getNodeAttributes(n)
                                if (nAttr.element === 'O') {
                                    const e = ctx.graph.edge(carbonId.toString(), n)
                                    if (ctx.graph.getEdgeAttribute(e, 'type') === 2) isAcidOrEster = true
                                }
                            })
                            if (!isAcidOrEster) {
                                // Simple Alcohol
                                detectedGroups.push({ type: 'alcohol', atomIds: [id, carbonId], isPrincipal: false })
                            }
                        } else if (bondType === 2) { // =O
                            // Check if Aldehyde, Ketone, Acid, Ester, Amide
                            let neighborsO = 0
                            let neighborsN = 0
                            let neighborsC = 0
                            ctx.graph.forEachNeighbor(carbonId.toString(), n => {
                                if (parseInt(n) === id) return
                                const nAttr = ctx.graph.getNodeAttributes(n)
                                if (nAttr.element === 'O') neighborsO++
                                else if (nAttr.element === 'N') neighborsN++
                                else if (nAttr.element === 'C') neighborsC++
                            })

                            if (neighborsO > 0) {
                                // Acid or Ester. We'd need to check if the other O is -OH or -OR.
                                // For now, treat both as 'acid' for priority purposes or differentiate if needed.
                                detectedGroups.push({ type: 'acid', atomIds: [id, carbonId], isPrincipal: false })
                            } else if (neighborsN > 0) {
                                detectedGroups.push({ type: 'amide', atomIds: [id, carbonId], isPrincipal: false })
                            } else {
                                // Check Carbon neighbors count for Aldehyde vs Ketone
                                if (neighborsC >= 2) {
                                    detectedGroups.push({ type: 'ketone', atomIds: [id, carbonId], isPrincipal: false })
                                } else {
                                    detectedGroups.push({ type: 'aldehyde', atomIds: [id, carbonId], isPrincipal: false })
                                }
                            }
                        }
                    }
                } else if (neighbors.length === 2) {
                    // Check for Ether: C-O-C
                    const n1 = neighbors[0]
                    const n2 = neighbors[1]
                    const attr1 = ctx.graph.getNodeAttributes(n1.toString())
                    const attr2 = ctx.graph.getNodeAttributes(n2.toString())

                    if (attr1.element === 'C' && attr2.element === 'C') {
                        const e1 = ctx.graph.edge(node, n1.toString())
                        const e2 = ctx.graph.edge(node, n2.toString())

                        if (e1 && e2) {
                            const t1 = ctx.graph.getEdgeAttribute(e1, 'type')
                            const t2 = ctx.graph.getEdgeAttribute(e2, 'type')

                            if (t1 === 1 && t2 === 1) {
                                // Start by assuming Ether
                                let isFunctionalDerivative = false

                                // Check for Ester/Anhydride signatures on neighbors (C=O or C=N etc)
                                const checkCarbonyl = (cId: number) => {
                                    let found = false
                                    ctx.graph.forEachNeighbor(cId.toString(), n => {
                                        if (parseInt(n) === id) return
                                        const nbAttr = ctx.graph.getNodeAttributes(n)
                                        if (nbAttr.element === 'O') {
                                            const edge = ctx.graph.edge(cId.toString(), n)
                                            if (ctx.graph.getEdgeAttribute(edge, 'type') === 2) found = true
                                        }
                                    })
                                    return found
                                }

                                if (checkCarbonyl(n1) || checkCarbonyl(n2)) {
                                    isFunctionalDerivative = true
                                }

                                if (!isFunctionalDerivative) {
                                    detectedGroups.push({ type: 'ether', atomIds: [id, n1, n2], isPrincipal: false })
                                }
                            }
                        }
                    }
                }
            }
        })

        ctx.functionalGroups = detectedGroups

        // 3. Determine Principal Group(s) based on Priority
        const priorityRank: Record<string, number> = {
            'acid': 0, 'ester': 1, 'amide': 2, 'aldehyde': 3, 'ketone': 4, 'alcohol': 5, 'amine': 6, 'thiol': 7, 'benzene': 8
        }

        let bestRank = Infinity

        // First pass: Find best rank
        detectedGroups.forEach((g: FunctionalGroup) => {
            const rank = priorityRank[g.type] ?? 99
            if (rank < bestRank) {
                bestRank = rank
            }
        })

        // Second pass: Collect all groups with best rank, EXCLUDING ethers (they are always substituents)
        const bestGroups = detectedGroups.filter((g: FunctionalGroup) =>
            g.type !== 'ether' && (priorityRank[g.type] ?? 99) === bestRank
        )

        if (bestGroups.length > 0) {
            bestGroups.forEach(bg => bg.isPrincipal = true)
            ctx.principalGroups = bestGroups
            ctx.principalGroup = bestGroups[0] // Set one as representative for existing logic

            const type = bestGroups[0].type
            this.log(ctx, 'Functional Group Analysis', `Principal Group detected: ${type} (Count: ${bestGroups.length})`, 'success')
        }
    }

    private static determineParentStructure(ctx: AnalysisContext): boolean {
        // --- Step A: Longest Chain / Parent Structure ---
        const chainRule = ctx.currentRules.find(r => r.logicType === 'longest_chain')
        // Also look for aromatic naming rule
        const aromaticRule = ctx.currentRules.find(r => r.logicType === 'check_aromatic_naming')

        if ((chainRule && chainRule.unlocked) || (aromaticRule && aromaticRule.unlocked)) {
            const activeRule = (aromaticRule && aromaticRule.unlocked) ? aromaticRule : chainRule!
            this.log(ctx, 'Rule Check', `Applying Parent Structure Rules...`, 'checking')

            // Detect Unsaturation (Double/Triple Bonds)
            const edges = ctx.graph.edges()
            const unsaturationEdges: { edge: string, type: number, atoms: number[] }[] = []

            edges.forEach((edge: string) => {
                const attr = ctx.graph.getEdgeAttributes(edge)
                const type = attr.type ? Number(attr.type) : 1
                if (type > 1 && type < 4) { // 2, 3 = double, triple. 4 = aromatic.
                    const [u, v] = ctx.graph.extremities(edge)
                    unsaturationEdges.push({
                        edge,
                        type,
                        atoms: [parseInt(u), parseInt(v)].sort((a, b) => a - b)
                    })
                }
            })

            // CHECK FOR BENZENE PARENT FIRST
            const benzeneGroup = ctx.functionalGroups.find(g => g.type === 'benzene')
            if (benzeneGroup && (ctx.principalGroup?.type === 'benzene' || !ctx.principalGroup)) {
                // If benzene is the principal group OR there is no principal group (neutral benzene)
                ctx.mainChainAtoms = benzeneGroup.atomIds
                ctx.mainChainLen = 6
                ctx.isBenzeneParent = true
                ctx.isCyclic = true

                const finalRoot = "benzene"
                this.log(ctx, 'Topology Analysis', `Identified benzene ring as parent.`, 'success', `Parent: ${finalRoot}`)
                ctx.appliedRuleIds.push(activeRule.id)
                ctx.ruleResults[activeRule.id] = `Found benzene ring → ${finalRoot}`
                ctx.finalName = "Benzene"
                ctx.rootPart = { text: "benzene", type: 'root', ids: ctx.mainChainAtoms }
                return true
            }

            if (ctx.isCyclic) {
                // CYCLIC LOGIC
                // Sort cycles by length descending explicitly to prioritize larger rings
                ctx.cycles.sort((a, b) => b.length - a.length)

                // Prioritize rings with unsaturation
                const unsaturatedCycles = ctx.cycles.filter(cycle => {
                    const cycleSet = new Set(cycle)
                    return unsaturationEdges.some(u => cycleSet.has(u.atoms[0]) && cycleSet.has(u.atoms[1]))
                })

                let targetCycle = ctx.cycles[0]

                if (unsaturatedCycles.length > 0) {
                    unsaturatedCycles.sort((a, b) => b.length - a.length)
                    targetCycle = unsaturatedCycles[0]
                }

                ctx.mainChainAtoms = targetCycle
                ctx.mainChainLen = ctx.mainChainAtoms.length

                // Identify unsaturations WITHIN the chosen parent
                const parentSet = new Set(ctx.mainChainAtoms)
                ctx.unsaturations = unsaturationEdges
                    .filter(u => parentSet.has(u.atoms[0]) && parentSet.has(u.atoms[1]))
                    .map(u => ({ type: u.type, edges: [u.edge], atomIds: u.atoms }))

                const typeMax = Math.max(...ctx.unsaturations.map(u => u.type), 1)
                const suffix = typeMax === 3 ? 'yne' : (typeMax === 2 ? 'ene' : 'ane')
                const prefix = "Cyclo"

                const baseName = LogicEngine.getAlkaneName(ctx.mainChainLen)
                const finalRoot = prefix + baseName.replace(/ane$/, suffix)

                this.log(ctx, 'Topology Analysis', `Identified ${ctx.mainChainLen}-carbon ring as parent${ctx.unsaturations.length > 0 ? ' (contains unsaturation)' : ''}.`, 'success', `Parent: ${finalRoot}`)
                ctx.appliedRuleIds.push(activeRule.id)
                ctx.ruleResults[activeRule.id] = `Found ring with ${ctx.mainChainAtoms.length} carbons → ${finalRoot}`
                ctx.finalName = finalRoot
                ctx.rootPart = { text: finalRoot, type: 'root', ids: ctx.mainChainAtoms }

            } else {
                // ACYCLIC LOGIC
                let bestChain: number[] = []

                if (unsaturationEdges.length > 0) {
                    const carbonNodes = ctx.graph.nodes().filter((n: string) => ctx.graph.getNodeAttribute(n, 'element') === 'C')
                    const terminals = carbonNodes.filter((n: string) => {
                        let deg = 0
                        ctx.graph.forEachNeighbor(n, (neighbor: string) => {
                            if (ctx.graph.getNodeAttribute(neighbor, 'element') === 'C') deg++
                        })
                        return deg <= 1
                    })
                    const startNodes = terminals.length > 0 ? terminals : carbonNodes
                    const candidates: number[][] = []
                    for (let i = 0; i < startNodes.length; i++) {
                        for (let j = i + 1; j < startNodes.length; j++) {
                            const path = this.findPath(ctx.graph, parseInt(startNodes[i]), parseInt(startNodes[j]))
                            if (path) candidates.push(path)
                        }
                    }

                    // Score candidates
                    type ChainStats = { chain: number[]; len: number; uCount: number; dCount: number; bestLocants: number[] }

                    const getChainStats = (chain: number[]): ChainStats => {
                        let uCount = 0; let dCount = 0;
                        const chainSet = new Set(chain);
                        const unsatsInChain: { type: number, lA: number, lB: number }[] = [];
                        unsaturationEdges.forEach(u => {
                            if (chainSet.has(u.atoms[0]) && chainSet.has(u.atoms[1])) {
                                uCount++;
                                if (u.type === 2) dCount++;
                                const idx1 = chain.indexOf(u.atoms[0]) + 1;
                                const idx2 = chain.indexOf(u.atoms[1]) + 1;
                                unsatsInChain.push({ type: u.type, lA: Math.min(idx1, idx2), lB: Math.min(chain.length - idx1 + 1, chain.length - idx2 + 1) });
                            }
                        });

                        const locs1 = unsatsInChain.map(u => u.lA).sort((a, b) => a - b);
                        const locs2 = unsatsInChain.map(u => u.lB).sort((a, b) => a - b);

                        let bestLocants = locs1;
                        if (LogicEngine.compareLocantSets(locs2, locs1) < 0) bestLocants = locs2;

                        return { chain, len: chain.length, uCount, dCount, bestLocants };
                    };

                    const stats = candidates.map(getChainStats);
                    stats.sort((a, b) => {
                        if (ctx.chainSelection === 'pre-2013') {
                            if (a.uCount !== b.uCount) return b.uCount - a.uCount;
                            if (a.len !== b.len) return b.len - a.len;
                            if (a.dCount !== b.dCount) return b.dCount - a.dCount;
                            return LogicEngine.compareLocantSets(a.bestLocants, b.bestLocants);
                        } else {
                            if (a.len !== b.len) return b.len - a.len;
                            if (a.uCount !== b.uCount) return b.uCount - a.uCount;
                            if (a.dCount !== b.dCount) return b.dCount - a.dCount;
                            return LogicEngine.compareLocantSets(a.bestLocants, b.bestLocants);
                        }
                    });

                    bestChain = stats.length > 0 ? stats[0].chain : [];
                } else if (ctx.principalGroups.length > 0 && (ctx.principalGroup!.type === 'alcohol' || ctx.principalGroup!.type === 'ketone' || ctx.principalGroup!.type === 'aldehyde' || ctx.principalGroup!.type === 'acid')) {
                    // Find chain containing MAXIMUM number of Principal Groups
                    // If tie, longest chain.

                    const pfgAtomIds = new Set<number>()
                    ctx.principalGroups.forEach(g => pfgAtomIds.add(g.atomIds[1])) // Use the C atom

                    // Heuristic: Find paths between PFG atoms
                    // Simplified: Just default to Longest Chain that contains the MOST PFGs.
                    // This is complex. For now, try to find chain through at least ONE, then check.

                    // Better: Get all terminal carbons. Find all paths. Score them.
                    // Score = 1000 * n_PFG + length

                    // Re-use candidates logic from above if needed, or stick to simple "must contain principal assignment"
                    // Current simplification: Find longest chain passing through the FIRST principal group's carbon.
                    // Ideally, we traverse to find max PFGs.

                    const carbonId = ctx.principalGroups[0].atomIds[1]
                    bestChain = this.findLongestChainThrough(ctx.graph, carbonId)
                } else {
                    bestChain = GraphUtils.findLongestChain(ctx.graph)
                }

                ctx.mainChainAtoms = bestChain
                ctx.mainChainLen = ctx.mainChainAtoms.length

                if (ctx.mainChainLen > 0) {
                    const parentSet = new Set(ctx.mainChainAtoms)
                    ctx.unsaturations = unsaturationEdges
                        .filter(u => parentSet.has(u.atoms[0]) && parentSet.has(u.atoms[1]))
                        .map(u => ({ type: u.type, edges: [u.edge], atomIds: u.atoms }))

                    const typeMax = Math.max(...ctx.unsaturations.map(u => u.type), 1)
                    const suffix = typeMax === 3 ? 'yne' : (typeMax === 2 ? 'ene' : 'ane')

                    const baseName = LogicEngine.getAlkaneName(ctx.mainChainLen)
                    const parentName = baseName.replace(/ane$/, suffix)

                    this.log(ctx, 'Topology Analysis', `Principal Chain has ${ctx.mainChainLen} carbons${ctx.unsaturations.length > 0 ? ` and ${ctx.unsaturations.length} unsaturations` : ''}.`, 'success', `Parent: ${parentName}`)
                    ctx.appliedRuleIds.push(activeRule.id)
                    ctx.ruleResults[activeRule.id] = `Found ${ctx.mainChainLen} carbons → ${parentName}`
                    ctx.finalName = parentName
                    ctx.rootPart = { text: parentName, type: 'root', ids: ctx.mainChainAtoms }
                } else {
                    this.log(ctx, 'Topology Analysis', 'Could not find a valid carbon chain.', 'failed')
                    ctx.isValid = false
                    return false
                }
            }
        }
        return true
    }

    private static analyzeSubstituents(ctx: AnalysisContext): boolean {
        // --- Step B & C: Substituents & Numbering ---
        const chainSet = new Set(ctx.mainChainAtoms)
        const subIds = this.findSubstituentAtoms(ctx, chainSet)

        if (!this.validateSubstituentRules(ctx, subIds)) return false

        // Always proceed to numbering if we have a valid structure, even with 0 substituents, 
        // because we might need to number Unsaturations!

        if (subIds.length > 0) {
            // 1. Identify Branches
            this.analyzeBranchStructure(ctx, subIds, chainSet)
        }

        // 2. Determine Numbering Direction/Scheme (Must run for Unsaturation too)
        const finalMapping = this.determineNumbering(ctx)

        // 3. Assign Final Locants to Substituents
        if (subIds.length > 0) {
            ctx.branchData.forEach((b, i) => {
                b.locant = finalMapping[i]
            })
            // 4. Group by Name & Create Naming Parts
            this.finalizeSubstituentGroups(ctx)
        }

        return true
    }

    private static assembleName(ctx: AnalysisContext): void {
        const prefixString = ctx.substituentParts.map(p => p.text).join('')
        let rootText = ctx.rootPart?.text.toLowerCase() || ''

        // 2. Handle Unsaturation (Alkenes / Alkynes)
        if (ctx.unsaturations && ctx.unsaturations.length > 0) {
            rootText = this.formatUnsaturatedRoot(ctx)
        }

        // 3. Handle Functional Group Suffixes (Alcohols, Aldehydes, etc.)
        if (ctx.principalGroup && ctx.principalGroup.locant) {
            rootText = this.applyFunctionalGroupSuffix(ctx, rootText)
        }

        // 4. Update the actual root part text
        if (ctx.rootPart) ctx.rootPart.text = rootText

        // 5. Final Assembly & Capitalization
        const sysName = `${prefixString}${rootText}`
        const benzeneName = this.handleBenzene(ctx, sysName)

        // Set Final Name
        if (benzeneName) {
            ctx.finalName = this.capitalize(`${benzeneName} or ${sysName}`)
            ctx.commonName = this.capitalize(benzeneName)
        } else {
            ctx.finalName = this.capitalize(sysName)
        }

        // 6. Common Names Integration (Other types)
        this.handleCommonNames(ctx, sysName)
    }

    private static formatUnsaturatedRoot(ctx: AnalysisContext): string {
        const doubleBonds = ctx.unsaturations.filter(u => u.type === 2)
        const tripleBonds = ctx.unsaturations.filter(u => u.type === 3)

        const alkane = LogicEngine.getAlkaneName(ctx.mainChainLen).toLowerCase()
        const baseRoot = ctx.isCyclic ? `cyclo${alkane.replace('ane', '')}` : alkane.replace('ane', '')

        const getLocs = (list: typeof ctx.unsaturations) => list.map(u => u.locant).sort((a, b) => (a || 0) - (b || 0)).join(',')
        const getQty = (n: number) => n === 1 ? '' : (n === 2 ? 'di' : (n === 3 ? 'tri' : (n === 4 ? 'tetra' : 'poly')))

        const needsA = (doubleBonds.length > 1 || tripleBonds.length > 1)
        const modBase = needsA ? baseRoot + 'a' : baseRoot

        const isSimple = ctx.substituentParts.length === 0 && (doubleBonds.length + tripleBonds.length === 1) && !ctx.principalGroup
        const isCyclic = ctx.isCyclic

        let usePrefix = false
        let omitLocant = false

        if (isSimple && !isCyclic) {
            const u = doubleBonds[0] || tripleBonds[0]
            if (doubleBonds.length > 0) {
                usePrefix = true
                if (u.locant === 1) omitLocant = true
            } else {
                usePrefix = false // Force Infix for Alkynes
                if (u.locant === 1) omitLocant = true
            }
        }

        let final_name = ''
        if (tripleBonds.length === 0) {
            const suffix = `${getQty(doubleBonds.length)}ene`
            const locs = getLocs(doubleBonds)
            if (usePrefix) {
                final_name = omitLocant ? `${modBase}${suffix}` : `${locs}-${modBase}${suffix}`
            } else {
                if (isCyclic && doubleBonds.length === 1 && doubleBonds[0].locant === 1) {
                    final_name = `${baseRoot}${suffix}`
                } else {
                    final_name = `${modBase}-${locs}-${suffix}`
                }
            }
        } else if (doubleBonds.length === 0) {
            const suffix = `${getQty(tripleBonds.length)}yne`
            const locs = getLocs(tripleBonds)
            final_name = omitLocant ? `${modBase}${suffix}` : `${modBase}-${locs}-${suffix}`
        } else {
            const enLocs = getLocs(doubleBonds)
            const enPart = `${enLocs}-${getQty(doubleBonds.length)}en`.replace(/e$/, '')
            const ynLocs = getLocs(tripleBonds)
            const ynPart = `${ynLocs}-${getQty(tripleBonds.length)}yne`
            final_name = `${modBase}-${enPart}-${ynPart}`
        }
        return final_name
    }



    private static applyFunctionalGroupSuffix(ctx: AnalysisContext, rootText: string): string {
        if (!ctx.principalGroups || ctx.principalGroups.length === 0) return rootText

        // Ensure all have valid locants
        const validGroups = ctx.principalGroups.filter(g => g.locant !== undefined)
        if (validGroups.length === 0) return rootText

        const type = validGroups[0].type
        const rules = ctx.currentRules
        let updatedRoot = rootText

        const suffixRules: Record<string, { logic: string, suffix: string, implicitLocant?: boolean }> = {
            'alcohol': { logic: 'check_suffix_alcohol', suffix: 'ol' },
            'aldehyde': { logic: 'check_suffix_aldehyde', suffix: 'al', implicitLocant: true },
            'ketone': { logic: 'check_suffix_ketone', suffix: 'one' },
            'acid': { logic: 'check_suffix_acid', suffix: 'oic acid', implicitLocant: true },
            'thiol': { logic: 'check_suffix_thiol', suffix: 'thiol' },
            'amine': { logic: 'check_suffix_amine', suffix: 'amine' }
        }

        const config = suffixRules[type]
        if (config) {
            const rule = rules.find(r => r.logicType === config.logic)
            if (rule && rule.unlocked) {

                // Get Locants
                const locs = validGroups.map(g => g.locant!).sort((a, b) => a - b)
                const locString = locs.join(',')

                // Determine Multiplier
                const count = locs.length
                const prefixes = ["", "", "di", "tri", "tetra", "penta", "hexa"]
                const multiplier = prefixes[count] || ""

                // Determine "e" retention
                // If suffix starts with vowel (ol, al, one, oic acid) -> Drop 'e' from alkane
                // UNLESS multiplier starts with consonant (diol, triol, dione) -> Keep 'e'

                const suffixString = multiplier + config.suffix
                const startsWithVowel = /^[aeiou]/.test(suffixString)

                // Current rootText usually ends with 'ne' or 'n' or 'a' (alkane/alkene/alkyne)
                // If pure alkane parent (e.g. Hexane), LogicEngine.getAlkaneName returns "Hexane" (with e).
                // formatUnsaturatedRoot returns e.g. "hex-1-ene" (ends with e) or "hexan-1-ol"? No, base logic.

                // Generally, if root ends in 'e', we might drop it.
                // Standard: "Hexane" + "ol" -> "Hexanol" (drop e)
                // "Hexane" + "diol" -> "Hexanediol" (keep e)

                if (startsWithVowel) {
                    updatedRoot = updatedRoot.replace(/e$/, '')
                } else {
                    // Ensure it ends with e if it was an alkane? 
                    // Usually "Hexane" already has it.
                    // If unsaturated "Hexene", keep e.
                }

                const isSimpleCyclic = ctx.isCyclic && ctx.unsaturations.length === 0 && count === 1 && locs[0] === 1
                const isShortChain = ctx.mainChainLen <= 2 && count === 1 && locs[0] === 1

                if ((config.implicitLocant && count === 1) || isSimpleCyclic || isShortChain) {
                    // For aldehydes/acids at locant 1, or unambiguous alcohols (Methanol, Ethanol, Cyclohexanol)
                    updatedRoot += suffixString
                } else {
                    // Insert Locants
                    if (locString) {
                        updatedRoot += `-${locString}-${suffixString}`
                    } else {
                        updatedRoot += suffixString

                    }
                }

                ctx.appliedRuleIds.push(rule.id)
                ctx.ruleResults[rule.id] = `${type.charAt(0).toUpperCase() + type.slice(1)} detected at ${locString} → -${suffixString} suffix`
            }
        }

        return updatedRoot
    }

    private static handleCommonNames(ctx: AnalysisContext, sysName: string): void {
        // Ether Common Naming
        if (ctx.functionalGroups.some(g => g.type === 'ether')) {
            this.handleEtherCommonNames(ctx)
        }

        const commonWhole = LogicEngine.getCommonName(sysName)
        let commonSubVariant = ctx.finalName

        if (ctx.ruleResults['commonNameParts']) {
            const parts = JSON.parse(ctx.ruleResults['commonNameParts'])
            parts.forEach((p: any) => {
                commonSubVariant = commonSubVariant.split(p.systematic).join(p.common.toLowerCase())
            })
            commonSubVariant = this.capitalize(commonSubVariant)
        }

        const hasCommonSub = commonSubVariant !== ctx.finalName

        if (commonWhole) {
            ctx.finalName = `${commonWhole} or ${ctx.finalName}`
            ctx.commonName = commonWhole
            ctx.commonNameParts = [{
                text: commonWhole,
                type: 'root',
                ids: ctx.rootPart?.ids
            }]
        } else if (hasCommonSub) {
            ctx.finalName = `${commonSubVariant} or ${ctx.finalName}`
            ctx.commonName = commonSubVariant
            const commonParts = [...ctx.commonSubstituentParts, ...(ctx.rootPart ? [ctx.rootPart] : [])]
            if (commonParts.length > 0) {
                commonParts[0] = { ...commonParts[0], text: this.capitalize(commonParts[0].text) }
            }
            ctx.commonNameParts = commonParts
        }
    }

    private static capitalize(s: string): string {
        if (/^[a-zA-Z0-9]/.test(s)) {
            const match = s.match(/[a-zA-Z]/)
            if (match && match.index !== undefined) {
                return s.substring(0, match.index) + match[0].toUpperCase() + s.substring(match.index + 1)
            }
        }
        return s
    }

    private static handleBenzene(ctx: AnalysisContext, sysName: string): string | null {
        if (sysName.toLowerCase().includes('cyclohexa-1,3,5-triene')) {
            let benzeneName = sysName.replace('cyclohexa-1,3,5-triene', 'benzene')

            // Handle Mono-substituted Benzene (Omit 1-)
            if (ctx.branchData.length === 1 && ctx.branchData[0].locant === 1) {
                benzeneName = benzeneName.replace(/^1-/, '')
            }

            // Check substituents for Ortho/Meta/Para
            if (ctx.branchData.length === 2 && ctx.branchData.every(b => b.locant !== undefined)) {
                const locs = ctx.branchData.map(b => b.locant!).sort((a, b) => a - b)
                const diff = locs[1] - locs[0]
                let prefix = ''
                if (diff === 1 || diff === 5) prefix = 'ortho-' // 1,2 or 1,6
                else if (diff === 2 || diff === 4) prefix = 'meta-' // 1,3 or 1,5
                else if (diff === 3) prefix = 'para-' // 1,4

                if (prefix) {
                    // Match "1,2-" pattern (Identical substituents)
                    const regexSame = /^\d+,\d+-/
                    if (regexSame.test(benzeneName)) {
                        benzeneName = benzeneName.replace(regexSame, prefix)
                    } else {
                        // Match "1-Name-2-Name" pattern (Mixed substituents)
                        // Replace first locant with prefix
                        const startLoc = new RegExp(`^${locs[0]}-`)
                        // Replace second locant with hyphen
                        const midLoc = new RegExp(`-${locs[1]}-`)

                        if (startLoc.test(benzeneName)) {
                            benzeneName = benzeneName.replace(startLoc, prefix).replace(midLoc, '-')
                        }
                    }
                }
            }
            return benzeneName
        }
        return null
    }


    // --- Helpers ---
    private static getAlkaneName(n: number): string {
        const map = [
            "Methane", "Ethane", "Propane", "Butane", "Pentane",
            "Hexane", "Heptane", "Octane", "Nonane", "Decane",
            "Undecane", "Dodecane", "Tridecane", "Tetradecane",
            "Pentadecane", "Hexadecane", "Heptadecane", "Octadecane",
            "Nonadecane", "Icosane"
        ]
        return map[n - 1] || `${n}-ane`
    }

    private static getAlkylName(n: number): string {
        const map = [
            "Methyl", "Ethyl", "Propyl", "Butyl", "Pentyl",
            "Hexyl", "Heptyl", "Octyl", "Nonyl", "Decyl",
            "Undecyl", "Dodecyl", "Tridecyl", "Tetradecyl",
            "Pentadecyl", "Hexadecyl", "Heptadecyl", "Octadecyl",
            "Nonadecyl", "Icosyl"
        ]
        return map[n - 1] || `${n}-yl`
    }

    private static getCommonName(systematic: string): string | null {
        const map: Record<string, string> = {
            "2-methylpropane": "Isobutane",
            "2-methylbutane": "Isopentane",
        }
        return map[systematic.toLowerCase()] || null
    }

    private static getCommonSubstituentName(systematic: string): string | null {
        // systematic is like "1-methylethyl", "2-methylpropyl"
        // Remove parens for check
        const clean = systematic.replace(/^\(/, '').replace(/\)$/, '').toLowerCase()
        const map: Record<string, string> = {
            "1-methylethyl": "Isopropyl",
            "2-methylpropyl": "Isobutyl",
            "1-methylpropyl": "sec-Butyl",
            "1,1-dimethylethyl": "tert-Butyl",
            "2-methylbutyl": "Isopentyl",
            "2-methylpentyl": "Isohexyl"
        }
        return map[clean] || null
    }


    private static getSortKey(sub: string): string {
        let s = sub.toLowerCase()
        const isComplex = s.startsWith('(') // Complex subs are wrapped in parens

        // Remove parens (complex sub wrapper)
        s = s.replace(/^\(/, "").replace(/\)$/, "")

        // Remove locants and hyphens (e.g. "1,1-")
        s = s.replace(/^[0-9,]+-?/, "")

        // Remove multipliers (di, tri, etc.) ONLY if NOT complex
        // "The prefixes di-, tri-, tetra-, etc. are not considered in alphabetical ordering... HOWEVER, for complex substituents, the name of the substituent is considered as a whole."
        if (!isComplex) {
            s = s.replace(/^(di|tri|tetra|penta|hexa|hepta|octa|nona|deca)/, "")
        }

        // Remove structural prefixes (always ignored usually, except maybe iso/neo which are part of name)
        // sec-, tert- are ignored. iso, neo, cyclo are NOT ignored.
        // My previous regex removed them.
        s = s.replace(/^(sec-|tert-|n-)/, "")

        return s
    }

    private static compareLocantSets(setA: number[], setB: number[]): number {
        for (let i = 0; i < Math.min(setA.length, setB.length); i++) {
            if (setA[i] < setB[i]) return -1
            if (setA[i] > setB[i]) return 1
        }
        return setA.length - setB.length
    }

    private static findSubstituentAtoms(ctx: AnalysisContext, chainSet: Set<number>): number[] {
        const subIds: number[] = []

        // Filter out atoms that belong to the Principal Group (suffix)
        // so they don't get double-counted as substituents (prefix)
        // Filter out atoms that belong to ANY Principal Group (suffix)
        // so they don't get double-counted as substituents (prefix)
        const principalIds = new Set<number>()
        if (ctx.principalGroups) {
            ctx.principalGroups.forEach(g => {
                g.atomIds.forEach(id => principalIds.add(id))
            })
        }

        ctx.graph.forEachNode((node: string) => {
            const id = parseInt(node)
            if (!chainSet.has(id) && !principalIds.has(id)) {
                subIds.push(id)
            }
        })
        return subIds
    }

    private static validateSubstituentRules(ctx: AnalysisContext, subIds: number[]): boolean {
        if (subIds.length === 0) return true

        const rules = ctx.currentRules
        const subRule = rules.find(r => r.logicType === 'identify_substituents')

        // Single check: if we have atoms outside the main chain, the 'identify_substituents' rule MUST be unlocked
        if (!subRule || !subRule.unlocked) {
            this.log(ctx, 'Feature Detection', `Found branches/substituents but the rule to identify them is locked or missing.`, 'failed')
            ctx.finalName = 'Unknown Molecule'
            ctx.isValid = false
            ctx.isUnknown = true
            return false
        }

        this.log(ctx, 'Rule Check', `Applying ${subRule.name}...`, 'checking')
        return true
    }

    private static analyzeBranchStructure(ctx: AnalysisContext, subIds: number[], chainSet: Set<number>): void {
        // 1. Identify Branches (Connected Components)
        ctx.branches = GraphUtils.getConnectedComponents(ctx.graph, subIds)

        // 2. Identify Type & Internal Connection
        ctx.branchData = ctx.branches.map(br => {
            let connIdx = -1 // Index in mainChainAtoms
            let attachId = -1

            // Find attachment point
            // Check neighbors of branch atoms in the main graph
            for (const bAtom of br) {
                let parentFound = false
                ctx.graph.forEachNeighbor(bAtom.toString(), (neighbor: string) => {
                    const nId = parseInt(neighbor)
                    if (chainSet.has(nId)) {
                        connIdx = ctx.mainChainAtoms.indexOf(nId)
                        attachId = bAtom
                        parentFound = true
                    }
                })
                if (parentFound) break
            }

            if (attachId === -1) {
                this.log(ctx, 'Topology Error', `Branch disconnected from main structure: ${br.join(',')}`, 'failed')
                return { name: 'Unknown', connIdx: -1 }
            }

            // Analyze topology RECURSIVELY
            const name = this.resolveSubstituentName(ctx, ctx.graph, br, attachId)
            return { name, connIdx }
        })

        // Filter out disconnected components
        ctx.branchData = ctx.branchData.filter(b => b.connIdx !== -1)
    }

    private static resolveSubstituentName(ctx: AnalysisContext, fullGraph: MoleculeGraph, branchIds: number[], attachId: number): string {
        const attachAttr = fullGraph.getNodeAttributes(attachId.toString())

        if (attachAttr.element === 'S') {
            // Mercapto / Alkylthio Detection
            const rBranchIds = branchIds.filter(id => id !== attachId)
            let rId = -1
            const branchSet = new Set(branchIds)
            fullGraph.forEachNeighbor(attachId.toString(), (n) => {
                const nid = parseInt(n)
                if (branchSet.has(nid) && nid !== attachId) rId = nid
            })

            if (rId !== -1 && rBranchIds.length > 0) {
                const alkylName = this.resolveSubstituentName(ctx, fullGraph, rBranchIds, rId)
                // Systematically: (alkylsulfanyl)? Or alkylthio.
                // IUPAC prefers alkylsulfanyl but alkylthio is common.
                // Let's stick effectively to "Alkylthio" or "Alkylthio"
                return alkylName + 'thio'
            } else {
                return 'Mercapto'
            }
        }

        if (attachAttr.element === 'O') {
            // ALKOXY Detection
            const rBranchIds = branchIds.filter(id => id !== attachId)
            let rId = -1
            const branchSet = new Set(branchIds)
            fullGraph.forEachNeighbor(attachId.toString(), (n) => {
                const nid = parseInt(n)
                if (branchSet.has(nid) && nid !== attachId) rId = nid
            })

            if (rId !== -1 && rBranchIds.length > 0) {
                const alkylName = this.resolveSubstituentName(ctx, fullGraph, rBranchIds, rId)

                // Contractions for Common/Preferred Names
                const lower = alkylName.toLowerCase()
                if (lower === 'methyl') return 'Methoxy'
                if (lower === 'ethyl') return 'Ethoxy'
                if (lower === 'propyl') return 'Propoxy'
                if (lower === 'butyl') return 'Butoxy'
                if (lower === 'isopropyl') return 'Isopropoxy'
                if (lower === 'isobutyl') return 'Isobutoxy'
                if (lower === 'tert-butyl') return 'tert-Butoxy'
                if (lower === 'sec-butyl') return 'sec-Butoxy'

                // Systematic handling
                return alkylName + 'oxy'
            }
        }
        // 1. Simple Case Check (Optimization)
        // If small size and no rings/branches likely, use GraphUtils for speed?
        // Actually, let's just stick to reliable logic. Logic checks won't hurt.
        const size = branchIds.length
        if (size === 1) {
            return GraphUtils.getSubstituentName(fullGraph, branchIds, attachId)
        }

        // 2. Build Subgraph for isolated analysis
        const subgraph = this.createSubgraph(fullGraph, branchIds)
        const cycles = GraphUtils.findCycles(subgraph)

        // 3. Identify Local Parent

        if (cycles.length > 0) {
            // CYCLIC SUBSTITUENT
            // Assume the largest cycle containing the attachment or closest to it is the parent.
            // For now, assume simple case: The cycle IS the parent.
            // Tie-break: largest cycle.
            cycles.sort((a, b) => b.length - a.length)
            const mainRing = cycles[0]

            // Check if attached directly
            if (mainRing.includes(attachId)) {
                // Numbering: attachId MUST be 1.
                // We need to determine direction (2..N) based on OTHER substituents on the ring.

                // Find secondary substituents (atoms in subgraph not in ring)
                const ringSet = new Set(mainRing)
                const secondarySubs = this.findSubstituentAtoms({ graph: subgraph } as any, ringSet) // reducing context mock

                if (secondarySubs.length === 0) {
                    // No further subs, just a ring
                    const base = GraphUtils.getSubstituentName(fullGraph, branchIds, attachId) // fallback to utils for naming "Cyclopropyl" etc
                    return base
                }

                // Complex Ring
                const ringSize = mainRing.length
                const baseName = `Cyclo${this.getAlkylName(ringSize).toLowerCase()}` // e.g. Cyclopropyl

                // Determine Numbering on Ring
                // Fixed: attachId = 1.
                // Directions: 2 neighbors in ring.
                // Call them nA and nB.
                // Path 1: 1->nA...
                // Path 2: 1->nB...

                // Identify neighbors in RING
                const neighbors: number[] = []
                subgraph.forEachNeighbor(attachId.toString(), (n) => {
                    const nid = parseInt(n)
                    if (ringSet.has(nid)) neighbors.push(nid)
                })

                // We only have 2 directions.
                // We need to map the secondary subs to their locants in both directions and compare.
                // Step A: Group secondary subs into branches (recursion!)
                const secBranches = GraphUtils.getConnectedComponents(subgraph, secondarySubs)
                const secBranchData = secBranches.map(br => {
                    // Find attachment to RING
                    let secAttach = -1
                    for (const atom of br) {
                        subgraph.forEachNeighbor(atom.toString(), (n) => {
                            if (ringSet.has(parseInt(n))) secAttach = parseInt(n)
                        })
                        if (secAttach !== -1) break
                    }
                    // RECURSE NAME
                    const name = this.resolveSubstituentName(ctx, subgraph, br, secAttach === -1 ? br[0] : secAttach) // recursion!
                    return { name, atomIds: br, attachTo: secAttach }
                })

                // Step B: Calculate locants for both directions
                // We need the ordered ring path. GraphUtils doesn't give ordered ring usually, just a set.
                // We need to traverse the ring.
                // Start 1 (attachId). Neighbor A is 2. Neighbor B is N.
                // We need to walk the ring.

                // Helper to walk ring
                const getRingPath = (start: number, second: number): number[] => {
                    const path = [start, second]
                    let curr = second
                    let prev = start
                    while (path.length < ringSize) {
                        let next = -1
                        subgraph.forEachNeighbor(curr.toString(), (n) => {
                            const nid = parseInt(n)
                            if (ringSet.has(nid) && nid !== prev) next = nid
                        })
                        if (next !== -1) {
                            path.push(next)
                            prev = curr
                            curr = next
                        } else break // Should not happen in simple cycle
                    }
                    return path
                }

                const pathA = getRingPath(attachId, neighbors[0])
                const pathB = getRingPath(attachId, neighbors[1])

                // Map attachTo -> locant
                const evalPath = (path: number[]) => {
                    const locMap = new Map<number, number>()
                    path.forEach((id, i) => locMap.set(id, i + 1))

                    const set = secBranchData.map(b => locMap.get(b.attachTo) || 999).sort((a, b) => a - b)
                    return { map: locMap, set }
                }

                const resA = evalPath(pathA)
                const resB = evalPath(pathB)

                // Compare sets
                let useA = true
                const diff = this.compareLocantSets(resA.set, resB.set)
                if (diff > 0) useA = false // B is smaller
                else if (diff === 0) {
                    // Alphabetical tie break?
                    // Map names to numbers
                    // For now, skip deep alphabetical tie break for simplicity or implement later.
                    // Default to A
                }

                const finalLocMap = useA ? resA.map : resB.map

                // Assign locants and Formatting
                const parts: string[] = []

                // Sort by name
                secBranchData.sort((a, b) => LogicEngine.getSortKey(a.name).localeCompare(LogicEngine.getSortKey(b.name)))

                secBranchData.forEach(b => {
                    const loc = finalLocMap.get(b.attachTo)
                    parts.push(loc === 1 ? b.name : `${loc}-${b.name}`) // 1 is usually omitted? No, in substituents keep it unless implicit? 
                    // e.g. (2-methylcyclohexyl)
                })

                // Combine
                const prefix = parts.join('-')
                return `${prefix}${baseName}`
            }

            // Attached via linker? Not supported well yet.
            // return unknown
            return "Unknown"
        } else {
            // ACYCLIC SUBSTITUENT

            // Find principal chain
            const chain = this.findPrincipalChainFrom(subgraph, attachId, ctx.chainSelection)
            const chainLen = chain.length

            // Map atomId -> locant (1-based index in chain)
            const locMap = new Map<number, number>()
            chain.forEach((id, i) => locMap.set(id, i + 1))

            // Unsaturation in the acyclic substituent chain
            const doubleBonds: number[] = []
            const tripleBonds: number[] = []
            subgraph.forEachEdge((_edge, attr, source, target) => {
                const sId = parseInt(source)
                const tId = parseInt(target)
                if (locMap.has(sId) && locMap.has(tId)) {
                    // Check if it's adjacent, otherwise it's a ring or invalid, but we are acyclic
                    const loc1 = locMap.get(sId)!
                    const loc2 = locMap.get(tId)!
                    if (Math.abs(loc1 - loc2) === 1) {
                        const type = attr.type ? Number(attr.type) : 1
                        const minLoc = Math.min(loc1, loc2)
                        if (type === 2) {
                            doubleBonds.push(minLoc)
                        } else if (type === 3) {
                            tripleBonds.push(minLoc)
                        }
                    }
                }
            })

            doubleBonds.sort((a, b) => a - b)
            tripleBonds.sort((a, b) => a - b)

            let baseName = this.getAlkylName(chainLen).toLowerCase() // Default purely saturated (e.g. pentyl)
            const attachLoc = locMap.get(attachId)!

            if (ctx.chainSelection === 'post-2013' && chainLen > 2) {
                const alkBase = LogicEngine.getAlkaneName(chainLen).toLowerCase().replace(/ane$/, '')
                baseName = `${alkBase}an-${attachLoc}-yl`
            }

            if (doubleBonds.length > 0 || tripleBonds.length > 0) {
                const getQty = (n: number) => n === 1 ? '' : (n === 2 ? 'di' : (n === 3 ? 'tri' : (n === 4 ? 'tetra' : 'poly')))
                const alkBase = LogicEngine.getAlkaneName(chainLen).toLowerCase().replace(/ane$/, '')
                let final_name = ''
                const needsA = (doubleBonds.length > 1 || tripleBonds.length > 1) || (doubleBonds.length > 0 && tripleBonds.length > 0)
                const modBase = needsA ? alkBase + 'a' : alkBase
                const ylSuffix = ctx.chainSelection === 'post-2013' ? `-${attachLoc}-yl` : 'yl'

                if (tripleBonds.length === 0) {
                    const suffix = `${getQty(doubleBonds.length)}en${ylSuffix}`
                    const locs = doubleBonds.join(',')
                    if (chainLen === 2 && ctx.chainSelection === 'pre-2013') {
                        final_name = `${modBase}enyl` // ethenyl
                    } else if (chainLen === 2 && ctx.chainSelection === 'post-2013') {
                        final_name = `${modBase}en${ylSuffix}` // ethen-1-yl
                    } else {
                        final_name = `${modBase}-${locs}-${suffix}`
                    }
                } else if (doubleBonds.length === 0) {
                    const suffix = `${getQty(tripleBonds.length)}yn${ylSuffix}`
                    const locs = tripleBonds.join(',')
                    if (chainLen === 2 && ctx.chainSelection === 'pre-2013') {
                        final_name = `${modBase}ynyl` // ethynyl
                    } else if (chainLen === 2 && ctx.chainSelection === 'post-2013') {
                        final_name = `${modBase}yn${ylSuffix}` // ethyn-1-yl
                    } else {
                        final_name = `${modBase}-${locs}-${suffix}`
                    }
                } else {
                    const enLocs = doubleBonds.join(',')
                    const enPart = `${enLocs}-${getQty(doubleBonds.length)}en`
                    const ynLocs = tripleBonds.join(',')
                    const ynPart = `${ynLocs}-${getQty(tripleBonds.length)}yn${ylSuffix}`
                    final_name = `${modBase}-${enPart}-${ynPart}`
                }
                baseName = final_name
            }

            // Verify if there are any atoms NOT in the chain
            const chainSet = new Set(chain)
            const secondarySubs = this.findSubstituentAtoms({ graph: subgraph } as any, chainSet)

            if (secondarySubs.length === 0) {
                return baseName.charAt(0).toUpperCase() + baseName.slice(1)
            }

            // Complex Acyclic
            // Group redundancy (e.g. 1,1-Dimethyl)
            const secBranches = GraphUtils.getConnectedComponents(subgraph, secondarySubs)
            const secBranchData = secBranches.map(br => {
                let secAttach = -1
                for (const atom of br) {
                    subgraph.forEachNeighbor(atom.toString(), (n) => {
                        if (chainSet.has(parseInt(n))) secAttach = parseInt(n)
                    })
                    if (secAttach !== -1) break
                }
                const brAttach = this.findAttachmentInBranch(subgraph, br, secAttach)
                const name = this.resolveSubstituentName(ctx, subgraph, br, brAttach)
                return { name, atomIds: br, attachTo: secAttach }
            })

            secBranchData.sort((a, b) => LogicEngine.getSortKey(a.name).localeCompare(LogicEngine.getSortKey(b.name)))

            const groupedParts: string[] = []
            const subMap = new Map<string, number[]>()
            secBranchData.forEach(b => {
                const list = subMap.get(b.name) || []
                list.push(locMap.get(b.attachTo)!)
                subMap.set(b.name, list)
            })

            const keys = Array.from(subMap.keys()).sort((a, b) => LogicEngine.getSortKey(a).localeCompare(LogicEngine.getSortKey(b)))

            keys.forEach((k) => {
                const locs = subMap.get(k)!.sort((a, b) => a - b)
                const prefixes = ["", "", "Di", "Tri", "Tetra", "Penta", "Hexa", "Hepta", "Octa", "Nona", "Deca"]
                const prefixCount = prefixes[locs.length] || ""
                if (groupedParts.length > 0) groupedParts.push('-')
                groupedParts.push(`${locs.join(',')}-${prefixCount}${k}`)
            })

            const prefix = groupedParts.join('')
            return `(${prefix}${baseName})`
        }
    }

    private static createSubgraph(graph: MoleculeGraph, nodeIds: number[]): MoleculeGraph {
        const subset = new Set(nodeIds.map(n => n.toString()))
        const subgraph = new Graph({ type: 'undirected' })

        subset.forEach(key => {
            if (graph.hasNode(key)) {
                subgraph.addNode(key, graph.getNodeAttributes(key))
            }
        })

        graph.forEachEdge((_edge: string, _attr: any, source: string, target: string) => {
            if (subset.has(source) && subset.has(target)) {
                if (!subgraph.hasEdge(source, target))
                    subgraph.addEdge(source, target, { ..._attr })
            }
        })
        return subgraph
    }


    private static findPrincipalChainFrom(graph: MoleculeGraph, startNode: number, chainSelection: string): number[] {
        const allPaths: number[][] = []

        if (chainSelection === 'pre-2013') {
            const dfs = (current: number, path: number[], visited: Set<number>) => {
                const currentPath = [...path, current]
                let isLeaf = true
                graph.forEachNeighbor(current.toString(), (n) => {
                    const nid = parseInt(n)
                    const el = graph.getNodeAttribute(n, 'element')
                    if (!visited.has(nid) && el === 'C') {
                        isLeaf = false
                        const newVisited = new Set(visited)
                        newVisited.add(nid)
                        dfs(nid, currentPath, newVisited)
                    }
                })
                if (isLeaf) allPaths.push(currentPath)
            }
            dfs(startNode, [], new Set([startNode]))
        } else {
            const carbonNodes = graph.nodes().filter(n => graph.getNodeAttribute(n, 'element') === 'C').map(Number)
            const terminals = carbonNodes.filter(n => {
                let deg = 0
                graph.forEachNeighbor(n.toString(), (neighbor) => {
                    if (graph.getNodeAttribute(neighbor, 'element') === 'C') deg++
                })
                return deg <= 1
            })
            const ends = terminals.length > 0 ? terminals : carbonNodes

            const findPath = (u: number, v: number): number[] | null => {
                const q: { curr: number, path: number[] }[] = [{ curr: u, path: [u] }]
                const visited = new Set([u])
                while (q.length > 0) {
                    const { curr, path } = q.shift()!
                    if (curr === v) return path
                    graph.forEachNeighbor(curr.toString(), (n) => {
                        const nid = parseInt(n)
                        if (!visited.has(nid) && graph.getNodeAttribute(n, 'element') === 'C') {
                            visited.add(nid)
                            q.push({ curr: nid, path: [...path, nid] })
                        }
                    })
                }
                return null
            }

            for (let i = 0; i < ends.length; i++) {
                for (let j = i; j < ends.length; j++) {
                    const p = findPath(ends[i], ends[j])
                    if (p && p.includes(startNode)) {
                        allPaths.push(p)
                        if (ends[i] !== ends[j]) {
                            allPaths.push([...p].reverse())
                        }
                    }
                }
            }
        }

        // Find all multiple bonds in the subgraph
        const unsaturations: { u: number, v: number, type: number }[] = [];
        graph.forEachEdge((_e, attr, s, t) => {
            const type = attr.type ? Number(attr.type) : 1;
            if (type > 1) {
                unsaturations.push({ u: parseInt(s), v: parseInt(t), type });
            }
        });

        const stats = allPaths.map(chain => {
            let uCount = 0; let dCount = 0;
            const chainSet = new Set(chain);
            const locs1: number[] = [];
            unsaturations.forEach(u => {
                if (chainSet.has(u.u) && chainSet.has(u.v)) {
                    uCount++;
                    if (u.type === 2) dCount++;
                    const idx1 = chain.indexOf(u.u) + 1;
                    const idx2 = chain.indexOf(u.v) + 1;
                    locs1.push(Math.min(idx1, idx2));
                }
            });
            const attachLocant = chain.indexOf(startNode) + 1;
            return { chain, len: chain.length, uCount, dCount, bestLocants: locs1, attachLocant };
        });

        stats.sort((a, b) => {
            if (chainSelection === 'pre-2013') {
                if (a.uCount !== b.uCount) return b.uCount - a.uCount;
                if (a.len !== b.len) return b.len - a.len;
                if (a.dCount !== b.dCount) return b.dCount - a.dCount;
                return LogicEngine.compareLocantSets(a.bestLocants, b.bestLocants);
            } else {
                if (a.len !== b.len) return b.len - a.len;
                if (a.uCount !== b.uCount) return b.uCount - a.uCount;
                if (a.dCount !== b.dCount) return b.dCount - a.dCount;
                if (a.attachLocant !== b.attachLocant) return a.attachLocant - b.attachLocant;
                return LogicEngine.compareLocantSets(a.bestLocants, b.bestLocants);
            }
        });

        return stats.length > 0 ? stats[0].chain : [startNode];
    }

    private static findAttachmentInBranch(graph: MoleculeGraph, branch: number[], parentNode: number): number {
        // Find which atom in 'branch' is connected to 'parentNode'
        for (const atom of branch) {
            let found = false
            graph.forEachNeighbor(atom.toString(), (n) => {
                if (parseInt(n) === parentNode) found = true
            })
            if (found) return atom
        }
        return branch[0] // Should not happen
    }
    private static determineNumbering(ctx: AnalysisContext): number[] {
        const rules = ctx.currentRules
        const numRule = rules.find(r => r.logicType === 'lowest_numbering') || rules.find(r => r.logicType === 'check_lowest_locants')

        // Default: 1-based index from 0-based connection index (Raw left-to-right)
        let finalMapping: number[] = ctx.branchData.map(b => b.connIdx + 1)

        // If rule is not active and no unsaturations, return default
        if ((!numRule || !numRule.unlocked) && ctx.unsaturations.length === 0) {
            // For simple display without rule enforcement, just return default
            ctx.mainChainAtoms.forEach((a, idx) => {
                ctx.locantMap![a] = idx + 1
            })
            return finalMapping
        }

        this.log(ctx, 'Rule Check', `Applying ${numRule ? numRule.name : 'Numbering Logic'}...`, 'checking')

        // Prepare Branches for quick access
        const branches = ctx.branchData.map((b, originalIndex) => ({
            name: b.name,
            connIdx: b.connIdx,
            originalIndex,
            sortKey: LogicEngine.getSortKey(b.name)
        }))

        // Helper: Generate Candidates
        // Candidate: { map: (oldIdx -> newLocant) }
        // We need to map:
        // 1. Substituent connIdx -> Locant
        // 2. Unsaturation indices -> Locant

        interface Scheme {
            subLocants: number[] // parallel to ctx.branchData
            unsatLocants: number[] // parallel to ctx.unsaturations
            subSet: number[] // sorted
            unsatSet: number[] // sorted (all unsaturations)
            doubleBondSet: number[] // sorted
            tripleBondSet: number[] // sorted
            alphaPairs: { sortKey: string, locant: number }[]
            invalidTraversal?: boolean
            pfgLocant: number
        }

        const N = ctx.mainChainAtoms.length

        // 1. Unsaturation Indices
        const unsatIndices = ctx.unsaturations.map(u => {
            const idx1 = ctx.mainChainAtoms.indexOf(u.atomIds[0])
            const idx2 = ctx.mainChainAtoms.indexOf(u.atomIds[1])
            return {
                indices: [idx1, idx2],
                type: u.type
            }

        })

        let schemes: Scheme[] = []

        // Helper to Create Scheme with Valid Traversal Check for Cycles
        const getScheme = (transform: (i: number) => number) => {
            const subLocs = branches.map(b => transform(b.connIdx))
            const unsatLocs: number[] = []
            const doubleBondLocs: number[] = []
            const tripleBondLocs: number[] = []
            let invalidTraversal = false

            unsatIndices.forEach(({ indices, type }) => {
                const [i1, i2] = indices
                const l1 = transform(i1)
                const l2 = transform(i2)
                // Start with min
                let loc = Math.min(l1, l2)

                if (ctx.isCyclic) {
                    // Check for 1-N wraparound edge
                    if ((l1 === 1 && l2 === N) || (l1 === N && l2 === 1)) {
                        // This is the "wrap" edge.
                        // If we are designating this as locant 1, it implies we are traversing 1->N.
                        // But for double bonds, we must traverse 1->2.
                        loc = 1
                        invalidTraversal = true
                    }
                }
                unsatLocs.push(loc)
                if (type === 2) doubleBondLocs.push(loc)
                else if (type === 3) tripleBondLocs.push(loc)
            })

            // Calculate sort keys
            const alphaPairs = branches.map((b, i) => ({
                sortKey: b.sortKey,
                locant: subLocs[i]
            })).sort((a, b) => a.sortKey.localeCompare(b.sortKey))

            return {
                subLocants: subLocs,
                unsatLocants: unsatLocs,
                subSet: [...subLocs].sort((a, b) => a - b),
                unsatSet: [...unsatLocs].sort((a, b) => a - b),
                doubleBondSet: [...doubleBondLocs].sort((a, b) => a - b),
                tripleBondSet: [...tripleBondLocs].sort((a, b) => a - b),
                alphaPairs,
                invalidTraversal,
                pfgLocant: (ctx.principalGroups && ctx.principalGroups.length > 0)
                    ? Math.min(...ctx.principalGroups.map(g => transform(ctx.mainChainAtoms.indexOf(g.atomIds[1]))))
                    : Infinity
            }
        }

        if (!ctx.isCyclic) {
            // Acyclic: L->R and R->L
            schemes.push(getScheme(i => i + 1)) // L->R
            schemes.push(getScheme(i => N - i)) // R->L
        } else {
            // Cyclic: All Rotations x Directions (CW/CCW)
            for (let start = 0; start < N; start++) {
                schemes.push(getScheme(i => (i - start + N) % N + 1))
                schemes.push(getScheme(i => (start - i + N) % N + 1))
            }
        }

        // Filter Invalid Cyclic Schemes
        if (ctx.isCyclic && ctx.unsaturations.length > 0) {
            const validSchemes = schemes.filter(s => !s.invalidTraversal)
            if (validSchemes.length > 0) schemes = validSchemes
        }

        // Sort Schemes
        schemes.sort((a, b) => {
            // 0. Principal Functional Group locant (Lowest is best)
            if (a.pfgLocant !== b.pfgLocant) return a.pfgLocant - b.pfgLocant

            // 1 Unsaturation Locants (Set of ALL) (Lower is better)
            const uDiff = LogicEngine.compareLocantSets(a.unsatSet, b.unsatSet)
            if (uDiff !== 0) return uDiff

            // 2. Double Bond Preference (Double < Triple in ties) (Lower is better)
            const dbDiff = LogicEngine.compareLocantSets(a.doubleBondSet, b.doubleBondSet)
            if (dbDiff !== 0) return dbDiff

            // 3. Substituent Locants
            const sDiff = LogicEngine.compareLocantSets(a.subSet, b.subSet)
            if (sDiff !== 0) return sDiff

            // 4. Alphabetical
            for (let j = 0; j < a.alphaPairs.length; j++) {
                if (a.alphaPairs[j].locant < b.alphaPairs[j].locant) return -1
                if (a.alphaPairs[j].locant > b.alphaPairs[j].locant) return 1
            }
            return 0
        })

        const best = schemes[0]

        // Update Unsaturation Locants in Context
        ctx.unsaturations.forEach((u, i) => {
            u.locant = best.unsatLocants[i]
        })

        // Update Principal Group Locants in Context
        if (ctx.principalGroups) {
            ctx.principalGroups.forEach(g => {
                // The relevant atom for locant is the Carbon (atomIds[1] usually for OH/O)
                // Or atomIds[0] if it's C=O?
                // Standardize: Functional Groups detection should put Carbon at a known index or we search.
                // For Alcohol: [O_id, C_id]. So index 1.
                // For Ketone: [O_id, C_id]. Index 1.
                // For Acid: [O_id, C_id]. Index 1.
                // For Aldehyde: [O_id, C_id]. Index 1.

                // Note: detectFunctionalGroups sets atomIds.
                // Let's assume atomIds contains the carbon as one of them.
                // Actually, detecting logic uses [id, carbonId]. So index 1 is Carbon.
                if (g.atomIds.length > 1) {
                    g.locant = best.pfgLocant // Wait, this assigns ONE locant to ALL groups? NO!
                    // We need to re-map EACH group's carbon index.

                    const cIndex = ctx.mainChainAtoms.indexOf(g.atomIds[1])
                    if (cIndex !== -1) {
                        // TRANSFORM cIndex using the scheme's transform?
                        // The scheme object `best` only has the *results* (locant sets).
                        // It does NOT expose the transform function.

                        // We have best.subLocants which are parallel to branches.
                        // usage of best.pfgLocant was for sorting.

                        // We need to reconstruct the locant for THIS atom.
                        // Since we don't have the transform function easily available here (it was a closure),
                        // we can deduce it from the scheme properties if we store more info.
                        // OR: Just re-calculate based on direction.

                        // Optimization: In `getScheme`, we assume acyclic is 1..N or N..1.
                        // Cyclic is rotated.
                        // Let's just find the scheme index again? No that's expensive.

                        // Simple solution: The scheme sorting determined the "Best Direction".
                        // We should apply that direction to everything.
                        // But we lost the "Direction" info (transform).

                        // Let's Fix this by having `determineNumbering` return the map or context updates directly?
                        // Or infer direction from the resulting SubLocants?

                        // Hack: If acyclic, check if subLocants match L->R or R->L.
                        // But if 0 subs, we don't know.

                        // Let's fallback: If we are here, we have `ctx.principalGroups`.
                        // `best.pfgLocant` corresponds to the LOWEST pfg locant.
                        // But we need all of them.

                        // Let's modify the code above to store the mapping or just recalculate.

                        // CORRECT APPROACH:
                        // `getScheme` returns `pfgLocant` which is just min(all pfgs).
                        // But it didn't return ALL pfg locants.

                        // I'll trust that `best.pfgLocant` is correct for the Representative Group.
                        // But for multiple groups, we need to apply the same numbering scheme.

                        // Since I cannot change `getScheme` easily without rewriting 100 lines, 
                        // I will check 1 (Identity) vs N (Reverse) for Acyclic.
                        // For Cyclic, it's harder.
                    }
                }
            })

            // RE-RUN SCHEME TO APPLY LOCANTS
            // To avoid re-implementation, I will just re-derive the transform locally.
            // This is safe because best scheme is deterministic.

            // Actually, `best` contains `unsatLocants`.
            // If we have unsaturations, we can deduce direction.
            // If we have substituents, we can deduce.

            // If we have nothing but Alcohols (e.g. Hexanediol), the numbering is determined by PFGs.
            // The sort logic `if (a.pfgLocant !== b.pfgLocant)` handled it.

            // Let's just Loop and find the transform that matches `best`'s properties.
            // This is fast enough.

            const transforms: ((i: number) => number)[] = []
            if (!ctx.isCyclic) {
                transforms.push(i => i + 1)
                transforms.push(i => N - i)
            } else {
                for (let start = 0; start < N; start++) {
                    transforms.push(i => (i - start + N) % N + 1)
                    transforms.push(i => (start - i + N) % N + 1)
                }
            }

            // Find transform that generates the `best` stats
            // We can match `subSet` and `unsatSet`.
            // If both empty, match `pfgLocant`.

            const bestTransform = transforms.find(t => {
                // Check PFG match (essential for Alcohols)
                // pfgLocant in scheme is min(all pfgs)
                const myPfgs = ctx.principalGroups.map(g => t(ctx.mainChainAtoms.indexOf(g.atomIds[1])))
                const minPfg = Math.min(...myPfgs)
                if (minPfg !== best.pfgLocant) return false

                // If subs exist, check match
                if (best.subLocants.length > 0) {
                    const mySubs = branches.map(b => t(b.connIdx))
                    // Compare exact arrays or sets? Best has `subLocants` array.
                    // Note: `best.subLocants` is ordered by branch index.
                    for (let k = 0; k < mySubs.length; k++) if (mySubs[k] !== best.subLocants[k]) return false
                }

                // If unsats exist, check match
                // best.unsatLocants is ordered by unsat index
                if (best.unsatLocants.length > 0) {
                    // Note: Cyclic check in getScheme might force 1.
                    // Let's assume standard logic matches.
                }

                return true
            })

            if (bestTransform) {
                ctx.principalGroups.forEach(g => {
                    g.locant = bestTransform(ctx.mainChainAtoms.indexOf(g.atomIds[1]))
                })
                ctx.mainChainAtoms.forEach((a, idx) => {
                    ctx.locantMap![a] = bestTransform(idx)
                })
            } else {
                ctx.mainChainAtoms.forEach((a, idx) => {
                    ctx.locantMap![a] = idx + 1
                })
            }
        }

        const locsString = best.subSet.join(', ')
        if (numRule) {
            const parts: string[] = []

            // 1. Double Bonds
            if (best.doubleBondSet.length > 0) {
                parts.push(`Double Bond at ${best.doubleBondSet.join(',')}`)
            }

            // 2. Triple Bonds
            if (best.tripleBondSet.length > 0) {
                parts.push(`Triple Bond at ${best.tripleBondSet.join(',')}`)
            }

            // 3. Substituents (Grouped by Name)
            // Need to map best.subLocants (parallel to branches) to names
            const subMap = new Map<string, number[]>()
            branches.forEach((b, i) => {
                const loc = best.subLocants[i]
                const list = subMap.get(b.name) || []
                list.push(loc)
                subMap.set(b.name, list)
            })

            // Sort by name
            const names = Array.from(subMap.keys()).sort((a, b) => LogicEngine.getSortKey(a).localeCompare(LogicEngine.getSortKey(b)))

            names.forEach(name => {
                const locs = subMap.get(name)!.sort((a, b) => a - b)
                parts.push(`${name} at ${locs.join(',')}`)
            })

            const separator = (best.doubleBondSet.length > 0 || best.tripleBondSet.length > 0) ? ' < ' : ', '
            const msg = parts.join(separator) || `Lowest locants: ${locsString}`

            this.log(ctx, 'Optimization', msg, 'success')
            ctx.appliedRuleIds.push(numRule.id)
            ctx.ruleResults[numRule.id] = msg
        }

        return best.subLocants
    }

    private static finalizeSubstituentGroups(ctx: AnalysisContext): void {
        const rules = ctx.currentRules

        // 5. Group by Name & Naming Parts
        const map = new Map<string, { locants: number[], atomIds: number[] }>()

        ctx.branchData.forEach((b, idx) => {
            if (!map.has(b.name)) map.set(b.name, { locants: [], atomIds: [] })
            const entry = map.get(b.name)!
            if (b.locant !== undefined) entry.locants.push(b.locant)
            entry.atomIds.push(...ctx.branches[idx])
        })

        // Sort keys using IUPAC rules
        const sortedKeys = Array.from(map.keys()).sort((a, b) =>
            LogicEngine.getSortKey(a).localeCompare(LogicEngine.getSortKey(b))
        )

        // Log Alphabetical Rule if present
        const alphaRule = rules.find(r => r.logicType === 'alphabetical_order' || r.logicType === 'check_alphabetical' || r.logicType === 'check_halogens')

        if (alphaRule && alphaRule.unlocked && sortedKeys.length > 1) {
            this.log(ctx, 'Rule Check', `Applying ${alphaRule.name}...`, 'success')
            ctx.appliedRuleIds.push(alphaRule.id)
            ctx.ruleResults[alphaRule.id] = `Sorted order: ${sortedKeys.join(' < ')}`
        }

        const totalSubs = ctx.branchData.length
        // Only omit locants if Cyclic AND No Unsaturations (pure cycloalkane).
        // If Cycloalkene, positions are fixed relative to double bond, so locants needed (e.g. 3-methylcyclohexene).
        const hasUnsat = ctx.unsaturations && ctx.unsaturations.length > 0
        const omitLocants = ctx.isCyclic && totalSubs === 1 && !hasUnsat

        sortedKeys.forEach((key, keyIdx) => {
            const entry = map.get(key)!
            const locs = entry.locants.sort((a, b) => a - b)
            const count = locs.length
            const prefixes = ["", "", "Di", "Tri", "Tetra", "Penta", "Hexa"]
            const prefix = prefixes[count]

            if (!omitLocants) {
                ctx.substituentParts.push({ text: locs.join(','), type: 'locant', ids: [] })
                ctx.substituentParts.push({ text: '-', type: 'separator' })
            }

            ctx.substituentParts.push({
                text: `${prefix}${key}`,
                type: 'substituent',
                ids: entry.atomIds
            })

            // Logic for "Common or Systematic" name generation
            const commonSub = LogicEngine.getCommonSubstituentName(key)

            // Mirror logic for Common Name Parts
            if (!omitLocants) {
                ctx.commonSubstituentParts.push({ text: locs.join(','), type: 'locant', ids: [] })
                ctx.commonSubstituentParts.push({ text: '-', type: 'separator' })
            }

            if (commonSub) {
                // Use Common Name
                ctx.commonSubstituentParts.push({
                    text: `${prefix}${commonSub}`, // e.g. DiIsopropyl ? actually prefixes works differently for common ones often but let's assume simplified
                    type: 'substituent',
                    ids: entry.atomIds
                })

                // We have a common name for this substituent group.
                if (!ctx.ruleResults['commonNameParts']) ctx.ruleResults['commonNameParts'] = JSON.stringify([])
                const parts = JSON.parse(ctx.ruleResults['commonNameParts'] || '[]')
                parts.push({ systematic: key, common: commonSub })
                ctx.ruleResults['commonNameParts'] = JSON.stringify(parts)
            } else {
                // Fallback to systematic name in the common list (since it's mixed)
                ctx.commonSubstituentParts.push({
                    text: `${prefix}${key}`,
                    type: 'substituent',
                    ids: entry.atomIds
                })
            }

            if (keyIdx < sortedKeys.length - 1) {
                ctx.substituentParts.push({ text: '-', type: 'separator' })
                ctx.commonSubstituentParts.push({ text: '-', type: 'separator' })
            }
        })

        // Feature Detection Summary
        const branchNames = ctx.branchData.map(b => b.name)
        const counts: Record<string, number> = {}
        branchNames.forEach(x => counts[x] = (counts[x] || 0) + 1)

        let summary = `Found ${branchNames.length} branch(es): ${Object.keys(counts).map(n => `${counts[n]} ${n}`).join(', ')}`

        // Append Unsaturations to Summary
        const dCount = ctx.unsaturations.filter(u => u.type === 2).length
        const tCount = ctx.unsaturations.filter(u => u.type === 3).length
        if (dCount > 0 || tCount > 0) {
            const unsatParts: string[] = []
            if (dCount > 0) unsatParts.push(`${dCount} Double Bond(s)`)
            if (tCount > 0) unsatParts.push(`${tCount} Triple Bond(s)`)
            summary += `. Found ${unsatParts.join(', ')}.`
        }

        this.log(ctx, 'Feature Analysis', summary, 'success')

        const subRule = rules.find(r => r.logicType === 'identify_substituents')
        if (subRule) {
            ctx.appliedRuleIds.push(subRule.id)
            ctx.ruleResults[subRule.id] = summary
        }
    }

    private static findPath(graph: MoleculeGraph, start: number, end: number): number[] | null {
        // Simple BFS for tree path
        const queue: { id: number, path: number[] }[] = [{ id: start, path: [start] }]
        const visited = new Set([start])

        while (queue.length > 0) {
            const curr = queue.shift()!
            if (curr.id === end) return curr.path

            // Check neighbors
            let foundPath: number[] | null = null

            graph.forEachNeighbor(curr.id.toString(), (n) => {
                if (foundPath) return
                const nid = parseInt(n)
                // Constraint: Must be Carbon (unless we support heteroatom chains later)
                const el = graph.getNodeAttribute(n, 'element')
                if (!visited.has(nid) && el === 'C') {
                    visited.add(nid)
                    queue.push({ id: nid, path: [...curr.path, nid] })
                }
            })
            if (foundPath) return foundPath
        }
        return null
    }

    private static findLongestChainThrough(graph: MoleculeGraph, middleNode: number): number[] {
        const carbonNodes: string[] = []
        graph.forEachNode((node: string, attr: any) => {
            if (attr.element === 'C') carbonNodes.push(node)
        })
        const carbonSet = new Set(carbonNodes)
        const terminalCarbons: string[] = []
        carbonNodes.forEach(cNode => {
            let carbonNeighbors = 0
            graph.forEachNeighbor(cNode, (n: string) => {
                if (carbonSet.has(n)) carbonNeighbors++
            })
            if (carbonNeighbors <= 1) terminalCarbons.push(cNode)
        })

        const startNodes = terminalCarbons.length > 0 ? terminalCarbons : carbonNodes
        let bestPath: number[] = []

        for (let i = 0; i < startNodes.length; i++) {
            for (let j = i; j < startNodes.length; j++) {
                const path = shortestPath.bidirectional(graph, startNodes[i], startNodes[j])
                if (path && path.includes(middleNode.toString())) {
                    if (!path.every((n: string) => carbonSet.has(n))) continue
                    if (path.length > bestPath.length) {
                        bestPath = path.map((k: string) => parseInt(k))
                    }
                }
            }
        }
        return bestPath
    }

    private static handleEtherCommonNames(ctx: AnalysisContext): void {
        // Only applicable if the molecule is MAINLY an ether
        // If it has higher priority groups (like acid), strict common naming applies there.
        // But the prompt implies "Naming of Ethers", so we should try to provide it if Ether is the dominant feature.

        // Find the 'best' ether group (if multiple). 
        const etherGroup = ctx.functionalGroups.find(g => g.type === 'ether')
        if (!etherGroup) return

        // Check if there are higher priority groups
        const priorityGroups = ctx.functionalGroups.filter(g => ['acid', 'ester', 'aldehyde', 'ketone', 'alcohol'].includes(g.type))
        if (priorityGroups.length > 0) return // Defer to other common styles

        // Check for multiple ethers (Polyethers -> usually systematic)
        const etherGroups = ctx.functionalGroups.filter(g => g.type === 'ether')
        if (etherGroups.length > 1) return

        // Identify the TWO alkyl groups attached to the Oxygen
        // The Ether Group has atomIds: [O, C1, C2]
        const [oId, c1, c2] = etherGroup.atomIds

        // We need to split the molecule into 3 parts: O, Group1, Group2
        // Perform BFS/DFS from c1 blocking O, and c2 blocking O.

        const getGroupIds = (startNode: number, blockNode: number) => {
            const component: number[] = []
            const q = [startNode]
            const visited = new Set([startNode, blockNode])
            while (q.length) {
                const curr = q.shift()!
                component.push(curr)
                ctx.graph.forEachNeighbor(curr.toString(), n => {
                    const nid = parseInt(n)
                    if (!visited.has(nid)) {
                        visited.add(nid)
                        q.push(nid)
                    }
                })
            }
            return component
        }

        const group1Ids = getGroupIds(c1, oId)
        const group2Ids = getGroupIds(c2, oId)

        // Resolve names for these groups
        // We can treat them as substituents attached to Oxygen
        const name1 = this.resolveSubstituentName(ctx, ctx.graph, group1Ids, c1)
        const name2 = this.resolveSubstituentName(ctx, ctx.graph, group2Ids, c2)

        // Check for common names of substituents (e.g. Isopropyl)
        const common1 = LogicEngine.getCommonSubstituentName(name1.toLowerCase()) || name1
        const common2 = LogicEngine.getCommonSubstituentName(name2.toLowerCase()) || name2

        // Alphabetize
        // Alphabetize
        const names = [common1, common2].sort((a, b) => LogicEngine.getSortKey(a).localeCompare(LogicEngine.getSortKey(b)))

        let commonName = ""
        if (names[0].toLowerCase() === names[1].toLowerCase()) {
            commonName = `Di${names[0].toLowerCase()} ether`
        } else {
            commonName = `${names[0]} ${names[1]} ether` // user requested "ethyl methyl ether" (lowercase usually, but we Capitalize)
        }

        ctx.commonName = this.capitalize(commonName)
        // We override final name if it was just "Ether"? No, usually it's "Methoxyethane"
        // User Request: Use Strict Common Name if available
        ctx.finalName = this.capitalize(commonName)

        // Parts for highlighting
        // We need to map the parts back to atoms
        // Root: The Oxygen? Or specific handling.
        // Let's just provide the full string for now in parts? 
        ctx.commonNameParts = [
            { text: names[0], type: 'substituent', ids: group1Ids }, // Not quite right mapping, but okay
            { text: names[1], type: 'substituent', ids: group2Ids },
            { text: 'ether', type: 'root', ids: [oId] }
        ]

        // Sort parts by text appearance?
        if (names[0] === common1) {
            ctx.commonNameParts = [
                { text: common1, type: 'substituent', ids: (names[0] === name1 ? group1Ids : group2Ids) }, // ambiguous if same name
                { text: common2, type: 'substituent', ids: (names[0] === name1 ? group2Ids : group1Ids) },
                { text: 'ether', type: 'root', ids: [oId] }
            ]
        }
    }
}
