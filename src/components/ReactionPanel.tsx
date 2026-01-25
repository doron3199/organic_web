import { useState } from 'react'
import { reactionRules, predictProducts, getReactionMechanism } from '../services/reactions'
import { rdkitService } from '../services/rdkit'
import './ReactionPanel.css'

interface ReactionPanelProps {
    currentMolecule: string
}

function ReactionPanel({ currentMolecule }: ReactionPanelProps) {
    const [selectedReaction, setSelectedReaction] = useState<string>('')
    const [products, setProducts] = useState<string[]>([])
    const [showMechanism, setShowMechanism] = useState(false)

    const handleRunReaction = () => {
        if (!currentMolecule || !selectedReaction) {
            alert('Please select a molecule and reaction type')
            return
        }

        // Validate SMILES
        if (!rdkitService.isValidSMILES(currentMolecule)) {
            alert('Invalid molecule structure')
            return
        }

        // Predict products
        const predicted = predictProducts(currentMolecule, selectedReaction)
        setProducts(predicted)
        setShowMechanism(true)
    }

    const handleClear = () => {
        setSelectedReaction('')
        setProducts([])
        setShowMechanism(false)
    }

    const selectedRule = reactionRules.find(r => r.id === selectedReaction)

    return (
        <div className="reaction-panel">
            <div className="panel-header">
                <h3>⚡ Reaction Predictor</h3>
                <p className="panel-subtitle">Select a reaction type to predict products</p>
            </div>

            <div className="reaction-selector">
                <label htmlFor="reaction-select">Reaction Type:</label>
                <select
                    id="reaction-select"
                    value={selectedReaction}
                    onChange={(e) => setSelectedReaction(e.target.value)}
                >
                    <option value="">-- Select Reaction --</option>
                    {reactionRules.map(rule => (
                        <option key={rule.id} value={rule.id}>
                            {rule.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedRule && (
                <div className="reaction-info card">
                    <h4>{selectedRule.name}</h4>
                    <p className="description">{selectedRule.description}</p>

                    <div className="conditions">
                        <strong>Conditions:</strong>
                        <ul>
                            {selectedRule.conditions.map((condition, idx) => (
                                <li key={idx}>{condition}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <div className="reaction-controls">
                <button
                    className="btn-primary"
                    onClick={handleRunReaction}
                    disabled={!currentMolecule || !selectedReaction}
                >
                    🧪 Run Reaction
                </button>
                <button className="btn-secondary" onClick={handleClear}>
                    Clear Results
                </button>
            </div>

            {products.length > 0 && (
                <div className="results-section fade-in">
                    <h4>Predicted Products:</h4>
                    <div className="products-list">
                        {products.map((product, idx) => (
                            <div key={idx} className="product-item">
                                <span className="product-number">Product {idx + 1}:</span>
                                <code className="smiles-code">{product}</code>
                                <span className="formula">
                                    {rdkitService.getMolecularFormula(product)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {showMechanism && selectedReaction && (
                        <div className="mechanism-section">
                            <h4>Reaction Mechanism:</h4>
                            <pre className="mechanism-text">
                                {getReactionMechanism(selectedReaction)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {!currentMolecule && (
                <div className="empty-state">
                    <p>👆 Draw or select a molecule in the editor above</p>
                </div>
            )}
        </div>
    )
}

export default ReactionPanel
