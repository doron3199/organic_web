import { useState, useEffect } from 'react'
import { findMatchingReactions } from '../services/reactions'
import { rdkitService } from '../services/rdkit'
import { SubSubject, initialCurriculum } from '../data/curriculum'
import CurriculumModal from './CurriculumModal'
import MoleculeViewer from './MoleculeViewer'
import SelectivityChart from './SelectivityChart'
import './ReactionPanel.css'

interface ReactionPanelProps {
    currentMolecule: string
    onMoleculeUpdate: (smiles: string) => void
    onRequestSmiles?: () => Promise<string | undefined>
    initialConditions?: string[]
}

const AVAILABLE_CONDITIONS = [
    { id: 'heat', label: '🔥 Heat (\u0394)' },
    { id: 'light', label: '☀️ Light (hv)' },
    { id: 'acid', label: '🧪 Acid (H+)' },
    { id: 'base', label: '🧼 Base (OH-)' },
    { id: 'h2o', label: '💧 Water' },
]

function ReactionPanel({ currentMolecule, onMoleculeUpdate, onRequestSmiles, initialConditions }: ReactionPanelProps) {
    const [selectedConditions, setSelectedConditions] = useState<string[]>(initialConditions || ['h2o'])

    const [results, setResults] = useState<{ reactionId: string, reactionName: string, matchExplanation?: string, products: { smiles: string, selectivity: string }[] }[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [searchPerformed, setSearchPerformed] = useState(false)
    const [showConditionError, setShowConditionError] = useState(false)
    const [isSingleSelect, setIsSingleSelect] = useState(true)
    const [unsupportedError, setUnsupportedError] = useState(false)
    const [selectedReactionInfo, setSelectedReactionInfo] = useState<SubSubject | null>(null)

    // Update conditions when prop changes (e.g. from Experiment button)
    useEffect(() => {
        if (initialConditions && initialConditions.length > 0) {
            setSelectedConditions(initialConditions)
        }
    }, [initialConditions])

    // Helper: Determine valid rules for a given molecule and set of conditions
    const getMatchingRules = (smiles: string | null, conditions: string[]) => {
        if (!smiles) return []
        const reactantsParts = smiles.split('.')
        const conditionMatchedRules = findMatchingReactions(conditions)

        // STRICT REQUIREMENT: Input must be exactly 2 reactants for current logic
        // (If we want to support 1 reactant later, we adjust this check)
        if (reactantsParts.length !== 2) {
            return []
        }

        const validRules = conditionMatchedRules.filter(rule => {
            if (!rule.reactant2Smarts) return false
            const [r1, r2] = reactantsParts

            // Check Permutation 1: Input A matches Rule 1, Input B matches Rule 2
            const match1 = rdkitService.getSubstructureMatch(r1, rule.reactant1Smarts) &&
                rdkitService.getSubstructureMatch(r2, rule.reactant2Smarts)

            // Check Permutation 2: Input A matches Rule 2, Input B matches Rule 1
            const match2 = rdkitService.getSubstructureMatch(r1, rule.reactant2Smarts) &&
                rdkitService.getSubstructureMatch(r2, rule.reactant1Smarts)

            return match1 || match2
        })

        // Deduplicate
        return validRules.filter((rule, index) => {
            return validRules.findIndex(r => r.name === rule.name) === index
        })
    }

    // Filter reactions based on selected conditions and reactant availability
    useEffect(() => {
        // Error handling updates
        if (currentMolecule && currentMolecule.split('.').length !== 2) {
            // Only show unsupported error if we actually have a molecule but it's wrong count
            // and we aren't just empty
            setUnsupportedError(true)
        } else {
            setUnsupportedError(false)
        }
    }, [selectedConditions, currentMolecule])


    const handleConditionToggle = (id: string) => {
        setSelectedConditions(prev => {
            let newConds: string[]

            if (isSingleSelect) {
                // In single select mode:
                // If clicking active one -> toggle off (empty)
                // If clicking inactive one -> replace all with this one
                if (prev.includes(id)) {
                    newConds = []
                } else {
                    newConds = [id]
                }
            } else {
                // Multi select mode (standard toggle)
                newConds = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
            }

            if (newConds.length > 0) setShowConditionError(false)
            return newConds
        })
    }

    const handleReactionInfoClick = (reactionId: string) => {
        // Try to find exact match in examples or rules
        for (const subject of initialCurriculum) {
            for (const sub of subject.subSubjects) {
                // Check reaction examples
                if (sub.reactionExamples?.some(ex => ex.id === reactionId)) {
                    setSelectedReactionInfo(sub)
                    return
                }
                // Check rules just in case
                if (sub.rules.some(r => r.id === reactionId)) {
                    setSelectedReactionInfo(sub)
                    return
                }
            }
        }

        // Fallback: Category matching based on ID string
        if (reactionId.includes('alkane')) {
            const subject = initialCurriculum.find(s => s.id === 'alkanes')
            const sub = subject?.subSubjects.find(s => s.id === 'alkanes-reactions')
            if (sub) {
                setSelectedReactionInfo(sub)
                return
            }
        }
        if (reactionId.includes('alkene')) {
            const subject = initialCurriculum.find(s => s.id === 'alkenes')
            const sub = subject?.subSubjects.find(s => s.id === 'alkenes-reactions')
            if (sub) {
                setSelectedReactionInfo(sub)
                return
            }
        }
        if (reactionId.includes('alkyne')) {
            const subject = initialCurriculum.find(s => s.id === 'alkynes')
            const sub = subject?.subSubjects.find(s => s.id === 'alkynes-reactions')
            if (sub) {
                setSelectedReactionInfo(sub)
                return
            }
        }
    }

    const handleRunReaction = async () => {
        if (selectedConditions.length === 0) {
            setShowConditionError(true)
            return
        }
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
            // If explicit run and no rules, maybe mismatch count?
            if (moleculeToReact.split('.').length !== 2) setUnsupportedError(true)
            setSearchPerformed(true)
            return
        }

        setIsRunning(true)
        const allResults: { reactionId: string, reactionName: string, matchExplanation?: string, products: { smiles: string, selectivity: string }[] }[] = []

        // Split molecule into independent reactants
        const reactantsSmiles = moleculeToReact.split('.');

        // Try every matched rule
        for (const rule of rulesToRun) {
            // STEP 1: Check if required reactants are present in the pot (using SMARTS)
            const reactant1Candidates = reactantsSmiles.filter(smi =>
                rdkitService.getSubstructureMatch(smi, rule.reactant1Smarts)
            );

            let reactant2Candidates: string[] = [];
            if (rule.reactant2Smarts) {
                reactant2Candidates = reactantsSmiles.filter(smi =>
                    rdkitService.getSubstructureMatch(smi, rule.reactant2Smarts!)
                );
            }

            if (reactant1Candidates.length === 0) continue;
            if (rule.reactant2Smarts && reactant2Candidates.length === 0) continue;

            const ruleProducts = new Map<string, { smiles: string, selectivity: string, rankIndex: number }>()

            // STEP 2: Iterate and Run
            for (const r1 of reactant1Candidates) {
                if (rule.reactant2Smarts) {
                    for (const r2 of reactant2Candidates) {
                        const outcomes = await rdkitService.runReaction([r1, r2], rule.reactionSmarts)
                        if (outcomes) {
                            outcomes.forEach(pSmiles => {
                                let matchIndex = 999;
                                // Check selectivity rules to find priority
                                if (rule.selectivity) {
                                    rule.selectivity.rules.forEach((selRule, idx) => {
                                        if (matchIndex === 999 && rdkitService.getSubstructureMatch(pSmiles, selRule.smarts)) {
                                            matchIndex = idx;
                                        }
                                    })
                                }
                                ruleProducts.set(pSmiles, { smiles: pSmiles, selectivity: 'equal', rankIndex: matchIndex })
                            })
                        }
                    }
                } else {
                    // Single reactant path (if we ever support it in UI)
                    const outcomes = await rdkitService.runReaction([r1], rule.reactionSmarts)
                    if (outcomes) {
                        outcomes.forEach(pSmiles => {
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
                    }
                }
            }

            // STEP 3: Determine Relative Selectivity
            // Find the best rank (lowest index) actually present in this batch of products
            if (ruleProducts.size > 0 && rule.selectivity) {
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

                allResults.push({
                    reactionId: rule.id,
                    reactionName: rule.name,
                    matchExplanation: explanation,
                    products: Array.from(ruleProducts.values()).map(p => ({ smiles: p.smiles, selectivity: p.selectivity }))
                })
            }
        }

        setResults(allResults)
        setSearchPerformed(true)
        setIsRunning(false)
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
                <div className="toggle-switch-container">
                    <span>Multi-Select</span>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={isSingleSelect}
                            onChange={(e) => {
                                setIsSingleSelect(e.target.checked)
                                // If switching TO single select and multiple are selected, keep only first or clear?
                                // Let's keep the most recent or just the first one to be safe.
                                if (e.target.checked && selectedConditions.length > 1) {
                                    setSelectedConditions([selectedConditions[0]])
                                }
                            }}
                        />
                        <span className="slider"></span>
                    </label>
                    <span>Single-Select</span>
                </div>

                {showConditionError && <div className="condition-error-msg">⚠️ Please select at least one condition</div>}
                {unsupportedError && <div className="condition-error-msg">⚠️ Reaction not supported: Exact 2 reactants required</div>}
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
                                    onClick={() => handleReactionInfoClick(res.reactionId)}
                                    title="Click to view reaction mechanism"
                                >
                                    <span style={{ marginRight: '8px', fontSize: '1.1em', opacity: 0.8 }}>ⓘ</span>
                                    Via {res.reactionName} <span className="reaction-explanation">
                                        {res.matchExplanation && `(${res.matchExplanation})`}
                                    </span>
                                </h4>
                                <div className="products-grid">
                                    {res.products.map((prod, idx) => (
                                        <div key={idx} className="product-card">
                                            <div className="product-img">
                                                <MoleculeViewer smiles={prod.smiles} width={150} height={100} readOnly={true} />
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
        </div>
    )
}

export default ReactionPanel
