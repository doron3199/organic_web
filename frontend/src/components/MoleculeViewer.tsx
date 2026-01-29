import { useEffect, useState } from 'react'
import { rdkitService } from '../services/rdkit'
import './MoleculeViewer.css'

interface MoleculeViewerProps {
    smiles: string
    customSvg?: string
    customSvgUrl?: string
    onEdit?: () => void
    width?: number
    height?: number
    className?: string
    readOnly?: boolean
}

function MoleculeViewer({ smiles, customSvg, customSvgUrl, onEdit, width = 250, height = 150, className = '', readOnly = false }: MoleculeViewerProps) {
    const [svg, setSvg] = useState<string>('')

    useEffect(() => {
        if (customSvg || customSvgUrl) {
            setSvg('')
            return
        }

        const updateSvg = () => {
            const generatedSvg = rdkitService.generateSVG(smiles, width, height, { addAtomIndices: false })
            if (generatedSvg) {
                setSvg(generatedSvg)
            }
        }

        // Initial update
        updateSvg()

        // If RDKit loads late (rare since initialized in App), we might want to retry
        // A simple polling or event listener could be better, but for now let's rely on parent init
        const interval = setInterval(() => {
            if (!svg && rdkitService.isAvailable()) {
                updateSvg()
            }
        }, 500)

        return () => clearInterval(interval)
    }, [smiles, width, height, customSvg])

    const displaySvg = customSvg || svg;

    return (
        <div className={`molecule-viewer-container ${className} ${customSvg || customSvgUrl ? 'is-custom' : ''}`}>
            <div
                className="molecule-canvas"
                style={customSvg || customSvgUrl ? { width, height } : {}}
            >
                {customSvgUrl ? (
                    <img
                        src={customSvgUrl}
                        alt={smiles}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <div
                        style={{ width: '100%', height: '100%' }}
                        dangerouslySetInnerHTML={{ __html: displaySvg }}
                    />
                )}
            </div>
            {!readOnly && onEdit && (
                <button className="edit-overlay-btn" onClick={onEdit}>
                    <span className="edit-icon">✎</span> Edit
                </button>
            )}
        </div>
    )
}

export default MoleculeViewer
