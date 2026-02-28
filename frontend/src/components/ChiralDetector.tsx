import { useEffect, useState } from 'react'
import { ChiralityResult, rdkitService } from '../services/rdkit'
import { LogicEngine } from '../services/logicEngine'
import { ALL_RULES } from '../data/allRules'
import './ChiralDetector.css'

interface ChiralDetectorProps {
    smiles?: string
    onDetect?: () => void
    detectDisabled?: boolean
    detectNonce?: number
}

const CHIRAL_COLORS = ['#4fc3f7', '#4caf50', '#ff9800', '#f44336', '#ab47bc', '#26a69a']

const getColorForPosition = (index: number): string => CHIRAL_COLORS[index % CHIRAL_COLORS.length]

function ChiralDetector({ smiles = '', onDetect, detectDisabled = false, detectNonce = 0 }: ChiralDetectorProps) {
    const [analysis, setAnalysis] = useState<ChiralityResult | null>(null)
    const [highlightSvg, setHighlightSvg] = useState<string | null>(null)
    const [atomColorMap, setAtomColorMap] = useState<Record<number, string>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        if (!smiles || smiles.trim() === '') {
            setAnalysis(null)
            setHighlightSvg(null)
            setAtomColorMap({})
            setError(null)
            return
        }

        const timer = setTimeout(() => {
            const run = async () => {
                setLoading(true)
                setError(null)

                try {
                    await rdkitService.initialize()
                    if (cancelled) return

                    // Get base name without stereochemistry suffix
                    const stnResult = LogicEngine.analyzeMolecule(smiles, ALL_RULES)
                    let baseName: string | undefined = stnResult.name || ''
                    if (baseName) {
                        baseName = baseName.replace(' (Stereochemistry not included. Switch to Stereo Mode to view)', '')
                    }
                    if (baseName === 'Unknown Molecule' || baseName.startsWith('Unknown Molecule -')) {
                        baseName = undefined
                    }

                    const locantMap: Record<number, string> = {}
                    if (stnResult.locantMap) {
                        for (const [key, val] of Object.entries(stnResult.locantMap)) {
                            locantMap[Number(key)] = val.toString()
                        }
                    } else if (stnResult.mainChainAtoms) {
                        stnResult.mainChainAtoms.forEach((atomIdx, index) => {
                            locantMap[atomIdx] = (index + 1).toString()
                        })
                    }

                    const result = await rdkitService.detectChiralCenters(smiles, baseName, locantMap)
                    if (cancelled) return

                    if (!result) {
                        setAnalysis(null)
                        setHighlightSvg(null)
                        setAtomColorMap({})
                        setError('Failed to detect chiral centers. Is the backend running?')
                        setLoading(false)
                        return
                    }

                    setAnalysis(result)

                    const nextAtomColorMap = result.chiral_atom_indices.reduce<Record<number, string>>((acc, atomIndex, position) => {
                        acc[atomIndex] = getColorForPosition(position)
                        return acc
                    }, {})
                    setAtomColorMap(nextAtomColorMap)

                    const svg = rdkitService.generateHighlightedSVG(
                        smiles,
                        result.chiral_atom_indices,
                        [],
                        500,
                        350,
                        '#4fc3f7',
                        nextAtomColorMap
                    )
                    setHighlightSvg(svg)
                } catch (e) {
                    console.error('Chiral detector error:', e)
                    if (!cancelled) {
                        setAnalysis(null)
                        setHighlightSvg(null)
                        setAtomColorMap({})
                        setError('Chiral center analysis failed.')
                    }
                }

                if (!cancelled) {
                    setLoading(false)
                }
            }

            void run()
        }, 500)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [smiles, detectNonce])

    const chiralCenters = analysis?.chiral_centers ?? []
    const assignedCenters = chiralCenters.filter((center) => center.configuration !== 'Unassigned')

    return (
        <div className="chiral-detector">
            <div className="chiral-header">
                <div className="chiral-header-row">
                    <h2>🧭 Chiral Carbon Detector</h2>
                    {onDetect && (
                        <button
                            className="chiral-detect-btn"
                            onClick={onDetect}
                            disabled={detectDisabled}
                        >
                            Detect
                        </button>
                    )}
                </div>
                <p className="chiral-subtitle">
                    Detect stereogenic carbons and assign absolute configuration (R/S)
                </p>
            </div>

            <div className="chiral-results">
                {loading && (
                    <div className="chiral-loading">
                        <div className="spinner"></div>
                        <span>Analyzing chirality...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="chiral-error">{error}</div>
                )}

                {!loading && analysis && (
                    <div className="chiral-analysis">
                        {highlightSvg && (
                            <div className="chiral-visualization">
                                <h3>
                                    {analysis.is_chiral
                                        ? '🔷 Chiral Carbons Highlighted'
                                        : '⚪ No Chiral Carbons Detected'}
                                </h3>
                                <div
                                    className="chiral-svg-container"
                                    dangerouslySetInnerHTML={{ __html: highlightSvg }}
                                />
                            </div>
                        )}

                        <div className={`chiral-verdict ${analysis.is_chiral ? 'is-chiral' : 'not-chiral'}`}>
                            {analysis.is_chiral ? (
                                <>
                                    <span className="verdict-icon">✓</span>
                                    <span className="verdict-text">
                                        {chiralCenters.length} chiral carbon{chiralCenters.length !== 1 ? 's' : ''} detected
                                    </span>
                                    <span className="verdict-detail">
                                        {assignedCenters.length} assigned (R/S)
                                    </span>
                                    {analysis.stereo_name && (
                                        <div className="stereo-name-result" style={{ marginTop: '10px', fontSize: '1.2em', fontWeight: 'bold', color: '#fff' }}>
                                            {analysis.stereo_name}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="verdict-icon">✗</span>
                                    <span className="verdict-text">Achiral molecule</span>
                                    <span className="verdict-detail">No stereogenic carbons found</span>
                                </>
                            )}
                        </div>

                        {chiralCenters.length > 0 && (
                            <div className="chiral-center-analysis">
                                <h4>Detected Chiral Carbons</h4>
                                <div className="chiral-legend-row" aria-label="R and S configuration legend">
                                    <div className="chiral-legend-item">
                                        <span className="legend-emoji">↻</span>
                                        <span className="legend-text"><strong>R</strong> - right / clockwise</span>
                                    </div>
                                    <div className="chiral-legend-item">
                                        <span className="legend-emoji">↺</span>
                                        <span className="legend-text"><strong>S</strong> - left / counterclockwise</span>
                                    </div>
                                </div>
                                <div className="chiral-center-cards">
                                    {chiralCenters.map((center) => (
                                        <div key={center.atom_index} className="chiral-center-card">
                                            <div className="chiral-center-badge" style={{ backgroundColor: atomColorMap[center.atom_index] || '#4fc3f7' }}></div>
                                            <div className="chiral-center-info">
                                                <div className="chiral-center-label">Chiral Carbon</div>
                                                <div className="chiral-center-detail">
                                                    Attached groups: {center.neighbors.join(', ')}
                                                </div>
                                            </div>
                                            <div
                                                className={`chiral-config ${center.configuration === 'Unassigned' ? 'unassigned' : ''}`}
                                                style={center.configuration === 'Unassigned' ? undefined : {
                                                    borderColor: atomColorMap[center.atom_index] || '#4fc3f7',
                                                    color: atomColorMap[center.atom_index] || '#4fc3f7'
                                                }}
                                            >
                                                {center.configuration}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!loading && !analysis && !smiles && (
                    <div className="chiral-empty">
                        <div className="empty-icon">🧭</div>
                        <p>Draw a molecule in the editor to detect chiral carbons and R/S assignments</p>
                        <div className="chiral-tips">
                            <h4>Try these molecules:</h4>
                            <div className="tip-examples">
                                <span className="tip-molecule">2-Bromobutane (chiral)</span>
                                <span className="tip-molecule">Lactic acid (chiral)</span>
                                <span className="tip-molecule">2-Propanol (achiral)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ChiralDetector
