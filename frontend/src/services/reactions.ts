import { rdkitService } from './rdkit'
import { ReactionRule, reactionRules } from './reaction_definitions'

// Helper function to get reaction by ID
export function getReactionById(id: string): ReactionRule | undefined {
    return reactionRules.find(rule => rule.id === id)
}


// Helper function to get all reaction names
export function getAllReactionNames(): { id: string; name: string }[] {
    return reactionRules.map(rule => ({ id: rule.id, name: rule.name }))
}

// Get reaction mechanism description
export function getReactionMechanism(reactionId: string): string {
    const reaction = getReactionById(reactionId)
    return reaction ? reaction.description : 'Mechanism details not available'
}

// Find matched reactions based on selected conditions and reactants
export function findMatchingReactions(selectedConditions: Set<string>, reactants: string[]): ReactionRule[] {
    return reactionRules.filter(rule => {
        // 1. Check conditions (Set equality match)
        const conditionMatch = rule.conditions.some(set => {
            // Rule condition set must be a subset of selected conditions? 
            // Or exact match? Original logic was equality of size and content.
            // "if (set.size !== selectedConditions.size) return false" -> Strict equality.
            // Let's keep strict equality for now as per original code.
            if (set.size !== selectedConditions.size) return false
            for (const item of set) {
                if (!selectedConditions.has(item)) return false
            }
            return true
        })

        if (!conditionMatch) return false

        // 2. Check reactants (Generic matching)
        // We need to find if all patterns in rule.reactantsSmarts are satisfied by distinct reactants from the input
        const patterns = rule.reactantsSmarts

        // Optimization for common cases
        if (patterns.length === 0) return true
        if (patterns.length > reactants.length) return false // Input doesn't have enough molecules

        if (patterns.length === 1) {
            return reactants.some(r => rdkitService.getSubstructureMatch(r, patterns[0]))
        }

        if (patterns.length === 2) {
            // Check permutations
            // Case 1: reactants[i] -> patterns[0], reactants[j] -> patterns[1] (i != j)
            // Since we usually have exactly 2 reactants in input when patterns=2 (or maybe 3 if solvent included in separate dots?)
            // Just try to find a pair (i, j) that matches
            for (let i = 0; i < reactants.length; i++) {
                if (rdkitService.getSubstructureMatch(reactants[i], patterns[0])) {
                    // Try to find a distinct j for pattern[1]
                    for (let j = 0; j < reactants.length; j++) {
                        if (i === j) continue
                        if (rdkitService.getSubstructureMatch(reactants[j], patterns[1])) {
                            return true
                        }
                    }
                }
            }
            return false
        }

        // Fallback for N > 2 (Backtracking or max flow not strictly needed yet for N=2 typical)
        // Simple distinct match check
        return checkSubsetMatch(reactants, patterns)
    })
}

// Helper for generic N matching
function checkSubsetMatch(reactants: string[], patterns: string[]): boolean {
    const used = new Array(reactants.length).fill(false)
    return matchRecursive(reactants, patterns, 0, used)
}

function matchRecursive(reactants: string[], patterns: string[], patternIdx: number, used: boolean[]): boolean {
    if (patternIdx === patterns.length) return true

    const pattern = patterns[patternIdx]
    for (let i = 0; i < reactants.length; i++) {
        if (!used[i] && rdkitService.getSubstructureMatch(reactants[i], pattern)) {
            used[i] = true
            if (matchRecursive(reactants, patterns, patternIdx + 1, used)) return true
            used[i] = false
        }
    }
    return false
}
