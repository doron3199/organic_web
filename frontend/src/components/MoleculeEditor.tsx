import { useRef, useState, useEffect } from 'react'
import { Editor } from 'ketcher-react'
import { StandaloneStructServiceProvider } from 'ketcher-standalone'
import { Ketcher, StructServiceProvider } from 'ketcher-core'
import 'ketcher-react/dist/index.css'
import './MoleculeEditor.css'

import { AnalysisResult } from '../services/logicEngine'

interface MoleculeEditorProps {
    onMoleculeChange?: (smiles: string) => void
    initialMolecule?: string
    initialConditions?: string[]
    onBack: () => void
    onNameMolecule: (smiles: string) => AnalysisResult
    showDebugPanel?: boolean
}

const structServiceProvider = new StandaloneStructServiceProvider() as StructServiceProvider
if ('setMaxListeners' in structServiceProvider) {
    (structServiceProvider as any).setMaxListeners(20)
}

// ... imports
import ReactionPanel from './ReactionPanel'
import ReactionDebugPanel from './ReactionDebugPanel'

// ... existing code ...

function MoleculeEditor({ onMoleculeChange, initialMolecule, initialConditions, onBack, onNameMolecule, showDebugPanel }: MoleculeEditorProps) {
    const ketcherRef = useRef<Ketcher | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [message, setMessage] = useState('Initializing...')
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

    const [currentSmiles, setCurrentSmiles] = useState<string>('')
    const lastInternalSmiles = useRef<string | null>(null)

    // Lifted State for Reaction Conditions
    const [selectedConditions, setSelectedConditions] = useState<string[]>(initialConditions || [])

    // State for triggering debugger from reaction panel
    const [triggeredReaction, setTriggeredReaction] = useState<{ id: string, name: string, smarts: string | string[] } | null>(null)

    // Update molecule if initialMolecule prop changes (e.g. loading new example)
    useEffect(() => {
        if (ketcherRef.current && initialMolecule) {
            if (initialMolecule === lastInternalSmiles.current) {
                return
            }
            ketcherRef.current.setMolecule(initialMolecule).catch(console.error)
            setAnalysisResult(null)
            setCurrentSmiles(initialMolecule) // Keep sync
            setMessage('Loaded new molecule')
        }
    }, [initialMolecule])

    // Update conditions if initialConditions prop changes
    useEffect(() => {
        if (initialConditions) {
            setSelectedConditions(initialConditions)
        }
    }, [initialConditions])

    // Handle Reset
    const handleReset = async () => {
        if (!ketcherRef.current) return
        try {
            await ketcherRef.current.setMolecule(initialMolecule || '')
            setMessage('Refreshed to original molecule')
            setAnalysisResult(null)
            lastInternalSmiles.current = null // Clear tracking on manual reset
            setCurrentSmiles(initialMolecule || '')
            if (initialConditions) setSelectedConditions(initialConditions)
        } catch (error) {
            console.error('Reset failed:', error)
        }
    }

    const updateCurrentSmiles = async () => {
        if (!ketcherRef.current) return
        try {
            const smiles = await ketcherRef.current.getSmiles()
            setCurrentSmiles(smiles)
            if (onMoleculeChange) onMoleculeChange(smiles)
            return smiles
        } catch (e) {
            console.error(e)
            return ''
        }
    }

    const handleNameMoleculeClick = async () => {
        if (!ketcherRef.current) return

        try {
            const smiles = await updateCurrentSmiles()
            if (!smiles) return

            lastInternalSmiles.current = smiles // Track this as internal update

            const result = onNameMolecule(smiles)
            setAnalysisResult(result)
            setMessage('Molecule named!')
        } catch (error) {
            console.error('Naming failed:', error)
            setMessage('Error identifying molecule')
        }
    }

    const handleReactionUpdate = async (newSmiles: string) => {
        if (!ketcherRef.current) return
        try {
            await ketcherRef.current.setMolecule(newSmiles)
            setCurrentSmiles(newSmiles)
            lastInternalSmiles.current = newSmiles
            if (onMoleculeChange) onMoleculeChange(newSmiles)
            setMessage('Product added to editor')
            setAnalysisResult(null) // Reset analysis as molecule changed
        } catch (e) {
            console.error('Failed to update editor:', e)
        }
    }

    const handleQuickAdd = async (smilesToAdd: string, label: string) => {
        if (!ketcherRef.current) return
        try {
            const current = await ketcherRef.current.getSmiles()
            const newSmiles = current ? `${current}.${smilesToAdd}` : smilesToAdd
            await ketcherRef.current.setMolecule(newSmiles)
            setCurrentSmiles(newSmiles)
            if (onMoleculeChange) onMoleculeChange(newSmiles)
            setMessage(`Added ${label}`)
            setAnalysisResult(null)
        } catch (e) {
            console.error('Quick add failed:', e)
            setMessage(`Error adding ${label}`)
        }
    }

    return (
        <div className="molecule-editor-container">
            {/* Header Controls */}
            <div className="editor-controls-header">
                <button className="control-btn back-btn" onClick={onBack} title="Return to Study Mode">
                    ← Back
                </button>
                <div className="editor-title-status">
                    <h3>Workbench</h3>
                    <span className="status-text">{message}</span>
                </div>
                <button
                    className="control-btn reset-btn"
                    onClick={handleReset}
                    disabled={!isReady}
                    title="Reset to original structure"
                >
                    ↺ Reset
                </button>
            </div>

            {/* Quick Add Buttons */}
            <div className="quick-add-bar" style={{ display: 'flex', gap: '8px', padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', justifyContent: 'center' }}>
                <span style={{ alignSelf: 'center', fontSize: '0.9em', opacity: 0.8, marginRight: '8px' }}>Quick Add:</span>
                <button className="btn-small" onClick={() => handleQuickAdd('[OH]S(=O)(=O)[OH]', 'H₂SO₄')} disabled={!isReady}>🧪 H₂SO₄</button>
                <button className="btn-small" onClick={() => handleQuickAdd('[OH-]', 'OH⁻')} disabled={!isReady}>🧼 OH⁻</button>
                <button className="btn-small" onClick={() => handleQuickAdd('O', 'H₂O')} disabled={!isReady}>💧 H₂O</button>
            </div>

            {/* Ketcher Editor */}
            <div className="editor-wrapper">
                {/* Status indicator overlay if needed, or just keep it clean */}
                {!isReady && (
                    <div className="loading-status-overlay">
                        <div className="spinner"></div>
                        <p>Loading Editor...</p>
                    </div>
                )}

                <Editor
                    staticResourcesUrl={import.meta.env.BASE_URL}
                    structServiceProvider={structServiceProvider}
                    onInit={(ketcher: Ketcher) => {
                        ketcherRef.current = ketcher
                            ; (window as any).ketcher = ketcher
                        setIsReady(true)
                        setMessage('Ready')

                        // Load initial molecule if provided
                        if (initialMolecule) {
                            ketcher.setMolecule(initialMolecule).catch(console.error)
                            setCurrentSmiles(initialMolecule)
                        }
                    }}
                    errorHandler={(message: string) => {
                        console.error('Ketcher error:', message)
                        setMessage(`Error: ${message}`)
                    }}
                />
            </div>

            {/* Footer Controls */}
            <div className="editor-footer-controls">
                <div className="button-group">
                    <button
                        className="action-btn name-btn"
                        onClick={handleNameMoleculeClick}
                        disabled={!isReady}
                    >
                        🏷️ Name Molecule
                    </button>
                    <button
                        className="action-btn smiles-btn"
                        onClick={async () => {
                            const s = await updateCurrentSmiles()
                            if (s) {
                                setAnalysisResult({ name: s, isValid: true, logs: [], appliedRuleIds: [], ruleResults: {} } as any)
                                setMessage('SMILES generated')
                            }
                        }}
                        disabled={!isReady}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                        📝 Get SMILES
                    </button>
                </div>

                {analysisResult && (
                    <div className="generated-name-display fade-in">
                        {renderInteractiveName(analysisResult)}
                    </div>
                )}
            </div>


            {/* Reaction Panel Overlay/Section - Always Visible */}
            <div className="reaction-panel-container fade-in">
                <ReactionPanel
                    currentMolecule={currentSmiles}
                    initialConditions={initialConditions} // Legacy prop, kept for init logic if needed, but state is now controlled
                    selectedConditions={selectedConditions}
                    onConditionsChange={setSelectedConditions}
                    onMoleculeUpdate={handleReactionUpdate}
                    onRequestSmiles={updateCurrentSmiles}
                    onReactionRun={(reaction) => setTriggeredReaction(reaction)}
                />

                {/* Debug Panel - Only in Testing Mode */}
                {showDebugPanel && (
                    <ReactionDebugPanel
                        currentMolecule={currentSmiles}
                        onMoleculeUpdate={handleReactionUpdate}
                        selectedConditions={selectedConditions}
                        triggeredReaction={triggeredReaction}
                    />
                )}
            </div>
        </div>
    )
}

function renderInteractiveName(result: AnalysisResult) {
    const renderFormattedText = (text: string) => {
        if (text.includes('<sub>')) {
            return <span dangerouslySetInnerHTML={{ __html: text }} />
        }
        return text
    }

    if (!result.nameParts || result.nameParts.length === 0) {
        return <span className="generated-smiles" style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{renderFormattedText(result.name || "Unknown")}</span>
    }

    const handleHover = (ids: number[] | undefined) => {
        if (!ids || ids.length === 0) return
        // @ts-ignore
        const ketcher = (window as any).ketcher
        if (ketcher) {
            try {
                ketcher.setSelection({ atoms: ids })
            } catch (e) {
                // Fallback to internal API if public fails
                if (ketcher.editor) ketcher.editor.setSelection({ atoms: ids })
            }
        }
    }

    const handleLeave = () => {
        // @ts-ignore
        const ketcher = (window as any).ketcher
        if (ketcher) {
            try {
                ketcher.setSelection(null)
            } catch (e) {
                if (ketcher && ketcher.editor) ketcher.editor.setSelection(null)
            }
        }
    }

    return (
        <div className="name-display-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {result.commonName && (
                <span className="common-name">
                    {result.commonNameParts && result.commonNameParts.length > 0 ? (
                        result.commonNameParts.map((part, idx) => (
                            <span
                                key={`common-${idx}`}
                                className={`name-part part-${part.type}`}
                                onMouseEnter={() => handleHover(part.ids)}
                                onMouseLeave={handleLeave}
                                style={{
                                    cursor: part.ids && part.ids.length > 0 ? 'pointer' : 'default',
                                    fontWeight: part.type === 'root' ? 'bold' : 'normal',
                                    color: part.type === 'root' ? '#4dabf7' : part.type === 'substituent' ? '#ff8787' : 'inherit'
                                }}
                            >
                                {renderFormattedText(part.text)}
                            </span>
                        ))
                    ) : (
                        <span style={{ fontSize: '1.2rem', color: '#4dabf7', fontWeight: 'bold' }}>
                            {renderFormattedText(result.commonName)}
                        </span>
                    )}
                    <span style={{ color: '#868e96', fontWeight: 'normal', margin: '0 8px', fontSize: '1rem' }}>or</span>
                </span>
            )}
            <span className="interactive-name">
                {result.nameParts.map((part, idx) => (
                    <span
                        key={idx}
                        className={`name-part part-${part.type}`}
                        onMouseEnter={() => handleHover(part.ids)}
                        onMouseLeave={handleLeave}
                        style={{
                            cursor: part.ids && part.ids.length > 0 ? 'pointer' : 'default',
                            fontWeight: part.type === 'root' ? 'bold' : 'normal',
                            color: part.type === 'root' ? '#4dabf7' : part.type === 'substituent' ? '#ff8787' : 'inherit'
                        }}
                        title={part.type}
                    >
                        {renderFormattedText(part.text)}
                    </span>
                ))}
            </span>
        </div>
    )
}

export default MoleculeEditor
