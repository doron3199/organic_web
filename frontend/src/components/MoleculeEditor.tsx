import { useRef, useState, useEffect } from 'react'
import { Editor } from 'ketcher-react'
import { StandaloneStructServiceProvider } from 'ketcher-standalone'
import { Ketcher, StructServiceProvider } from 'ketcher-core'
import 'ketcher-react/dist/index.css'
import './MoleculeEditor.css'

import { AnalysisResult } from '../services/logicEngine'
import { AcidComparisonResult, compareAcids } from '../services/acidBase'
import { QUICK_ADD_MOLECULES } from '../services/conditions'
import { urlSync } from '../services/urlSync'
import MoleculeViewer from './MoleculeViewer'
import { ALL_RULES } from '../data/allRules'

interface MoleculeEditorProps {
    onMoleculeChange?: (smiles: string) => void
    initialMolecule?: string
    initialConditions?: string[]
    initialWorkbenchSubMode?: 'reactions' | 'resonance' | 'aromatic-detector' | 'chiral-detector' | 'compare-acids'
    onBack: () => void
    onNameMolecule: (smiles: string, chainSelection?: 'pre-2013' | 'post-2013') => AnalysisResult
    onCompareAcids?: (result: AcidComparisonResult) => void
    pendingCompare?: { smilesA: string; smilesB: string } | null
    onCompareSeeded?: () => void
    showDebugPanel?: boolean
}

const structServiceProvider = new StandaloneStructServiceProvider() as StructServiceProvider
if ('setMaxListeners' in structServiceProvider) {
    (structServiceProvider as any).setMaxListeners(20)
}

// ... imports
import ReactionPanel from './ReactionPanel'
import ReactionDebugPanel from './ReactionDebugPanel'
import ResonanceDrawer from './ResonanceDrawer'
import AromaticDetector from './AromaticDetector'
import ChiralDetector from './ChiralDetector'

// ... existing code ...

function MoleculeEditor({ onMoleculeChange, initialMolecule, initialConditions, initialWorkbenchSubMode, onBack, onNameMolecule, onCompareAcids, pendingCompare, onCompareSeeded, showDebugPanel }: MoleculeEditorProps) {
    const ketcherRef = useRef<Ketcher | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [message, setMessage] = useState('Initializing...')
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)

    // Workbench sub-mode: reactions (default), resonance, aromatic-detector, chiral-detector, compare-acids
    const [workbenchSubMode, setWorkbenchSubMode] = useState<'reactions' | 'resonance' | 'aromatic-detector' | 'chiral-detector' | 'compare-acids'>(initialWorkbenchSubMode || 'reactions')

    const [currentSmiles, setCurrentSmiles] = useState<string>('')
    const lastInternalSmiles = useRef<string | null>(null)
    const [aromaticDetectNonce, setAromaticDetectNonce] = useState(0)
    const [chiralDetectNonce, setChiralDetectNonce] = useState(0)
    const [resonanceDrawNonce, setResonanceDrawNonce] = useState(0)

    const [compareA, setCompareA] = useState<string | null>(null)
    const [compareB, setCompareB] = useState<string | null>(null)
    const [compareResult, setCompareResult] = useState<AcidComparisonResult | null>(null)
    const [compareError, setCompareError] = useState<string | null>(null)

    const [chainSelection, setChainSelection] = useState<'pre-2013' | 'post-2013'>('post-2013')
    const [isChainSelectionInfoOpen, setIsChainSelectionInfoOpen] = useState(false)

    // Lifted State for Reaction Conditions
    const [selectedConditions, setSelectedConditions] = useState<string[]>(initialConditions || [])

    // State for triggering debugger from reaction panel
    const [triggeredReaction, setTriggeredReaction] = useState<{ id: string, name: string, smarts: string | string[] } | null>(null)

    // State for share button animation
    const [isCopied, setIsCopied] = useState(false)

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

    useEffect(() => {
        if (!pendingCompare) return
        setWorkbenchSubMode('compare-acids')
        setIsActionMenuOpen(false)
        setCompareA(pendingCompare.smilesA)
        setCompareB(pendingCompare.smilesB)
        setCompareResult(null)
        setCompareError(null)

        const combined = `${pendingCompare.smilesA}.${pendingCompare.smilesB}`
        if (ketcherRef.current) {
            ketcherRef.current.setMolecule(combined).catch(console.error)
            setCurrentSmiles(combined)
            setMessage('Loaded comparison molecules')
        }

        const result = compareAcids(pendingCompare.smilesA, pendingCompare.smilesB)
        setCompareResult(result)
        onCompareAcids?.(result)
        onCompareSeeded?.()
    }, [pendingCompare, onCompareAcids, onCompareSeeded])

    useEffect(() => {
        if (!initialWorkbenchSubMode || pendingCompare) {
            return
        }

        setWorkbenchSubMode(initialWorkbenchSubMode)
        if (initialWorkbenchSubMode === 'resonance') {
            setResonanceDrawNonce((value) => value + 1)
            setMessage('Resonance updated')
        }
    }, [initialWorkbenchSubMode, pendingCompare])

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
            const newSmiles = initialMolecule || ''
            setCurrentSmiles(newSmiles)
            if (initialConditions) setSelectedConditions(initialConditions)

            // Sync immediately manually
            urlSync.setParams({
                smiles: newSmiles || null,
                conditions: initialConditions && initialConditions.length > 0 ? initialConditions.join(',') : null,
                submode: workbenchSubMode
            })
        } catch (error) {
            console.error('Reset failed:', error)
        }
    }

    // Continuously sync to URL context when major states change
    useEffect(() => {
        urlSync.setParams({
            smiles: currentSmiles || null,
            conditions: selectedConditions.length > 0 ? selectedConditions.join(',') : null,
            submode: workbenchSubMode
        })
    }, [currentSmiles, selectedConditions, workbenchSubMode])

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

            const result = onNameMolecule(smiles, chainSelection)
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

    const handleCompareAcids = async () => {
        setCompareError(null)
        const smiles = await updateCurrentSmiles()
        if (!smiles) {
            setCompareError('There should be only two molecules.')
            setCompareResult(null)
            return
        }
        const parts = smiles.split('.').map(s => s.trim()).filter(Boolean)
        if (parts.length !== 2) {
            setCompareError('There should be only two molecules.')
            setCompareResult(null)
            return
        }

        setCompareA(parts[0])
        setCompareB(parts[1])

        const result = compareAcids(parts[0], parts[1])
        setCompareResult(result)
        onCompareAcids?.(result)
        setMessage('Compared acids')
    }

    const handleAromaticDetect = async () => {
        const smiles = await updateCurrentSmiles()
        if (smiles) {
            setMessage('Aromaticity updated')
        }
        setAromaticDetectNonce((value) => value + 1)
    }

    const handleDrawResonance = async () => {
        const smiles = await updateCurrentSmiles()
        if (smiles) {
            setMessage('Resonance updated')
        }
        setResonanceDrawNonce((value) => value + 1)
    }

    const handleChiralDetect = async () => {
        const smiles = await updateCurrentSmiles()
        if (smiles) {
            setMessage('Chirality updated')
        }
        setChiralDetectNonce((value) => value + 1)
    }

    const handleSelectSubMode = async (subMode: 'reactions' | 'resonance' | 'aromatic-detector' | 'chiral-detector' | 'compare-acids') => {
        setWorkbenchSubMode(subMode)
        setIsActionMenuOpen(false)
        if (subMode === 'resonance') {
            const smiles = await updateCurrentSmiles()
            if (smiles) {
                setMessage('Resonance updated')
            }
            setResonanceDrawNonce((value) => value + 1)
        } else if (subMode === 'chiral-detector') {
            const smiles = await updateCurrentSmiles()
            if (smiles) {
                setMessage('Chirality updated')
            }
            setChiralDetectNonce((value) => value + 1)
        }
    }

    const getActionLabel = () => {
        if (workbenchSubMode === 'compare-acids') return '🧪 Compare Acids'
        if (workbenchSubMode === 'resonance') return '↔ Resonance'
        if (workbenchSubMode === 'aromatic-detector') return '⌬ Aromatics'
        if (workbenchSubMode === 'chiral-detector') return '🧭 Chirality'
        return 'Additional Actions'
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
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`control-btn share-btn ${isCopied ? 'copied' : ''}`}
                        onClick={async () => {
                            const smiles = await updateCurrentSmiles();
                            urlSync.setParams({
                                smiles: smiles || null,
                                conditions: selectedConditions.length > 0 ? selectedConditions.join(',') : null,
                                submode: workbenchSubMode
                            });
                            navigator.clipboard.writeText(window.location.href);
                            setMessage('Link copied to clipboard!');
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                        }}
                        disabled={!isReady}
                        title="Copy to clipboard"
                        style={{
                            transition: 'all 0.3s ease',
                            backgroundColor: isCopied ? '#40c057' : undefined,
                            color: isCopied ? 'white' : undefined,
                            borderColor: isCopied ? '#40c057' : undefined,
                            transform: isCopied ? 'scale(1.05)' : 'scale(1)'
                        }}
                    >
                        {isCopied ? '✅ Copied!' : '🔗 Share'}
                    </button>
                    <button
                        className="control-btn reset-btn"
                        onClick={handleReset}
                        disabled={!isReady}
                        title="Reset to original structure"
                    >
                        ↺ Reset
                    </button>
                </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="quick-add-bar" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.9em', opacity: 0.8, marginRight: '8px' }}>Quick Add:</span>
                    {Object.entries(QUICK_ADD_MOLECULES).slice(0, Math.ceil(Object.entries(QUICK_ADD_MOLECULES).length / 2)).map(([key, item]) => (
                        <button
                            key={key}
                            className="btn-small"
                            onClick={() => handleQuickAdd(item.smiles, item.label)}
                            disabled={!isReady}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(QUICK_ADD_MOLECULES).slice(Math.ceil(Object.entries(QUICK_ADD_MOLECULES).length / 2)).map(([key, item]) => (
                        <button
                            key={key}
                            className="btn-small"
                            onClick={() => handleQuickAdd(item.smiles, item.label)}
                            disabled={!isReady}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
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
                <div className="button-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="chain-selection-container" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                className="info-icon-btn"
                                onClick={() => setIsChainSelectionInfoOpen(!isChainSelectionInfoOpen)}
                                style={{
                                    background: 'none',
                                    border: '1px solid var(--border-color)',
                                    color: '#ffd43b',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    padding: 0,
                                    flexShrink: 0
                                }}
                                title="Learn more about IUPAC rule changes"
                            >
                                !
                            </button>
                            <select
                                value={chainSelection}
                                onChange={(e) => setChainSelection(e.target.value as 'pre-2013' | 'post-2013')}
                                style={{
                                    padding: '8px',
                                    borderRadius: '4px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                                title="Select IUPAC chain finding rules"
                            >
                                <option value="post-2013">Post-2013</option>
                                <option value="pre-2013">Pre-2013</option>
                            </select>
                        </div>
                        {isChainSelectionInfoOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: 0,
                                zIndex: 100,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                padding: '16px',
                                borderRadius: '8px',
                                width: '350px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)',
                                textAlign: 'left'
                            }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#4dabf7' }}>IUPAC Rules Update</h4>
                                <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
                                    In 2013, IUPAC changed the naming rules for determining the <strong>parent chain</strong> and the <strong>substituents names</strong> and more:
                                </p>
                                <p style={{ margin: '0 0 12px 0', lineHeight: 1.4 }}>
                                    <strong>Post-2013:</strong> The <em>longest continuous carbon chain</em> is strictly selected as the principal chain. In addition, substituents strictly follow systematic PIN names instead of common names (e.g., propan-2-yl instead of isopropyl).
                                </p>
                                <p style={{ margin: '0 0 12px 0', lineHeight: 1.4 }}>
                                    <strong>Pre-2013:</strong> The chain with the <em>maximum number of multiple bonds</em> is selected first, even if a longer saturated chain exists. Common substituent names are widely accepted.
                                </p>
                                <p style={{ margin: '0 0 12px 0', lineHeight: 1.4, fontStyle: 'italic', opacity: 0.9 }}>
                                    Both conventions are still widely taught in chemistry courses globally. You can choose the setting that matches your curriculum or preference.
                                </p>

                                <div style={{
                                    marginTop: '12px',
                                    paddingBottom: '4px',
                                    borderTop: '1px solid var(--border-color)',
                                    paddingTop: '12px'
                                }}>
                                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
                                        For a complete list of in-depth rules, please refer to the official documentation:
                                    </p>
                                    <a href="https://iupac.qmul.ac.uk/BlueBook/" target="_blank" rel="noopener noreferrer" style={{ color: '#4dabf7', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', marginBottom: '12px' }}>
                                        🔗 IUPAC Blue Book
                                    </a>

                                    <div style={{
                                        padding: '10px',
                                        background: 'rgba(255, 212, 59, 0.1)',
                                        borderLeft: '3px solid #ffd43b',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                    }}>
                                        <p style={{ margin: 0, lineHeight: 1.4, color: '#ffd43b', fontWeight: 'bold' }}>
                                            ⚠️ Disclaimer
                                        </p>
                                        <p style={{ margin: '4px 0 0 0', lineHeight: 1.4, opacity: 0.9 }}>
                                            The naming engine is an educational tool and may contain errors. It is optimized for the molecules covered on this site.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        className="action-btn name-btn"
                        onClick={handleNameMoleculeClick}
                        disabled={!isReady}
                    >
                        Name Molecule
                    </button>
                    <button
                        className="action-btn smiles-btn"
                        onClick={async () => {
                            const s = await updateCurrentSmiles()
                            if (s) {
                                lastInternalSmiles.current = s // Prevent initialMolecule useEffect from clearing result
                                setAnalysisResult({ name: s, isValid: true, logs: [], appliedRuleIds: [], ruleResults: {} } as any)
                                setMessage('SMILES generated')
                            }
                        }}
                        disabled={!isReady}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                        Get SMILES
                    </button>
                    <div className="action-menu">
                        <button
                            className="action-menu-trigger"
                            onClick={() => setIsActionMenuOpen((open) => !open)}
                            aria-expanded={isActionMenuOpen}
                            aria-haspopup="menu"
                        >
                            {getActionLabel()} ▼
                        </button>
                        {isActionMenuOpen && (
                            <div className="action-menu-list" role="menu">
                                <button
                                    className={`action-menu-item ${workbenchSubMode === 'reactions' ? 'active-submode' : ''}`}
                                    onClick={() => handleSelectSubMode('reactions')}
                                    role="menuitem"
                                >
                                    ⚡ Reaction Workbench
                                </button>
                                <button
                                    className={`action-menu-item ${workbenchSubMode === 'resonance' ? 'active-submode' : ''}`}
                                    onClick={() => handleSelectSubMode('resonance')}
                                    role="menuitem"
                                >
                                    ↔ Resonance Drawer
                                </button>
                                <button
                                    className={`action-menu-item ${workbenchSubMode === 'aromatic-detector' ? 'active-submode' : ''}`}
                                    onClick={() => handleSelectSubMode('aromatic-detector')}
                                    role="menuitem"
                                >
                                    ⌬ Aromatic Detector
                                </button>
                                <button
                                    className={`action-menu-item ${workbenchSubMode === 'chiral-detector' ? 'active-submode' : ''}`}
                                    onClick={() => handleSelectSubMode('chiral-detector')}
                                    role="menuitem"
                                >
                                    🧭 Chiral Detector
                                </button>
                                <button
                                    className={`action-menu-item ${workbenchSubMode === 'compare-acids' ? 'active-submode' : ''}`}
                                    onClick={() => handleSelectSubMode('compare-acids')}
                                    role="menuitem"
                                >
                                    🧪 Compare Acids
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {analysisResult && (
                    <div className="generated-name-display fade-in">
                        {renderInteractiveName(analysisResult)}
                    </div>
                )}
            </div>

            {workbenchSubMode === 'compare-acids' && (
                <div className="acid-compare-panel fade-in">
                    <div className="acid-compare-header">
                        <div>
                            <div className="acid-compare-title">Acid Strength Comparison</div>
                            <div className="acid-compare-subtitle">Draw two molecules in the editor and compare their acidity.</div>
                        </div>
                        <button className="btn-compare-acids" onClick={handleCompareAcids} disabled={!isReady}>
                            Compare Acids
                        </button>
                    </div>

                    <div className="acid-compare-grid">
                        <div className="acid-compare-card">
                            <div className="acid-compare-card-title">
                                {compareResult && compareResult.winner === 'A' ? '👑 Molecule A' : 'Molecule A'}
                            </div>
                            {compareA ? (
                                <MoleculeViewer smiles={compareA} readOnly={true} width={200} height={140} />
                            ) : (
                                <div className="acid-compare-placeholder">Not set</div>
                            )}
                        </div>
                        <div className="acid-compare-card">
                            <div className="acid-compare-card-title">
                                {compareResult && compareResult.winner === 'B' ? '👑 Molecule B' : 'Molecule B'}
                            </div>
                            {compareB ? (
                                <MoleculeViewer smiles={compareB} readOnly={true} width={200} height={140} />
                            ) : (
                                <div className="acid-compare-placeholder">Not set</div>
                            )}
                        </div>
                    </div>

                    {compareError && <div className="acid-compare-error">{compareError}</div>}

                    {compareResult && compareResult.winner === 'tie' && (
                        <div className="acid-compare-result">
                            <div className="acid-compare-result-title">Result: Tie</div>
                        </div>
                    )}

                    {compareResult && compareResult.appliedRuleIds && compareResult.appliedRuleIds.length > 0 && (
                        <div className="acid-compare-rules" style={{ marginTop: '32px', textAlign: 'left', width: '100%', maxWidth: '800px', alignSelf: 'center', backgroundColor: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
                            <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.4rem' }}>🧠</span> Applied Logic
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                {compareResult.appliedRuleIds.map(ruleId => {
                                    const rule = ALL_RULES.find(r => r.id === ruleId)
                                    if (!rule) return null
                                    return (
                                        <div
                                            key={rule.id}
                                            className="logic-rule-card fade-in"
                                            style={{
                                                padding: '16px',
                                                background: 'var(--bg-tertiary)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#4dabf7'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)' }}
                                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                                        >
                                            <div style={{ fontWeight: '600', color: '#4dabf7', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {rule.name}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                                {rule.description}
                                            </div>
                                            {compareResult.ruleResults[rule.id] && (
                                                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.9rem', color: '#e0e0e0' }}>
                                                    <span style={{ color: '#868e96', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Conclusion</span>
                                                    <div style={{ background: 'rgba(77, 171, 247, 0.1)', padding: '8px 12px', borderRadius: '4px', borderLeft: '3px solid #4dabf7', color: '#fff' }}>
                                                        {compareResult.ruleResults[rule.id]}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Reaction Panel Overlay/Section - Shown in 'reactions' sub-mode */}
            {workbenchSubMode === 'reactions' && (
                <div className="reaction-panel-container fade-in">
                    <ReactionPanel
                        currentMolecule={currentSmiles}
                        initialConditions={initialConditions}
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
            )}

            {/* Resonance Drawer - Shown in 'resonance' sub-mode */}
            {workbenchSubMode === 'resonance' && (
                <div className="reaction-panel-container fade-in">
                    <ResonanceDrawer
                        smiles={currentSmiles}
                        onDrawResonance={handleDrawResonance}
                        drawDisabled={!isReady}
                        drawNonce={resonanceDrawNonce}
                    />
                </div>
            )}

            {/* Aromatic Detector - Shown in 'aromatic-detector' sub-mode */}
            {workbenchSubMode === 'aromatic-detector' && (
                <div className="reaction-panel-container fade-in">
                    <AromaticDetector
                        smiles={currentSmiles}
                        onDetect={handleAromaticDetect}
                        detectDisabled={!isReady}
                        detectNonce={aromaticDetectNonce}
                    />
                </div>
            )}

            {workbenchSubMode === 'chiral-detector' && (
                <div className="reaction-panel-container fade-in">
                    <ChiralDetector
                        smiles={currentSmiles}
                        onDetect={handleChiralDetect}
                        detectDisabled={!isReady}
                        detectNonce={chiralDetectNonce}
                    />
                </div>
            )}
        </div>
    )
}

function renderInteractiveName(result: AnalysisResult) {
    const renderFormattedText = (text: string) => {
        if (!text.includes('<sub>')) {
            return text
        }
        const parts = text.split(/(<sub>.*?<\/sub>)/g)
        return (
            <>
                {parts.map((part, index) => {
                    if (part.startsWith('<sub>') && part.endsWith('</sub>')) {
                        return <sub key={index}>{part.slice(5, -6)}</sub>
                    }
                    return <span key={index}>{part}</span>
                })}
            </>
        )
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
