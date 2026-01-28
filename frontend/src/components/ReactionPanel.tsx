import { useState, useEffect } from 'react'
import { reactionRules } from '../services/reactions'
import { rdkitService } from '../services/rdkit'
import MoleculeViewer from './MoleculeViewer'
import './ReactionPanel.css'

interface ReactionPanelProps {
    currentMolecule: string
    onMoleculeUpdate: (smiles: string) => void
    onRequestSmiles?: () => Promise<string | undefined>
}

const AVAILABLE_CONDITIONS = [
    { id: 'heat', label: '🔥 Heat (\u0394)' },
    { id: 'light', label: '☀️ Light (hv)' },
    { id: 'acid', label: '🧪 Acid (H+)' },
    { id: 'base', label: '🧼 Base (OH-)' },
    { id: 'h2o', label: '💧 Water' },
]

function ReactionPanel({ currentMolecule, onMoleculeUpdate, onRequestSmiles }: ReactionPanelProps) {
    const [selectedConditions, setSelectedConditions] = useState<string[]>(['h2o'])
    const [matchedReactions, setMatchedReactions] = useState(reactionRules)
    const [results, setResults] = useState<{ reactionName: string, products: string[] }[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [searchPerformed, setSearchPerformed] = useState(false)
    const [showConditionError, setShowConditionError] = useState(false)
    const [isSingleSelect, setIsSingleSelect] = useState(true)

    // Filter reactions based on selected conditions
    useEffect(() => {
        if (selectedConditions.length === 0) {
            // If no conditions selected, don't match anything that typically requires conditions (like heat/light).
            // For now, let's just return empty matches to force user to select active conditions.
            setMatchedReactions([])
            return
        }

        const filtered = reactionRules.filter(rule => {
            const ruleCondsLower = rule.conditions.join(' ').toLowerCase()

            // 1. First check if rule matches what IS selected (User selected 'Light', does rule use 'Light'?)
            // This was the old logic.
            // But we also need: If rule REQUIRES 'Light', did user select 'Light'?

            // Let's invert the thinking:
            // A rule is a candidate if ALL its required "driver" conditions are met.
            // We define "drivers" as Heat, Light, Acid, Base.

            const needsHeat = ruleCondsLower.includes('heat') || ruleCondsLower.includes('\u0394')
            const needsLight = ruleCondsLower.includes('light') || ruleCondsLower.includes('hv')
            const needsAcid = ruleCondsLower.includes('acid') || ruleCondsLower.includes('h+') || ruleCondsLower.includes('h2so4')
            const needsBase = ruleCondsLower.includes('base') || ruleCondsLower.includes('oh-') || ruleCondsLower.includes('nanh2')

            const hasHeat = selectedConditions.includes('heat')
            const hasLight = selectedConditions.includes('light')
            const hasAcid = selectedConditions.includes('acid')
            const hasBase = selectedConditions.includes('base')

            // Logic: Include rule if strict requirements are met
            if (needsHeat && !hasHeat && !needsLight) return false // Requires heat, don't have it
            if (needsLight && !hasLight && !needsHeat) return false // Requires light, don't have it

            // Special case: "Heat OR Light" (Halogenation often allows either)
            // If rule implies (Heat OR Light)
            if ((needsHeat && needsLight) && (!hasHeat && !hasLight)) return false

            if (needsAcid && !hasAcid) return false
            if (needsBase && !hasBase) return false

            // STRICT EXCLUSION: If user selected Acid/Base but rule strictly DOES NOT need it, exclude it.
            if (hasAcid && !needsAcid) return false
            if (hasBase && !needsBase) return false

            // If we passed strict checks, does it match at least one selected condition?
            // (To avoid showing random unaffected reactions)
            return selectedConditions.some(cond => {
                if (cond === 'heat') return needsHeat
                if (cond === 'light') return needsLight
                if (cond === 'acid') return needsAcid
                if (cond === 'base') return needsBase
                return ruleCondsLower.includes(cond)
            })
        })
        setMatchedReactions(filtered)
    }, [selectedConditions])

    const handleConditionToggle = (id: string) => {
        setSelectedConditions(prev => {
            let newConds: string[]

            if (isSingleSelect) {
                // In single select mode:
                // If clicking active one -> toggle off (empty)
                // If clicking inactive one -> replace all with this one
                if (prev.includes(id)) {
                    newConds = []
                } else {
                    newConds = [id]
                }
            } else {
                // Multi select mode (standard toggle)
                newConds = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
            }

            if (newConds.length > 0) setShowConditionError(false)
            return newConds
        })
    }

    const handleRunReaction = async () => {
        if (selectedConditions.length === 0) {
            setShowConditionError(true)
            return
        }
        setShowConditionError(false)

        setSearchPerformed(false)
        setResults([])

        // Fetch latest SMILES if available
        let moleculeToReact = currentMolecule
        if (onRequestSmiles) {
            const latestSmiles = await onRequestSmiles()
            if (latestSmiles) {
                moleculeToReact = latestSmiles
            }
        }

        if (!moleculeToReact || matchedReactions.length === 0) return

        setIsRunning(true)
        const allResults: { reactionName: string, products: string[] }[] = []

        // Split molecule into independent reactants
        const reactants = moleculeToReact.split('.')

        // Try every matched rule on every reactant
        for (const rule of matchedReactions) {
            // STRICT REAGENT CHECK: Ensure required reagents are actually present
            // This prevents "Light" from triggering both Cl2 and Br2 reactions if only one is present.
            const conds = rule.conditions.join(' ')
            const needsBr2 = conds.includes('Br2')
            const needsCl2 = conds.includes('Cl2')

            const hasBr2 = reactants.some(r => r === 'BrBr' || r === 'Br-Br')
            const hasCl2 = reactants.some(r => r === 'ClCl' || r === 'Cl-Cl')

            if (needsBr2 && !hasBr2) continue
            if (needsCl2 && !hasCl2) continue

            const ruleProducts = new Set<string>()

            for (const reactant of reactants) {
                // Skip reagents themselves as reactants (don't react Cl2 with itself)
                if (reactant === 'ClCl' || reactant === 'Cl-Cl' || reactant === 'BrBr' || reactant === 'Br-Br') continue

                // Run RDKit reaction on single reactant
                // Note: If rule requires 2 reactants, this simplified loop might need adjustment,
                // but for our current 1-component SMARTS, this allows any drawn molecule to react.
                const outcomes = await rdkitService.runReaction([reactant], rule.smarts)
                if (outcomes) {
                    const outcomeList = Array.isArray(outcomes) ? outcomes : [outcomes as string]
                    if (outcomeList.length > 0) {
                        outcomeList.forEach(p => ruleProducts.add(p))
                    }
                }
            }

            if (ruleProducts.size > 0) {
                allResults.push({
                    reactionName: rule.name,
                    products: Array.from(ruleProducts)
                })
            }
        }

        setResults(allResults)
        setSearchPerformed(true)
        setIsRunning(false)
    }

    const handleAddToEditor = (productSmiles: string) => {
        onMoleculeUpdate(productSmiles)
    }

    return (
        <div className="reaction-panel">
            <div className="panel-header">
                <h3>⚡ Reaction Workbench</h3>
            </div>

            <div className="conditions-selector">
                <div className="toggle-switch-container">
                    <span>Multi-Select</span>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={isSingleSelect}
                            onChange={(e) => {
                                setIsSingleSelect(e.target.checked)
                                // If switching TO single select and multiple are selected, keep only first or clear?
                                // Let's keep the most recent or just the first one to be safe.
                                if (e.target.checked && selectedConditions.length > 1) {
                                    setSelectedConditions([selectedConditions[0]])
                                }
                            }}
                        />
                        <span className="slider"></span>
                    </label>
                    <span>Single-Select</span>
                </div>

                {showConditionError && <div className="condition-error-msg">⚠️ Please select at least one condition</div>}
                <h4>Select Conditions:</h4>
                <div className="conditions-grid">
                    {AVAILABLE_CONDITIONS.map(cond => (
                        <button
                            key={cond.id}
                            className={`condition-tag ${selectedConditions.includes(cond.id) ? 'active' : ''}`}
                            onClick={() => handleConditionToggle(cond.id)}
                        >
                            {cond.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="reaction-actions">
                <button
                    className="btn-primary"
                    disabled={isRunning}
                    onClick={handleRunReaction}
                >
                    {isRunning ? 'Running...' : '🚀 Run Matching Reactions'}
                </button>
            </div>

            {searchPerformed && results.length === 0 && (
                <div className="no-matches-container">
                    <p className="no-matches-text">No matching reactions found. Check reagents and conditions.</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="products-section">
                    {results.map((res, resIdx) => (
                        <div key={resIdx} className="reaction-result-group">
                            <h4>Via {res.reactionName}:</h4>
                            <div className="products-grid">
                                {res.products.map((prod, idx) => (
                                    <div key={idx} className="product-card">
                                        <div className="product-img">
                                            <MoleculeViewer smiles={prod} width={150} height={100} readOnly={true} />
                                        </div>
                                        <button
                                            className="btn-small"
                                            onClick={() => handleAddToEditor(prod)}
                                        >
                                            Add to Editor
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ReactionPanel
