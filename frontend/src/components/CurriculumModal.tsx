import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SubSubject } from '../data/curriculum'
import MoleculeViewer from './MoleculeViewer'
import ReactionEquation from './ReactionEquation'
import './CurriculumModal.css'

interface CurriculumModalProps {
    topic: SubSubject | null
    onClose: () => void
    onExperiment?: (smiles: string, conditions: string) => void
}

const CurriculumModal: React.FC<CurriculumModalProps> = ({ topic, onClose, onExperiment }) => {
    if (!topic) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{topic.name}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {topic.content}
                    </ReactMarkdown>

                    {/* Standard Examples */}
                    {topic.examples && topic.examples.length > 0 && (
                        <div className="modal-examples">
                            <h4>Examples</h4>
                            <div className="modal-examples-grid">
                                {topic.examples.map((ex, idx) => (
                                    <div key={idx} className="modal-example-card">
                                        <div className="modal-molecule-container">
                                            <MoleculeViewer smiles={ex.smiles} readOnly={true} width={220} height={140} />
                                        </div>
                                        <div className="modal-molecule-label">{ex.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reaction Examples */}
                    {topic.reactionExamples && topic.reactionExamples.length > 0 && (
                        <div className="modal-examples">
                            <h4>Examples from Curriculum</h4>
                            <div className="reactions-list">
                                {topic.reactionExamples.map((ex, idx) => (
                                    <ReactionEquation
                                        key={idx}
                                        reaction={ex}
                                        onExperiment={onExperiment}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {topic.compareExamples && topic.compareExamples.length > 0 && (
                        <div className="modal-examples">
                            <h4>Compare Examples</h4>
                            <div className="compare-section">
                                {topic.compareExamples.map((ex, idx) => (
                                    <div key={ex.id || idx} className="compare-card">
                                        <div className="compare-card-header">
                                            <div className="compare-title">{ex.name}</div>
                                            {onExperiment && (
                                                <button
                                                    className="btn-compare"
                                                    onClick={() => onExperiment(`${ex.left.smiles}.${ex.right.smiles}`, 'compare-acids')}
                                                >
                                                    Compare
                                                </button>
                                            )}
                                        </div>
                                        <div className="compare-molecules">
                                            <div className="compare-molecule">
                                                <div className="compare-crown">👑</div>
                                                <MoleculeViewer smiles={ex.left.smiles} readOnly={true} width={200} height={130} />
                                                <div className="compare-label">{ex.left.name}</div>
                                            </div>
                                            <div className="compare-vs">vs</div>
                                            <div className="compare-molecule">
                                                <MoleculeViewer smiles={ex.right.smiles} readOnly={true} width={200} height={130} />
                                                <div className="compare-label">{ex.right.name}</div>
                                            </div>
                                        </div>
                                        {ex.note && <div className="compare-note">{ex.note}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CurriculumModal
