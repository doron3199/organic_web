// RDKit.js wrapper for chemistry calculations
// This will be initialized from CDN in the browser

export interface Molecule {
    smiles: string
    molBlock?: string
    svg?: string
}

export interface ReactionRule {
    id: string
    name: string
    smarts: string
    description: string
    conditions: string[]
}

export interface MatchResult {
    atoms: number[]
    bonds: number[]
}

class RDKitService {
    private rdkit: any = null
    private initialized: boolean = false

    async initialize(): Promise<boolean> {
        if (this.initialized) return true

        try {
            // RDKit will be loaded from CDN via script tag in index.html
            // @ts-ignore
            if (window.initRDKitModule) {
                // @ts-ignore
                this.rdkit = await window.initRDKitModule()
                this.initialized = true
                console.log('RDKit initialized successfully')
                return true
            } else {
                console.warn('RDKit not available, using mock mode')
                return false
            }
        } catch (error) {
            console.error('Failed to initialize RDKit:', error)
            return false
        }
    }

    isAvailable(): boolean {
        return this.initialized && this.rdkit !== null
    }

    // Parse SMILES string into molecule
    parseSMILES(smiles: string): Molecule | null {
        if (!this.isAvailable()) {
            // Mock mode - just return the SMILES
            return { smiles }
        }

        try {
            const mol = this.rdkit.get_mol(smiles)
            if (!mol || !mol.is_valid()) {
                return null
            }

            const molBlock = mol.get_molblock()
            const svg = mol.get_svg()

            mol.delete() // Clean up memory

            return {
                smiles,
                molBlock,
                svg
            }
        } catch (error) {
            console.error('Error parsing SMILES:', error)
            return null
        }
    }

    // Generate SVG from SMILES with options
    generateSVG(smiles: string, width: number = 400, height: number = 300, options: { addAtomIndices?: boolean } = {}): string | null {
        if (!this.isAvailable()) {
            return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="50%" y="50%" text-anchor="middle">RDKit not loaded</text></svg>`
        }

        const molecule = this.parseSMILES(smiles)
        if (!molecule) return null

        try {
            const mol = this.rdkit.get_mol(smiles)

            // Prepare drawing options
            const drawOpts = JSON.stringify({
                ...options,
                width,
                height,
                addAtomIndices: options.addAtomIndices ?? false
            })

            // Use get_svg_with_highlights if available for more options, otherwise get_svg
            let svg = ''
            if (mol.get_svg_with_highlights) {
                svg = mol.get_svg_with_highlights(drawOpts)
            } else {
                svg = mol.get_svg(width, height)
            }

            mol.delete()
            return svg
        } catch (e) {
            console.error("Error generating SVG:", e)
            return null
        }
    }

    // Validate SMILES notation
    isValidSMILES(smiles: string): boolean {
        if (!smiles || smiles.trim() === '') return false

        if (!this.isAvailable()) {
            // Basic validation in mock mode
            const validChars = /^[A-Za-z0-9@+\-\[\]\(\)=#$:.\/\\]+$/
            return validChars.test(smiles)
        }

        const mol = this.parseSMILES(smiles)
        return mol !== null
    }

    // Get molecular formula
    getMolecularFormula(smiles: string): string {
        if (!this.isAvailable()) {
            // Mock formulas for common molecules
            const mockFormulas: Record<string, string> = {
                'CCO': 'C₂H₆O',
                'CC(=O)O': 'C₂H₄O₂',
                'CC(=O)C': 'C₃H₆O',
                'CC=C': 'C₃H₆',
                'c1ccccc1': 'C₆H₆',
                'CC': 'C₂H₆',
                'C': 'CH₄'
            }
            return mockFormulas[smiles] || 'Unknown'
        }

        const molecule = this.parseSMILES(smiles)
        if (!molecule) return 'Invalid'

        try {
            const mol = this.rdkit.get_mol(smiles)
            const formula = mol.get_mol_formula()
            mol.delete()
            return formula
        } catch (error) {
            return 'Error'
        }
    }

    // Check if molecule contains a SMARTS pattern
    getSubstructureMatch(smiles: string, smarts: string): boolean {
        if (!this.isAvailable()) return false

        try {
            const mol = this.rdkit.get_mol(smiles)
            const qmol = this.rdkit.get_qmol(smarts)
            const match = mol.get_substruct_match(qmol)

            const isMatch = match && match.length > 0

            mol.delete()
            qmol.delete()

            return isMatch
        } catch (error) {
            console.error('SMARTS match error:', error)
            return false
        }
    }

    // Run a reaction given reactants and a reaction SMARTS via Backend
    async runReaction(reactantsSMILES: string[], reactionSmarts: string): Promise<string | string[] | null> {
        try {
            const response = await fetch('http://localhost:8000/reaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reactants: reactantsSMILES, smarts: reactionSmarts })
            });

            if (!response.ok) {
                console.error('Backend reaction request failed');
                return null;
            }

            const data = await response.json();
            const products = data.products;

            // Maintain backward compatibility for single product returns
            if (Array.isArray(products) && products.length === 1) {
                return products[0];
            }
            return products;

        } catch (error) {
            console.error('Reaction execution error:', error);
            return null;
        }
    }

    // Clean up resources
    cleanup() {
        if (this.rdkit) {
            // RDKit cleanup if needed
            this.rdkit = null
            this.initialized = false
        }
    }
}

// Singleton instance
export const rdkitService = new RDKitService()
