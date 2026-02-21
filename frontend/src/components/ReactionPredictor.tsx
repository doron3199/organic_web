import React, { useState } from 'react';
import './ReactionPredictor.css';

type SubstrateType = 'methyl' | 'primary' | 'secondary' | 'tertiary';
type SubstrateHindrance = 'unhindered' | 'hindered';
type ReagentStrength = 'strong' | 'weak';
type ReagentSize = 'small' | 'bulky';
type Temp = 'low' | 'high';

interface Prediction {
    mechanisms: string[]; // e.g., ['SN2'], ['SN1', 'E1']
    major: string | null; // e.g., 'SN2'
    explanation: string;
}

const ReactionPredictor: React.FC = () => {
    const [substrate, setSubstrate] = useState<SubstrateType>('primary');
    const [substrateHindrance, setSubstrateHindrance] = useState<SubstrateHindrance>('unhindered');
    const [strength, setStrength] = useState<ReagentStrength>('strong');
    const [size, setSize] = useState<ReagentSize>('small');
    const [temp, setTemp] = useState<Temp>('low');

    // ==================================================================================
    // ** IMPORTANT: This logic is mirrored in the backend predict_mechanism function **
    // ** (backend/engine/substitution_elimination.py)                                **
    // ** When changing selectivity rules here, update the backend too!               **
    // ==================================================================================
    const predict = (): Prediction => {
        // 1. Methyl Haloalkane
        if (substrate === 'methyl') {
            if (strength === 'strong') {
                // Methyl + Strong Nu -> SN2
                // Note: Methyl cannot eliminate as there is no beta-carbon.
                return {
                    mechanisms: ['SN2'],
                    major: 'SN2',
                    explanation: 'Methyl halides undergo SN2 reactions with strong nucleophiles. Elimination is impossible (no β-hydrogens). Steric hindrance is minimal, favoring back-side attack.'
                };
            } else {
                // Methyl + Weak Nu -> No Reaction usually, or very slow SN2
                return {
                    mechanisms: ['No Reaction'],
                    major: null,
                    explanation: 'Methyl halides are too unstable to form methyl carbocations (no SN1/E1). With a weak nucleophile, the reaction is extremely slow or does not occur.'
                };
            }
        }

        // 2. Primary Haloalkane
        if (substrate === 'primary') {
            if (strength === 'strong') {
                if (size === 'bulky') {
                    // Primary + Strong Bulky Base -> E2 (e.g. t-BuOK)
                    return {
                        mechanisms: ['E2'],
                        major: 'E2',
                        explanation: 'The base is strong but too bulky to perform a back-side attack (steric hindrance inhibits SN2). Instead, it acts as a base and removes a proton, favoring E2 elimination.'
                    };
                } else {
                    // Primary + Strong Small Nu
                    // CHECK SUBSTRATE HINDRANCE
                    if (substrateHindrance === 'hindered') {
                        return {
                            mechanisms: ['E2', 'SN2'],
                            major: 'E2',
                            explanation: 'Although primary, the substrate is sterically hindered (e.g. beta-branching). This hinders back-side attack (SN2), allowing the strong base to favor Elimination (E2).'
                        };
                    }

                    if (temp === 'high') {
                        return {
                            mechanisms: ['E2', 'SN2'],
                            major: 'E2',
                            explanation: 'While primary substrates usually favor SN2, high temperatures favor Elimination (E2) due to entropy. E2 becomes the major pathway, with SN2 competing.'
                        };
                    } else {
                        return {
                            mechanisms: ['SN2', 'E2'],
                            major: 'SN2',
                            explanation: 'Unblocked primary carbons are excellent for SN2. However, with a strong base, E2 elimination competes as a minor pathway.'
                        };
                    }
                }
            } else {
                // Primary + Weak Nu -> No Reaction logic generally (Carbocation unstable)
                return {
                    mechanisms: ['No Reaction (Slow)'],
                    major: null,
                    explanation: 'Primary carbocations are unstable, so SN1 and E1 are essentially forbidden. Without a strong nucleophile to drive SN2, no significant reaction occurs.'
                };
            }
        }

        // 3. Secondary Haloalkane
        if (substrate === 'secondary') {
            if (strength === 'strong') {
                // Strong Nu/Base
                if (size === 'bulky') {
                    return {
                        mechanisms: ['E2'],
                        major: 'E2',
                        explanation: 'Steric hindrance from the bulky base prevents SN2. The strong basicity drives the E2 elimination mechanism.'
                    };
                }
                // Small Strong Base/Nu
                // Competition between SN2 and E2.
                // E2 is favored by heat and basicity.

                // CHECK SUBSTRATE HINDRANCE
                if (substrateHindrance === 'hindered') {
                    return {
                        mechanisms: ['E2', 'SN2'],
                        major: 'E2',
                        explanation: 'The secondary substrate is sterically hindered (e.g. beta-branching). This significant steric bulk inhibits the SN2 back-side attack, causing the strong base to favor Elimination (E2).'
                    };
                }

                if (temp === 'high') {
                    return {
                        mechanisms: ['E2', 'SN2'],
                        major: 'E2',
                        explanation: 'Secondary halides with strong bases can undergo both SN2 and E2. High temperatures favor Elimination due to entropy (creating more molecules).'
                    };
                } else {
                    return {
                        mechanisms: ['SN2', 'E2'],
                        major: 'SN2',
                        explanation: 'With a strong, small nucleophile at low temperatures, SN2 is often favored (or competitive) because the steric hindrance isn\'t prohibitive yet. However, E2 is always a strong competitor here.'
                    };
                }
            } else {
                // Weak Nu/Base (Solvolysis) -> SN1 / E1
                // Carbocation forms.
                if (temp === 'high') {
                    return {
                        mechanisms: ['SN1', 'E1'],
                        major: 'E1',
                        explanation: 'Formation of the carbocation is the rate-limiting step. Once formed, high heat favors the elimination pathway (E1) over substitution.'
                    };
                } else {
                    return {
                        mechanisms: ['SN1', 'E1'],
                        major: 'SN1',
                        explanation: 'The secondary carbocation forms (slowly). Without a strong base to force elimination or heat to favor entropy, the nucleophile attacks the carbocation (SN1) as the major pathway.'
                    };
                }
            }
        }

        // 4. Tertiary Haloalkane
        if (substrate === 'tertiary') {
            if (strength === 'strong') {
                // Tertiary + Strong Base -> E2
                // SN2 is impossible (sterics).
                return {
                    mechanisms: ['E2'],
                    major: 'E2',
                    explanation: 'SN2 is impossible due to extreme steric hindrance at the tertiary center. A strong base will remove a beta-proton to cause E2 elimination.'
                };
            } else {
                // Tertiary + Weak Base -> SN1 / E1
                // Good carbocation.
                if (temp === 'high') {
                    return {
                        mechanisms: ['SN1', 'E1'],
                        major: 'E1',
                        explanation: 'The stable tertiary carbocation forms readily. High temperatures favor the elimination (E1) pathway due to entropy.'
                    };
                } else {
                    return {
                        mechanisms: ['SN1', 'E1'],
                        major: 'SN1',
                        explanation: 'Solvolysis conditions. The stable tertiary carbocation is attacked by the weak nucleophile. At lower temperatures, Substitution (SN1) dominates over Elimination.'
                    };
                }
            }
        }

        return { mechanisms: [], major: null, explanation: '' };
    };

    const prediction = predict();

    return (
        <div className="reaction-predictor-container">
            <div className="predictor-controls">
                <div className="control-group">
                    <label>Substrate (Alkyl Halide)</label>
                    <div className="toggle-group">
                        {(['methyl', 'primary', 'secondary', 'tertiary'] as const).map((s) => (
                            <button
                                key={s}
                                className={substrate === s ? 'active' : ''}
                                onClick={() => setSubstrate(s)}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label>Substrate Sterics</label>
                    <div className="toggle-group">
                        {(['unhindered', 'hindered'] as const).map((h) => (
                            <button
                                key={h}
                                className={substrateHindrance === h ? 'active' : ''}
                                onClick={() => setSubstrateHindrance(h)}
                                disabled={substrate === 'methyl' || substrate === 'tertiary'} // Methyl can't branch, Tertiary is always hindered
                                title={substrate === 'methyl' ? "Methyl cannot be hindered" : substrate === 'tertiary' ? "Tertiary is always hindered" : "e.g. Beta-branching"}
                            >
                                {h === 'unhindered' ? 'Normal' : 'Hindered (e.g. Branching)'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label>Reagent Strength (Nuc/Base)</label>
                    <div className="toggle-group">
                        {(['strong', 'weak'] as const).map((s) => (
                            <button
                                key={s}
                                className={strength === s ? 'active' : ''}
                                onClick={() => setStrength(s)}
                            >
                                {s === 'strong' ? 'Strong (e.g. HO⁻)' : 'Weak (e.g. H₂O)'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label>Reagent Size (Sterics)</label>
                    <div className="toggle-group">
                        {(['small', 'bulky'] as const).map((s) => (
                            <button
                                key={s}
                                className={size === s ? 'active' : ''}
                                onClick={() => setSize(s)}
                                disabled={strength === 'weak' && false} // Even weak can be bulky, but usually matters for strong bases
                            >
                                {s === 'small' ? 'Small' : 'Bulky (e.g. t-BuO⁻)'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label>Temperature</label>
                    <div className="toggle-group">
                        {(['low', 'high'] as const).map((t) => (
                            <button
                                key={t}
                                className={temp === t ? 'active' : ''}
                                onClick={() => setTemp(t)}
                            >
                                {t === 'low' ? 'Low / Room Temp' : 'High (Heat)'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="predictor-results">
                <h3>Prediction Result</h3>
                <div className="mechanism-badge-container">
                    {prediction.major && (
                        <div className="mechanism-result major">
                            <span className="label">Major Path:</span>
                            <span className="value">{prediction.major}</span>
                        </div>
                    )}
                    {prediction.mechanisms.filter(m => m !== prediction.major).map(m => (
                        <div key={m} className="mechanism-result minor">
                            <span className="label">Competes:</span>
                            <span className="value">{m}</span>
                        </div>
                    ))}
                </div>

                <div className="result-explanation">
                    <p>{prediction.explanation}</p>
                </div>
            </div>
        </div>
    );
};

export default ReactionPredictor;
