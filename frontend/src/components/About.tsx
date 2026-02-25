import React from 'react';
import './About.css';

const About: React.FC = () => {
    return (
        <div className="about-container fade-in">
            <header className="about-header">
                <div className="gradient-sphere"></div>
                <h1 className="about-title">About Organic Chemistry Solver</h1>
                <p className="about-subtitle">Empowering learners with interactive chemical simulation and logic.</p>
            </header>

            <section className="about-section">
                <h2>Project Vision</h2>
                <p>
                    The Organic Chemistry Solver is designed to bridge the gap between static textbook examples and
                    real-world chemical intuition. By combining a powerful graph-based logic engine with specialized
                    cheminformatics tools, we provide a playground for students and researchers to explore
                    molecular structures, reaction mechanisms, and nomenclature in real-time.
                </p>
            </section>

            <section className="about-grid">
                <div className="about-card">
                    <div className="card-icon">🔬</div>
                    <h3>Interactive Workbench</h3>
                    <p>Draw, edit, and analyze molecules using the industry-standard Ketcher editor.</p>
                </div>
                <div className="about-card">
                    <div className="card-icon">🧠</div>
                    <h3>Smart Analysis</h3>
                    <p>Our custom logic engine identifies functional groups and predicts systematic names following IUPAC principles.</p>
                </div>
                <div className="about-card">
                    <div className="card-icon">⚡</div>
                    <h3>Reaction Prediction</h3>
                    <p>Simulate complex organic reactions and visualize substitution vs. elimination pathways instantly.</p>
                </div>
            </section>

            <section className="about-section">
                <h2>Our Mission</h2>
                <p>
                    Organic chemistry is often seen as a daunting subject. Our mission is to make it approachable,
                    visual, and logically consistent. We believe that by seeing the "why" behind the reactions,
                    learners can build a deeper understanding that goes beyond memorization.
                </p>
            </section>
            <section className="about-section contact-section">
                <h2>Contact & Open Source</h2>
                <p>
                    Have questions, suggestions, or want to report a bug? Feel free to reach out or contribute to the project.
                </p>
                <div className="contact-links">
                    <a href="https://github.com/doron3199/organic_web/issues" target="_blank" rel="noopener noreferrer" className="contact-link">
                        <span className="icon">🐛</span> Report a bug or Request a feature
                    </a>
                    <a href="https://github.com/doron3199/organic_web" target="_blank" rel="noopener noreferrer" className="contact-link">
                        <span className="icon">🐙</span> GitHub Repository
                    </a>
                </div>
            </section>

            <section className="about-section privacy-section">
                <h2>Privacy Policy & Analytics</h2>
                <p>
                    We value your privacy. We use <a href="https://www.goatcounter.com/" target="_blank" rel="noopener noreferrer">GoatCounter</a> for basic, anonymous traffic analytics.
                </p>
                <div className="privacy-details">
                    <p><strong>What is collected:</strong> We collect non-personally identifiable information such as page views, browser type, and screen size. No personal data or tracking cookies are used.</p>
                    <p><strong>Purpose:</strong> This data is strictly used to improve the site's performance, stability, and to better understand our users' educational needs.</p>
                    <p><strong>GDPR & Data Processing:</strong> In compliance with GDPR and to protect our users, we rely on GoatCounter's <a href="https://www.goatcounter.com/help/gdpr" target="_blank" rel="noopener noreferrer">GDPR Compliance</a>, ensuring that all data is handled transparently and securely.</p>
                    <p>For more details on how the data is handled, please review <a href="https://www.goatcounter.com/help/privacy" target="_blank" rel="noopener noreferrer">GoatCounter's Privacy Policy</a>.</p>
                </div>
            </section>

            <footer className="about-footer">
                <div className="subtle-legal">
                    <p>© {new Date().getFullYear()} Organic Chemistry Solver</p>
                    <p className="license-link">Built with open-source chemistry logic (MIT/Apache/BSD). <span className="tooltip-trigger">View Licenses
                        <span className="tooltip-content">
                            Ketcher (Apache 2.0), RDKit (BSD), React Flow (MIT), FastAPI (MIT)
                        </span>
                    </span></p>
                </div>
            </footer>
        </div>
    );
};

export default About;
