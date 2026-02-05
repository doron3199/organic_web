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
    description: string
    curriculum_subsubject_id: string
    reactionSmarts: string | string[] // The actual transformation SMARTS (can be multiple steps)
    reactantsSmarts: string[] // SMARTS to identify reactants (e.g. [Substrate, Reagent])
    matchExplanation?: string // Explanation of why this reaction is selected (e.g. "Alkane + Br2")
    conditions: Set<string>[] // Required conditions (list of sets for OR logic)
    autoAdd?: (string | Record<string, never>)[] // Optional: molecules to auto-add at each step (SMILES string or empty object for no addition)
    selectivity?: {
        type: 'rank' | 'explicit',
        rules: { smarts: string; label: 'major' | 'minor' | 'trace' | 'equal' }[]
    }
    rank?: number
    append_reaction?: string
}

export interface MatchResult {
    atoms: number[]
    bonds: number[]
}

export interface ReactionOutcome {
    products: string[]
    byproducts: string[]
}

export interface ReactionStep {
    step_id: string
    step_index: number
    smarts_used: string
    input_smiles: string[]
    products: string[]
    parent_id: string | null
    parent_ids?: string[]  // For multiple parents (e.g., auto-add + previous step)
    step_type: 'initial' | 'reaction' | 'carbocation_intermediate' | 'carbocation_rearrangement' | 'auto_add'
    group_id?: string
}

export interface DebugReactionOutcome {
    steps: ReactionStep[]
    finalProducts: string[]
    finalByproducts: string[]
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
                width,
                height,
                addAtomIndices: options.addAtomIndices ?? false,
                padding: 0.15, // Add padding to avoid clipping at edges
                bondLineWidth: 2, // Slightly thicker bonds for visibility
                ...options
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

            const isMatch = match !== '{}'

            mol.delete()
            qmol.delete()

            return isMatch
        } catch (error) {
            console.error('SMARTS match error:', error)
            return false
        }
    }

    // Run a reaction given reactants and a reaction SMARTS via Backend
    // If debug=true, returns all intermediate steps; otherwise returns only final products
    async runReaction(
        reactantsSMILES: string[],
        reactionSmarts: string | string[],
        debug: boolean = false,
        autoAdd?: (string | Record<string, never>)[]
    ): Promise<ReactionOutcome | DebugReactionOutcome | null> {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/reaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reactants: reactantsSMILES,
                    smarts: reactionSmarts,
                    debug: debug,
                    autoAdd: autoAdd || []
                })
            });

            if (!response.ok) {
                console.error('Backend reaction request failed');
                return null;
            }

            const data = await response.json();

            if (debug) {
                // Return debug format
                return {
                    steps: data.steps,
                    finalProducts: data.final_organic,
                    finalByproducts: data.final_inorganic
                } as DebugReactionOutcome;
            } else {
                // Return simple format
                return {
                    products: data.products,
                    byproducts: data.byproducts
                } as ReactionOutcome;
            }

        } catch (error) {
            console.error('Reaction execution error:', error);
            return null;
        }
    }

    // Run a specialized substitution/elimination reaction with backend logic
    async runSubstitutionElimination(
        reactantsSMILES: string[],
        conditions: string[]
    ): Promise<any | null> {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/reaction/substitution_elimination`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reactants: reactantsSMILES,
                    conditions: conditions
                })
            });

            if (!response.ok) {
                console.error('Backend substitution/elimination request failed');
                return null;
            }

            const data = await response.json();

            // Map the backend result structure to what the UI expects
            // Backend returns: { products: [], steps: [], mechanisms: [], explanation: "" }
            // DebugReactionOutcome expects: { steps: [], finalProducts: [], finalByproducts: [] }

            return {
                steps: data.steps,
                finalProducts: data.products,
                finalByproducts: [], // We could extract byproducts (inorganic) if backend provides
                mechanisms: data.mechanisms, // Pass through for UI
                explanation: data.explanation // Pass through for UI
            };

        } catch (error) {
            console.error('Reaction execution error:', error);
            return null;
        }
    }

    // Deprecated: Use runReaction with debug=true instead
    async runReactionDebug(reactantsSMILES: string[], reactionSmarts: string | string[]): Promise<DebugReactionOutcome | null> {
        const result = await this.runReaction(reactantsSMILES, reactionSmarts, true);
        return result as DebugReactionOutcome | null;
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
