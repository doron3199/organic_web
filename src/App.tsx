import { useState, useEffect, useCallback } from 'react'
import './App.css'
import CurriculumTree from './components/CurriculumTree'
import LogicConsole from './components/LogicConsole'
import ContentCanvas from './components/ContentCanvas'
import { initialCurriculum, Subject, SubSubject, Rule } from './data/curriculum'
import { rdkitService } from './services/rdkit'
import { LogicEngine } from './services/logicEngine'

function App() {
    // Layout State
    const [currentSubject, setCurrentSubject] = useState<Subject>(initialCurriculum[0])
    const [currentSubSubject, setCurrentSubSubject] = useState<SubSubject>(initialCurriculum[0].subSubjects[0])
    const [mode, setMode] = useState<'study' | 'workbench' | 'cheatsheet'>('study')

    // Scroll Control
    const [scrollTargetId, setScrollTargetId] = useState<string | null>(null)

    // Workbench State
    const [workbenchMolecule, setWorkbenchMolecule] = useState<string>('')
    const [originalMolecule, setOriginalMolecule] = useState<string>('')
    const [activeRules, setActiveRules] = useState<Rule[]>([])
    const [appliedRuleIds, setAppliedRuleIds] = useState<string[]>([])
    const [ruleResults, setRuleResults] = useState<Record<string, string>>({})

    // Initialize RDKit and active rules
    useEffect(() => {
        rdkitService.initialize()
    }, [])

    // Update active rules when subject changes
    useEffect(() => {
        setActiveRules(currentSubSubject.rules.filter(r => r.unlocked))
    }, [currentSubSubject])

    // Auto-analyze molecule when it changes (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (workbenchMolecule) {
                const result = LogicEngine.analyzeMolecule(workbenchMolecule, currentSubSubject)
                setAppliedRuleIds(result.appliedRuleIds)
                setRuleResults(result.ruleResults)
            } else {
                setAppliedRuleIds([])
                setRuleResults({})
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [workbenchMolecule, currentSubSubject])

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
                const result = LogicEngine.analyzeMolecule(part, currentSubSubject)
                // For now, we only update console with the first one or just return names
                // LogicConsole will likely only show results for one if we don't merge
                return `${label}: ${result.name || "Unknown"}`
            })
            return names.join(',\n')
        }

        const result = LogicEngine.analyzeMolecule(smiles, currentSubSubject)
        setAppliedRuleIds(result.appliedRuleIds)
        setRuleResults(result.ruleResults)
        return result.name || "Unknown Molecule"
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
                    onSwitchMode={setMode}
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
                        appliedRuleIds={appliedRuleIds}
                        ruleResults={ruleResults} // Pass detailed results
                    />
                </div>
            )}
        </div>
    )
}

export default App
