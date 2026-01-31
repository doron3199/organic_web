import { useState, useEffect, useMemo } from 'react'
import {
    rdkitService,
    ReactionStep,
    DebugReactionOutcome
} from '../services/rdkit'
import { findMatchingReactions } from '../services/reactions'
import { ReactionRule } from '../services/reaction_definitions'
import MoleculeViewer from './MoleculeViewer'
import './ReactionDebugPanel.css'
import { ReactionMechanismGraph } from './ReactionMechanismGraph'

interface ReactionDebugPanelProps {
    currentMolecule: string
    onMoleculeUpdate: (smiles: string) => void
    selectedConditions?: string[]
    triggeredReaction?: { id: string, name: string, smarts: string | string[] } | null
}

function ReactionDebugPanel({ currentMolecule, onMoleculeUpdate, selectedConditions, triggeredReaction }: ReactionDebugPanelProps) {
    const [smartsInput, setSmartsInput] = useState<string>('')
    const [debugResult, setDebugResult] = useState<DebugReactionOutcome | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedStep, setSelectedStep] = useState<ReactionStep | null>(null)

    // Matching reactions from current molecule
    const [matchingReactions, setMatchingReactions] = useState<ReactionRule[]>([])
    const [selectedReactionIdx, setSelectedReactionIdx] = useState<number>(-1)

    // Find matching reactions whenever the molecule changes
    useEffect(() => {
        if (!currentMolecule) {
            setMatchingReactions([])
            return
        }

        const reactantsParts = currentMolecule.split('.')
        // Use selected conditions for filtering (default to empty if not provided)
        const conditions = new Set(selectedConditions || [])
        const matches = findMatchingReactions(conditions, reactantsParts)
        setMatchingReactions(matches)
        setSelectedReactionIdx(-1)
    }, [currentMolecule, selectedConditions])

    // Auto-select and run debug if a reaction was triggered from the workbench
    useEffect(() => {
        if (triggeredReaction && matchingReactions.length > 0) {
            const matchIdx = matchingReactions.findIndex(r => r.id === triggeredReaction.id)
            if (matchIdx !== -1) {
                setSelectedReactionIdx(matchIdx)
                // Set the smarts input field as well
                const smarts = Array.isArray(triggeredReaction.smarts)
                    ? triggeredReaction.smarts.join('\n')
                    : triggeredReaction.smarts
                setSmartsInput(smarts)
                handleRunDebug(triggeredReaction.smarts)
            }
        }
    }, [triggeredReaction, matchingReactions])

    // Reaction mechanism graph component used here
    useEffect(() => {
        // No local graph logic needed anymore, state passed to child component
    }, [debugResult])

    const handleReactionSelect = (idx: number) => {
        setSelectedReactionIdx(idx)
        if (idx >= 0 && idx < matchingReactions.length) {
            const rule = matchingReactions[idx]
            const smarts = Array.isArray(rule.reactionSmarts)
                ? rule.reactionSmarts.join('\n')
                : rule.reactionSmarts
            setSmartsInput(smarts)
        }
    }

    const handleRunDebug = async (overrideSMARTS?: string | string[]) => {
        const smartsToUse = overrideSMARTS || smartsInput

        if (!smartsToUse || (typeof smartsToUse === 'string' && !smartsToUse.trim())) {
            setError('Please enter a SMARTS string or select a reaction from the dropdown')
            return
        }
        if (!currentMolecule.trim()) {
            setError('No molecule loaded. Enter a SMILES in the editor above.')
            return
        }

        setError(null)
        setIsRunning(true)
        setDebugResult(null)
        setSelectedStep(null)

        try {
            let smartsSteps: string[] = []
            if (Array.isArray(smartsToUse)) {
                smartsSteps = smartsToUse
            } else {
                smartsSteps = smartsToUse
                    .split('\n')
                    .map(s => s.trim())
                    .filter(s => s.length > 0)
            }

            const reactants = currentMolecule.split('.')
            const result = await rdkitService.runReaction(reactants, smartsSteps.length > 1 ? smartsSteps : smartsSteps[0], true) as DebugReactionOutcome | null

            if (result) {
                setDebugResult(result)
                console.log("debug result")
                // full print as object
                console.log(JSON.stringify(result, null, 2))
            } else {
                setError('No results returned from reaction')
            }
        } catch (e) {
            setError('Error running reaction: ' + (e as Error).message)
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <div className="reaction-debug-panel">
            <div className="debug-header">
                <h4>🔧 Reaction Debug</h4>
            </div>

            <div className="smarts-input-section">
                <div className="reaction-selector">
                    <label>Select Matching Reaction:</label>
                    <select
                        value={selectedReactionIdx}
                        onChange={(e) => handleReactionSelect(parseInt(e.target.value))}
                        className="reaction-dropdown"
                    >
                        <option value={-1}>-- Choose a reaction or enter SMARTS manually --</option>
                        {matchingReactions.map((rule, idx) => (
                            <option key={rule.id} value={idx}>
                                {rule.name} {rule.matchExplanation ? `(${rule.matchExplanation})` : ''}
                            </option>
                        ))}
                    </select>
                    {matchingReactions.length === 0 && currentMolecule && (
                        <span className="no-matches-hint">No matching reactions for current molecule</span>
                    )}
                </div>

                <label>SMARTS String(s):</label>
                <textarea
                    value={smartsInput}
                    onChange={(e) => {
                        setSmartsInput(e.target.value)
                        setSelectedReactionIdx(-1)
                    }}
                    placeholder="Enter SMARTS pattern(s), one per line for multi-step reactions"
                    rows={3}
                />

                <div className="current-molecule-info">
                    <span className="label">Current molecule (from Ketcher):</span>
                    <code>{currentMolecule || '(empty)'}</code>
                </div>

                <button
                    className="run-debug-btn"
                    onClick={() => handleRunDebug()}
                    disabled={isRunning}
                >
                    {isRunning ? '⏳ Running...' : '▶ Run Debug'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {debugResult && (
                <div className="debug-results-container">
                    <div className="graph-section">
                        <div className="results-header">
                            <h5>Reaction Tree ({debugResult.steps.length} steps)</h5>
                            <span className="zoom-hint">🖱️ Scroll to zoom, drag to pan</span>
                        </div>
                        <div className="react-flow-host">
                            <ReactionMechanismGraph
                                debugResult={debugResult}
                                onStepSelect={setSelectedStep}
                                selectedStep={selectedStep}
                                onMoleculeUpdate={onMoleculeUpdate}
                                interactive={true}
                            />
                        </div>
                    </div>

                    <div className="details-section">
                        {selectedStep ? (
                            <div className="step-details">
                                <div className="details-header">
                                    <h5>Step Details: {selectedStep.step_type}</h5>
                                    <span className="step-id-badge">#{selectedStep.step_index}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">SMARTS:</span>
                                    <code className="value smarts-code">{selectedStep.smarts_used}</code>
                                </div>
                                {selectedStep.input_smiles.length > 0 && (
                                    <div className="detail-row">
                                        <span className="label">Inputs:</span>
                                        <div className="products-row">
                                            <span style={{ fontSize: '0.85rem' }}>{selectedStep.input_smiles.join(' + ')}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="detail-row">
                                    <span className="label">Products:</span>
                                    <div className="products-row">
                                        {selectedStep.products.map((prod, idx) => (
                                            <div key={idx} className="detail-product">
                                                <MoleculeViewer smiles={prod} width={100} height={80} readOnly={true} />
                                                <div className="product-smiles-label">{prod}</div>
                                                <button className="add-btn" onClick={() => onMoleculeUpdate(prod)} title="Add to editor">+</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="step-details empty">
                                <p>Select a step in the graph to see details</p>
                            </div>
                        )}

                        <div className="final-products-section">
                            <h5>🎯 Final Products</h5>
                            <div className="final-products-grid">
                                {debugResult.finalProducts.map((prod, idx) => (
                                    <div key={idx} className="final-product-card">
                                        <MoleculeViewer
                                            smiles={prod}
                                            width={120}
                                            height={90}
                                            readOnly={true}
                                        />
                                        <div className="product-smiles-label">{prod}</div>
                                        <button
                                            className="add-btn"
                                            onClick={() => onMoleculeUpdate(prod)}
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                                {debugResult.finalProducts.length === 0 && (
                                    <span className="no-products-msg">No final products found</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}

export default ReactionDebugPanel
