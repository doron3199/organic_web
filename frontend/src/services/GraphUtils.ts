import { rdkitService } from './rdkit'
import Graph from 'graphology'
import { simplePath, shortestPath } from 'graphology-library'



// Export Graphology Graph as the main type
export type MoleculeGraph = Graph

/* 
   Legacy interfaces removed in favor of Graphology
   - Atom
   - MoleculeGraph (interface)
*/


export class GraphUtils {

    // Use RDKit to parse molecule into graph
    static parseMolecule(smiles: string): MoleculeGraph {
        const rdkitRes = rdkitService.parseSMILES(smiles)

        if (rdkitRes && rdkitRes.molBlock) {
            return this.parseMolBlock(rdkitRes.molBlock)
        }

        throw new Error("RDKit failed to parse SMILES or is not initialized.")
    }

    private static parseMolBlock(molBlock: string): MoleculeGraph {
        const g = new Graph({ type: 'undirected' })
        const lines = molBlock.split('\n')

        // Header parsing logic...
        let countLineIdx = 0
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('V2000')) {
                countLineIdx = i
                break
            }
        }
        const countsLine = lines[countLineIdx]
        const numAtoms = parseInt(countsLine.substring(0, 3).trim())
        const numBonds = parseInt(countsLine.substring(3, 6).trim())

        // Parse Atoms and add Nodes
        for (let i = 0; i < numAtoms; i++) {
            const line = lines[countLineIdx + 1 + i]
            const parts = line.trim().split(/\s+/)
            const element = parts[3]

            g.addNode(i.toString(), {
                id: i, // keep numeric id in attributes
                element: element,
                isAromatic: false
            })
        }

        // Parse Bonds and add Edges
        const bondStart = countLineIdx + 1 + numAtoms
        for (let i = 0; i < numBonds; i++) {
            const line = lines[bondStart + i]
            const from = parseInt(line.substring(0, 3).trim()) - 1
            const to = parseInt(line.substring(3, 6).trim()) - 1
            const type = parseInt(line.substring(6, 9).trim())

            // Self-healing check
            if (g.hasNode(from.toString()) && g.hasNode(to.toString())) {
                if (!g.hasEdge(from.toString(), to.toString())) {
                    g.addEdge(from.toString(), to.toString(), { type })
                }
            }
        }

        return g
    }

    // Find all simple cycles (rings) in the graph
    // Returns list of cycles, where each cycle is a list of atom IDs
    // Find all simple cycles (rings) in the graph using Graphology
    static findCycles(graph: MoleculeGraph): number[][] {
        const allCycles: number[][] = []
        const cycleSet = new Set<string>()

        // For each node, find simple paths to itself (cycles)
        // Since graph is undirected, a path A-B-A is technically a cycle of length 2 usually ignored,
        // but simplePath might return length > 2
        // Actually, simplePath only finds acyclic paths if source!=target.
        // If source==target, it finds cycles.

        // Optimisation: Only pick one node per component to start searching? No, might miss disjoint cycles.
        // But checking every node will find the same cycle N times.
        // We will deduplicate.

        // User explicitly asked: "just use simple path". 
        // Logic: Iterate all edges (u, v), find path u -> v not using the edge.
        // Any such path + the edge forms a cycle.

        const edges = graph.edges()
        edges.forEach((edge: string) => {
            const [u, v] = graph.extremities(edge)

            // Temporarily hide the edge to find alternate paths
            // We use dropEdge and addEdgeWithKey to restore it
            const edgeAttr = graph.getEdgeAttributes(edge)
            graph.dropEdge(edge)

            const paths = simplePath.allSimplePaths(graph, u, v)

            paths.forEach((p: string[]) => {
                // p is path from u to v. Length is nodes count. 
                // Min cycle size 3 means path length >= 2 edges (3 nodes)?
                // u-x-v is 3 nodes. + u-v edge = cycle of 3.
                if (p.length >= 3) {
                    // Normalize cycle
                    const cycle = p.map(n => parseInt(n))
                    // Deduplicate by set of atoms
                    const sorted = [...cycle].sort((a, b) => a - b).toString()
                    if (!cycleSet.has(sorted)) {
                        cycleSet.add(sorted)
                        allCycles.push(cycle)
                    }
                }
            })

            // Restore edge
            graph.addEdgeWithKey(edge, u, v, edgeAttr)
        })

        return allCycles
    }

    // Find the longest chain obeying IUPAC rules:
    // 1. Maximize Length
    // 2. Maximize Substituents (Branches)
    static findLongestChain(graph: MoleculeGraph): number[] {
        if (graph.order === 0) return []
        if (graph.order === 1) return [0]

        // 1. Identify leaves (degree 1) that are CARBONS
        const leaves: string[] = []
        graph.forEachNode((node: string, attributes: any) => {
            if (graph.degree(node) === 1 && attributes.element === 'C') leaves.push(node)
        })

        // Also consider ends of carbon chains that might be attached to non-carbons (e.g. C-C-Cl, the C attached to Cl acts as a "leaf" for the carbon chain perspective?)
        // Actually, strictly speaking, we want the longest path of Carbon atoms.
        // A "Carbon Leaf" in the subgraph of Carbons has degree 1 in that subgraph.
        // Let's filter the graph to a Carbon-only subgraph first?
        // Simpler: Find all Carbon nodes. 

        const carbonNodes: string[] = []
        graph.forEachNode((node: string, attr: any) => {
            if (attr.element === 'C') carbonNodes.push(node)
        })

        if (carbonNodes.length === 0) return []
        if (carbonNodes.length === 1) return [parseInt(carbonNodes[0])]

        // We want longest path in the subgraph induced by carbonNodes.
        // But doing shortestPath on the main graph might hop through non-carbons if we aren't careful?
        // No, we should ensure the path contains only carbons.

        let maxLen = 0
        let candidates: number[][] = []

        // Optimization: Finding longest path is expensive (NP-hard in general, but easy-ish in trees/sparse).
        // For small organic molecules, we can iterate pairs of carbon "terminals".

        // Function to check if a node is "terminal" in the Carbon skeleton
        // Degree in G_carbon <= 1
        const carbonSet = new Set(carbonNodes)
        const terminalCarbons: string[] = []

        carbonNodes.forEach(cNode => {
            let carbonNeighbors = 0
            graph.forEachNeighbor(cNode, (n: string) => {
                if (carbonSet.has(n)) carbonNeighbors++
            })
            if (carbonNeighbors <= 1) terminalCarbons.push(cNode)
        })

        // If ring-only (no terminals), pick all carbons
        const startNodes = terminalCarbons.length > 0 ? terminalCarbons : carbonNodes

        for (let i = 0; i < startNodes.length; i++) {
            for (let j = i + 1; j < startNodes.length; j++) {
                const path = shortestPath.bidirectional(graph, startNodes[i], startNodes[j])
                if (path) {
                    // VALIDATE PATH IS ALL CARBON
                    if (!path.every(n => carbonSet.has(n))) continue

                    if (path.length > maxLen) {
                        maxLen = path.length
                        candidates = [path.map(k => parseInt(k))]
                    } else if (path.length === maxLen) {
                        candidates.push(path.map(k => parseInt(k)))
                    }
                }
            }
        }

        if (candidates.length === 0) return []

        // 3. Maximise branches
        let bestPath = candidates[0]
        let maxSubs = -1

        candidates.forEach(path => {
            const pathSet = new Set(path)
            let subCount = 0

            path.forEach(atomId => {
                // Check neighbors in graph
                graph.forEachNeighbor(atomId.toString(), (neighbor: string) => {
                    if (!pathSet.has(parseInt(neighbor))) {
                        subCount++
                    }
                })
            })

            if (subCount > maxSubs) {
                maxSubs = subCount
                bestPath = path
            }
        })

        return bestPath
    }

    // Find connected components within a subset of nodes (e.g. all substituent atoms)
    static getConnectedComponents(graph: MoleculeGraph, nodeIds: number[]): number[][] {
        // We can induce a subgraph or just BFS. 
        // Graphology doesn't strictly support "components of a subset" without creating a subgraph.
        // Creating a subgraph is cleaner.
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

        // Now find components
        const visited = new Set<string>()
        const components: number[][] = []

        subgraph.forEachNode((node: string) => {
            if (visited.has(node)) return

            const component: string[] = []
            // BFS
            const stack = [node]
            visited.add(node)

            while (stack.length) {
                const current = stack.pop()!
                component.push(current)

                subgraph.forEachNeighbor(current, (neighbor: string) => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor)
                        stack.push(neighbor)
                    }
                })
            }
            components.push(component.map(k => parseInt(k)))
        })

        return components
    }

    static getSubstituentName(graph: MoleculeGraph, branchIds: number[], attachId: number): string {
        const size = branchIds.length

        // Single Atom Substituents (Methyl or Halogens)
        if (size === 1) {
            const attr = graph.getNodeAttributes(branchIds[0].toString())
            const el = attr.element
            if (el === 'F') return "Fluoro"
            if (el === 'Cl') return "Chloro"
            if (el === 'Br') return "Bromo"
            if (el === 'I') return "Iodo"
            if (el === 'O') return "Hydroxy"
            if (el === 'N') return "Amino"
            if (el === 'S') return "Sulfanyl"
            return "Methyl"
        }

        if (size === 2) return "Ethyl"

        // Analyze topology using Graphology
        const branchSet = new Set(branchIds.map(n => String(n)))

        // Check for Cycles in the Branch
        // We need to construct a subgraph for the branch to find cycles effectively?
        // Reuse getConnectedComponents logic but for subgraph creation? 
        // Actually, let's just use the existing GraphUtils.findCycles on a subgraph.
        // Or simpler: BFS/Path finding? 
        // Let's create a temporary subgraph for the branch
        const subgraph = new Graph({ type: 'undirected' })
        branchIds.forEach(id => {
            const key = id.toString()
            if (graph.hasNode(key)) subgraph.addNode(key, graph.getNodeAttributes(key))
        })
        graph.forEachEdge((_edge, attr, source, target) => {
            if (branchSet.has(source) && branchSet.has(target)) {
                if (!subgraph.hasEdge(source, target))
                    subgraph.addEdge(source, target, attr)
            }
        })

        const branchCycles = GraphUtils.findCycles(subgraph) // Reusing our static method
        if (branchCycles.length > 0) {
            // It's a cyclic substituent!
            // Assume simple mono-cyclic for now (e.g. Cyclopropyl, Cyclobutyl)
            // Sort by size
            branchCycles.sort((a, b) => b.length - a.length)
            const mainRing = branchCycles[0]
            const ringSize = mainRing.length

            // Check if attached directly to the ring?
            // "Cyclopropyl", "Cyclobutyl" etc.
            // If the attachment point is IN the ring, it's "Cyclo...yl"
            const attachInRing = mainRing.includes(attachId) // attachId is the atom IN the branch that connects to parent
            // Actually attachId passed to this function is the "head" of the branch (the atom in branch connected to main chain)

            if (attachInRing) {
                // Fix: Use alkyl name (remove -ane add -yl)
                // Simple hack: getAlkaneName returns "Propane".
                // Better: Implement getAlkylName or map.
                const alkyl = GraphUtils.getAlkylName(ringSize)
                return `Cyclo${alkyl.toLowerCase()}`
            } else {
                // Attached via alkyl linker? e.g. (Cyclopropyl)methyl -> "Cyclopropylmethyl"
                // This is complex. For now, if complex, return "Cycloalkyl"
                return `Cyclo${GraphUtils.getAlkaneName(ringSize).toLowerCase()}yl-alkyl` // Placeholder
            }
        }

        // Degree of attachment atom WITHIN the branch
        let internalDegree = 0
        let neighborInBranch: string | null = null

        graph.forEachNeighbor(attachId.toString(), (n: string) => {
            if (branchSet.has(n)) {
                internalDegree++
                neighborInBranch = n
            }
        })

        // Simple Alkyls
        if (size === 3) {
            if (internalDegree === 1) return "Propyl"
            if (internalDegree === 2) return "Isopropyl"
        }

        if (size === 4) {
            if (internalDegree === 1) {
                // n-Butyl or Isobutyl
                // Check neighbor's degree in branch
                let neighborDeg = 0
                if (neighborInBranch) {
                    graph.forEachNeighbor(neighborInBranch, (n: string) => {
                        if (branchSet.has(n)) neighborDeg++
                    })
                }

                // If neighbor (CH) is connected to 2 other carbons => Isobutyl (CH2-CH-(CH3)2)
                // neighborDeg will be 3 (1 back to attach, 2 others)
                if (neighborDeg === 3) return "Isobutyl"
                return "Butyl"
            }
            if (internalDegree === 2) return "sec-Butyl"
            if (internalDegree === 3) return "tert-Butyl"
        }

        if (size === 5) return "Pentyl"
        if (size === 6) return "Hexyl"

        return "Alkyl"
    }

    private static getAlkaneName(n: number): string {
        const map = ["Methane", "Ethane", "Propane", "Butane", "Pentane", "Hexane", "Heptane", "Octane", "Nonane", "Decane"]
        return map[n - 1] || `${n}-ane`
    }

    private static getAlkylName(n: number): string {
        const map = ["Methyl", "Ethyl", "Propyl", "Butyl", "Pentyl", "Hexyl", "Heptyl", "Octyl", "Nonyl", "Decyl"]
        return map[n - 1] || `${n}-yl`
    }




}
