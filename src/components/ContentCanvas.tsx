import { useEffect, useRef } from 'react'
import { Subject } from '../data/curriculum' // SubSubject imported but used in inner scope
import MoleculeViewer from './MoleculeViewer'
import MoleculeEditor from './MoleculeEditor'
import './ContentCanvas.css'

interface ContentCanvasProps {
    subject: Subject
    mode: 'study' | 'workbench'
    onSwitchMode: (mode: 'study' | 'workbench') => void
    workbenchMolecule: string
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
                    🧪 Workbench
                </button>
            </div>

            {/* Content Area */}
            <div className="canvas-body">
                {mode === 'study' ? (
                    <div id="study-scroll-container" className="study-container fade-in" ref={containerRef}>
                        {/* Iterating over ALL sub-subjects */}
                        {subject.subSubjects.map((subSubject) => (
                            <div
                                key={subSubject.id}
                                id={`section-${subSubject.id}`}
                                className="topic-section"
                                data-subsubject-id={subSubject.id}
                            >
                                <h1 className="topic-title">{subSubject.name}</h1>

                                <div className="topic-content">
                                    {subSubject.content.split('\n').map((line, idx) => {
                                        if (line.startsWith('# ')) return <h1 key={idx}>{line.substring(2)}</h1>
                                        if (line.startsWith('### ')) return <h3 key={idx}>{line.substring(4)}</h3>
                                        if (line.startsWith('- ')) return <li key={idx}>{line.substring(2)}</li>
                                        if (line.trim() === '') return <br key={idx} />
                                        return <p key={idx}>{line}</p>
                                    })}
                                </div>

                                <div className="examples-section">
                                    <h3>Examples</h3>
                                    <div className="molecules-grid">
                                        {subSubject.examples.map((ex, idx) => (
                                            <div key={idx} className="molecule-card">
                                                <MoleculeViewer
                                                    smiles={ex.smiles}
                                                    onEdit={() => handleEditClick(ex.smiles)}
                                                />
                                                <div className="molecule-label">{ex.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <hr className="section-divider" />
                            </div>
                        ))}

                        {/* Padding at bottom for easier scrolling */}
                        <div style={{ height: '200px' }}></div>
                    </div>
                ) : (
                    <div className="workbench-container fade-in">
                        <MoleculeEditor
                            onMoleculeChange={onWorkbenchChange}
                            initialMolecule={workbenchMolecule}
                            onBack={() => onSwitchMode('study')}
                            onNameMolecule={onNameMolecule}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default ContentCanvas
