import { useState } from 'react'
import { Rule, initialCurriculum, SubSubject } from '../data/curriculum'
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
    activeRules: Rule[] // Unlocked/Learned rules
    allRules?: Rule[] // All system rules (needed for workbench to show unlearned logic)
    appliedRuleIds: string[] // Rules that matched in workbench
    ruleResults: Record<string, string> // Detailed results per rule
    onToggleRule?: (ruleId: string) => void
    isOpen: boolean
    onToggle: () => void
}

function LogicConsole({ mode, activeRules, allRules = [], appliedRuleIds, ruleResults, onToggleRule, isOpen, onToggle }: LogicConsoleProps) {

    const [selectedSubSubject, setSelectedSubSubject] = useState<SubSubject | null>(null)

    // Study: Show all currently unlocked rules
    // Workbench: Show ALL applied rules (even if not unlocked)
    // Testing: Show ALL rules passed in activeRules (which is ALL_RULES in testing mode?)

    // For workbench, we need to map appliedRuleIds to Rule objects.
    // We try to find them in activeRules first, then in allRules.

    const getDisplayRules = () => {
        if (mode === 'study') return activeRules
        if (mode === 'testing') return activeRules

        // Workbench:
        // We want to show everything that was applied.
        // We need a source of all rules to lookup by ID.
        const ruleSource = allRules.length > 0 ? allRules : activeRules

        return ruleSource.filter(r => appliedRuleIds.includes(r.id))
    }

    const displayRules = getDisplayRules()



    const handleRuleClick = (ruleId: string) => {
        // Find the sub-subject that contains this rule (Search by ID)
        for (const subject of initialCurriculum) {
            for (const sub of subject.subSubjects) {
                if (sub.rules.some(r => r.id === ruleId)) {
                    setSelectedSubSubject(sub)
                    return
                }
            }
        }
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
                    <h3>{mode === 'study' ? '🧠 Unlocked Rules' : mode === 'testing' ? '🛠️ Testing Rules' : '🧪 Applied Logic'}</h3>
                    <button className="sidebar-toggle-btn-inner" onClick={onToggle} title="Collapse Logic Console" style={{ marginLeft: 'auto' }}>
                        ▶
                    </button>
                </div>
            </div>

            <div className="console-content">
                <div className="rules-container">
                    {displayRules.length === 0 ? (
                        <div className="empty-rules">
                            {mode === 'study'
                                ? "No rules unlocked yet."
                                : mode === 'testing'
                                    ? "No rules enabled."
                                    : "No rules applied to this molecule."}
                        </div>
                    ) : (
                        displayRules.map(rule => {



                            return (
                                <div
                                    key={rule.id}
                                    className={`rule-item ${mode === 'testing' ? 'testing-item' : ''}`}
                                    onClick={() => mode !== 'testing' && handleRuleClick(rule.id)}
                                    style={{
                                        ...(mode === 'testing' ? { cursor: 'default', display: 'flex', alignItems: 'flex-start', gap: '8px' } : {})
                                    }}
                                >
                                    {mode === 'testing' && (
                                        <input
                                            type="checkbox"
                                            checked={rule.unlocked}
                                            onChange={() => onToggleRule && onToggleRule(rule.id)}
                                            style={{ marginTop: '0.3rem', cursor: 'pointer' }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}

                                    <div style={{ flex: 1 }}>
                                        <div className="rule-header" onClick={() => mode === 'testing' && handleRuleClick(rule.id)} style={{ cursor: 'pointer' }}>
                                            <span className="rule-name">{rule.name}</span>
                                            {mode === 'testing' && (
                                                <span style={{ fontSize: '0.8rem', color: '#666' }}>ⓘ</span>
                                            )}
                                        </div>
                                        <div className="rule-desc">{rule.description}</div>

                                        {(mode === 'workbench' || mode === 'testing') && ruleResults && ruleResults[rule.id] && (
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

            {/* Rule Detail Modal */}
            <CurriculumModal
                topic={selectedSubSubject}
                onClose={() => setSelectedSubSubject(null)}
            />
        </div>
    )
}

export default LogicConsole
