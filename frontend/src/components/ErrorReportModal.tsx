import React, { useState, useEffect } from 'react';
import './ErrorReportModal.css';

interface ErrorReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reactants: string;
    conditions: string[];
    results: any[];
}

export function ErrorReportModal({ isOpen, onClose, reactants, conditions, results }: ErrorReportModalProps) {
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const sanitizeInput = (str: string) => {
        return str.replace(/[<>]/g, (char) => char === '<' ? '&lt;' : '&gt;');
    };

    // Custom Math CAPTCHA
    const [captchaNum1, setCaptchaNum1] = useState(0);
    const [captchaNum2, setCaptchaNum2] = useState(0);
    const [captchaAttempt, setCaptchaAttempt] = useState('');
    const [captchaError, setCaptchaError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset form and generate fresh CAPTCHA on open
            setMessage('');
            setStatus('idle');
            setCaptchaAttempt('');
            setCaptchaError(false);
            setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
            setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validate CAPTCHA
        const expectedAnswer = captchaNum1 + captchaNum2;
        if (parseInt(captchaAttempt.trim()) !== expectedAnswer) {
            setCaptchaError(true);
            return;
        }
        setCaptchaError(false);

        // 2. Validate Message length
        if (message.length > 400) {
            setStatus('error');
            setErrorMessage('Message must be under 400 characters.');
            return;
        }

        // 3. Prepare Data for Web3Forms
        const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
        if (!accessKey) {
            setStatus('error');
            setErrorMessage('Missing Web3Forms Access Key. Please check your .env file.');
            return;
        }

        setStatus('submitting');

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({
                    access_key: accessKey,
                    subject: '🚨 New Organic Web Error Report',
                    from_name: 'Workbench Engine',
                    message: sanitizeInput(message) || '(No additional comments provided)',
                    reactants: reactants,
                    conditions: conditions.join(', '),
                    reaction_results: JSON.stringify(results, null, 2),
                })
            });

            const result = await response.json();
            if (result.success) {
                setStatus('success');
                setTimeout(() => onClose(), 2500);
            } else {
                throw new Error(result.message || 'Failed to submit form');
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'A network error occurred.');
        }
    };

    return (
        <div className="error-modal-overlay" onClick={onClose}>
            <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="error-modal-header">
                    <h3>Report Reaction Error</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {status === 'success' ? (
                    <div className="success-message">
                        ✅ Error report sent successfully! Thank you.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="error-form">
                        <div className="form-group">
                            <label>What went wrong? (Optional)</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="E.g., It was supposed to be a major Sn2 product, but instead showed E2..."
                                rows={4}
                                maxLength={400}
                            />
                            <div style={{ fontSize: '0.8rem', color: message.length >= 400 ? '#ef4444' : '#64748b', textAlign: 'right' }}>
                                {message.length}/400
                            </div>
                        </div>

                        <div className="form-group captcha-group">
                            <label>Verify you are human:</label>
                            <div className="captcha-challenge">
                                <span>What is {captchaNum1} + {captchaNum2}?</span>
                                <input
                                    type="number"
                                    value={captchaAttempt}
                                    onChange={(e) => {
                                        setCaptchaAttempt(e.target.value);
                                        setCaptchaError(false);
                                    }}
                                    className={captchaError ? 'input-error' : ''}
                                    required
                                />
                            </div>
                            {captchaError && <span className="error-text">Incorrect math result, try again.</span>}
                        </div>

                        {status === 'error' && (
                            <div className="error-alert">
                                {errorMessage}
                            </div>
                        )}

                        <div className="error-modal-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn-danger" disabled={status === 'submitting'}>
                                {status === 'submitting' ? 'Sending...' : 'Send Error Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
