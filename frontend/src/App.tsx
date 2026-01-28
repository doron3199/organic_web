import { useState, useEffect, useCallback } from 'react'
import './App.css'
import CurriculumTree from './components/CurriculumTree'
import LogicConsole from './components/LogicConsole'
import ContentCanvas from './components/ContentCanvas'
import { initialCurriculum, Subject, SubSubject, Rule } from './data/curriculum'
import { ALL_RULES } from './data/allRules'
import { rdkitService } from './services/rdkit'
import { LogicEngine } from './services/logicEngine'

function App() {
    // Layout State
    const [currentSubject, setCurrentSubject] = useState<Subject>(initialCurriculum[0])
    const [currentSubSubject, setCurrentSubSubject] = useState<SubSubject>(initialCurriculum[0].subSubjects[0])
    const [mode, setMode] = useState<'study' | 'workbench' | 'cheatsheet' | 'testing'>('study')

    // Scroll Control
    const [scrollTargetId, setScrollTargetId] = useState<string | null>(null)

    // Workbench State
    const [workbenchMolecule, setWorkbenchMolecule] = useState<string>('')
    const [originalMolecule, setOriginalMolecule] = useState<string>('')
    const [activeRules, setActiveRules] = useState<Rule[]>([])
    const [appliedRuleIds, setAppliedRuleIds] = useState<string[]>([])
    const [ruleResults, setRuleResults] = useState<Record<string, string>>({})

    // Testing Mode State
    // Import ALL_RULES dynamically or defining it here? ideally import.
    // For now we can use the imported one if we import it.
    // Let's add the import first.
    // Actually, I need to add the import to the top of the file separately.
    // I will do a multi-replace to add the import and the state.
    // Wait, I can't do multi-replace if I'm using replace_file_content.
    // I'll do the imports in a separate step or just assume I can add it here if I include the top lines.
    // Trying to do it cleanly.

    // Let's rely on standard logic:
    // 1. Add ALL_RULES import.
    // 2. Add state.
    // 3. Update useEffect and handlers.

    // This replacement handles the state and mode type.
    // I will use another call for the import.

    // Testing Rules State
    // We'll initialize it lazily or just empty.
    const [testingRules, setTestingRules] = useState<Rule[]>([])

    // Initialize RDKit and active rules
    useEffect(() => {
        rdkitService.initialize()
        setTestingRules(ALL_RULES.rules)
    }, [])

    // Update active rules when subject changes
    useEffect(() => {
        if (mode === 'study' || mode === 'workbench') {
            setActiveRules(currentSubSubject.rules.filter(r => r.unlocked))
        } else if (mode === 'testing') {
            setActiveRules(testingRules)
        }
    }, [currentSubSubject, mode, testingRules])

    // Auto-analyze molecule when it changes (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (workbenchMolecule) {
                // Always use ALL rules for analysis, but track learning context separately
                const result = LogicEngine.analyzeMolecule(workbenchMolecule, ALL_RULES)
                setAppliedRuleIds(result.appliedRuleIds)
                setRuleResults(result.ruleResults)
            } else {
                setAppliedRuleIds([])
                setRuleResults({})
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [workbenchMolecule, currentSubSubject, mode, testingRules])

    // Handler when user selects a topic from sidebar
    const handleSelectSubSubject = (subject: Subject, sub: SubSubject) => {
        setCurrentSubject(subject)
        setCurrentSubSubject(sub)
        setMode('study') // Default back to study mode on navigation
        setScrollTargetId(sub.id) // Trigger scroll in ContentCanvas
    }

    // Handler when user scrolls to a different section
    const handleSectionVisible = useCallback((subId: string) => {
        const sub = currentSubject.subSubjects.find(s => s.id === subId)
        if (sub) {
            setCurrentSubSubject(sub)
            // DO NOT set scrollTargetId here to avoid scroll fighting
        }
    }, [currentSubject])

    // Handler to load an example into the workbench
    const handleLoadExample = (smiles: string) => {
        setWorkbenchMolecule(smiles)
        setOriginalMolecule(smiles)
        // Loading example automatically switches to workbench in ContentCanvas
    }

    const handleWorkbenchChange = (smiles: string) => {
        setWorkbenchMolecule(smiles)
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    const handleNameMolecule = (smiles: string) => {
        // Handle multiple molecules (dot-separated)
        if (smiles.includes('.')) {
            const parts = smiles.split('.')
            const names = parts.map((part, index) => {
                const label = String.fromCharCode(65 + index) // A, B, C...
                // Always use ALL_RULES
                const result = LogicEngine.analyzeMolecule(part, ALL_RULES)
                return `${label}: ${result.name || "Unknown"}`
            })
            // Return a dummy result with combined text
            return {
                logs: [],
                name: names.join(',\n'),
                isValid: true,
                appliedRuleIds: [],
                ruleResults: {}
            }
        }

        // Always use ALL_RULES
        const result = LogicEngine.analyzeMolecule(smiles, ALL_RULES)
        setAppliedRuleIds(result.appliedRuleIds)
        setRuleResults(result.ruleResults)
        return result
    }

    const handleToggleRule = (ruleId: string) => {
        // Toggle existence in testingRules or a separate 'enabled' property?
        // LogicEngine uses 'unlocked' property.
        // Let's clone testingRules and toggle 'unlocked'.
        // Actually testingRules is an array of Rules.
        setTestingRules(prev => prev.map(r =>
            r.id === ruleId ? { ...r, unlocked: !r.unlocked } : r
        ))
    }

    return (
        <div className={`app-container ${!isSidebarOpen ? 'sidebar-collapsed' : ''} ${mode === 'cheatsheet' ? 'cheatsheet-mode' : ''}`}>
            {/* Left Sidebar: Curriculum */}
            {isSidebarOpen && (
                <div className="sidebar-left">
                    <CurriculumTree
                        curriculum={initialCurriculum}
                        currentSubSubjectId={currentSubSubject.id}
                        onSelectSubSubject={handleSelectSubSubject}
                    />
                </div>
            )}

            {/* Center: Main Canvas */}
            <div className={`center-canvas ${!isSidebarOpen ? 'expanded' : ''}`}>
                <ContentCanvas
                    subject={currentSubject} // Pass full subject for continuous scroll
                    mode={mode}
                    onSwitchMode={setMode as any}
                    workbenchMolecule={workbenchMolecule}
                    originalMolecule={originalMolecule}
                    onWorkbenchChange={handleWorkbenchChange}
                    onLoadExample={handleLoadExample}
                    onNameMolecule={handleNameMolecule}
                    isSidebarOpen={isSidebarOpen}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    scrollTargetId={scrollTargetId}
                    onSectionVisible={handleSectionVisible}
                />
            </div>

            {/* Right Sidebar: Logic Console */}
            {mode !== 'cheatsheet' && (
                <div className="sidebar-right">
                    <LogicConsole
                        mode={mode}
                        activeRules={activeRules}
                        allRules={ALL_RULES.rules}
                        appliedRuleIds={appliedRuleIds}
                        ruleResults={ruleResults} // Pass detailed results
                        onToggleRule={handleToggleRule}
                    />
                </div>
            )}
        </div>
    )
}

export default App
