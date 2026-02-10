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
