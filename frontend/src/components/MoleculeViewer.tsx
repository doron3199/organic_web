import { useEffect, useState } from 'react'
import { rdkitService } from '../services/rdkit'
import './MoleculeViewer.css'

interface MoleculeViewerProps {
    smiles: string
    onEdit?: () => void
    width?: number
    height?: number
    className?: string
    readOnly?: boolean
}

function MoleculeViewer({ smiles, onEdit, width = 250, height = 150, className = '', readOnly = false }: MoleculeViewerProps) {
    const [svg, setSvg] = useState<string>('')

    useEffect(() => {
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
    }, [smiles, width, height])

    return (
        <div className={`molecule-viewer-container ${className}`}>
            <div
                className="molecule-canvas"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            {!readOnly && onEdit && (
                <button className="edit-overlay-btn" onClick={onEdit}>
                    <span className="edit-icon">✎</span> Edit / Experiment
                </button>
            )}
        </div>
    )
}

export default MoleculeViewer
