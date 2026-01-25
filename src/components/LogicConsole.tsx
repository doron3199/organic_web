import { useState } from 'react'
import { Rule, initialCurriculum, SubSubject } from '../data/curriculum'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import MoleculeViewer from './MoleculeViewer'
import './LogicConsole.css'

export interface LogEntry {
    id: string
    step: string
    detail: string
    result?: string
    status: 'success' | 'checking' | 'failed'
    timestamp: number
}

interface LogicConsoleProps {
    mode: 'study' | 'workbench' | 'cheatsheet'
    activeRules: Rule[] // Unlocked rules
    appliedRuleIds: string[] // Rules that matched in workbench
    ruleResults: Record<string, string> // Detailed results per rule
}

function LogicConsole({ mode, activeRules, appliedRuleIds, ruleResults }: LogicConsoleProps) {

    const [selectedSubSubject, setSelectedSubSubject] = useState<SubSubject | null>(null)

    // Study: Show all active rules
    // Workbench: Show only applied rules (or all active, with status?)
    const displayRules = mode === 'study'
        ? activeRules
        : activeRules.filter(r => appliedRuleIds.includes(r.id))

    const handleRuleClick = (ruleId: string) => {
        // Find the sub-subject that contains this rule
        for (const subject of initialCurriculum) {
            for (const sub of subject.subSubjects) {
                if (sub.rules.some(r => r.id === ruleId)) {
                    setSelectedSubSubject(sub)
                    return
                }
            }
        }
    }

    return (
        <div className="logic-console">
            <div className="console-header">
                <h3>{mode === 'study' ? '🧠 Unlocked Rules' : '🧪 Applied Logic'}</h3>
            </div>

            <div className="console-content">
                <div className="rules-container">
                    {displayRules.length === 0 ? (
                        <div className="empty-rules">
                            {mode === 'study'
                                ? "No rules unlocked yet."
                                : "No rules applied to this molecule."}
                        </div>
                    ) : (
                        displayRules.map(rule => (
                            <div
                                key={rule.id}
                                className="rule-item"
                                onClick={() => handleRuleClick(rule.id)}
                            >
                                <div className="rule-header">
                                    <span className="rule-name">{rule.name}</span>
                                    {/* Removed LEARNED/APPLIED tag as requested */}
                                </div>
                                <div className="rule-desc">{rule.description}</div>

                                {mode === 'workbench' && ruleResults && ruleResults[rule.id] && (
                                    <div className="rule-result" style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', borderLeft: '3px solid #646cff' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.2rem' }}>Result:</div>
                                        <div>{ruleResults[rule.id]}</div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Rule Detail Modal */}
            {selectedSubSubject && (
                <div className="modal-overlay" onClick={() => setSelectedSubSubject(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedSubSubject.name}</h3>
                            <button className="modal-close" onClick={() => setSelectedSubSubject(null)}>×</button>
                        </div>
                        <div className="modal-body markdown-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedSubSubject.content}
                            </ReactMarkdown>

                            {selectedSubSubject.examples && selectedSubSubject.examples.length > 0 && (
                                <div className="modal-examples">
                                    <h4>Examples</h4>
                                    <div className="modal-examples-grid">
                                        {selectedSubSubject.examples.map((ex, idx) => (
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LogicConsole
