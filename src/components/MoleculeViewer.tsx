import { useEffect, useState } from 'react'
import { rdkitService } from '../services/rdkit'
import './MoleculeViewer.css'

interface MoleculeViewerProps {
    smiles: string
    onEdit: () => void
}

function MoleculeViewer({ smiles, onEdit }: MoleculeViewerProps) {
    const [svg, setSvg] = useState<string>('')

    useEffect(() => {
        const updateSvg = () => {
            const generatedSvg = rdkitService.generateSVG(smiles, 250, 150, { addAtomIndices: false })
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
    }, [smiles])

    return (
        <div className="molecule-viewer-container">
            <div
                className="molecule-canvas"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            <button className="edit-overlay-btn" onClick={onEdit}>
                <span className="edit-icon">✎</span> Edit / Experiment
            </button>
        </div>
    )
}

export default MoleculeViewer
