import { rdkitService } from './rdkit'
import { SubSubject } from '../data/curriculum'
import { LogEntry } from '../components/LogicConsole'
import { GraphUtils } from './GraphUtils'

export interface AnalysisResult {
    logs: LogEntry[]
    name?: string
    isValid: boolean
    appliedRuleIds: string[]
    ruleResults: Record<string, string> // Map ruleId -> result string
}

export class LogicEngine {

    static analyzeMolecule(
        smiles: string,
        currentSubSubject: SubSubject
    ): AnalysisResult {
        const logs: LogEntry[] = []
        const appliedRuleIds: string[] = []
        const ruleResults: Record<string, string> = {}

        // --- Helper to log ---
        const log = (step: string, detail: string, status: 'success' | 'checking' | 'failed', result?: string) => {
            logs.push({
                id: step + '_' + Math.random().toString(36).substr(2, 9),
                step,
                detail,
                status,
                result,
                timestamp: Date.now()
            })
        }

        log('Initialization', `Analyzing: ${smiles}`, 'success')

        // 1. Basic Validation
        if (!smiles) {
            log('Validation', 'Molecule is empty.', 'failed')
            return { logs, isValid: false, appliedRuleIds: [], ruleResults: {} }
        }
        if (!rdkitService.isValidSMILES(smiles)) {
            log('Structure Check', 'Invalid chemical structure.', 'failed')
            return { logs, isValid: false, appliedRuleIds: [], ruleResults: {} }
        }

        // 2. Parse Graph (Topology)
        const graph = GraphUtils.parseAlkaneSMILES(smiles)
        const totalCarbons = graph.atoms.filter(a => a.element === 'C').length
        log('Graph Parsing', `Found ${totalCarbons} Carbon atoms.`, 'success')

        // 3. Logic Pipeline
        // We will construct the name step-by-step
        let mainChainLen = 0
        let mainChainAtoms: number[] = []
        // Define branches in shared scope for Step C
        let branches: number[][] = []

        // Define naming components
        let finalName = "Unknown Molecule"
        let isUnknown = false

        // --- Step A: Longest Chain (Topology) ---
        const chainRule = currentSubSubject.rules.find(r => r.logicType === 'longest_chain')

        if (chainRule && chainRule.unlocked) {
            log('Rule Check', `Applying ${chainRule.name}...`, 'checking')

            // Algorithm: Find Graph Diameter
            mainChainAtoms = GraphUtils.findLongestChain(graph)
            mainChainLen = mainChainAtoms.length

            if (mainChainLen > 0 && mainChainLen <= 10) {
                const parents = ["Methane", "Ethane", "Propane", "Butane", "Pentane", "Hexane", "Heptane", "Octane", "Nonane", "Decane"]
                // Extended parents list or fallback
                const parentName = parents[mainChainLen - 1] || `${mainChainLen}-ane`

                log('Topology Analysis', `Longest chain has ${mainChainLen} carbons.`, 'success', `Parent: ${parentName}`)
                appliedRuleIds.push(chainRule.id)
                ruleResults[chainRule.id] = `Found ${mainChainLen} carbons → ${parentName}`
                finalName = parentName
            }
            else if (mainChainLen > 10) {
                log('Topology Analysis', 'Longest chain has more than 10 carbons.', 'failed')
                return { logs, isValid: false, appliedRuleIds, ruleResults }
            }
            else {
                log('Topology Analysis', 'Could not find a valid carbon chain.', 'failed')
                return { logs, isValid: false, appliedRuleIds, ruleResults }
            }
        }

        // --- Step B: Substituents (Features / SMARTS) ---
        // Identify atoms NOT in the main chain
        const chainSet = new Set(mainChainAtoms)
        const substituentAtoms = graph.atoms.filter(a => !chainSet.has(a.id))

        if (substituentAtoms.length > 0) {
            const subRule = currentSubSubject.rules.find(r => r.logicType === 'identify_substituents')

            if (!subRule || !subRule.unlocked) {
                // FAIL: We have atoms outside the chain, but no rule to explain them!
                log('Feature Detection', `Found ${substituentAtoms.length} atoms outside the main chain.`, 'failed')
                log('Logic Failure', 'You have not learned about substituents yet.', 'failed', 'Result: Unknown Molecule')
                return { logs, isValid: false, name: 'Unknown Molecule', appliedRuleIds, ruleResults }
            }

            // Rule is unlocked: Use SMARTS to identify them
            log('Rule Check', `Applying ${subRule.name}...`, 'checking')

            const visited = new Set<number>()

            substituentAtoms.forEach(atom => {
                if (visited.has(atom.id)) return
                // BFS to find component
                const component: number[] = []
                const queue = [atom.id]
                visited.add(atom.id)
                while (queue.length) {
                    const id = queue.shift()!
                    component.push(id)
                    graph.atoms[id].neighbors.forEach(n => {
                        if (!chainSet.has(n) && !visited.has(n)) {
                            visited.add(n)
                            queue.push(n)
                        }
                    })
                }
                branches.push(component)
            })

            const branchNames: string[] = []
            branches.forEach(branch => {
                if (branch.length === 1) branchNames.push("Methyl")
                else if (branch.length === 2) branchNames.push("Ethyl")
                else branchNames.push("Alkyl") // Generic
            })

            branchNames.sort()
            // Counts
            const counts: Record<string, number> = {}
            branchNames.forEach(x => counts[x] = (counts[x] || 0) + 1)

            let prefix = ""
            Object.entries(counts).forEach(([name, count]) => {
                const countPrefix = count === 1 ? "" : count === 2 ? "Di" : "Tri"
                prefix += `${countPrefix}${name}`
            })

            finalName = prefix + finalName.toLowerCase()
            const resultSummary = `Found ${branchNames.length} branch(es): ${Object.keys(counts).map(n => `${counts[n]} ${n}`).join(', ')}`

            log('Feature Analysis', `Identified branches: ${branchNames.join(', ')}`, 'success')
            appliedRuleIds.push(subRule.id)
            ruleResults[subRule.id] = resultSummary
        }

        // --- Step C: Numbering (Optimization) ---
        // If we have branches, we need numbering? 
        if (substituentAtoms.length > 0) {
            const numRule = currentSubSubject.rules.find(r => r.logicType === 'lowest_numbering')

            if (numRule && numRule.unlocked) {
                log('Rule Check', `Applying ${numRule.name}...`, 'checking')

                const locants: number[] = []

                branches.forEach(branch => {
                    // Find connection point
                    for (const bAtom of branch) {
                        const parent = graph.atoms[bAtom].neighbors.find(n => chainSet.has(n))
                        if (parent !== undefined) {
                            const idx = mainChainAtoms.indexOf(parent)
                            locants.push(idx)
                            break
                        }
                    }
                })

                // Calculate sets
                const setA = locants.map(i => i + 1).sort((a, b) => a - b) // 1-based
                const setB = locants.map(i => mainChainLen - i).sort((a, b) => a - b)

                // Compare (Lexicographical)
                let useSetA = true
                for (let i = 0; i < setA.length; i++) {
                    if (setA[i] < setB[i]) { useSetA = true; break }
                    if (setB[i] < setA[i]) { useSetA = false; break }
                }

                const finalLocants = useSetA ? setA : setB
                const locantString = finalLocants.join(',')

                finalName = `${locantString}-${finalName}`

                const resultSummary = `Lowest locants set: ${finalLocants.join(', ')}`
                log('Optimization', `Lowest locants calculated: ${finalLocants.join(', ')}`, 'success')
                appliedRuleIds.push(numRule.id)
                ruleResults[numRule.id] = resultSummary
            } else {
                log('Rule Locked', 'Numbering rule not active. Returning un-numbered name.', 'checking')
            }
        }

        return {
            logs,
            name: finalName,
            isValid: !isUnknown,
            appliedRuleIds,
            ruleResults
        }
    }
}
