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
export function findMatchingReactions(selectedConditions: Set<string>, reactant1: string, reactant2: string): ReactionRule[] {
    return reactionRules.filter(rule => {
        // 1. Check conditions (Set equality match)
        const conditionMatch = rule.conditions.some(set => {
            if (set.size !== selectedConditions.size) return false
            for (const item of set) {
                if (!selectedConditions.has(item)) return false
            }
            return true
        })

        if (!conditionMatch) return false

        // 2. Check reactants (Order-invariant)
        const matchR1_R1 = rdkitService.getSubstructureMatch(reactant1, rule.reactant1Smarts)
        const matchR2_R2 = rdkitService.getSubstructureMatch(reactant2, rule.reactant2Smarts)
        if (matchR1_R1 && matchR2_R2) return true
        const matchR2_R1 = rdkitService.getSubstructureMatch(reactant2, rule.reactant1Smarts)
        const matchR1_R2 = rdkitService.getSubstructureMatch(reactant1, rule.reactant2Smarts)
        return (matchR2_R1 && matchR1_R2)
    })
}
