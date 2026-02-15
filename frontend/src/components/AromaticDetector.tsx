import { useState, useEffect } from 'react'
import { rdkitService } from '../services/rdkit'
import { GraphUtils } from '../services/GraphUtils'
import './AromaticDetector.css'

interface AromaticRing {
    atoms: number[]
    size: number
    piElectrons: number
    isAromatic: boolean
    isAntiAromatic: boolean
    label: string
}

interface AromaticAnalysis {
    rings: AromaticRing[]
    totalAromaticAtoms: number[]
    totalAromaticBonds: number[]
    highlightSvg: string | null
    isFullyAromatic: boolean
    hasAromaticRegions: boolean
    moleculeFormula: string
}

interface AromaticDetectorProps {
    smiles?: string
    onDetect?: () => void
    detectDisabled?: boolean
    detectNonce?: number
}

function AromaticDetector({ smiles = '', onDetect, detectDisabled = false, detectNonce = 0 }: AromaticDetectorProps) {
    const [analysis, setAnalysis] = useState<AromaticAnalysis | null>(null)
    const [loading, setLoading] = useState(false)

    // Analyze aromaticity when SMILES changes
    useEffect(() => {
        let cancelled = false
        if (!smiles || smiles.trim() === '') {
            setAnalysis(null)
            return
        }

        const timer = setTimeout(() => {
            const run = async () => {
                setLoading(true)
                await rdkitService.initialize()
                if (cancelled) return
                analyzeAromaticity(smiles)
                setLoading(false)
            }
            void run()
        }, 600)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [smiles, detectNonce])

    const analyzeAromaticity = (smiles: string) => {
        try {
            // Detect aromatic regions using RDKit
            const aromaticRegions = rdkitService.detectAromaticRegions(smiles)

            if (!aromaticRegions) {
                setAnalysis(null)
                return
            }

            const { aromaticAtoms, aromaticBonds } = aromaticRegions

            // Get molecular formula
            const formula = rdkitService.getMolecularFormula(smiles)

            // Try to analyze individual rings using GraphUtils
            let rings: AromaticRing[] = []
            try {
                const graph = GraphUtils.parseMolecule(smiles)
                const allCycles = GraphUtils.findCycles(graph)

                // Analyze each ring
                rings = allCycles
                    .filter(cycle => cycle.length >= 3 && cycle.length <= 8) // Only rings of realistic size
                    .map(cycle => {
                        const aromaticSet = new Set(aromaticAtoms)
                        const ringAromaticAtoms = cycle.filter(a => aromaticSet.has(a))
                        const allAtomsAromatic = ringAromaticAtoms.length === cycle.length

                        // Estimate pi electrons (simplified Hückel count)
                        // In a fully aromatic ring, pi electrons = number of atoms in the ring
                        // (each contributes 1 p-orbital electron for simple cases)
                        const piElectrons = allAtomsAromatic ? cycle.length : 0

                        // Check Hückel's rule: 4n+2
                        const n = (piElectrons - 2) / 4
                        const isHuckel = piElectrons > 0 && n >= 0 && Number.isInteger(n)

                        // Anti-aromatic: 4n electrons in planar cyclic conjugated system
                        const nAnti = piElectrons / 4
                        const isAntiAromatic = piElectrons > 0 && piElectrons >= 4 && Number.isInteger(nAnti) && !isHuckel

                        let label = ''
                        if (allAtomsAromatic && isHuckel) {
                            label = `${cycle.length}-membered aromatic ring (${piElectrons}π e⁻, n=${n})`
                        } else if (isAntiAromatic) {
                            label = `${cycle.length}-membered anti-aromatic ring (${piElectrons}π e⁻)`
                        } else if (allAtomsAromatic) {
                            label = `${cycle.length}-membered aromatic ring`
                        } else {
                            label = `${cycle.length}-membered non-aromatic ring`
                        }

                        return {
                            atoms: cycle,
                            size: cycle.length,
                            piElectrons,
                            isAromatic: allAtomsAromatic,
                            isAntiAromatic,
                            label
                        }
                    })
            } catch (e) {
                console.warn('Could not analyze rings via GraphUtils:', e)
            }

            // Generate highlighted SVG
            const highlightSvg = rdkitService.generateHighlightedSVG(
                smiles,
                aromaticAtoms,
                aromaticBonds,
                500,
                350,
                '#ff2222' // Red for aromatic regions
            )

            const aromaticRings = rings.filter(r => r.isAromatic)

            setAnalysis({
                rings,
                totalAromaticAtoms: aromaticAtoms,
                totalAromaticBonds: aromaticBonds,
                highlightSvg,
                isFullyAromatic: aromaticRings.length > 0 && aromaticRings.length === rings.length,
                hasAromaticRegions: aromaticAtoms.length > 0,
                moleculeFormula: formula
            })
        } catch (e) {
            console.error('Aromaticity analysis error:', e)
            setAnalysis(null)
        }
    }

    const aromaticRings = analysis?.rings.filter(r => r.isAromatic) || []
    const nonAromaticRings = analysis?.rings.filter(r => !r.isAromatic && !r.isAntiAromatic) || []
    const antiAromaticRings = analysis?.rings.filter(r => r.isAntiAromatic) || []

    return (
        <div className="aromatic-detector">
            <div className="aromatic-header">
                <div className="aromatic-header-row">
                    <h2>⌬ Aromatic Region Detector</h2>
                    {onDetect && (
                        <button
                            className="aromatic-detect-btn"
                            onClick={onDetect}
                            disabled={detectDisabled}
                        >
                            Detect
                        </button>
                    )}
                </div>
                <p className="aromatic-subtitle">
                    Draw a molecule above to detect and highlight aromatic regions in <span className="red-text">red</span>
                </p>
            </div>

            {smiles && (
                <div className="aromatic-input-display">
                    <span className="aromatic-label">Input:</span>
                    <code className="aromatic-smiles">{smiles}</code>
                    {analysis && (
                        <span className="aromatic-formula">{analysis.moleculeFormula}</span>
                    )}
                </div>
            )}

            <div className="aromatic-results">
                {loading && (
                    <div className="aromatic-loading">
                        <div className="spinner"></div>
                        <span>Analyzing aromaticity...</span>
                    </div>
                )}

                {!loading && analysis && (
                    <div className="aromatic-analysis">
                        {/* Highlighted molecule visualization */}
                        {analysis.highlightSvg && (
                            <div className="aromatic-visualization">
                                <h3>
                                    {analysis.hasAromaticRegions
                                        ? '🔴 Aromatic Regions Highlighted'
                                        : '⚪ No Aromatic Regions Detected'}
                                </h3>
                                <div
                                    className="aromatic-svg-container"
                                    dangerouslySetInnerHTML={{ __html: analysis.highlightSvg }}
                                />
                            </div>
                        )}

                        {/* Verdict banner */}
                        <div className={`aromatic-verdict ${analysis.hasAromaticRegions ? 'is-aromatic' : 'not-aromatic'}`}>
                            {analysis.hasAromaticRegions ? (
                                <>
                                    <span className="verdict-icon">✓</span>
                                    <span className="verdict-text">
                                        {analysis.isFullyAromatic
                                            ? 'Fully Aromatic Molecule'
                                            : `Contains ${aromaticRings.length} Aromatic Ring${aromaticRings.length !== 1 ? 's' : ''}`
                                        }
                                    </span>
                                    <span className="verdict-detail">
                                        {analysis.totalAromaticAtoms.length} aromatic atom{analysis.totalAromaticAtoms.length !== 1 ? 's' : ''}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="verdict-icon">✗</span>
                                    <span className="verdict-text">Not Aromatic</span>
                                    <span className="verdict-detail">No aromatic regions detected</span>
                                </>
                            )}
                        </div>

                        {/* Ring Analysis Details */}
                        {analysis.rings.length > 0 && (
                            <div className="ring-analysis">
                                <h4>Ring Analysis</h4>
                                <div className="ring-cards">
                                    {aromaticRings.map((ring, idx) => (
                                        <div key={`arom-${idx}`} className="ring-card aromatic">
                                            <div className="ring-icon">⌬</div>
                                            <div className="ring-info">
                                                <div className="ring-label">{ring.label}</div>
                                                <div className="ring-detail">
                                                    Hückel's Rule: 4n + 2 = {ring.piElectrons} π electrons ✓
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {antiAromaticRings.map((ring, idx) => (
                                        <div key={`anti-${idx}`} className="ring-card anti-aromatic">
                                            <div className="ring-icon">⚠</div>
                                            <div className="ring-info">
                                                <div className="ring-label">{ring.label}</div>
                                                <div className="ring-detail">
                                                    4n electrons — Anti-aromatic (destabilized)
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {nonAromaticRings.map((ring, idx) => (
                                        <div key={`non-${idx}`} className="ring-card non-aromatic">
                                            <div className="ring-icon">○</div>
                                            <div className="ring-info">
                                                <div className="ring-label">{ring.label}</div>
                                                <div className="ring-detail">
                                                    Does not meet aromaticity criteria
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Criteria checklist */}
                        <div className="aromatic-criteria">
                            <h4>Aromaticity Criteria</h4>
                            <div className="criteria-list">
                                <div className={`criterion ${analysis.rings.length > 0 ? 'met' : 'unmet'}`}>
                                    <span className="criterion-check">{analysis.rings.length > 0 ? '✓' : '✗'}</span>
                                    <span>Cyclic structure (contains ring)</span>
                                </div>
                                <div className={`criterion ${analysis.hasAromaticRegions ? 'met' : 'unmet'}`}>
                                    <span className="criterion-check">{analysis.hasAromaticRegions ? '✓' : '✗'}</span>
                                    <span>Planar with continuous p-orbital overlap</span>
                                </div>
                                <div className={`criterion ${aromaticRings.some(r => r.piElectrons > 0) ? 'met' : 'unmet'}`}>
                                    <span className="criterion-check">{aromaticRings.some(r => r.piElectrons > 0) ? '✓' : '✗'}</span>
                                    <span>Hückel's Rule: 4n + 2 π electrons (odd number of pairs)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !analysis && !smiles && (
                    <div className="aromatic-empty">
                        <div className="empty-icon">⌬</div>
                        <p>Draw a molecule in the editor to analyze its aromaticity</p>
                        <div className="aromatic-tips">
                            <h4>Try these molecules:</h4>
                            <div className="tip-examples">
                                <span className="tip-molecule">Benzene (aromatic)</span>
                                <span className="tip-molecule">Naphthalene (fused aromatic)</span>
                                <span className="tip-molecule">Pyrrole (heteroaromatic)</span>
                                <span className="tip-molecule">Cyclohexane (not aromatic)</span>
                                <span className="tip-molecule">Cyclobutadiene (anti-aromatic)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    )
}

export default AromaticDetector
