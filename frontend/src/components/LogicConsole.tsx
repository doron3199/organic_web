import { useState } from 'react'
import { Rule, SubSubject, initialCurriculum } from '../data/curriculum'
import CurriculumModal from './CurriculumModal'
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
    mode: 'study' | 'workbench' | 'cheatsheet' | 'testing' | 'about'
    allRules?: Rule[] // All system rules (needed for workbench to show unlearned logic)
    appliedRuleIds: string[] // Rules that matched in workbench
    ruleResults: Record<string, string> // Detailed results per rule
    appliedMode?: 'naming' | 'acid-comparison' | null
    isOpen: boolean
    onToggle: () => void
}

function LogicConsole({ mode, allRules = [], appliedRuleIds, ruleResults, appliedMode = null, isOpen, onToggle }: LogicConsoleProps) {
    const [selectedSubSubject, setSelectedSubSubject] = useState<SubSubject | null>(null)

    const findSubSubjectById = (subSubjectId: string): SubSubject | null => {
        for (const subject of initialCurriculum) {
            const subSubject = subject.subSubjects.find(sub => sub.id === subSubjectId)
            if (subSubject) return subSubject
        }
        return null
    }

    const handleRuleClick = (rule: Rule) => {
        const subSubjectId = rule.subSubjectId
        if (!subSubjectId) return

        const subSubject = findSubSubjectById(subSubjectId)
        if (!subSubject) return

        setSelectedSubSubject(subSubject)
    }

    const getDisplayRules = () => {
        return allRules.filter(r => appliedRuleIds.includes(r.id))
    }

    const displayRules = getDisplayRules()

    if (!isOpen) {
        return (
            <div className="logic-console collapsed">
                <button className="sidebar-toggle-btn-inner" onClick={onToggle} title="Expand Logic Console">
                    ◀
                </button>
            </div>
        )
    }

    return (
        <div className="logic-console">
            <div className="console-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3>🧪 Applied Logic</h3>
                    {mode === 'workbench' && appliedMode && (
                        <span className="console-mode">
                            {appliedMode === 'acid-comparison' ? 'Acid Comparison' : 'Naming'}
                        </span>
                    )}
                    <button className="sidebar-toggle-btn-inner" onClick={onToggle} title="Collapse Logic Console" style={{ marginLeft: 'auto' }}>
                        ▶
                    </button>
                </div>
            </div>

            <div className="console-content">
                <div className="rules-container">
                    {displayRules.length === 0 ? (
                        <div className="empty-rules">No rules applied to this molecule.</div>
                    ) : (
                        displayRules.map(rule => {



                            return (
                                <div
                                    key={rule.id}
                                    className="rule-item"
                                    onClick={() => handleRuleClick(rule)}
                                >
                                    <div>
                                        <div className="rule-header">
                                            <span className="rule-name">{rule.name}</span>
                                        </div>
                                        <div className="rule-desc">{rule.description}</div>

                                        {ruleResults && ruleResults[rule.id] && (
                                            <div className="rule-result" style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', borderLeft: '3px solid #646cff' }}>
                                                <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.2rem' }}>Result:</div>
                                                <div>{ruleResults[rule.id]}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <CurriculumModal
                topic={selectedSubSubject}
                onClose={() => setSelectedSubSubject(null)}
            />
        </div>
    )
}

export default LogicConsole
