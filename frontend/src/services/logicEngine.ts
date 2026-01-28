import { rdkitService } from './rdkit'
import { SubSubject } from '../data/curriculum'
import { LogEntry } from '../components/LogicConsole'
import { GraphUtils, MoleculeGraph } from './GraphUtils'
import Graph from 'graphology'

export interface AnalysisResult {
    logs: LogEntry[]
    name?: string
    nameParts?: NamePart[]
    isValid: boolean
    appliedRuleIds: string[]
    ruleResults: Record<string, string> // Map ruleId -> result string
    commonName?: string
    commonNameParts?: NamePart[]
}

export interface NamePart {
    text: string
    type: 'root' | 'substituent' | 'locant' | 'separator'
    ids?: number[]
}

interface AnalysisContext {
    smiles: string
    currentSubSubject: SubSubject


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
}

export class LogicEngine {

    static analyzeMolecule(
        smiles: string,
        currentSubSubject: SubSubject
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

        const ctx = this.initializeContext(smiles, currentSubSubject)

        this.log(ctx, 'Initialization', `Analyzing: ${smiles}`, 'success')

        if (!this.validateStructure(ctx)) return this.buildResult(ctx)

        this.parseGraph(ctx)

        if (!this.determineParentStructure(ctx)) return this.buildResult(ctx)

        if (!this.analyzeSubstituents(ctx)) return this.buildResult(ctx)



        this.assembleName(ctx)

        return this.buildResult(ctx)
    }

    private static initializeContext(smiles: string, sub: SubSubject): AnalysisContext {
        return {
            smiles,
            currentSubSubject: sub,

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
            unsaturations: []

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
            finalName = `Unknown Molecule - ${ctx.smiles}`
        }

        return {
            logs: ctx.logs,
            name: finalName,
            nameParts: ctx.substituentParts.length > 0 || ctx.rootPart ? [...ctx.substituentParts, ...(ctx.rootPart ? [ctx.rootPart] : [])] : undefined,
            isValid: ctx.isValid,
            appliedRuleIds: ctx.appliedRuleIds,
            ruleResults: ctx.ruleResults,
            commonName: ctx.commonName,
            commonNameParts: ctx.commonNameParts
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

    private static determineParentStructure(ctx: AnalysisContext): boolean {
        // --- Step A: Longest Chain / Parent Structure ---
        const chainRule = ctx.currentSubSubject.rules.find(r => r.logicType === 'longest_chain')

        if (chainRule && chainRule.unlocked) {
            this.log(ctx, 'Rule Check', `Applying Parent Structure Rules...`, 'checking')

            // Detect Unsaturation (Double/Triple Bonds)
            const edges = ctx.graph.edges()
            const unsaturationEdges: { edge: string, type: number, atoms: number[] }[] = []

            edges.forEach((edge: string) => {
                const attr = ctx.graph.getEdgeAttributes(edge)
                const type = attr.type ? Number(attr.type) : 1
                if (type > 1) {
                    const [u, v] = ctx.graph.extremities(edge)
                    unsaturationEdges.push({
                        edge,
                        type,
                        atoms: [parseInt(u), parseInt(v)].sort((a, b) => a - b)
                    })
                }
            })

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
                ctx.appliedRuleIds.push(chainRule.id)
                ctx.ruleResults[chainRule.id] = `Found ring with ${ctx.mainChainLen} carbons → ${finalRoot}`
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
                    let bestC: number[] = []
                    let maxU = -1
                    let maxLen = -1

                    candidates.forEach(chain => {
                        let uCount = 0
                        const chainSet = new Set(chain)
                        unsaturationEdges.forEach(u => {
                            if (chainSet.has(u.atoms[0]) && chainSet.has(u.atoms[1])) uCount++
                        })

                        if (uCount > maxU) {
                            maxU = uCount
                            maxLen = chain.length
                            bestC = chain
                        } else if (uCount === maxU) {
                            if (chain.length > maxLen) {
                                maxLen = chain.length
                                bestC = chain
                            }
                        }
                    })
                    bestChain = bestC
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
                    ctx.appliedRuleIds.push(chainRule.id)
                    ctx.ruleResults[chainRule.id] = `Found ${ctx.mainChainLen} carbons → ${parentName}`
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

        // Handle Unsaturation Locants in Root
        if (ctx.unsaturations && ctx.unsaturations.length > 0) {
            const doubleBonds = ctx.unsaturations.filter(u => u.type === 2)
            const tripleBonds = ctx.unsaturations.filter(u => u.type === 3)

            const alkane = LogicEngine.getAlkaneName(ctx.mainChainLen).toLowerCase()
            const baseRoot = ctx.isCyclic ? `cyclo${alkane.replace('ane', '')}` : alkane.replace('ane', '')

            const getLocs = (list: typeof ctx.unsaturations) => list.map(u => u.locant).sort((a, b) => (a || 0) - (b || 0)).join(',')
            const getQty = (n: number) => n === 1 ? '' : (n === 2 ? 'di' : (n === 3 ? 'tri' : (n === 4 ? 'tetra' : 'poly')))

            // Epenthesis 'a'
            // Logic for 'a' epenthesis
            // Removed conjunction case: simple enyne "heptenyne" does not need 'a'.
            const needsA = (doubleBonds.length > 1 || tripleBonds.length > 1)
            const modBase = needsA ? baseRoot + 'a' : baseRoot

            const isSimple = ctx.substituentParts.length === 0 && (doubleBonds.length + tripleBonds.length === 1)
            const isCyclic = ctx.isCyclic

            // formatting flags
            let usePrefix = false
            let omitLocant = false

            if (isSimple && !isCyclic) {
                const u = doubleBonds[0] || tripleBonds[0]
                if (doubleBonds.length > 0) {
                    // Alkene simple: "2-Butene", "Butene"
                    usePrefix = true
                    if (u.locant === 1) omitLocant = true
                } else {
                    // Alkyne simple: Test expects "Pent-2-yne". Infix.
                    // But for "Butyne" (locant 1), maybe "1-Butyne" -> "Butyne"?
                    usePrefix = false // Force Infix for Alkynes
                    if (u.locant === 1) {
                        // Expect "Butyne", "Pentyne".
                        omitLocant = true // Logic: If Infix + Omit -> "Pentyne" (Base+Suffix)
                    }
                }
            }

            // Assemble
            if (tripleBonds.length === 0) {
                // Alkenes
                const suffix = `${getQty(doubleBonds.length)}ene`
                const locs = getLocs(doubleBonds)

                if (usePrefix) {
                    if (omitLocant) rootText = `${modBase}${suffix}`
                    else rootText = `${locs}-${modBase}${suffix}`
                } else {
                    // Infix or Cyclic Implicit
                    if (isCyclic && doubleBonds.length === 1 && doubleBonds[0].locant === 1 && ctx.substituentParts.length === 0) {
                        rootText = `${baseRoot}${suffix}`
                    } else if (isCyclic && doubleBonds.length === 1 && doubleBonds[0].locant === 1) {
                        // Cyclic with substituents: "3-methylcyclohexene".
                        // Locant 1 is implicit for the Double Bond if substituents are numbered relative to it.
                        // Standard: "cyclohexene" root.
                        rootText = `${baseRoot}${suffix}`
                    } else {
                        // Cyclohex-1,3-diene
                        rootText = `${modBase}-${locs}-${suffix}`
                    }
                }
            } else if (doubleBonds.length === 0) {
                // Alkynes
                const suffix = `${getQty(tripleBonds.length)}yne`
                const locs = getLocs(tripleBonds)

                if (omitLocant) {
                    rootText = `${modBase}${suffix}`
                } else {
                    rootText = `${modBase}-${locs}-${suffix}`
                }
            } else {
                // Enynes
                const enLocs = getLocs(doubleBonds)
                const enQty = getQty(doubleBonds.length)
                const enPart = `${enLocs}-${enQty}ene`

                const enPartElided = enPart.replace(/e$/, '')

                const ynLocs = getLocs(tripleBonds)
                const ynQty = getQty(tripleBonds.length)
                const ynPart = `${ynLocs}-${ynQty}yne`

                rootText = `${modBase}-${enPartElided}-${ynPart}`
            }

            if (ctx.rootPart) ctx.rootPart.text = rootText
        }

        let sysName = `${prefixString}${rootText}`

        // Capitalize first letter logic
        const capitalize = (s: string) => {
            if (/^[a-zA-Z0-9]/.test(s)) {
                // Find first letter
                const match = s.match(/[a-zA-Z]/)
                if (match && match.index !== undefined) {
                    return s.substring(0, match.index) + match[0].toUpperCase() + s.substring(match.index + 1)
                }
            }
            return s
        }

        ctx.finalName = capitalize(sysName)

        // Common Names Re-Integration
        const commonWhole = LogicEngine.getCommonName(sysName)
        let commonSubVariant = ctx.finalName

        if (ctx.ruleResults['commonNameParts']) {
            const parts = JSON.parse(ctx.ruleResults['commonNameParts'])
            parts.forEach((p: any) => {
                commonSubVariant = commonSubVariant.split(p.systematic).join(p.common.toLowerCase())
            })
            commonSubVariant = capitalize(commonSubVariant)
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
                commonParts[0] = { ...commonParts[0], text: capitalize(commonParts[0].text) }
            }
            ctx.commonNameParts = commonParts
        }
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
        ctx.graph.forEachNode((node: string) => {
            const id = parseInt(node)
            if (!chainSet.has(id)) subIds.push(id)
        })
        return subIds
    }

    private static validateSubstituentRules(ctx: AnalysisContext, subIds: number[]): boolean {
        if (subIds.length === 0) return true

        const rules = ctx.currentSubSubject.rules
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
            const name = this.resolveSubstituentName(ctx.graph, br, attachId)
            return { name, connIdx }
        })

        // Filter out disconnected components
        ctx.branchData = ctx.branchData.filter(b => b.connIdx !== -1)
    }

    private static resolveSubstituentName(fullGraph: MoleculeGraph, branchIds: number[], attachId: number): string {
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
                    const name = this.resolveSubstituentName(subgraph, br, secAttach === -1 ? br[0] : secAttach) // recursion!
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

            // Find longest chain STARTING at attachId within the subgraph
            const chain = this.findLongestChainFrom(subgraph, attachId)
            const chainLen = chain.length

            // If simple chain (length == size of subgraph), it's just a straight alkyl
            // Verify if there are any atoms NOT in the chain
            const chainSet = new Set(chain)
            const secondarySubs = this.findSubstituentAtoms({ graph: subgraph } as any, chainSet)

            const baseName = this.getAlkylName(chainLen).toLowerCase() // e.g. pentyl

            if (secondarySubs.length === 0) {
                return baseName.charAt(0).toUpperCase() + baseName.slice(1)
            }

            // Complex Acyclic
            // Main Chain is fixed 1..N starting at attachId.
            // Map atomId -> locant (1-based index in chain)
            const locMap = new Map<number, number>()
            chain.forEach((id, i) => locMap.set(id, i + 1))

            // Identify secondary branches
            const secBranches = GraphUtils.getConnectedComponents(subgraph, secondarySubs)
            const secBranchData = secBranches.map(br => {
                // Find attachment to MAIN CHAIN
                let secAttach = -1
                for (const atom of br) {
                    subgraph.forEachNeighbor(atom.toString(), (n) => {
                        if (chainSet.has(parseInt(n))) secAttach = parseInt(n)
                    })
                    if (secAttach !== -1) break
                }

                // RECURSE NAME
                // internal attachment for the sub-substituent
                const brAttach = this.findAttachmentInBranch(subgraph, br, secAttach)
                const name = this.resolveSubstituentName(subgraph, br, brAttach)

                return { name, atomIds: br, attachTo: secAttach }
            })

            // Sort and Format
            secBranchData.sort((a, b) => LogicEngine.getSortKey(a.name).localeCompare(LogicEngine.getSortKey(b.name)))

            // Group redundancy (e.g. 1,1-Dimethyl)
            const groupedParts: string[] = []

            // Map name -> locants
            const subMap = new Map<string, number[]>()
            secBranchData.forEach(b => {
                const list = subMap.get(b.name) || []
                list.push(locMap.get(b.attachTo)!)
                subMap.set(b.name, list)
            })

            // Sort keys by IUPAC name sort key
            const keys = Array.from(subMap.keys()).sort((a, b) =>
                LogicEngine.getSortKey(a).localeCompare(LogicEngine.getSortKey(b))
            )

            keys.forEach((k) => {
                const locs = subMap.get(k)!.sort((a, b) => a - b)
                const prefixes = ["", "", "Di", "Tri", "Tetra", "Penta", "Hexa", "Hepta", "Octa", "Nona", "Deca"]
                const prefixCount = prefixes[locs.length] || ""

                // Add separator if not first
                if (groupedParts.length > 0) groupedParts.push('-')

                groupedParts.push(`${locs.join(',')}-${prefixCount}${k}`)
            })

            const prefix = groupedParts.join('')

            // Construct systematic complex name
            const systematic = `(${prefix}${baseName})`


            return systematic


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
                    subgraph.addEdge(source, target)
            }
        })
        return subgraph
    }


    private static findLongestChainFrom(graph: MoleculeGraph, startNode: number): number[] {
        // DFS to find longest path of Carbons starting at startNode
        let maxPath: number[] = []

        const dfs = (current: number, path: number[], visited: Set<number>) => {
            const currentPath = [...path, current]

            // Check if leaf (no unvisited neighbors)
            let isLeaf = true
            graph.forEachNeighbor(current.toString(), (n) => {
                const nid = parseInt(n)
                if (!visited.has(nid)) {
                    // Assume all atoms in substituent subgraph are carbons for alkyl naming
                    // If we support other atoms later, check element type here.
                    isLeaf = false
                    const newVisited = new Set(visited)
                    newVisited.add(nid)
                    dfs(nid, currentPath, newVisited)
                }
            })

            if (isLeaf) {
                if (currentPath.length > maxPath.length) {
                    maxPath = currentPath
                }
            }
        }

        dfs(startNode, [], new Set([startNode]))
        return maxPath
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
        const rules = ctx.currentSubSubject.rules
        const numRule = rules.find(r => r.logicType === 'lowest_numbering') || rules.find(r => r.logicType === 'check_lowest_locants')

        // Default: 1-based index from 0-based connection index (Raw left-to-right)
        let finalMapping: number[] = ctx.branchData.map(b => b.connIdx + 1)

        // If rule is not active and no unsaturations, return default
        if ((!numRule || !numRule.unlocked) && ctx.unsaturations.length === 0) {
            // For simple display without rule enforcement, just return default
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
                invalidTraversal
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
            // 1. Unsaturation Locants (Set of ALL) (Lower is better)
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
        const rules = ctx.currentSubSubject.rules

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
}
