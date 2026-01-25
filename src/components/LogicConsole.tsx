import { Rule } from '../data/curriculum'
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
    mode: 'study' | 'workbench'
    activeRules: Rule[] // Unlocked rules
    appliedRuleIds: string[] // Rules that matched in workbench
    ruleResults: Record<string, string> // Detailed results per rule
}

function LogicConsole({ mode, activeRules, appliedRuleIds, ruleResults }: LogicConsoleProps) {

    // Study: Show all active rules
    // Workbench: Show only applied rules (or all active, with status?)
    // User requested: "on the workbench it shows wich rules are applyed"
    // And for results: "for each rule add text like..."

    const displayRules = mode === 'study'
        ? activeRules
        : activeRules.filter(r => appliedRuleIds.includes(r.id))

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
                            <div key={rule.id} className="rule-item">
                                <div className="rule-header">
                                    <span className="rule-name">{rule.name}</span>
                                    <span className="rule-status active">
                                        {mode === 'study' ? 'LEARNED' : 'APPLIED'}
                                    </span>
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
        </div>
    )
}

export default LogicConsole
