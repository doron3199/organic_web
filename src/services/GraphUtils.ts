// GraphUtils.ts - Helper for molecular graph topology

export interface Atom {
    id: number
    element: string
    isAromatic: boolean
    neighbors: number[]
}

export interface MoleculeGraph {
    atoms: Atom[]
    adjacency: number[][] // Adjacency Matrix or List (using list in atom)
}

export class GraphUtils {

    // Very basic SMILES parser for Alkanes (Tree structures)
    // Note: This is a simplified parser for tutorial purposes. 
    // In a production app, we would use RDKit's JSON output if available, 
    // but here we parse the SMILES string structure directly for simple alkanes.
    // Supports: C, (branch), = (skip for now as we focus on alkanes)
    static parseAlkaneSMILES(smiles: string): MoleculeGraph {
        const atoms: Atom[] = []
        let atomCounter = 0
        const stack: number[] = [] // For branching '()'
        let currentAtomIdx = -1

        // Normalizing: simplified parsing purely for Carbon connectivity
        // We assume valid SMILES from RDKit.

        for (let i = 0; i < smiles.length; i++) {
            const char = smiles[i]

            if (char === 'C' || char === 'c') {
                const newAtom: Atom = {
                    id: atomCounter++,
                    element: 'C',
                    isAromatic: char === 'c',
                    neighbors: []
                }
                atoms.push(newAtom)

                // Connect to previous atom if exists and not starting a new disconnected component
                if (currentAtomIdx !== -1) {
                    // Add bidirectional edge
                    atoms[currentAtomIdx].neighbors.push(newAtom.id)
                    newAtom.neighbors.push(currentAtomIdx)
                }

                currentAtomIdx = newAtom.id
            }
            else if (char === '(') {
                // Branch start: push current parent to stack
                stack.push(currentAtomIdx)
            }
            else if (char === ')') {
                // Branch end: pop parent, reset current to it
                if (stack.length > 0) {
                    currentAtomIdx = stack.pop()!
                }
            }
            else if (char === '.') {
                // Disconnected structure (shouldn't happen in alkanes usually)
                currentAtomIdx = -1
            }
            // Ignore digits (ring closures) for simple alkanes tutorial 
            // as we deal with trees. (We can add ring support later if needed)
        }

        return { atoms, adjacency: [] }
    }

    // Find the longest path (graph diameter) in a tree (Alkane)
    // Returns the path of atom IDs
    static findLongestChain(graph: MoleculeGraph): number[] {
        if (graph.atoms.length === 0) return []
        if (graph.atoms.length === 1) return [0]

        // Double BFS to find diameter
        // 1. BFS from node 0 to find furthest node A
        const furthestFromStart = this.getFurthestNode(graph, 0)

        // 2. BFS from node A to find furthest node B (This path A->B is diameter)
        const path = this.getPathToFurthest(graph, furthestFromStart.id)

        return path
    }

    private static getFurthestNode(graph: MoleculeGraph, startNodeId: number): { id: number, distance: number } {
        const visited = new Set<number>()
        const queue: { id: number, dist: number }[] = [{ id: startNodeId, dist: 0 }]
        visited.add(startNodeId)

        let maxDist = -1
        let furthestNode = startNodeId

        while (queue.length > 0) {
            const { id, dist } = queue.shift()!

            if (dist > maxDist) {
                maxDist = dist
                furthestNode = id
            }

            for (const neighborId of graph.atoms[id].neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId)
                    queue.push({ id: neighborId, dist: dist + 1 })
                }
            }
        }

        return { id: furthestNode, distance: maxDist }
    }

    private static getPathToFurthest(graph: MoleculeGraph, startNodeId: number): number[] {
        // BFS but track parents to reconstruct path
        const visited = new Set<number>()
        const queue: number[] = [startNodeId]
        const parentMap = new Map<number, number>()
        visited.add(startNodeId)

        let lastNode = startNodeId

        while (queue.length > 0) {
            const id = queue.shift()!
            lastNode = id

            for (const neighborId of graph.atoms[id].neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId)
                    parentMap.set(neighborId, id)
                    queue.push(neighborId)
                }
            }
        }

        // Reconstruct path from lastNode back to startNodeId
        const path: number[] = []
        let curr: number | undefined = lastNode
        while (curr !== undefined) {
            path.push(curr)
            curr = parentMap.get(curr)
        }

        return path // Returns path [End -> Start], order doesn't matter for "Longest Chain" set
    }
}
