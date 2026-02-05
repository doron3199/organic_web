import { useState, useEffect } from 'react'
import { findMatchingReactions, findNextReactionStep } from '../services/reactions'
import { rdkitService, DebugReactionOutcome } from '../services/rdkit'
import { SubSubject, initialCurriculum } from '../data/curriculum'
import { AVAILABLE_CONDITIONS, QUICK_ADD_MOLECULES } from '../services/conditions'
import CurriculumModal from './CurriculumModal'
import MoleculeViewer from './MoleculeViewer'
import SelectivityChart from './SelectivityChart'
import { ReactionMechanismGraph } from './ReactionMechanismGraph'
import './ReactionPanel.css'

interface ReactionPanelProps {
    currentMolecule: string
    onMoleculeUpdate: (smiles: string) => void
    onRequestSmiles?: () => Promise<string | undefined>
    initialConditions?: string[]
    // New Props for Controlled State
    selectedConditions?: string[]
    onConditionsChange?: (conditions: string[]) => void
    onReactionRun?: (reaction: { id: string, name: string, smarts: string | string[] } | null) => void
}

function ReactionPanel({ currentMolecule, onMoleculeUpdate, onRequestSmiles, initialConditions, selectedConditions: propConditions, onConditionsChange, onReactionRun }: ReactionPanelProps) {
    // Internal state fallback if not controlled (for backward compat or isolated usage)
    const [internalConditions, setInternalConditions] = useState<string[]>(initialConditions || [])

    // Use prop if available, otherwise internal state
    const selectedConditions = propConditions !== undefined ? propConditions : internalConditions

    const [results, setResults] = useState<{
        reactionId: string,
        reactionName: string,
        curriculum_subsubject_id: string,
        matchExplanation?: string,
        products: { smiles: string, selectivity: string, nextStep?: { ruleName: string, requiredReactants: string[] } }[],
        byproducts: string[],
        smarts: string,
        autoAdd?: (string | Record<string, never>)[],
        rank?: number,
        mechanism?: string  // logic engine mechanism (e.g. "SN2")
    }[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [searchPerformed, setSearchPerformed] = useState(false)
    const [showConditionError, setShowConditionError] = useState(false)

    const [selectedReactionInfo, setSelectedReactionInfo] = useState<SubSubject | null>(null)

    // Mechanism Modal State
    interface MechanismResult extends DebugReactionOutcome {
        reactionName: string
    }
    const [mechanismResult, setMechanismResult] = useState<MechanismResult | null>(null)
    const [isMechanismLoading, setIsMechanismLoading] = useState<string | null>(null)

    const handleViewMechanism = async (reactionName: string, smarts: string, autoAdd?: (string | Record<string, never>)[], reactionId?: string) => {
        if (!currentMolecule) return

        setIsMechanismLoading(reactionName)
        try {
            const reactants = currentMolecule.split('.')
            let result: import('../services/rdkit').DebugReactionOutcome | null = null

            if (reactionId === 'elimination_substitution' || reactionId === 'intramolecular_substitution') {
                // Special handling for Substitution/Elimination
                // For mechanism view, we need to pass conditions again.
                // We assume 'selectedConditions' state is current.
                // Check type of selectedConditions. It is string[] based on lines 28 & 16.
                const outcome = await rdkitService.runSubstitutionElimination(reactants, selectedConditions)
                if (outcome) {
                    result = {
                        steps: outcome.steps,
                        finalProducts: outcome.finalProducts,
                        finalByproducts: outcome.finalByproducts
                    } as import('../services/rdkit').DebugReactionOutcome
                }
            } else {
                // Handle potentially multi-line SMARTS string (for multi-step reactions)
                let smartsArg: string | string[] = smarts
                if (smarts.includes('\n')) {
                    smartsArg = smarts.split('\n').map(s => s.trim()).filter(s => !!s)
                }

                result = await rdkitService.runReaction(reactants, smartsArg, true, autoAdd) as import('../services/rdkit').DebugReactionOutcome | null
            }

            if (result) {
                setMechanismResult({ ...result, reactionName })
            }
        } catch (e) {
            console.error("Failed to load mechanism:", e)
        } finally {
            setIsMechanismLoading(null)
        }
    }

    // Sync internal state if prop changes (just in case mixed usage) - likely not needed if controlled perfectly but safe
    useEffect(() => {
        if (initialConditions && initialConditions.length > 0 && propConditions === undefined) {
            setInternalConditions(initialConditions)
        }
    }, [initialConditions, propConditions])

    // Helper: Determine valid rules for a given molecule and set of conditions
    const getMatchingRules = (smiles: string | null, conditions: string[]) => {
        if (!smiles) return []
        const reactantsParts = smiles.split('.')
        const condSet = new Set(conditions)

        return findMatchingReactions(condSet, reactantsParts)
    }




    const handleConditionToggle = (id: string) => {
        const updateConditions = (prev: string[]) => {
            let newConds: string[]
            // Single select mode:
            // If clicking active one -> toggle off (empty)
            // If clicking inactive one -> replace all with this one
            if (prev.includes(id)) {
                newConds = []
            } else {
                newConds = [id]
            }
            if (newConds.length > 0) setShowConditionError(false)
            return newConds
        }

        if (onConditionsChange && propConditions !== undefined) {
            // Controlled mode
            const newConds = updateConditions(propConditions)
            onConditionsChange(newConds)
        } else {
            // Uncontrolled
            setInternalConditions(prev => updateConditions(prev))
        }
    }

    const handleReactionInfoClick = (subsubjectId: string) => {
        for (const subject of initialCurriculum) {
            const sub = subject.subSubjects.find(s => s.id === subsubjectId)
            if (sub) {
                setSelectedReactionInfo(sub)
                return
            }
        }
    }

    const handleRunReaction = async () => {
        setShowConditionError(false)

        setSearchPerformed(false)
        setResults([])

        let moleculeToReact = currentMolecule
        if (onRequestSmiles) {
            const latestSmiles = await onRequestSmiles()
            if (latestSmiles) {
                moleculeToReact = latestSmiles
            }
        }

        if (!moleculeToReact) return

        // 2. Re-calculate matched reactions using the FRESH molecule
        // This fixes the "click twice" bug by ensuring we use rules matching the *current* editor state
        // not the *previous* react state.
        const rulesToRun = getMatchingRules(moleculeToReact, selectedConditions)

        if (rulesToRun.length === 0) {
            // Fallback: Check if any selected condition acts as a reagent (e.g. KMnO4)
            // If we find a Quick Add molecule that, when added to reactants, triggers a match
            // then we auto-add it to the editor.
            const conditionsWithMolecules = selectedConditions.filter(c => QUICK_ADD_MOLECULES[c]);

            for (const condId of conditionsWithMolecules) {
                const moleculeDefinition = QUICK_ADD_MOLECULES[condId];
                const moleculeToAdd = moleculeDefinition.smiles;
                // Add with dot separator
                const testInternalSmiles = `${moleculeToReact}.${moleculeToAdd}`;
                // Remove the condition from the check since it's now a reactant
                const testConditions = selectedConditions.filter(c => c !== condId);

                const testRules = getMatchingRules(testInternalSmiles, testConditions);

                if (testRules.length > 0) {
                    // Found a match! Add the reagent to the editor.
                    onMoleculeUpdate(testInternalSmiles);

                    // Also clear this condition to prevent re-triggering mismatch loop
                    // since we've converted the condition into a reactant.
                    if (onConditionsChange) {
                        onConditionsChange(testConditions);
                    } else {
                        setInternalConditions(testConditions);
                    }

                    return;
                }
            }

            setSearchPerformed(true)
            return
        }

        setIsRunning(true)
        const allResults: {
            reactionId: string,
            reactionName: string,
            curriculum_subsubject_id: string,
            matchExplanation?: string,
            products: { smiles: string, selectivity: string, nextStep?: { ruleName: string, requiredReactants: string[] } }[],
            byproducts: string[],
            smarts: string,
            autoAdd?: (string | Record<string, never>)[],
            rank?: number,
            mechanism?: string
        }[] = []

        // Determine the highest rank among the matching reactions
        // Default rank is 1 if not specified.
        const maxRank = Math.max(...rulesToRun.map(r => r.rank || 1));

        // Split molecule into independent reactants
        const reactantsSmiles = moleculeToReact.split('.');

        try {
            // Try every matched rule
            for (const rule of rulesToRun) {
                // STEP 1: Identify candidates for each reactant slot
                const reactantIndices = reactantsSmiles.map((s, i) => ({ s, i }))
                const slotsCandidatesIndices = rule.reactantsSmarts.map(pattern => {
                    return reactantIndices.filter(item => rdkitService.getSubstructureMatch(item.s, pattern))
                })

                // If any required slot has no candidates, skip this rule
                if (slotsCandidatesIndices.some(c => c.length === 0)) continue

                // STEP 2: Generate valid combinations (distinct molecules for distinct slots)
                const combinations: number[][] = []

                const generate = (slotIdx: number, currentIndices: number[]) => {
                    if (slotIdx === rule.reactantsSmarts.length) {
                        combinations.push([...currentIndices])
                        return
                    }

                    for (const candidate of slotsCandidatesIndices[slotIdx]) {
                        if (!currentIndices.includes(candidate.i)) {
                            currentIndices.push(candidate.i)
                            generate(slotIdx + 1, currentIndices)
                            currentIndices.pop()
                        }
                    }
                }

                // If rule has 0 reactants (not typical), run once with empty?
                if (rule.reactantsSmarts.length === 0) {
                    combinations.push([])
                } else {
                    generate(0, [])
                }

                if (combinations.length === 0) continue

                const ruleProducts = new Map<string, { smiles: string, selectivity: string, rankIndex: number }>()
                const ruleByproducts = new Set<string>()

                // STEP 3: Iterate and Run combinations
                for (const comboIndices of combinations) {
                    const reactantsForRun = comboIndices.map(i => reactantsSmiles[i])

                    let outcome;

                    if (rule.id === 'elimination_substitution' || rule.id === 'intramolecular_substitution') {
                        // Special handling for Substitution/Elimination logic
                        // Check type of selectedConditions. It is string[] based on lines 28 & 16.
                        outcome = await rdkitService.runSubstitutionElimination(reactantsForRun, selectedConditions)

                        // The result has "explanation" and "mechanisms" in it. We might want to use them.
                        // But here we are mapping to `matchExplanation` of the result object.
                        // The standard valid outcome structure is expected.
                        // See line 259 cast.
                        // We need to make sure 'outcome' matches the shape expected or we modify how we process.
                        // The runSubstitutionElimination returns an object with steps, finalProducts.
                        // Let's adapt it to look like ReactionOutcome/DebugReactionOutcome.
                        if (outcome) {
                            // Attach explanation to rule or handle it.
                            // For now, let's piggyback interpretation here if feasible or just return standard structure.
                            // But we want the "White Box" explanation.
                            if (outcome.explanation) {
                                rule.matchExplanation = outcome.explanation
                            }
                            // Also map finalProducts to products, ensuring it's an array
                            outcome.products = Array.isArray(outcome.finalProducts) ? outcome.finalProducts : []
                            outcome.byproducts = Array.isArray(outcome.finalByproducts) ? outcome.finalByproducts : []

                            // Store mechanism for display
                            if (outcome.mechanisms && outcome.mechanisms.length > 0) {
                                // Temporarily attach to rule to pass to result construction below
                                (rule as any)._detectedMechanism = outcome.mechanisms.join(' + ');
                            }
                        }
                    } else {
                        outcome = await rdkitService.runReaction(reactantsForRun, rule.reactionSmarts, false, rule.autoAdd)
                    }

                    if (outcome && Array.isArray(outcome.products)) {
                        const reactionOutcome = outcome as import('../services/rdkit').ReactionOutcome
                        reactionOutcome.products.forEach((pSmiles: string) => {
                            let matchIndex = 999;
                            if (rule.selectivity) {
                                rule.selectivity.rules.forEach((selRule, idx) => {
                                    if (matchIndex === 999 && rdkitService.getSubstructureMatch(pSmiles, selRule.smarts)) {
                                        matchIndex = idx;
                                    }
                                })
                            }
                            ruleProducts.set(pSmiles, { smiles: pSmiles, selectivity: 'equal', rankIndex: matchIndex })
                        })
                        reactionOutcome.byproducts.forEach((bSmi: string) => ruleByproducts.add(bSmi));

                        // Add unused inorganic reactants (Spectators) to byproducts
                        // This ensures excess reagents (like HBr) are visible in the results
                        const unusedIndices = reactantIndices.filter(ri => !comboIndices.includes(ri.i));
                        unusedIndices.forEach(ri => {
                            // Heuristic for inorganic: No 'C' or simple check. 
                            // Using a simple check: if it doesn't contain 'C' (except common inorganic C like CO2? Not handling that complexity for now)
                            // Actually, let's just check if it has Carbon.
                            if (!ri.s.includes('C') && !ri.s.includes('c')) {
                                ruleByproducts.add(ri.s);
                            }
                        });
                    }
                }

                // Check for chained reactions for each unique product
                // This needs to be done AFTER we have all unique products for this rule
                // But we are constructing the result object per rule.

                const processedProducts: { smiles: string, selectivity: string, nextStep?: { ruleName: string, requiredReactants: string[] }, rankIndex: number }[] = []

                for (const prod of ruleProducts.values()) {
                    // Check if this product can react further
                    // We use the original reactant pool (reactantsSmiles) + the product
                    const nextStep = findNextReactionStep(prod.smiles, reactantsSmiles, new Set(selectedConditions))

                    processedProducts.push({
                        ...prod,
                        nextStep: nextStep ? { ruleName: nextStep.rule.name, requiredReactants: nextStep.requiredReactants } : undefined
                    })
                }

                // STEP 3: Determine Relative Selectivity
                // If there's only one unique product, it's the major product
                if (processedProducts.length === 1) {
                    const singleProd = processedProducts[0]
                    if (singleProd) singleProd.selectivity = 'major'
                }
                // Otherwise, find the best rank (lowest index) if rules exist
                else if (processedProducts.length > 0 && rule.selectivity) {
                    let bestRankFound = 999;
                    for (const prod of processedProducts) {
                        if (prod.rankIndex < bestRankFound) bestRankFound = prod.rankIndex
                    }

                    // If we found any hierarchy matches
                    if (bestRankFound !== 999) {
                        for (const prod of processedProducts) {
                            if (prod.rankIndex === bestRankFound) {
                                prod.selectivity = 'major'
                            } else if (prod.rankIndex < 999) {
                                // Matches a rule but not the best one -> minor
                                prod.selectivity = 'minor'
                            } else {
                                // Matches no rules?
                                prod.selectivity = 'minor'
                            }
                        }
                    }
                }



                // STEP 4: Adjust based on Reaction Rank
                const ruleRank = rule.rank || 1;
                if (ruleRank < maxRank) {
                    // Downgrade all products to minor if reaction itself is minor
                    for (const prod of processedProducts) {
                        prod.selectivity = 'minor';
                    }
                }

                if (processedProducts.length > 0) {
                    // Enhance match explanation with conditions
                    let explanation = rule.matchExplanation || '';

                    // Find the biggest condition set to display (assuming it covers the alternatives)
                    if (rule.conditions && rule.conditions.length > 0) {
                        // Sort sets by size descending
                        const sets = [...rule.conditions].sort((a, b) => b.size - a.size);
                        const biggestSet = sets[0];
                        if (biggestSet.size > 0) {
                            const condStr = Array.from(biggestSet).join(' or ');
                            explanation += ` + ${condStr}`;
                        }
                    }

                    // Handle string[] smarts by joining
                    const smartsStr = Array.isArray(rule.reactionSmarts)
                        ? rule.reactionSmarts.join('\n')
                        : rule.reactionSmarts;

                    allResults.push({
                        reactionId: rule.id,
                        reactionName: rule.name,
                        curriculum_subsubject_id: rule.curriculum_subsubject_id,
                        matchExplanation: explanation,
                        products: processedProducts.map(p => ({ smiles: p.smiles, selectivity: p.selectivity, nextStep: p.nextStep })),
                        byproducts: Array.from(ruleByproducts),
                        smarts: smartsStr,
                        autoAdd: rule.autoAdd,
                        rank: rule.rank || 1,
                        mechanism: (rule as any)._detectedMechanism
                    })
                }
            }
        } catch (e) {
            console.error("Reaction processing error:", e)
        }

        // Sort by rank descending
        allResults.sort((a, b) => (b.rank || 1) - (a.rank || 1));

        setResults(allResults)
        setSearchPerformed(true)
        setIsRunning(false)

        // If exactly one reaction matches, auto-trigger the debugger
        if (allResults.length === 1 && onReactionRun) {
            const res = allResults[0]
            const rule = rulesToRun[0] // Since allResults.length === 1 and it corresponds to rulesToRun matches
            onReactionRun({
                id: res.reactionId,
                name: res.reactionName,
                smarts: rule.reactionSmarts
            })
        }
    }

    const handleAddToEditor = (productSmiles: string) => {
        onMoleculeUpdate(productSmiles)
    }

    const handleContinueReaction = (reactants: string[]) => {
        onMoleculeUpdate(reactants.join('.'))
    }

    const handleCurriculumExperiment = (smiles: string, conditionsStr: string) => {
        // Close the modal
        setSelectedReactionInfo(null)

        // Update molecule
        onMoleculeUpdate(smiles)

        // Parse conditions
        // Format can be "H2SO4", "Acid, Heat", "NaBH4, H3O+"
        // We need to map these strings to IDs in AVAILABLE_CONDITIONS or QUICK_ADD_MOLECULES
        const conditionIds: string[] = []

        const parts = conditionsStr.split(',').map(s => s.trim())

        for (const part of parts) {
            // 1. Try exact ID match (case insensitive)
            const idMatch = AVAILABLE_CONDITIONS.find(c => c.id.toLowerCase() === part.toLowerCase())
            if (idMatch) {
                conditionIds.push(idMatch.id)
                continue
            }

            // 2. Try Label match (contains) in AVAILABLE_CONDITIONS
            const labelMatch = AVAILABLE_CONDITIONS.find(c => c.label.toLowerCase().includes(part.toLowerCase()))
            if (labelMatch) {
                conditionIds.push(labelMatch.id)
                continue
            }

            // 3. Try QUICK_ADD_MOLECULES (ID or Label)
            const quickAddKey = Object.keys(QUICK_ADD_MOLECULES).find(k => k.toLowerCase() === part.toLowerCase())
            if (quickAddKey) {
                conditionIds.push(quickAddKey)
                continue
            }

            const quickAddLabel = Object.entries(QUICK_ADD_MOLECULES).find(([, v]) => v.label.toLowerCase().includes(part.toLowerCase()))
            if (quickAddLabel) {
                conditionIds.push(quickAddLabel[0])
                continue
            }

            // Fallback for known mappings if labels are tricky
            if (part.toLowerCase() === 'acid' || part === 'H+') conditionIds.push('h2so4') // Map generic acid to H2SO4? Or maybe we need a generic acid condition?
            // Assuming H2SO4 for now if not found, or maybe just ignore.
        }

        if (onConditionsChange) {
            onConditionsChange(conditionIds)
        } else {
            setInternalConditions(conditionIds)
        }
    }

    return (
        <div className="reaction-panel">
            <div className="panel-header">
                <h3>⚡ Reaction Workbench</h3>
            </div>

            <div className="conditions-selector">
                {showConditionError && <div className="condition-error-msg">⚠️ Please select at least one condition</div>}
                <h4>Select Conditions:</h4>
                <div className="conditions-grid">
                    {AVAILABLE_CONDITIONS.map(cond => (
                        <button
                            key={cond.id}
                            className={`condition-tag ${selectedConditions.includes(cond.id) ? 'active' : ''}`}
                            onClick={() => handleConditionToggle(cond.id)}
                        >
                            {cond.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="reaction-actions">
                <button
                    className="btn-primary"
                    disabled={isRunning}
                    onClick={handleRunReaction}
                >
                    {isRunning ? 'Running...' : '🚀 Run Matching Reactions'}
                </button>
            </div>

            {
                searchPerformed && results.length === 0 && (
                    <div className="no-matches-container">
                        <p className="no-matches-text">No matching reactions found. Check Reagents and Conditions.</p>
                    </div>
                )
            }

            {
                results.length > 0 && (
                    <div className="products-section">
                        {results.map((res, resIdx) => (
                            <div key={resIdx} className="reaction-result-group">
                                <h4
                                    className="reaction-result-title clickable"
                                    onClick={() => handleReactionInfoClick(res.curriculum_subsubject_id)}
                                    title="Click to view reaction mechanism"
                                >
                                    <span style={{ marginRight: '8px', fontSize: '1.1em', opacity: 0.8 }}>ⓘ</span>
                                    Via {res.reactionName}
                                    {results.length > 1 && res.rank && (
                                        <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '8px' }}>
                                            (Rank: {res.rank})
                                        </span>
                                    )}
                                    <span className="reaction-explanation">
                                        {res.matchExplanation && `(${res.matchExplanation})`}
                                    </span>
                                </h4>


                                {/* Special Explanation Widget for Substitution/Elimination or complex matches */}
                                {res.reactionId === 'elimination_substitution' && res.matchExplanation && (
                                    <div style={{
                                        backgroundColor: '#1e3a8a', // Dark blue
                                        border: '1px solid #3b82f6',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        margin: '12px 0 20px 0',
                                        color: '#e0f2fe', // Light blue text
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px',
                                            borderBottom: '1px solid #3b82f6',
                                            paddingBottom: '8px'
                                        }}>
                                            <span style={{
                                                fontSize: '2rem',
                                                fontWeight: '800',
                                                color: '#60a5fa',
                                                letterSpacing: '1px'
                                            }}>
                                                {res.mechanism || 'REACTION'}
                                            </span>
                                            <span style={{
                                                textTransform: 'uppercase',
                                                fontSize: '0.75rem',
                                                opacity: 0.8,
                                                letterSpacing: '1px'
                                            }}>
                                                Chemistry Engine Logic
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: '1rem',
                                            lineHeight: '1.6',
                                            opacity: 0.95
                                        }}>
                                            {res.matchExplanation}
                                        </div>
                                    </div>
                                )}

                                <div style={{ padding: '0 0px 8px 0px' }}>
                                    <button
                                        className="reaction-mechanism-btn"
                                        onClick={() => handleViewMechanism(res.reactionName, res.smarts, res.autoAdd, res.reactionId)}
                                        disabled={isMechanismLoading === res.reactionName}
                                    >
                                        {isMechanismLoading === res.reactionName ? 'Loading...' : 'Steps'}
                                    </button>
                                </div>
                                <div className="products-layout-container">
                                    <div className="products-grid main-organic">
                                        {res.products.map((prod, idx) => (
                                            <div key={idx} className="product-card">
                                                <div className="product-img">
                                                    <MoleculeViewer smiles={prod.smiles} width={140} height={100} readOnly={true} />
                                                </div>
                                                <button
                                                    className="btn-small"
                                                    onClick={() => handleAddToEditor(prod.smiles)}
                                                >
                                                    Add to Editor
                                                </button>
                                                {prod.nextStep && (
                                                    <button
                                                        className="btn-small btn-continue"
                                                        style={{ marginTop: '4px', backgroundColor: '#1565c0', color: 'white', border: '1px solid #0d47a1' }}
                                                        onClick={() => handleContinueReaction(prod.nextStep!.requiredReactants)}
                                                        title={`Apply next reaction: ${prod.nextStep.ruleName}`}
                                                    >
                                                        Continue &rarr;
                                                    </button>
                                                )}
                                                {!['elimination_substitution', 'intramolecular_substitution', 'sn1_reaction', 'sn2_reaction', 'e1_reaction', 'e2_reaction'].includes(res.reactionId) && (
                                                    <SelectivityChart
                                                        type={prod.selectivity as any}
                                                        label={prod.selectivity === 'major' ? 'Major' : prod.selectivity === 'minor' ? 'Minor' : 'Mixture'}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {res.byproducts.length > 0 && (
                                        <div className="byproducts-sidebar">
                                            <h5 className="byproducts-title">Inorganic Byproducts</h5>
                                            <div className="byproducts-list">
                                                {res.byproducts.map((bSmi, bIdx) => (
                                                    <div key={bIdx} className="byproduct-item" title={bSmi}>
                                                        <MoleculeViewer smiles={bSmi} width={60} height={50} readOnly={true} />
                                                        <span className="byproduct-label">{bSmi}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                        }
                    </div >
                )
            }

            {/* Reaction Info Modal */}
            <CurriculumModal
                topic={selectedReactionInfo}
                onClose={() => setSelectedReactionInfo(null)}
                onExperiment={handleCurriculumExperiment}
            />

            {/* Reaction Mechanism Modal */}
            {
                mechanismResult && (
                    <div className="mechanism-modal-overlay" onClick={() => setMechanismResult(null)}>
                        <div className="mechanism-modal-content" onClick={e => e.stopPropagation()}>
                            <div className="mechanism-modal-header">
                                <h3>Reaction Mechanism: {mechanismResult.reactionName || 'Details'}</h3>
                                <button className="close-modal-btn" onClick={() => setMechanismResult(null)}>×</button>
                            </div>
                            <div className="mechanism-modal-body">
                                <ReactionMechanismGraph
                                    debugResult={mechanismResult}
                                    onMoleculeUpdate={() => { }}
                                    interactive={false}
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

export default ReactionPanel
