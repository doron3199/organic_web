import React from 'react'
import MoleculeViewer from './MoleculeViewer'
import './Cheatsheet.css'

const Cheatsheet = () => {
    return (
        <div className="cheatsheet-container fade-in">
            <h1>Organic Chemistry Cheatsheet</h1>

            {/* Section 1: Organic Periodic Table */}
            <section className="cs-section">
                <h2>Organic Elements</h2>
                <div className="periodic-grid">
                    <div className="element-card c-card">
                        <div className="atomic-number">6</div>
                        <div className="symbol">C</div>
                        <div className="name">Carbon</div>
                        <div className="valence">Valence: 4</div>
                    </div>
                    <div className="element-card h-card">
                        <div className="atomic-number">1</div>
                        <div className="symbol">H</div>
                        <div className="name">Hydrogen</div>
                        <div className="valence">Valence: 1</div>
                    </div>
                    <div className="element-card n-card">
                        <div className="atomic-number">7</div>
                        <div className="symbol">N</div>
                        <div className="name">Nitrogen</div>
                        <div className="valence">Valence: 3</div>
                    </div>
                    <div className="element-card o-card">
                        <div className="atomic-number">8</div>
                        <div className="symbol">O</div>
                        <div className="name">Oxygen</div>
                        <div className="valence">Valence: 2</div>
                    </div>
                    <div className="element-card x-card">
                        <div className="atomic-number">17</div>
                        <div className="symbol">X</div>
                        <div className="name">Halogen</div>
                        <div className="valence">Valence: 1</div>
                        <small>(F, Cl, Br, I)</small>
                    </div>
                </div>
            </section>

            {/* Section 1.5: Degrees of Unsaturation */}
            <section className="cs-section">
                <h2>Degrees of Unsaturation</h2>
                <div className="equation-container">
                    <div className="equation">
                        <span>Degrees of Unsaturation = </span>
                        <div className="fraction">
                            <span className="numerator">
                                <span>2C</span> <span>+</span> <span>2</span> <span>+</span> <span className="eq-n">N</span> <span>-</span> <span className="eq-h">H</span> <span>-</span> <span className="eq-x">X</span>
                            </span>
                            <span className="denominator">2</span>
                        </div>
                    </div>
                    <div className="legend">
                        <div className="legend-item"><span className="eq-c">C</span> = #carbons</div>
                        <div className="legend-item"><span className="eq-h">H</span> = #hydrogens</div>
                        <div className="legend-item"><span className="eq-n">N</span> = #nitrogens</div>
                        <div className="legend-item"><span className="eq-x">X</span> = #halogens</div>
                    </div>
                </div>
            </section>

            {/* Section 1.8: Radical Stability */}
            <section className="cs-section">
                <h2>Relative Stabilities of Alkyl Radicals</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <strong>General Rule:</strong> 3° (Tertiary) &gt; 2° (Secondary) &gt; 1° (Primary) &gt; Methyl
                    </div>
                    <div className="alkyl-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                        <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                            <div className="alkyl-name">Tertiary (3°)</div>
                            <div style={{ padding: '1rem 0' }}>
                                <img src="/assets/tertiary_radical.svg" alt="Tertiary" style={{ width: '100%', maxHeight: '120px' }} />
                            </div>
                            <small>Most Stable</small>
                        </div>
                        <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                            <div className="alkyl-name">Secondary (2°)</div>
                            <div style={{ padding: '1rem 0' }}>
                                <img src="/assets/secondary_radical.svg" alt="Secondary" style={{ width: '100%', maxHeight: '120px' }} />
                            </div>
                            <small>Intermediate</small>
                        </div>
                        <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                            <div className="alkyl-name">Primary (1°)</div>
                            <div style={{ padding: '1rem 0' }}>
                                <img src="/assets/primary_radical.svg" alt="Primary" style={{ width: '100%', maxHeight: '120px' }} />
                            </div>
                            <small>Less Stable</small>
                        </div>
                        <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                            <div className="alkyl-name">Methyl</div>
                            <div style={{ padding: '1rem 0' }}>
                                <img src="/assets/methyl_radical.svg" alt="Methyl" style={{ width: '100%', maxHeight: '120px' }} />
                            </div>
                            <small>Least Stable</small>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 1.9: Carbonyl Groups */}
            <section className="cs-section">
                <h2>Carbonyl Groups</h2>
                <div className="alkyl-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                        <div className="alkyl-name" style={{ color: '#4ade80' }}>Carbonyl Group</div>
                        <div style={{ padding: '1rem 0' }}>
                            <img src="/assets/carbonyl%20group.svg" alt="Carbonyl Group" style={{ width: '100%', maxHeight: '120px' }} />
                        </div>
                    </div>
                    <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                        <div className="alkyl-name">Ketone</div>
                        <div style={{ padding: '1rem 0' }}>
                            <img src="/assets/ketone.svg" alt="Ketone" style={{ width: '100%', maxHeight: '120px' }} />
                        </div>
                    </div>
                    <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                        <div className="alkyl-name">Aldehyde</div>
                        <div style={{ padding: '1rem 0' }}>
                            <img src="/assets/aldehyde_RH.svg" alt="Aldehyde" style={{ width: '100%', maxHeight: '120px' }} />
                        </div>
                    </div>
                    <div className="alkyl-card" style={{ height: 'auto', padding: '1rem' }}>
                        <div className="alkyl-name">Aldehyde</div>
                        <div style={{ padding: '1rem 0' }}>
                            <img src="/assets/aldehyde_HH.svg" alt="Aldehyde" style={{ width: '100%', maxHeight: '120px' }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Alkyl Groups (Full Width) */}
            <section className="cs-section">
                <h2>Alkyl Groups</h2>
                <div className="alkyl-grid">
                    {/* Methyl - 1 Carbon */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Methyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]C" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* Ethyl - 2 Carbons */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Ethyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]CC" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* Propyl - 3 Carbons */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Propyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]CCC" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* Isopropyl */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Isopropyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]C(C)C" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* Butyl */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Butyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]CCCC" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* Isobutyl */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Isobutyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]CC(C)C" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* sec-Butyl */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">sec-Butyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]C(C)CC" width={200} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* tert-Butyl */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">tert-Butyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]C(C)(C)C" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* Pentyl */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Pentyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]CCCCC" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                    {/* Isopentyl */}
                    <div className="alkyl-card">
                        <div className="alkyl-name">Isopentyl</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]CCC(C)C" width={300} height={200} onEdit={() => { }} /></div>
                    </div>
                </div>
            </section>

            {/* 3. Halogens (Full Width) */}
            <section className="cs-section">
                <h2>Halogens (Prefixes)</h2>
                <div className="alkyl-grid">
                    <div className="alkyl-card">
                        <div className="alkyl-name">Fluoro-</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]F" width={200} height={200} onEdit={() => { }} /></div>
                    </div>
                    <div className="alkyl-card">
                        <div className="alkyl-name">Chloro-</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]Cl" width={200} height={200} onEdit={() => { }} /></div>
                    </div>
                    <div className="alkyl-card">
                        <div className="alkyl-name">Bromo-</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]Br" width={200} height={200} onEdit={() => { }} /></div>
                    </div>
                    <div className="alkyl-card">
                        <div className="alkyl-name">Iodo-</div>
                        <div className="mol-container"><MoleculeViewer smiles="[*]I" width={200} height={200} onEdit={() => { }} /></div>
                    </div>
                </div>


                <div style={{ marginTop: '2rem' }}>
                    <h3>Halogen Substituents</h3>
                    <table className="cs-table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Element Name</th>
                                <th>Substituent Name (Prefix)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>F</td><td>Fluorine</td><td>Fluoro-</td></tr>
                            <tr><td>Cl</td><td>Chlorine</td><td>Chloro-</td></tr>
                            <tr><td>Br</td><td>Bromine</td><td>Bromo-</td></tr>
                            <tr><td>I</td><td>Iodine</td><td>Iodo-</td></tr>
                        </tbody>
                    </table>
                </div>
            </section >

            {/* 4. CIP Priority Rules */}
            <section className="cs-section">
                <h2>CIP Priority Rules (E/Z)</h2>
                <div className="cip-rules-container" style={{ padding: '0 1rem' }}>
                    <ol className="cip-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <li>
                            <strong>1. Higher Atomic Number = Higher Priority</strong>
                            <div className="cip-example" style={{ opacity: 0.8, marginTop: '0.2rem' }}>
                                I (53) &gt; Br (35) &gt; Cl (17) &gt; F (9) &gt; O (8) &gt; N (7) &gt; C (6) &gt; H (1)
                            </div>
                        </li>
                        <li>
                            <strong>2. Tie-Breaker</strong>: If atoms are identical, compare the atoms attached to them until a difference is found.
                        </li>
                        <li>
                            <strong>3. Multiple Bonds</strong>: Treat double/triple bonds as if bonded to that atom 2 or 3 times.
                            <div className="cip-example" style={{ opacity: 0.8, marginTop: '0.2rem' }}>
                                • C=O counts as C bonded to (O, O)<br />
                                • C≡N counts as C bonded to (N, N, N)
                            </div>
                        </li>
                    </ol>
                </div>
            </section>

            <div className="cs-columns">
                {/* Column 1: Nomenclature & Alkanes */}
                <div className="cs-column">
                    <section className="cs-section">
                        <h2>Nomenclature Structure</h2>
                        <div className="nomenclature-diagram">
                            <div className="nom-part prefix">
                                <span className="label">Prefix</span>
                                <span className="question">Where are substituents?</span>
                            </div>
                            <span className="separator">—</span>
                            <div className="nom-part parent">
                                <span className="label">Parent</span>
                                <span className="question">How many carbons?</span>
                            </div>
                            <span className="separator">—</span>
                            <div className="nom-part suffix">
                                <span className="label">Suffix</span>
                                <span className="question">What family?</span>
                            </div>
                        </div>
                    </section>

                    <section className="cs-section">
                        <h2>Alkanes (Parent Chains)</h2>
                        <table className="cs-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Prefix</th>
                                    <th>Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>1</td><td>Meth-</td><td>Methane</td></tr>
                                <tr><td>2</td><td>Eth-</td><td>Ethane</td></tr>
                                <tr><td>3</td><td>Prop-</td><td>Propane</td></tr>
                                <tr><td>4</td><td>But-</td><td>Butane</td></tr>
                                <tr><td>5</td><td>Pent-</td><td>Pentane</td></tr>
                                <tr><td>6</td><td>Hex-</td><td>Hexane</td></tr>
                                <tr><td>7</td><td>Hept-</td><td>Heptane</td></tr>
                                <tr><td>8</td><td>Oct-</td><td>Octane</td></tr>
                                <tr><td>9</td><td>Non-</td><td>Nonane</td></tr>
                                <tr><td>10</td><td>Dec-</td><td>Decane</td></tr>
                            </tbody>
                        </table>
                    </section>
                </div>

                {/* Column 2: Functional Groups & Multipliers */}
                <div className="cs-column">
                    <section className="cs-section">
                        <h2>Functional Groups</h2>
                        <div className="func-groups-grid">
                            <div className="func-card">
                                <div className="func-struct">R—OH</div>
                                <div className="func-name">Alcohol</div>
                            </div>
                            <div className="func-card">
                                <div className="func-struct">R—NH<sub>2</sub></div>
                                <div className="func-name">Amine</div>
                            </div>
                            <div className="func-card">
                                <div className="func-struct">R—X</div>
                                <div className="func-name">Alkyl Halide</div>
                                <div className="func-note">(X = F, Cl, Br, I)</div>
                            </div>
                            <div className="func-card">
                                <div className="func-struct">R—O—R</div>
                                <div className="func-name">Ether</div>
                            </div>
                        </div>
                    </section>

                    <section className="cs-section">
                        <h2>Multipliers</h2>
                        <table className="cs-table">
                            <thead>
                                <tr>
                                    <th>Count</th>
                                    <th>Prefix</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>2</td><td>Di-</td></tr>
                                <tr><td>3</td><td>Tri-</td></tr>
                                <tr><td>4</td><td>Tetra-</td></tr>
                                <tr><td>5</td><td>Penta-</td></tr>
                                <tr><td>6</td><td>Hexa-</td></tr>
                                <tr><td>7</td><td>Hepta-</td></tr>
                                <tr><td>8</td><td>Octa-</td></tr>
                                <tr><td>9</td><td>Nona-</td></tr>
                                <tr><td>10</td><td>Deca-</td></tr>
                            </tbody>
                        </table>
                    </section>
                </div >
            </div >
        </div >
    )
}

export default Cheatsheet
