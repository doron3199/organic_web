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
}

export class LogicEngine {

    static analyzeMolecule(
        smiles: string,
        currentSubSubject: SubSubject
    ): AnalysisResult {
        const ctx = this.initializeContext(smiles, currentSubSubject)

        this.log(ctx, 'Initialization', `Analyzing: ${smiles}`, 'success')

        if (!this.validateStructure(ctx)) return this.buildResult(ctx)

        this.parseGraph(ctx)

        if (!this.determineParentStructure(ctx)) return this.buildResult(ctx)

        if (!this.analyzeSubstituents(ctx)) return this.buildResult(ctx)

        // Validation against user input removed.

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
            // substituentAtoms: [],
            branchData: [],
            rootPart: null,
            substituentParts: [],
            commonSubstituentParts: [],

            finalName: "Unknown Molecule",
            alternativeName: undefined
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
        return {
            logs: ctx.logs,
            name: ctx.finalName,
            nameParts: ctx.substituentParts.length > 0 || ctx.rootPart ? [...ctx.substituentParts, ...(ctx.rootPart ? [ctx.rootPart] : [])] : undefined, // Logic handled in assembleName but fallbacks here?
            // Actually assembleName handles 'nameParts'. We shoud use ctx.nameParts? 
            // The context has `substituentParts` and `rootPart`.
            // Let's refine buildResult in next steps or stick to what assembleName produces.
            // assembleName will populate `finalName` and `substituentParts`/`rootPart`.
            // Let's just construct the final parts list here if not done.
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

            if (ctx.isCyclic) {
                // CYCLIC LOGIC
                ctx.cycles.sort((a, b) => b.length - a.length)
                ctx.mainChainAtoms = ctx.cycles[0]
                ctx.mainChainLen = ctx.mainChainAtoms.length

                const baseName = LogicEngine.getAlkaneName(ctx.mainChainLen)
                const parentName = `Cyclo${baseName.toLowerCase()}`

                this.log(ctx, 'Topology Analysis', `Identified ${ctx.mainChainLen}-carbon ring as parent.`, 'success', `Parent: ${parentName}`)
                ctx.appliedRuleIds.push(chainRule.id)
                ctx.ruleResults[chainRule.id] = `Found ring with ${ctx.mainChainLen} carbons → ${parentName}`
                ctx.finalName = parentName

                ctx.rootPart = {
                    text: parentName,
                    type: 'root',
                    ids: ctx.mainChainAtoms
                }

            } else {
                // ACYCLIC LOGIC
                ctx.mainChainAtoms = GraphUtils.findLongestChain(ctx.graph)
                ctx.mainChainLen = ctx.mainChainAtoms.length

                if (ctx.mainChainLen > 0) {
                    const parentName = LogicEngine.getAlkaneName(ctx.mainChainLen)

                    this.log(ctx, 'Topology Analysis', `Longest chain has ${ctx.mainChainLen} carbons.`, 'success', `Parent: ${parentName}`)
                    ctx.appliedRuleIds.push(chainRule.id)
                    ctx.ruleResults[chainRule.id] = `Found ${ctx.mainChainLen} carbons → ${parentName}`
                    ctx.finalName = parentName

                    // Create Root Part
                    ctx.rootPart = {
                        text: parentName,
                        type: 'root',
                        ids: ctx.mainChainAtoms
                    }
                }
                else if (false) {
                    this.log(ctx, 'Topology Analysis', 'Longest chain has more than 10 carbons.', 'failed')
                    ctx.isValid = false
                    return false
                }
                else {
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

        if (subIds.length > 0) {
            // 1. Identify Branches (Connected Components) and Type
            this.analyzeBranchStructure(ctx, subIds, chainSet)

            // 2. Determine Numbering Direction/Scheme
            const finalMapping = this.determineNumbering(ctx)

            // 3. Assign Final Locants
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
        let sysName = `${prefixString}${ctx.rootPart?.text.toLowerCase() || ''}`

        // Capitalize first letter
        const capitalize = (s: string) => {
            if (/^[a-zA-Z0-9]/.test(s)) {
                const first = s.search(/[a-zA-Z]/)
                if (first !== -1) {
                    return s.substring(0, first) +
                        s.charAt(first).toUpperCase() +
                        s.substring(first + 1)
                }
            }
            return s
        }

        ctx.finalName = capitalize(sysName)

        // Check for Common Name (Whole Molecule)
        const commonWhole = this.getCommonName(sysName)

        // Check for Common Substituents
        let commonSubVariant = ctx.finalName // Start with the Capitalized Systematic Name
        if (ctx.ruleResults['commonNameParts']) {
            const parts = JSON.parse(ctx.ruleResults['commonNameParts'])
            parts.forEach((p: any) => {
                // Replace ALL occurrences
                commonSubVariant = commonSubVariant.split(p.systematic).join(p.common.toLowerCase())
            })
            // Fix capitalization
            commonSubVariant = capitalize(commonSubVariant)
        }

        const hasCommonSub = commonSubVariant !== ctx.finalName

        if (commonWhole) {
            ctx.finalName = `${commonWhole} or ${ctx.finalName}`
            ctx.commonName = commonWhole
            // Common Whole Name is treated as a single Root part
            ctx.commonNameParts = [{
                text: commonWhole,
                type: 'root',
                ids: ctx.rootPart?.ids // Use main chain ids or all ids? ideally all but main chain is fine for highlighting
            }]
        } else if (hasCommonSub) {
            ctx.finalName = `${commonSubVariant} or ${ctx.finalName}`
            ctx.commonName = commonSubVariant

            // Assemble Common Name Parts
            // We need to capitalize the first part text
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
        let localParentAtoms: number[] = []

        if (cycles.length > 0) {
            // CYCLIC SUBSTITUENT
            // Assume the largest cycle containing the attachment or closest to it is the parent.
            // For now, assume simple case: The cycle IS the parent.
            // Tie-break: largest cycle.
            cycles.sort((a, b) => b.length - a.length)
            const mainRing = cycles[0]

            // Check if attached directly
            if (mainRing.includes(attachId)) {
                localParentAtoms = mainRing
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
            // return "Complex-Cyclo-Sub"
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

            keys.forEach((k, idx) => {
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

            // Check for common substituent name
            // Remove outer parens for check: "1-methylethyl"
            const inner = systematic.slice(1, -1)
            const common = this.getCommonSubstituentName(inner)

            // If common name exists, verify if we should use it or allow replacement later.
            // Tests expectation implies standard IUPAC structure usually, but we have strict matching.
            return systematic

            // Or maybe I should just return `isopropyl` and rely on the fact that `isopropyl` is "Common".
            // Ah, the test checks for the FULL string "A or B".

            // Hack: If a substituent has a common name, return "Common or Systematic".
            // e.g. "Isopropyl or (1-methylethyl)"
            // Then final name: "4-Isopropyl or (1-methylethyl)heptane"? No, likely "4-Isopropylheptane or 4-(1-methylethyl)heptane".
            // The "OR" splits the whole name.

            // This is getting complex for a simple string return.
            // Let's try to handle this in `finalizeSubstituentGroups` or `assembleName`.
            // I will store the common name candidates in the context?
            // `ctx.branchData` has `name`.
            // If I change `name` to be "Common|Systematic" (special delimiter)?

            // Let's stick to returning systematic from here, and in `finalizeSubstituentGroups`, we check `getCommonSubstituentName`.
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
        // Ensure we copy to avoid mutation issues if we sort later?
        let finalMapping: number[] = ctx.branchData.map(b => b.connIdx + 1)

        // If rule is not active, return default
        if (!numRule || !numRule.unlocked || ctx.branchData.length === 0) {
            return finalMapping
        }

        this.log(ctx, 'Rule Check', `Applying ${numRule.name}...`, 'checking')

        const branches = ctx.branchData.map((b, originalIndex) => ({
            name: b.name,
            connIdx: b.connIdx,
            originalIndex,
            sortKey: LogicEngine.getSortKey(b.name)
        }))

        // Helper to evaluate a numbering scheme
        const evaluateScheme = (locants: number[]) => {
            // 1. Create the locant set for comparison (sorted numbers)
            const set = [...locants].sort((a, b) => a - b)

            // 2. Create the alphabetical pairs for tie-breaking
            // We pair the computed locant with the branch's sortKey
            const alphaPairs = branches.map((b, i) => ({
                sortKey: b.sortKey,
                locant: locants[i]
            }))
            // Sort by name to see which name gets which number
            alphaPairs.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

            return { locants, set, alphaPairs }
        }

        let candidates: number[][] = []

        if (!ctx.isCyclic) {
            // Acyclic: Left-to-Right vs Right-to-Left
            const len = ctx.mainChainLen
            candidates.push(branches.map(b => b.connIdx + 1)) // L -> R
            candidates.push(branches.map(b => len - b.connIdx)) // R -> L
        } else {
            // Cyclic: Try all start points, CW and CCW
            const N = ctx.mainChainLen
            const raw = branches.map(b => b.connIdx)

            for (let start = 0; start < N; start++) {
                candidates.push(raw.map(idx => (idx - start + N) % N + 1)) // CW
                candidates.push(raw.map(idx => (start - idx + N) % N + 1)) // CCW
            }
        }

        // Compare all candidates
        let bestScheme = evaluateScheme(candidates[0])

        for (let i = 1; i < candidates.length; i++) {
            const currentScheme = evaluateScheme(candidates[i])

            // Compare 1: Lowest Locant Set
            const setDiff = LogicEngine.compareLocantSets(currentScheme.set, bestScheme.set)
            if (setDiff < 0) {
                bestScheme = currentScheme
                continue
            }
            if (setDiff > 0) continue

            // Compare 2: Alphabetical Tie-Breaker
            // If sets are equal, lowest number should go to the alphabetically first substituent
            let alphaBetter = false
            for (let j = 0; j < currentScheme.alphaPairs.length; j++) {
                if (currentScheme.alphaPairs[j].locant < bestScheme.alphaPairs[j].locant) {
                    alphaBetter = true; break;
                }
                if (currentScheme.alphaPairs[j].locant > bestScheme.alphaPairs[j].locant) {
                    alphaBetter = false; break;
                }
            }

            if (alphaBetter) {
                bestScheme = currentScheme
            }
        }

        const locsString = bestScheme.set.join(', ')
        this.log(ctx, 'Optimization', `Lowest locants set: ${locsString}`, 'success')
        ctx.appliedRuleIds.push(numRule.id)
        ctx.ruleResults[numRule.id] = `Lowest locants set: ${locsString}`

        return bestScheme.locants
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
        const omitLocants = ctx.isCyclic && totalSubs === 1

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
        const summary = `Found ${branchNames.length} branch(es): ${Object.keys(counts).map(n => `${counts[n]} ${n}`).join(', ')}`

        this.log(ctx, 'Feature Analysis', summary, 'success')

        const subRule = rules.find(r => r.logicType === 'identify_substituents')
        if (subRule) {
            ctx.appliedRuleIds.push(subRule.id)
            ctx.ruleResults[subRule.id] = summary
        }
    }
}
