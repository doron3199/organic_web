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
                    <div className="reaction-arrow">→</div>
                </div>

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
                                {!product.isByproduct && (
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
