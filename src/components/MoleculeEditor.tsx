import { useRef, useState } from 'react'
import { Editor } from 'ketcher-react'
import { StandaloneStructServiceProvider } from 'ketcher-standalone'
import { Ketcher, StructServiceProvider } from 'ketcher-core'
import 'ketcher-react/dist/index.css'
import './MoleculeEditor.css'

interface MoleculeEditorProps {
    onMoleculeChange?: (smiles: string) => void
    initialMolecule?: string
    onBack: () => void
    onNameMolecule: (smiles: string) => string
}

const structServiceProvider = new StandaloneStructServiceProvider() as StructServiceProvider

function MoleculeEditor({ onMoleculeChange, initialMolecule, onBack, onNameMolecule }: MoleculeEditorProps) {
    const ketcherRef = useRef<Ketcher | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [message, setMessage] = useState('Initializing...')
    const [generatedName, setGeneratedName] = useState<string | null>(null)

    // Handle Reset
    const handleReset = async () => {
        if (!ketcherRef.current) return
        try {
            await ketcherRef.current.setMolecule(initialMolecule || '')
            setMessage('Refreshed to original molecule')
            setGeneratedName(null)
        } catch (error) {
            console.error('Reset failed:', error)
        }
    }

    const handleNameMoleculeClick = async () => {
        if (!ketcherRef.current) return

        try {
            const smiles = await ketcherRef.current.getSmiles()
            if (onMoleculeChange) onMoleculeChange(smiles)

            const name = onNameMolecule(smiles)
            setGeneratedName(name)
            setMessage('Molecule named!')
        } catch (error) {
            console.error('Naming failed:', error)
            setMessage('Error identifying molecule')
        }
    }

    return (
        <div className="molecule-editor-container">
            {/* Header Controls */}
            <div className="editor-controls-header">
                <button className="control-btn back-btn" onClick={onBack} title="Return to Study Mode">
                    ← Back
                </button>
                <div className="editor-title-status">
                    <h3>Workbench</h3>
                    <span className="status-text">{message}</span>
                </div>
                <button
                    className="control-btn reset-btn"
                    onClick={handleReset}
                    disabled={!isReady}
                    title="Reset to original structure"
                >
                    ↺ Reset
                </button>
            </div>

            {/* Ketcher Editor */}
            <div className="editor-wrapper">
                {/* Status indicator overlay if needed, or just keep it clean */}
                {!isReady && (
                    <div className="loading-status-overlay">
                        <div className="spinner"></div>
                        <p>Loading Editor...</p>
                    </div>
                )}

                <Editor
                    staticResourcesUrl={import.meta.env.BASE_URL}
                    structServiceProvider={structServiceProvider}
                    onInit={(ketcher: Ketcher) => {
                        ketcherRef.current = ketcher
                            ; (window as any).ketcher = ketcher
                        setIsReady(true)
                        setMessage('Ready')

                        // Load initial molecule if provided
                        if (initialMolecule) {
                            ketcher.setMolecule(initialMolecule).catch(console.error)
                        }
                    }}
                    errorHandler={(message: string) => {
                        console.error('Ketcher error:', message)
                        setMessage(`Error: ${message}`)
                    }}
                />
            </div>

            {/* Footer Controls */}
            <div className="editor-footer-controls">
                <button
                    className="action-btn name-btn"
                    onClick={handleNameMoleculeClick}
                    disabled={!isReady}
                >
                    🏷️ Name Molecule
                </button>

                {generatedName && (
                    <div className="generated-name-display fade-in">
                        <strong>Name:</strong> {generatedName}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MoleculeEditor
