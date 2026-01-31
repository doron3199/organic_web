import { useState, useEffect } from 'react'
import { findMatchingReactions } from '../services/reactions'
import { rdkitService, DebugReactionOutcome } from '../services/rdkit'
import { SubSubject, initialCurriculum } from '../data/curriculum'
import { AVAILABLE_CONDITIONS } from '../services/conditions'
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
    const [internalConditions, setInternalConditions] = useState<string[]>(initialConditions || ['h2o'])

    // Use prop if available, otherwise internal state
    const selectedConditions = propConditions !== undefined ? propConditions : internalConditions

    const [results, setResults] = useState<{
        reactionId: string,
        reactionName: string,
        curriculum_subsubject_id: string,
        matchExplanation?: string,
        products: { smiles: string, selectivity: string }[],
        byproducts: string[],
        smarts: string
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

    const handleViewMechanism = async (reactionName: string, smarts: string) => {
        if (!currentMolecule) return

        setIsMechanismLoading(reactionName)
        try {
            const reactants = currentMolecule.split('.')

            // Handle potentially multi-line SMARTS string (for multi-step reactions)
            // If it's a string, we check for newlines or just pass it if it's single
            // ReactionDebugPanel logic handles string[] or single string. rdkitService expects string or string[].

            let smartsArg: string | string[] = smarts
            if (smarts.includes('\n')) {
                smartsArg = smarts.split('\n').map(s => s.trim()).filter(s => !!s)
            }

            const result = await rdkitService.runReaction(reactants, smartsArg, true) as import('../services/rdkit').DebugReactionOutcome | null
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

        // 1. Fetch latest SMILES directly to ensure we aren't using stale state
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
            setSearchPerformed(true)
            return
        }

        setIsRunning(true)
        const allResults: {
            reactionId: string,
            reactionName: string,
            curriculum_subsubject_id: string,
            matchExplanation?: string,
            products: { smiles: string, selectivity: string }[],
            byproducts: string[],
            smarts: string
        }[] = []

        // Split molecule into independent reactants
        const reactantsSmiles = moleculeToReact.split('.');

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

                const outcome = await rdkitService.runReaction(reactantsForRun, rule.reactionSmarts, false)
                if (outcome) {
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
                }
            }

            // STEP 3: Determine Relative Selectivity
            // If there's only one unique product, it's the major product
            if (ruleProducts.size === 1) {
                const singleProd = Array.from(ruleProducts.values())[0]
                if (singleProd) singleProd.selectivity = 'major'
            }
            // Otherwise, find the best rank (lowest index) if rules exist
            else if (ruleProducts.size > 0 && rule.selectivity) {
                let bestRankFound = 999;
                for (const prod of ruleProducts.values()) {
                    if (prod.rankIndex < bestRankFound) bestRankFound = prod.rankIndex
                }

                // If we found any hierarchy matches
                if (bestRankFound !== 999) {
                    for (const prod of ruleProducts.values()) {
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

            if (ruleProducts.size > 0) {
                // Enhance match explanation with conditions
                let explanation = rule.matchExplanation || '';
                if (rule.conditions && rule.conditions.length > 0) {
                    explanation += ` + ${rule.conditions.join(', ')}`;
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
                    products: Array.from(ruleProducts.values()).map(p => ({ smiles: p.smiles, selectivity: p.selectivity })),
                    byproducts: Array.from(ruleByproducts),
                    smarts: smartsStr
                })
            }
        }

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
                                    Via {res.reactionName} <span className="reaction-explanation">
                                        {res.matchExplanation && `(${res.matchExplanation})`}
                                    </span>
                                </h4>
                                <div style={{ padding: '0 0px 8px 0px' }}>
                                    <button
                                        className="reaction-mechanism-btn"
                                        onClick={() => handleViewMechanism(res.reactionName, res.smarts)}
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
                                                <SelectivityChart
                                                    type={prod.selectivity as any}
                                                    label={prod.selectivity === 'major' ? 'Major' : prod.selectivity === 'minor' ? 'Minor' : 'Mixture'}
                                                />
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
                        ))}
                    </div>
                )
            }

            {/* Reaction Info Modal */}
            <CurriculumModal
                topic={selectedReactionInfo}
                onClose={() => setSelectedReactionInfo(null)}
            />

            {/* Reaction Mechanism Modal */}
            {mechanismResult && (
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
            )}
        </div>
    )
}

export default ReactionPanel
