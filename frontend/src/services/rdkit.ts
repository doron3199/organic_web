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
    reaction_context?: string  // Rule ID (e.g. 'alkene_halogenation')
    reaction_name?: string     // Human-readable name (e.g. 'Alkene Halogenation')
}

export interface DebugReactionOutcome {
    steps: ReactionStep[]
    finalProducts: string[]
    finalByproducts: string[]
}

export interface ChiralCenter {
    atom_index: number
    atom_symbol: string
    configuration: 'R' | 'S' | 'Unassigned'
    neighbors: string[]
}

export interface ChiralityResult {
    chiral_centers: ChiralCenter[]
    chiral_atom_indices: number[]
    is_chiral: boolean
    error?: string
}

class RDKitService {
    private rdkit: any = null
    private initialized: boolean = false

    async initialize(): Promise<boolean> {
        if (this.initialized) return true

        try {
            // RDKit will be loaded from CDN (browser) or from Node module (tests)
            // @ts-ignore
            const initRDKitModule = (globalThis as any).initRDKitModule
            if (initRDKitModule) {
                this.rdkit = await initRDKitModule()
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

    // Generate SVG from a MolBlock (preserves exact bond orders for resonance structures)
    generateSVGFromMolBlock(molblock: string, width: number = 400, height: number = 300): string | null {
        if (!this.isAvailable() || !molblock) return null

        try {
            // Use get_mol with sanitize:false and removeHs:false to preserve exact bond orders
            const mol = this.rdkit.get_mol(molblock, JSON.stringify({ sanitize: false, removeHs: false }))
            if (!mol) return null

            // Kekulize is needed for drawing but we need to set bond wedging first
            try {
                mol.set_new_coords()
            } catch (_) {
                // coords may already be set from molblock
            }

            const drawOpts = JSON.stringify({
                width,
                height,
                addAtomIndices: false,
                padding: 0.15,
                bondLineWidth: 2,
                backgroundColour: [0, 0, 0, 1],
                symbolColour: [1, 1, 1, 1],
                defaultColour: [1, 1, 1, 1],
            })

            let svg = ''
            if (mol.get_svg_with_highlights) {
                svg = mol.get_svg_with_highlights(drawOpts)
            } else {
                svg = mol.get_svg(width, height)
            }

            // Ensure any remaining black strokes become white for dark background
            svg = svg.replace(/stroke:#000000/g, 'stroke:#FFFFFF')
                .replace(/fill:#000000/g, 'fill:#FFFFFF')

            mol.delete()
            return svg
        } catch (e) {
            console.error("Error generating SVG from molblock:", e)
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
            if (!mol || !mol.is_valid()) return 'Invalid'
            // get_mol_formula doesn't exist in RDKit.js minimallib; use get_descriptors
            try {
                const desc = JSON.parse(mol.get_descriptors())
                const nHeavy = desc.NumHeavyAtoms || 0
                const nAtoms = desc.NumAtoms || 0
                const nH = nAtoms - nHeavy
                // Build a rough formula from SMILES (RDKit minimallib has no direct formula method)
                const smiles2 = mol.get_smiles()
                mol.delete()
                // Count elements from canonical SMILES
                return this.formulaFromSmiles(smiles2, nH)
            } catch {
                mol.delete()
                return 'Error'
            }
        } catch (error) {
            return 'Error'
        }
    }

    // Build a molecular formula string from canonical SMILES + hydrogen count
    private formulaFromSmiles(smiles: string, totalH: number): string {
        // Parse the canonical SMILES to count heavy atoms by element
        const counts: Record<string, number> = {}
        // Remove ring closures, charges, etc and extract element symbols
        const elementRegex = /\[([A-Z][a-z]?)(?:[^\]]*?)\]|Br|Cl|([A-Z][a-z]?)/g
        let match: RegExpExecArray | null
        const cleaned = smiles.replace(/[cnos]/g, (ch) => ch.toUpperCase())
        while ((match = elementRegex.exec(cleaned)) !== null) {
            const elem = match[1] || match[2] || match[0]
            if (elem && /^[A-Z][a-z]?$/.test(elem)) {
                counts[elem] = (counts[elem] || 0) + 1
            }
        }

        // Build formula in Hill order: C first, then H, then alphabetical
        let formula = ''
        if (counts['C']) {
            formula += 'C' + (counts['C'] > 1 ? counts['C'] : '')
            delete counts['C']
            if (totalH > 0) {
                formula += 'H' + (totalH > 1 ? totalH : '')
            }
        }
        delete counts['H']
        for (const elem of Object.keys(counts).sort()) {
            formula += elem + (counts[elem] > 1 ? counts[elem] : '')
        }
        return formula || 'Unknown'
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
        autoAdd?: (string | Record<string, never>)[],
        reactionName?: string
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
                    autoAdd: autoAdd || [],
                    reactionName: reactionName || null
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

    async proposeReactions(reactants: string[], conditions: string[]): Promise<any[]> {
        console.log("rdkitService.proposeReactions called:", reactants, conditions)
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Default if env not set
            const url = `${apiUrl}/reactions/propose`;
            console.log("Fetching from:", url)

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reactants, conditions })
            })

            console.log("Response status:", response.status)

            if (!response.ok) {
                console.error(`Propose reactions failed: ${response.statusText}`, await response.text())
                return []
            }

            const json = await response.json()
            console.log("Propose reactions data:", json)
            return json
        } catch (e) {
            console.error('Propose reactions error:', e)
            return []
        }
    }

    // Fetch resonance structures from the backend
    async getResonanceStructures(
        smiles: string,
        options?: {
            allow_incomplete_octets?: boolean
            allow_charge_separation?: boolean
            unconstrained_cations?: boolean
            unconstrained_anions?: boolean
        }
    ): Promise<{ structures: { smiles: string; molblock?: string; svg?: string; index: number }[]; count: number; capped: boolean } | null> {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/resonance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles, ...(options || {}) })
            });

            if (!response.ok) {
                console.error('Resonance request failed:', response.statusText);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Resonance structures error:', error);
            return null;
        }
    }

    async detectChiralCenters(smiles: string): Promise<ChiralityResult | null> {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
            const response = await fetch(`${apiUrl}/chirality`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smiles })
            })

            if (!response.ok) {
                console.error('Chirality request failed:', response.statusText)
                return null
            }

            const data = await response.json()
            return data as ChiralityResult
        } catch (error) {
            console.error('Chiral center detection error:', error)
            return null
        }
    }

    // Generate SVG with highlighted atoms (for aromatic detector)
    generateHighlightedSVG(
        smiles: string,
        highlightAtoms: number[],
        highlightBonds: number[],
        width: number = 400,
        height: number = 300,
        atomColor: string = '#ff0000',
        atomColorMap?: Record<number, string>
    ): string | null {
        if (!this.isAvailable()) {
            return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="50%" y="50%" text-anchor="middle">RDKit not loaded</text></svg>`;
        }

        try {
            const mol = this.rdkit.get_mol(smiles);
            if (!mol || !mol.is_valid()) return null;

            // Build color maps for highlight atoms and bonds
            const atomColors: Record<number, number[]> = {};
            const bondColors: Record<number, number[]> = {};

            const parseHexColor = (hex: string): [number, number, number] => {
                if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
                    return [1, 0, 0]
                }
                const r = parseInt(hex.slice(1, 3), 16) / 255
                const g = parseInt(hex.slice(3, 5), 16) / 255
                const b = parseInt(hex.slice(5, 7), 16) / 255
                return [r, g, b]
            }

            const [defaultR, defaultG, defaultB] = parseHexColor(atomColor)

            highlightAtoms.forEach(idx => {
                const atomHex = atomColorMap?.[idx] || atomColor
                const [r, g, b] = parseHexColor(atomHex)
                atomColors[idx] = [r, g, b]
            });
            highlightBonds.forEach(idx => {
                bondColors[idx] = [defaultR, defaultG, defaultB]
            });

            const drawOpts = JSON.stringify({
                width,
                height,
                atoms: highlightAtoms,
                bonds: highlightBonds,
                highlightAtomColors: atomColors,
                highlightBondColors: bondColors,
                highlightAtomRadii: Object.fromEntries(highlightAtoms.map(a => [a, 0.4])),
                padding: 0.15,
                bondLineWidth: 2,
            });

            let svg = '';
            if (mol.get_svg_with_highlights) {
                svg = mol.get_svg_with_highlights(drawOpts);
            } else {
                svg = mol.get_svg(width, height);
            }

            mol.delete();
            if (svg) {
                // RDKit SVG uses inline style= (e.g. style='fill:#FFFFFF;stroke:#000000')
                // Step 1: White background → black (use placeholder to avoid later clobbering)
                svg = svg.replace(/fill:#FFFFFF/gi, 'fill:__BG_BLACK__');
                svg = svg.replace(/fill=['"]#FFFFFF['"]/gi, "fill='__BG_BLACK__'");
                svg = svg.replace(/fill=['"]white['"]/gi, "fill='__BG_BLACK__'");
                // Step 2: Black lines/text → light gray for dark theme
                svg = svg.replace(/fill:#000000/gi, 'fill:#f2f2f2');
                svg = svg.replace(/stroke:#000000/gi, 'stroke:#f2f2f2');
                svg = svg.replace(/fill=['"]#000000['"]/gi, "fill='#f2f2f2'");
                svg = svg.replace(/fill=['"]black['"]/gi, "fill='#f2f2f2'");
                svg = svg.replace(/stroke=['"]#000000['"]/gi, "stroke='#f2f2f2'");
                svg = svg.replace(/stroke=['"]black['"]/gi, "stroke='#f2f2f2'");
                // Step 3: Resolve placeholder to actual black
                svg = svg.replace(/__BG_BLACK__/g, '#000000');
            }
            return svg;
        } catch (e) {
            console.error('Error generating highlighted SVG:', e);
            return null;
        }
    }

    // Detect aromatic atoms and bonds in a molecule
    detectAromaticRegions(smiles: string): { aromaticAtoms: number[]; aromaticBonds: number[] } | null {
        if (!this.isAvailable()) return null;

        try {
            const mol = this.rdkit.get_mol(smiles);
            if (!mol || !mol.is_valid()) return null;

            // Primary method: SMARTS matching with [a] (any aromatic atom)
            const aromaticAtoms: number[] = [];
            const aromaticBonds: number[] = [];

            try {
                const qmol = this.rdkit.get_qmol('[a]');
                if (qmol) {
                    const matchStr = mol.get_substruct_matches(qmol);
                    if (matchStr) {
                        const matches = JSON.parse(matchStr);
                        if (Array.isArray(matches)) {
                            for (const m of matches) {
                                // RDKit.js returns {atoms: number[], bonds: number[]} per match
                                const atomIndices = Array.isArray(m) ? m : (m?.atoms ?? []);
                                for (const idx of atomIndices) {
                                    if (typeof idx === 'number' && !aromaticAtoms.includes(idx)) {
                                        aromaticAtoms.push(idx);
                                    }
                                }
                            }
                        }
                    }
                    qmol.delete();
                }
            } catch (smartsErr) {
                console.warn('SMARTS aromatic detection failed:', smartsErr);
            }

            // Determine aromatic bonds from the molecule JSON
            if (aromaticAtoms.length > 0) {
                try {
                    const molJson = JSON.parse(mol.get_json());
                    const molData = molJson.molecules?.[0];
                    const bonds = molData?.bonds ?? [];
                    const aromaticSet = new Set(aromaticAtoms);
                    bonds.forEach((bond: any, idx: number) => {
                        const atomPair = bond?.atoms;
                        if (Array.isArray(atomPair) && atomPair.length >= 2) {
                            if (aromaticSet.has(atomPair[0]) && aromaticSet.has(atomPair[1])) {
                                aromaticBonds.push(idx);
                            }
                        }
                    });
                } catch {
                    // Fallback: parse molblock for bond info
                    this.addAromaticBondsFromMolBlock(mol, aromaticAtoms, aromaticBonds);
                }
            }

            mol.delete();
            return { aromaticAtoms, aromaticBonds };
        } catch (e) {
            console.error('Error detecting aromatic regions:', e);
            return null;
        }
    }

    // Helper: extract aromatic bonds from molblock when JSON isn't available
    private addAromaticBondsFromMolBlock(
        mol: any,
        aromaticAtoms: number[],
        aromaticBonds: number[]
    ): void {
        try {
            const molBlock = mol.get_molblock();
            if (!molBlock) return;
            const aromaticSet = new Set(aromaticAtoms);
            const lines = molBlock.split('\n');
            let countLineIdx = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('V2000')) { countLineIdx = i; break; }
            }
            const countsLine = lines[countLineIdx];
            const numAtoms = parseInt(countsLine.substring(0, 3).trim());
            const numBonds = parseInt(countsLine.substring(3, 6).trim());
            const bondStart = countLineIdx + 1 + numAtoms;
            for (let i = 0; i < numBonds; i++) {
                const line = lines[bondStart + i];
                if (!line) continue;
                const from = parseInt(line.substring(0, 3).trim()) - 1;
                const to = parseInt(line.substring(3, 6).trim()) - 1;
                const bondType = parseInt(line.substring(6, 9).trim());
                if (bondType === 4 || (aromaticSet.has(from) && aromaticSet.has(to))) {
                    aromaticBonds.push(i);
                }
            }
        } catch (e) {
            console.warn('MolBlock bond parsing failed:', e);
        }
    }


}

export const rdkitService = new RDKitService()
