import { useEffect, useRef } from 'react'
import { Subject } from '../data/curriculum' // SubSubject imported but used in inner scope
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MoleculeViewer from './MoleculeViewer'
import MoleculeEditor from './MoleculeEditor'
import Cheatsheet from './Cheatsheet'
import './ContentCanvas.css'

interface ContentCanvasProps {
    subject: Subject
    mode: 'study' | 'workbench' | 'cheatsheet'
    onSwitchMode: (mode: 'study' | 'workbench' | 'cheatsheet') => void
    workbenchMolecule: string
    originalMolecule?: string
    onWorkbenchChange: (smiles: string) => void
    onLoadExample: (smiles: string) => void
    onNameMolecule: (smiles: string) => string
    isSidebarOpen: boolean
    onToggleSidebar: () => void
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
    isSidebarOpen,
    onToggleSidebar,
    scrollTargetId,
    onSectionVisible
}: ContentCanvasProps) {

    const containerRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)

    // Handle Auto-Scroll to Target
    useEffect(() => {
        if (scrollTargetId && mode === 'study') {
            const el = document.getElementById(`section-${scrollTargetId}`)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
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

    return (
        <div className="content-canvas">
            {/* Mode Switcher */}
            <div className="mode-switcher">
                <button
                    className="sidebar-toggle-btn"
                    onClick={onToggleSidebar}
                    title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    style={{ marginRight: '1rem', padding: '0.4rem 0.8rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                    {isSidebarOpen ? '◀' : '▶'}
                </button>

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
                    className={`mode-btn ${mode === 'cheatsheet' ? 'active' : ''}`}
                    onClick={() => onSwitchMode('cheatsheet')}
                >
                    🧪 Cheatsheet
                </button>
            </div>

            {/* Content Area */}
            <div className="canvas-body">
                {mode === 'study' ? (
                    <div id="study-scroll-container" className="study-container fade-in" ref={containerRef}>
                        {/* Iterating over ALL sub-subjects */}
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
                                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '0.5rem 0 2rem' }}>
                                                The systematic set of rules for naming chemical compounds.
                                            </p>
                                            <div className="warning-box" style={{
                                                margin: '0 auto',
                                                maxWidth: '600px',
                                                padding: '1rem',
                                                background: 'rgba(255, 145, 0, 0.1)',
                                                border: '1px solid var(--warning)',
                                                borderRadius: '8px',
                                                color: 'var(--warning)',
                                                textAlign: 'center',
                                                fontSize: '0.9rem'
                                            }}>
                                                ⚠️ <strong>Learning Mode:</strong> The generator only uses rules you have unlocked. The name may be incomplete until you finish all steps!
                                            </div>
                                        </div>
                                    )}

                                    <h1 className="topic-title">{subSubject.name}</h1>

                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        className="markdown-content"
                                    >
                                        {subSubject.content}
                                    </ReactMarkdown>

                                    <div className="examples-section">
                                        <h3>Examples</h3>
                                        <div className="molecules-grid">
                                            {subSubject.examples.map((ex, idx) => (
                                                <div key={idx} className="molecule-card">
                                                    <MoleculeViewer
                                                        smiles={ex.smiles}
                                                        onEdit={() => handleEditClick(ex.smiles)}
                                                        width={300}
                                                        height={200}
                                                    />
                                                    <div className="molecule-label">{ex.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <hr className="section-divider" />
                                </div>
                            )
                        })}

                        {/* Padding at bottom for easier scrolling */}
                        <div style={{ height: '200px' }}></div>
                    </div>
                ) : mode === 'cheatsheet' ? (
                    <Cheatsheet />
                ) : (
                    <div className="workbench-container fade-in">
                        <MoleculeEditor
                            onMoleculeChange={onWorkbenchChange}
                            initialMolecule={originalMolecule || workbenchMolecule}
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
