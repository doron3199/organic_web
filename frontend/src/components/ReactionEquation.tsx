import { ReactionExample } from '../data/curriculum'
import MoleculeViewer from './MoleculeViewer'
import SelectivityChart from './SelectivityChart'
import './ReactionEquation.css'

interface ReactionEquationProps {
    reaction: ReactionExample
    onExperiment?: (smiles: string, conditions: string) => void
}

function ReactionEquation({ reaction, onExperiment }: ReactionEquationProps) {
    const handleExperimentClick = () => {
        if (onExperiment) {
            const reactantSmiles = reaction.reactants.map(r => r.smiles).join('.')
            onExperiment(reactantSmiles, reaction.conditions)
        }
    }

    return (
        <div className="reaction-equation-wrapper">
            {reaction.name && <h3 className="reaction-title">{reaction.name}</h3>}
            {onExperiment && (
                <div className="experiment-controls">
                    <button className="btn-experiment" onClick={handleExperimentClick}>
                        🧪 Experiment
                    </button>
                </div>
            )}
            <div className="reaction-equation-container">
                {/* Reactants */}
                <div className="reactants-group">
                    {reaction.reactants.map((reactant, idx) => (
                        <div key={idx} className="reaction-part">
                            <MoleculeViewer
                                smiles={reactant.smiles}
                                width={180}
                                height={120}
                                readOnly={true}
                            />
                            <div className="reaction-label">{reactant.name}</div>
                            {idx < reaction.reactants.length - 1 && (
                                <div className="plus-sign">+</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Arrow & Conditions */}
                <div className="reaction-arrow-container">
                    <div className="reaction-condition">{reaction.conditions}</div>
                    <div className="reaction-arrow">{reaction.isEquilibrium ? '⇌' : '→'}</div>
                </div>

                {/* Auto-Add Molecules (display only, not included in experiment) */}
                {reaction.autoAddMolecules && reaction.autoAddMolecules.length > 0 && (
                    <div className="auto-add-molecules-group">
                        <div className="auto-add-label">+ reagents:</div>
                        <div className="auto-add-list">
                            {reaction.autoAddMolecules.map((mol, idx) => (
                                <div key={idx} className="auto-add-molecule">
                                    <MoleculeViewer
                                        smiles={mol.smiles}
                                        width={60}
                                        height={45}
                                        readOnly={true}
                                    />
                                    <span className="auto-add-name">{mol.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="reaction-arrow" style={{ fontSize: '1.2rem' }}>→</div>
                    </div>
                )}

                {/* Products */}
                <div className="products-group">
                    {reaction.products.map((product, idx) => {
                        // Determine label for chart
                        let chartLabel = ''
                        if (product.yield) chartLabel = `${product.yield}%`
                        else if (product.selectivity) chartLabel = product.selectivity.charAt(0).toUpperCase() + product.selectivity.slice(1)

                        return (
                            <div key={idx} className={`reaction-part ${product.isByproduct ? 'byproduct' : ''}`}>
                                <MoleculeViewer
                                    smiles={product.smiles}
                                    width={product.isByproduct ? 100 : 180}
                                    height={product.isByproduct ? 80 : 120}
                                    readOnly={true}
                                />
                                <div className="reaction-label product-label">{product.name}</div>
                                {!['elimination_substitution', 'intramolecular_substitution', 'sn1_reaction', 'sn2_reaction', 'e1_reaction', 'e2_reaction'].includes(reaction.id || '') && !product.isByproduct && (
                                    <SelectivityChart
                                        type={product.selectivity}
                                        percentage={product.yield}
                                        label={chartLabel}
                                    />
                                )}
                                {idx < reaction.products.length - 1 && (
                                    <div className="plus-sign">+</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default ReactionEquation
