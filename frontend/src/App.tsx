import { useState, useEffect, useCallback } from 'react'
import './App.css'
import CurriculumTree from './components/CurriculumTree'
import LogicConsole from './components/LogicConsole'
import ContentCanvas from './components/ContentCanvas'
import { initialCurriculum, Subject, SubSubject } from './data/curriculum'
import { ALL_RULES } from './data/allRules'
import { rdkitService } from './services/rdkit'
import { LogicEngine } from './services/logicEngine'
import { AcidComparisonResult } from './services/acidBase'
import { urlSync } from './services/urlSync'

function App() {
    // Initial Layout State
    const initialSubjectId = urlSync.getSubject();
    const initialSubSubjectId = urlSync.getSubSubject();

    let startingSubject = initialCurriculum[0];
    let startingSubSubject = initialCurriculum[0].subSubjects[0];

    if (initialSubjectId) {
        const foundSubj = initialCurriculum.find(s => s.id === initialSubjectId);
        if (foundSubj) {
            startingSubject = foundSubj;
            if (initialSubSubjectId) {
                const foundSub = foundSubj.subSubjects.find(s => s.id === initialSubSubjectId);
                if (foundSub) {
                    startingSubSubject = foundSub;
                }
            } else {
                startingSubSubject = foundSubj.subSubjects[0];
            }
        }
    }

    // Layout State
    const [currentSubject, setCurrentSubject] = useState<Subject>(startingSubject)
    const [currentSubSubject, setCurrentSubSubject] = useState<SubSubject>(startingSubSubject)
    const [mode, setMode] = useState<'study' | 'workbench' | 'cheatsheet' | 'testing' | 'info'>(urlSync.getMode() as 'study' | 'workbench' | 'cheatsheet' | 'testing' | 'info')

    // Scroll Control
    const [scrollTargetId, setScrollTargetId] = useState<string | null>(startingSubSubject.id)

    // Workbench State
    const [workbenchMolecule, setWorkbenchMolecule] = useState<string>(urlSync.getParam('smiles') || '')
    const [originalMolecule, setOriginalMolecule] = useState<string>('')
    const [appliedRuleIds, setAppliedRuleIds] = useState<string[]>([])
    const [ruleResults, setRuleResults] = useState<Record<string, string>>({})
    const [workbenchAppliedMode, setWorkbenchAppliedMode] = useState<'naming' | 'acid-comparison' | null>(null)
    const [workbenchRuleOverride, setWorkbenchRuleOverride] = useState<null | {
        appliedRuleIds: string[]
        ruleResults: Record<string, string>
    }>(null)
    const [pendingCompare, setPendingCompare] = useState<null | { smilesA: string; smilesB: string }>(null)

    // Initialize RDKit
    useEffect(() => {
        rdkitService.initialize()
    }, [])

    useEffect(() => {
        urlSync.setMode(mode);
    }, [mode]);

    useEffect(() => {
        if (mode === 'study') {
            urlSync.setStudyPath(currentSubject.id, currentSubSubject.id);
        }
    }, [currentSubject, currentSubSubject, mode]);

    useEffect(() => {
        const handlePopState = () => {
            const newMode = urlSync.getMode();
            setMode(newMode as any);

            const newSmiles = urlSync.getParam('smiles');
            if (newSmiles !== null && newSmiles !== workbenchMolecule) {
                setWorkbenchMolecule(newSmiles);
            }

            const subjectId = urlSync.getSubject();
            const subsubjectId = urlSync.getSubSubject();
            if (subjectId) {
                const foundSubj = initialCurriculum.find(s => s.id === subjectId);
                if (foundSubj) {
                    setCurrentSubject(foundSubj);
                    if (subsubjectId) {
                        const foundSub = foundSubj.subSubjects.find(s => s.id === subsubjectId);
                        if (foundSub) {
                            setCurrentSubSubject(foundSub);
                            setScrollTargetId(null);
                            setTimeout(() => setScrollTargetId(foundSub.id), 0);
                        }
                    } else {
                        setCurrentSubSubject(foundSubj.subSubjects[0]);
                        setScrollTargetId(null);
                        setTimeout(() => setScrollTargetId(foundSubj.subSubjects[0].id), 0);
                    }
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [workbenchMolecule]);

    // Auto-analyze molecule when it changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (workbenchRuleOverride) {
                return
            }
            if (workbenchMolecule) {
                const result = LogicEngine.analyzeMolecule(workbenchMolecule, ALL_RULES)
                setAppliedRuleIds(result.appliedRuleIds)
                setRuleResults(result.ruleResults)
                setWorkbenchAppliedMode('naming')
            } else {
                setAppliedRuleIds([])
                setRuleResults({})
                setWorkbenchAppliedMode(null)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [workbenchMolecule, workbenchRuleOverride])

    // Handler when user selects a topic from sidebar
    const handleSelectSubSubject = (subject: Subject, sub: SubSubject) => {
        setCurrentSubject(subject)
        setCurrentSubSubject(sub)
        setMode('study') // Default back to study mode on navigation

        // Reset scrollTargetId first to ensure change is detected even if same ID
        setScrollTargetId(null)
        setTimeout(() => {
            setScrollTargetId(sub.id)
        }, 0)
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
        setWorkbenchRuleOverride(null)
        setPendingCompare(null)
        setWorkbenchAppliedMode(null)
        setWorkbenchMolecule(smiles)
        setOriginalMolecule(smiles)
        // Loading example automatically switches to workbench in ContentCanvas
    }

    const handleWorkbenchChange = (smiles: string) => {
        setWorkbenchRuleOverride(null)
        setWorkbenchAppliedMode(null)
        setWorkbenchMolecule(smiles)
    }

    const handleLoadCompareExample = (smilesA: string, smilesB: string) => {
        setWorkbenchRuleOverride(null)
        setPendingCompare({ smilesA, smilesB })
        setWorkbenchAppliedMode(null)
        const combined = `${smilesA}.${smilesB}`
        setWorkbenchMolecule(combined)
        setOriginalMolecule(combined)
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)

    const handleNameMolecule = (smiles: string) => {
        setWorkbenchRuleOverride(null)
        setWorkbenchAppliedMode('naming')
        // Handle multiple molecules (dot-separated)
        if (smiles.includes('.')) {
            const parts = smiles.split('.')
            const names = parts.map((part, index) => {
                const label = String.fromCharCode(65 + index) // A, B, C...
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

        const result = LogicEngine.analyzeMolecule(smiles, ALL_RULES)
        setAppliedRuleIds(result.appliedRuleIds)
        setRuleResults(result.ruleResults)
        return result
    }

    const handleCompareAcids = (result: AcidComparisonResult) => {
        setAppliedRuleIds(result.appliedRuleIds)
        setRuleResults(result.ruleResults)
        setWorkbenchAppliedMode('acid-comparison')
        setWorkbenchRuleOverride({
            appliedRuleIds: result.appliedRuleIds,
            ruleResults: result.ruleResults
        })
    }

    const showRightSidebar = mode !== 'cheatsheet' && mode !== 'study' && mode !== 'info'

    return (
        <div className={`app-container 
            ${!isSidebarOpen ? 'sidebar-collapsed' : ''} 
            ${!isRightSidebarOpen ? 'right-sidebar-collapsed' : ''} 
            ${mode === 'cheatsheet' ? 'cheatsheet-mode' : ''} 
            ${mode === 'study' ? 'study-mode' : ''}
            ${mode === 'info' ? 'info-mode' : ''}`}
        >
            {/* Left Sidebar: Curriculum */}
            <div className={`sidebar-left ${!isSidebarOpen ? 'collapsed' : ''}`}>
                <CurriculumTree
                    curriculum={initialCurriculum}
                    currentSubSubjectId={currentSubSubject.id}
                    onSelectSubSubject={handleSelectSubSubject}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                />
            </div>

            {/* Center: Main Canvas */}
            <div className="center-canvas">
                <ContentCanvas
                    subject={currentSubject} // Pass full subject for continuous scroll
                    mode={mode}
                    onSwitchMode={setMode as any}
                    workbenchMolecule={workbenchMolecule}
                    originalMolecule={originalMolecule}
                    onWorkbenchChange={handleWorkbenchChange}
                    onLoadExample={handleLoadExample}
                    onLoadCompareExample={handleLoadCompareExample}
                    onNameMolecule={handleNameMolecule}
                    onCompareAcids={handleCompareAcids}
                    pendingCompare={pendingCompare}
                    onCompareSeeded={() => setPendingCompare(null)}
                    scrollTargetId={scrollTargetId}
                    onSectionVisible={handleSectionVisible}
                />
            </div>

            {/* Right Sidebar: Logic Console */}
            {showRightSidebar && (
                <div className={`sidebar-right ${!isRightSidebarOpen ? 'collapsed' : ''}`}>
                    <LogicConsole
                        mode={mode}
                        allRules={ALL_RULES}
                        appliedRuleIds={appliedRuleIds}
                        ruleResults={ruleResults} // Pass detailed results
                        appliedMode={workbenchAppliedMode}
                        isOpen={isRightSidebarOpen}
                        onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    />
                </div>
            )}
        </div>
    )
}

export default App
