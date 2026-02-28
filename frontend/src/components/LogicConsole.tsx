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
    mode: 'study' | 'workbench' | 'cheatsheet' | 'testing' | 'info'
    allRules?: Rule[] // All system rules (needed for workbench to show unlearned logic)
    appliedRuleIds: string[] // Rules that matched in workbench
    ruleResults: Record<string, string> // Detailed results per rule
    appliedMode?: 'naming' | 'acid-comparison' | null
    isOpen: boolean
    onToggle: () => void
    ruleSections?: { title: string, appliedRuleIds: string[], ruleResults: Record<string, string> }[] | null
}

function LogicConsole({ mode, allRules = [], appliedRuleIds, ruleResults, appliedMode = null, isOpen, onToggle, ruleSections }: LogicConsoleProps) {
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


    const renderRules = (rIds: string[], rRes: Record<string, string>) => {
        const dRules = allRules.filter(r => rIds.includes(r.id))
        if (dRules.length === 0) return <div className="empty-rules">No rules applied to this molecule.</div>

        return dRules.map(rule => (
            <div key={rule.id} className="rule-item" onClick={() => handleRuleClick(rule)}>
                <div>
                    <div className="rule-header">
                        <span className="rule-name">{rule.name}</span>
                    </div>
                    <div className="rule-desc">{rule.description}</div>
                    {rRes && rRes[rule.id] && (
                        <div className="rule-result" style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', borderLeft: '3px solid #646cff' }}>
                            <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '0.2rem' }}>Result:</div>
                            <div>{rRes[rule.id]}</div>
                        </div>
                    )}
                </div>
            </div>
        ))
    }

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
                    {mode === 'workbench' && appliedMode === 'naming' && (
                        <span className="console-mode">Naming</span>
                    )}
                    <button className="sidebar-toggle-btn-inner" onClick={onToggle} title="Collapse Logic Console" style={{ marginLeft: 'auto' }}>
                        ▶
                    </button>
                </div>
            </div>

            <div className="console-content">
                <div className="rules-container">
                    {ruleSections && ruleSections.length > 0 ? (
                        ruleSections.map((sec, idx) => (
                            <div key={idx} style={{ marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--text-primary)' }}>{sec.title}</h4>
                                {renderRules(sec.appliedRuleIds, sec.ruleResults)}
                            </div>
                        ))
                    ) : (
                        <>
                            {renderRules(appliedRuleIds, ruleResults)}
                        </>
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
