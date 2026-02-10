import { useEffect, useRef, useState } from 'react'
import { Subject } from '../data/curriculum' // SubSubject imported but used in inner scope
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MoleculeViewer from './MoleculeViewer'
import ReactionEquation from './ReactionEquation'
import MoleculeEditor from './MoleculeEditor'
import Cheatsheet from './Cheatsheet'
import ReactionPredictor from './ReactionPredictor'
import About from './About'
import { AnalysisResult } from '../services/logicEngine'
import { QUICK_ADD_MOLECULES } from '../services/conditions'
import './ContentCanvas.css'

interface ContentCanvasProps {
    subject: Subject
    mode: 'study' | 'workbench' | 'cheatsheet' | 'testing' | 'about'
    onSwitchMode: (mode: 'study' | 'workbench' | 'cheatsheet' | 'testing' | 'about') => void
    workbenchMolecule: string
    originalMolecule?: string
    onWorkbenchChange: (smiles: string) => void
    onLoadExample: (smiles: string) => void
    onNameMolecule: (smiles: string) => AnalysisResult
    scrollTargetId: string | null
    onSectionVisible: (subId: string) => void
}

function ContentCanvas({
    subject,
    mode,
    onSwitchMode,
    workbenchMolecule,
    originalMolecule,
    onWorkbenchChange,
    onLoadExample,
    onNameMolecule,
    scrollTargetId,
    onSectionVisible
}: ContentCanvasProps) {

    const containerRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const [testSmiles, setTestSmiles] = useState('')
    const [workbenchConditions, setWorkbenchConditions] = useState<string[]>([])

    const handleExperiment = (smiles: string, conditions: string) => {
        let smilesToLoad = smiles
        const conds: string[] = []
        const condLower = conditions.toLowerCase()

        // Dynamically check for Quick Add Molecules/Reagents in conditions string
        // This avoids hardcoding specific reagents like KMnO4 or H2SO4
        Object.entries(QUICK_ADD_MOLECULES).forEach(([key, molecule]) => {
            // Check against key (usually simpler, e.g. 'kmno4')
            const keyMatch = condLower.includes(key.toLowerCase());
            // Check against label (e.g. 'H₂SO₄' or 'KMnO₄') - strip emoji if needed or just specific substring
            const labelMatch = conditions.includes(molecule.label.replace(/^[^\w\d\s]+/, '').trim()) || conditions.includes(molecule.label);

            if (keyMatch || labelMatch) {
                // Avoid double adding if multiple checks match the same thing, but usually safe
                // We assume unique reagents for now
                smilesToLoad = `${smilesToLoad}.${molecule.smiles}`
            }
        });

        // Check for Heat: "heat", "Δ" (Capital Delta), "delta", "mix"
        if (condLower.includes('heat') || conditions.includes('Δ') || condLower.includes('delta') || condLower.includes('mix')) conds.push('heat')
        // Check for Light: "light", "hv", "hν" (Greek Nu)
        if (condLower.includes('light') || condLower.includes('hv') || conditions.includes('hν')) conds.push('light')
        // Check for Pd/C
        if (condLower.includes('pd/c') || condLower.includes('pd-c')) conds.push('pd_c')
        // Check for Lindlar
        if (condLower.includes('lindlar')) conds.push('lindlar')
        // Check for Cold: "cold", "-78"
        if (condLower.includes('cold') || conditions.includes('-78')) conds.push('cold')

        onLoadExample(smilesToLoad)
        setWorkbenchConditions(conds)
        onSwitchMode('workbench')
    }

    // Handle Auto-Scroll to Target
    useEffect(() => {
        if (scrollTargetId && mode === 'study') {
            // Small delay to ensure any layout shifts/renders are complete
            const timer = setTimeout(() => {
                const el = document.getElementById(`section-${scrollTargetId}`)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [scrollTargetId, mode])

    // Setup Intersection Observer for Scroll Tracking
    useEffect(() => {
        if (mode !== 'study' || !subject) return

        if (observerRef.current) observerRef.current.disconnect()

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const subId = entry.target.getAttribute('data-subsubject-id')
                        if (subId) {
                            onSectionVisible(subId)
                        }
                    }
                })
            },
            {
                root: containerRef.current,
                threshold: 0.5 // Trigger when 50% visible
            }
        )

        // Observe all section elements
        subject.subSubjects.forEach(sub => {
            const el = document.getElementById(`section-${sub.id}`)
            if (el) observerRef.current?.observe(el)
        })

        return () => observerRef.current?.disconnect()
    }, [subject, mode, onSectionVisible])


    const handleEditClick = (smiles: string) => {
        onLoadExample(smiles)
        onSwitchMode('workbench')
    }

    const handleTestLoad = () => {
        if (testSmiles) {
            onLoadExample(testSmiles)
            // No mode switch needed as we stay in testing but update the molecule
        }
    }

    return (
        <div className="content-canvas">
            {/* Mode Switcher */}
            <div className="mode-switcher">

                <button
                    className={`mode-btn ${mode === 'study' ? 'active' : ''}`}
                    onClick={() => onSwitchMode('study')}
                >
                    📖 Study
                </button>
                <button
                    className={`mode-btn ${mode === 'workbench' ? 'active' : ''}`}
                    onClick={() => onSwitchMode('workbench')}
                >
                    🔬 Workbench
                </button>
                <button
                    className={`mode-btn ${mode === 'testing' ? 'active' : ''}`}
                    onClick={() => onSwitchMode('testing')}
                >
                    🚧 Testing
                </button>
                <button
                    className={`mode-btn ${mode === 'cheatsheet' ? 'active' : ''}`}
                    onClick={() => onSwitchMode('cheatsheet')}
                >
                    🧪 Cheatsheet
                </button>
                <button
                    className={`mode-btn ${mode === 'about' ? 'active' : ''}`}
                    onClick={() => onSwitchMode('about')}
                >
                    ℹ️ About
                </button>
            </div>

            {/* Content Area */}
            <div className="canvas-body">
                {mode === 'study' ? (
                    <div id="study-scroll-container" className="study-container fade-in" ref={containerRef}>
                        {/* Iterating over ALL sub-subjects */}
                        {subject.subSubjects.map((subSubject, index) => {
                            const prevSub = index > 0 ? subject.subSubjects[index - 1] : null
                            const showSectionHeader = subSubject.section && (index === 0 || subSubject.section !== prevSub?.section)

                            return (
                                <div
                                    key={subSubject.id}
                                    id={`section-${subSubject.id}`}
                                    className="topic-section"
                                    data-subsubject-id={subSubject.id}
                                >
                                    {showSectionHeader && (
                                        <div className="section-group-header" style={{
                                            textAlign: 'center',
                                            margin: '4rem 0 3rem',
                                            paddingBottom: '1rem',
                                            borderBottom: '2px solid var(--border-color)'
                                        }}>
                                            <h1 style={{
                                                fontSize: '2.5rem',
                                                fontWeight: '800',
                                                color: 'var(--accent-primary)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '2px',
                                                margin: 0
                                            }}>
                                                {subSubject.section}
                                            </h1>
                                        </div>
                                    )}

                                    <h1 className="topic-title">{subSubject.name}</h1>

                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        className="markdown-content"
                                    >
                                        {subSubject.content}
                                    </ReactMarkdown>

                                    {((subSubject.examples && subSubject.examples.length > 0) || (subSubject.reactionExamples && subSubject.reactionExamples.length > 0)) && (
                                        <div className="examples-section">
                                            <h3>Examples</h3>
                                            {subSubject.reactionExamples && subSubject.reactionExamples.length > 0 ? (
                                                <div className="reactions-list">
                                                    {subSubject.reactionExamples.map((rxn, idx) => (
                                                        <ReactionEquation
                                                            key={idx}
                                                            reaction={rxn}
                                                            onExperiment={handleExperiment}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="molecules-grid">
                                                    {subSubject.examples.map((ex, idx) => (
                                                        <div key={idx} className="molecule-card">
                                                            <MoleculeViewer
                                                                smiles={ex.smiles}
                                                                customSvg={ex.customSvg}
                                                                customSvgUrl={ex.customSvgUrl}
                                                                onEdit={() => handleEditClick(ex.smiles)}
                                                                width={300}
                                                                height={200}
                                                            />
                                                            <div className="molecule-label">{ex.name}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <hr className="section-divider" />

                                    {subSubject.widgetType === 'sn_e_predictor' && (
                                        <ReactionPredictor />
                                    )}
                                </div>
                            )
                        })}

                        {/* Padding at bottom for easier scrolling */}
                        <div style={{ height: '200px' }}></div>
                    </div>
                ) : mode === 'cheatsheet' ? (
                    <Cheatsheet />
                ) : mode === 'about' ? (
                    <About />
                ) : mode === 'testing' ? (
                    <div className="workbench-container fade-in">
                        {/* SMILES Input Row */}
                        <div style={{ padding: '1rem', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                            <input
                                type="text"
                                placeholder="Enter SMILES string (e.g. CC=C.Br)"
                                value={testSmiles}
                                onChange={e => setTestSmiles(e.target.value)}
                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                            <button
                                onClick={handleTestLoad}
                                style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Load
                            </button>
                        </div>

                        {/* Molecule Editor with Debug Mode */}
                        <MoleculeEditor
                            onMoleculeChange={onWorkbenchChange}
                            initialMolecule={originalMolecule || workbenchMolecule}
                            onBack={() => onSwitchMode('study')}
                            onNameMolecule={onNameMolecule}
                            showDebugPanel={true}
                            initialConditions={workbenchConditions}
                        />
                    </div>
                ) : (
                    <div className="workbench-container fade-in">
                        <MoleculeEditor
                            onMoleculeChange={onWorkbenchChange}
                            initialMolecule={originalMolecule || workbenchMolecule}
                            initialConditions={workbenchConditions}
                            onBack={() => onSwitchMode('study')}
                            onNameMolecule={onNameMolecule}
                        />
                    </div>
                )}
            </div>
        </div >
    )
}

export default ContentCanvas
