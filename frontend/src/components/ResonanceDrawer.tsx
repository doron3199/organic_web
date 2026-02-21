import { useState, useEffect, Fragment } from 'react'
import MoleculeViewer from './MoleculeViewer'
import { rdkitService } from '../services/rdkit'
import './ResonanceDrawer.css'

interface ResonanceStructure {
    smiles: string
    molblock?: string
    svg?: string
    index: number
}

interface ResonanceDrawerProps {
    smiles?: string
    onDrawResonance?: () => void
    drawDisabled?: boolean
    drawNonce?: number
}

function ResonanceDrawer({ smiles = '', onDrawResonance, drawDisabled = false, drawNonce = 0 }: ResonanceDrawerProps) {
    const [resonanceStructures, setResonanceStructures] = useState<ResonanceStructure[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [capped, setCapped] = useState(false)
    const [options, setOptions] = useState({
        allow_incomplete_octets: false,
        allow_charge_separation: false,
        unconstrained_cations: false,
        unconstrained_anions: false,
    })

    // Fetch resonance structures when drawNonce changes (button click)
    useEffect(() => {
        if (!smiles || smiles.trim() === '' || drawNonce === 0) {
            if (!smiles || smiles.trim() === '') {
                setResonanceStructures([])
                setError(null)
                setCapped(false)
            }
            return
        }

        const fetchResonance = async () => {
            setLoading(true)
            setError(null)

            try {
                const result = await rdkitService.getResonanceStructures(smiles, options)
                if (result) {
                    setResonanceStructures(result.structures)
                    setCapped(result.capped)
                } else {
                    setError('Failed to compute resonance structures. Is the backend running?')
                    setResonanceStructures([])
                }
            } catch (e) {
                setError('Error connecting to backend.')
                setResonanceStructures([])
            }

            setLoading(false)
        }

        fetchResonance()
    }, [smiles, drawNonce])

    return (
        <div className="resonance-drawer">
            <div className="resonance-header">
                <div className="resonance-header-row">
                    <h2>↔ Resonance Structure Drawer</h2>
                    {onDrawResonance && (
                        <button
                            className="resonance-draw-btn"
                            onClick={onDrawResonance}
                            disabled={drawDisabled}
                        >
                            Draw Resonance
                        </button>
                    )}
                </div>
                <p className="resonance-subtitle">
                    Draw a molecule above to see all its resonance contributors
                </p>
                <div className="resonance-options-row">
                    <label className="resonance-option">
                        <input
                            type="checkbox"
                            checked={options.allow_incomplete_octets}
                            onChange={(e) => setOptions((prev) => ({ ...prev, allow_incomplete_octets: e.target.checked }))}
                        />
                        <span>Allow incomplete octets</span>
                    </label>
                    <label className="resonance-option">
                        <input
                            type="checkbox"
                            checked={options.allow_charge_separation}
                            onChange={(e) => setOptions((prev) => ({ ...prev, allow_charge_separation: e.target.checked }))}
                        />
                        <span>Allow charge separation</span>
                    </label>
                    <label className="resonance-option">
                        <input
                            type="checkbox"
                            checked={options.unconstrained_cations}
                            onChange={(e) => setOptions((prev) => ({ ...prev, unconstrained_cations: e.target.checked }))}
                        />
                        <span>Unconstrained cations</span>
                    </label>
                    <label className="resonance-option">
                        <input
                            type="checkbox"
                            checked={options.unconstrained_anions}
                            onChange={(e) => setOptions((prev) => ({ ...prev, unconstrained_anions: e.target.checked }))}
                        />
                        <span>Unconstrained anions</span>
                    </label>
                </div>
                <p className="resonance-options-note">
                    Note: turning these options on may include incorrect resonance contributors.
                </p>
            </div>

            <div className="resonance-results">
                {loading && (
                    <div className="resonance-loading">
                        <div className="spinner"></div>
                        <span>Computing resonance structures...</span>
                    </div>
                )}

                {error && (
                    <div className="resonance-error">
                        <span>⚠️ {error}</span>
                    </div>
                )}

                {!loading && !error && resonanceStructures.length > 0 && (
                    <>
                        {capped && (
                            <div className="resonance-count">
                                <span>Showing first 20 resonance contributors.</span>
                            </div>
                        )}

                        {/* ── Mechanism strip ── */}
                        {resonanceStructures.length > 1 && (
                            <div className="resonance-mechanism">
                                <h4>Order</h4>
                                <div className="mechanism-scroll">
                                    <div className="mechanism-strip">
                                        {resonanceStructures.map((structure, idx) => (
                                            <Fragment key={idx}>
                                                <div className="mechanism-structure">
                                                    <span className="mechanism-num">#{idx + 1}</span>
                                                    <MoleculeViewer
                                                        smiles={structure.smiles}
                                                        customSvg={structure.svg || undefined}
                                                        width={160}
                                                        height={115}
                                                        readOnly={true}
                                                    />
                                                </div>
                                                {idx < resonanceStructures.length - 1 && (
                                                    <div className="mechanism-arrow">
                                                        <svg viewBox="0 0 40 24" width="40" height="24">
                                                            <line x1="8" y1="12" x2="32" y2="12" stroke="currentColor" strokeWidth="2" />
                                                            <polyline points="12,6 4,12 12,18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                                            <polyline points="28,6 36,12 28,18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Contributor grid ── */}
                        <div className="resonance-grid">
                            {resonanceStructures.map((structure, idx) => (
                                <div key={idx} className="resonance-card">
                                    <div className="resonance-card-header">
                                        <span className="contributor-number">#{idx + 1}</span>
                                        {idx === 0 && <span className="primary-badge">Primary</span>}
                                    </div>
                                    <MoleculeViewer
                                        smiles={structure.smiles}
                                        customSvg={structure.svg || undefined}
                                        width={280}
                                        height={200}
                                        readOnly={true}
                                    />
                                    <div className="resonance-card-smiles">
                                        <code>{structure.smiles}</code>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {resonanceStructures.length > 1 && (
                            <div className="resonance-explanation">
                                <h4>↔ Resonance Hybrid</h4>
                                <p>
                                    The actual molecule is a <strong>hybrid</strong> of all {resonanceStructures.length} contributors shown above.
                                    None of these structures alone represents the real molecule — the true electron distribution
                                    is a weighted average of all contributors.
                                </p>
                            </div>
                        )}

                        {resonanceStructures.length === 1 && (
                            <div className="resonance-explanation">
                                <h4>No additional resonance</h4>
                                <p>
                                    This molecule has only one significant Lewis structure.
                                    It does not exhibit meaningful resonance delocalization.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {!loading && !error && smiles && resonanceStructures.length === 0 && (
                    <div className="resonance-empty">
                        Draw a valid molecule in the editor above to see its resonance structures.
                    </div>
                )}

                {!smiles && (
                    <div className="resonance-empty">
                        <div className="empty-icon">↔</div>
                        <p>Draw a molecule in the editor to explore its resonance structures</p>
                        <div className="resonance-tips">
                            <h4>Try these molecules:</h4>
                            <div className="tip-examples">
                                <span className="tip-molecule">Benzene</span>
                                <span className="tip-molecule">Acetate ion</span>
                                <span className="tip-molecule">Nitrobenzene</span>
                                <span className="tip-molecule">Allyl cation</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ResonanceDrawer
