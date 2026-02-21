import { useState, useEffect } from 'react'



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
        mechanism?: string,  // logic engine mechanism (e.g. "SN2")
        perMechanism?: { mechanism: string, selectivity: string, organic: string[], inorganic: string[] }[],
        stepExplanations?: string[]
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

    const handleViewMechanism = async (reactionName: string, smarts: string, autoAdd?: (string | Record<string, never>)[], reactionId?: string, stepExplanations?: string[]) => {
        if (!currentMolecule) return

        setIsMechanismLoading(reactionName)
        try {
            const reactants = currentMolecule.split('.')
            let result: import('../services/rdkit').DebugReactionOutcome | null = null

            if (reactionId === 'elimination_substitution') {
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

                result = await rdkitService.runReaction(reactants, smartsArg, true, autoAdd, reactionName, reactionId) as import('../services/rdkit').DebugReactionOutcome | null
            }

            if (result) {
                // Backend now handles explanations and selectivity via reactionId lookup
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

        if (!moleculeToReact) {
            console.log("No molecule to react")
            return
        }

        setIsRunning(true)
        console.log("Running matching reactions for:", moleculeToReact, "Conditions:", selectedConditions)

        const reactants = moleculeToReact.split('.')
        const conditions = selectedConditions

        try {
            // Call Backend API
            console.log("Calling proposeReactions backend API...")
            const backendResults = await rdkitService.proposeReactions(reactants, conditions)
            console.log("Backend results:", backendResults)

            // Map backend results to Component state format
            // Backend returns: { reactionId, reactionName, curriculum_subsubject_id, matchExplanation, products: [...], byproducts, smarts, autoAdd, rank }
            // Component expects similar structure.

            const mappedResults = backendResults.map((res: any) => ({
                reactionId: res.reactionId,
                reactionName: res.reactionName,
                curriculum_subsubject_id: res.curriculum_subsubject_id,
                matchExplanation: res.matchExplanation,
                products: res.products.map((p: any) => ({
                    smiles: p.smiles,
                    selectivity: p.selectivity,
                    nextStep: undefined // TODO: Backend could return this? Or we re-calc?
                })),
                byproducts: res.byproducts,
                smarts: Array.isArray(res.smarts) ? res.smarts.join('\n') : res.smarts,
                autoAdd: res.autoAdd,
                rank: res.rank,
                mechanism: res.mechanism, // if any
                perMechanism: res.perMechanism, // per-mechanism breakdown
                stepExplanations: res.stepExplanations // per-step explanations from SmartsEntry
            }))

            setResults(mappedResults)
            setSearchPerformed(true)

            // If exactly one reaction matches, auto-trigger the debugger
            if (mappedResults.length === 1 && onReactionRun) {
                const res = mappedResults[0]
                onReactionRun({
                    id: res.reactionId,
                    name: res.reactionName,
                    smarts: res.smarts
                })
            }

        } catch (e) {
            console.error("Reaction run failed", e)
        } finally {
            setIsRunning(false)
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
                                        onClick={() => handleViewMechanism(res.reactionName, res.smarts, res.autoAdd, res.reactionId, res.stepExplanations)}
                                        disabled={isMechanismLoading === res.reactionName}
                                    >
                                        {isMechanismLoading === res.reactionName ? 'Loading...' : 'Steps'}
                                    </button>
                                </div>
                                {/* Per-mechanism split display for SN/E reactions */}
                                {res.perMechanism && res.perMechanism.length > 1 ? (
                                    <div className="per-mechanism-container">
                                        {res.perMechanism.map((mechData, mechIdx) => (
                                            <div key={mechIdx} className="mechanism-row">
                                                <div className="mechanism-row-header">
                                                    <span className={`mechanism-badge ${mechData.selectivity === 'major' ? 'mechanism-badge-major' : 'mechanism-badge-minor'}`}>
                                                        {mechData.mechanism}
                                                    </span>
                                                    <span className={`mechanism-selectivity ${mechData.selectivity}`}>
                                                        {mechData.selectivity === 'major' ? '★ Major Product' : '○ Minor Product'}
                                                    </span>
                                                </div>
                                                <div className="products-layout-container">
                                                    <div className="products-grid main-organic">
                                                        {mechData.organic.map((smi, idx) => (
                                                            <div key={idx} className="product-card">
                                                                <div className="product-img">
                                                                    <MoleculeViewer smiles={smi} width={140} height={100} readOnly={true} />
                                                                </div>
                                                                <button
                                                                    className="btn-small"
                                                                    onClick={() => handleAddToEditor(smi)}
                                                                >
                                                                    Add to Editor
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {mechData.inorganic.length > 0 && (
                                                        <div className="byproducts-sidebar">
                                                            <h5 className="byproducts-title">Inorganic Byproducts</h5>
                                                            <div className="byproducts-list">
                                                                {mechData.inorganic.map((bSmi, bIdx) => (
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
                                ) : (
                                    /* Standard single-row display */
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
                                                    {!['elimination_substitution', 'sn1_reaction', 'sn2_reaction', 'e1_reaction', 'e2_reaction'].includes(res.reactionId) && (
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
                                )}
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
