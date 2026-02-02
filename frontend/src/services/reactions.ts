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
    const matches = reactionRules.filter(rule => {
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

    return matches.map(rule => {
        if (rule.append_reaction) {
            const appendedRule = getReactionById(rule.append_reaction)
            if (appendedRule) {
                const baseSmarts = Array.isArray(rule.reactionSmarts) ? rule.reactionSmarts : [rule.reactionSmarts]
                const appendSmarts = Array.isArray(appendedRule.reactionSmarts) ? appendedRule.reactionSmarts : [appendedRule.reactionSmarts]

                return {
                    ...rule,
                    reactionSmarts: [...baseSmarts, ...appendSmarts],
                    selectivity: appendedRule.selectivity
                }
            }
        }
        return rule
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

export function findNextReactionStep(
    productSmiles: string,
    originalReactants: string[],
    conditions: Set<string>
): { rule: ReactionRule, requiredReactants: string[] } | null {
    // Pool includes the new product and all original reactants (reagents)
    const pool = [productSmiles, ...originalReactants]

    // Find all rules that match this pool
    const matchedRules = findMatchingReactions(conditions, pool)

    for (const rule of matchedRules) {
        const patterns = rule.reactantsSmarts

        // We need to verify that 'productSmiles' is actually used in the match as one of the reactants
        // and identifying exactly which other reactants are needed.

        // Strategy: Iterate over which pattern the product matches
        for (let pIdx = 0; pIdx < patterns.length; pIdx++) {
            if (rdkitService.getSubstructureMatch(productSmiles, patterns[pIdx])) {
                // The product matches pattern[pIdx].
                // Now try to match the OTHER patterns using the REST of the pool (originalReactants)

                const remainingPatterns = patterns.filter((_, idx) => idx !== pIdx)
                const usedIndicesInOriginal = new Set<number>()

                const othersFound = matchDistinctFromPool(originalReactants, remainingPatterns, usedIndicesInOriginal)

                if (othersFound) {
                    // Found a valid combination!
                    // Construct the required reactants list: Product + The matched originals
                    const matchedOriginals = Array.from(usedIndicesInOriginal).map(idx => originalReactants[idx])
                    return {
                        rule,
                        requiredReactants: [productSmiles, ...matchedOriginals]
                    }
                }
            }
        }
    }

    return null
}

function matchDistinctFromPool(pool: string[], patterns: string[], usedIndices: Set<number>): boolean {
    if (patterns.length === 0) return true;

    // Try to match patterns[0]
    const pattern = patterns[0];
    for (let i = 0; i < pool.length; i++) {
        if (!usedIndices.has(i) && rdkitService.getSubstructureMatch(pool[i], pattern)) {
            usedIndices.add(i);
            if (matchDistinctFromPool(pool, patterns.slice(1), usedIndices)) {
                return true;
            }
            usedIndices.delete(i);
        }
    }
    return false;
}
