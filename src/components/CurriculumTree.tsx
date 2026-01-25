import { useState } from 'react'
import { Subject, SubSubject } from '../data/curriculum'
import './CurriculumTree.css'

interface CurriculumTreeProps {
    curriculum: Subject[]
    currentSubSubjectId: string | null
    onSelectSubSubject: (subject: Subject, subSubject: SubSubject) => void
}

function CurriculumTree({ curriculum, currentSubSubjectId, onSelectSubSubject }: CurriculumTreeProps) {
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
        'alkanes': true // Expand first one by default
    })

    const toggleSubject = (subjectId: string) => {
        setExpandedSubjects(prev => ({
            ...prev,
            [subjectId]: !prev[subjectId]
        }))
    }

    // Calculate progress for a subject (mock calculation for now)
    const getProgress = (subject: Subject) => {
        const totalRules = subject.subSubjects.reduce((acc, sub) => acc + sub.rules.length, 0)
        const unlockedRules = subject.subSubjects.reduce((acc, sub) =>
            acc + sub.rules.filter(r => r.unlocked).length, 0)
        return { total: totalRules, unlocked: unlockedRules }
    }

    return (
        <div className="curriculum-tree">
            <div className="curriculum-header">
                <h3>📚 Curriculum</h3>
            </div>
            <div className="curriculum-content">
                {curriculum.map(subject => {
                    const progress = getProgress(subject)
                    const isExpanded = expandedSubjects[subject.id]

                    return (
                        <div key={subject.id} className="subject-group">
                            <div
                                className={`subject-header ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleSubject(subject.id)}
                            >
                                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                <span className="subject-icon">{subject.icon}</span>
                                <span className="subject-name">{subject.name}</span>
                                <span className="progress-badge" title={`${progress.unlocked}/${progress.total} rules unlocked`}>
                                    {progress.unlocked}/{progress.total}
                                </span>
                            </div>

                            {isExpanded && (
                                <div className="sub-subject-list">
                                    {Object.entries(subject.subSubjects.reduce((acc, sub) => {
                                        const key = sub.section || 'General';
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(sub);
                                        return acc;
                                    }, {} as Record<string, SubSubject[]>)).map(([section, subs]) => (
                                        <div key={section} className="curriculum-section-group">
                                            {section !== 'General' && (
                                                <div className="section-header" style={{
                                                    color: '#858585',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    margin: '12px 0 4px 16px',
                                                    letterSpacing: '1px'
                                                }}>
                                                    {section}
                                                </div>
                                            )}
                                            {subs.map(sub => (
                                                <div
                                                    key={sub.id}
                                                    className={`sub-subject-item ${currentSubSubjectId === sub.id ? 'active' : ''}`}
                                                    onClick={() => onSelectSubSubject(subject, sub)}
                                                >
                                                    <div className="status-dot">
                                                        {sub.rules.every(r => r.unlocked) ? '●' : '○'}
                                                    </div>
                                                    <span className="sub-name">{sub.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default CurriculumTree
