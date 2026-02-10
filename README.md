# Organic Chemistry Solver 🧪

> [!CAUTION]
> **PULL REQUESTS ARE NOT WELCOMED AT THIS MOMENT.**
> A major code change/architectural overhaul is currently in progress. Please refrain from submitting PRs until this transition is complete.

## Overview
Organic Chemistry Solver is an interactive web application designed to simulate and visualize organic chemistry reactions. It provides users with a platform to draw molecules, predict reaction products, and explore chemical mechanisms.

## Features
- **Interactive Molecule Editor**: Draw and edit chemical structures in the browser.
- **Reaction Prediction**: Predict organic products and byproducts based on user-defined reactants and conditions.
- **Curriculum Tree**: Explore organized topics in organic chemistry, from substitution-elimination to complex functional group transformations.
- **Chemical Intelligence**: Leveraging RDKit for high-fidelity molecular modeling and SMARTS matching.

## Architecture

### Frontend
- **Framework**: React + Vite
- **Styling**: Vanilla CSS
- **Visualization**: RDKit.js for molecular rendering and custom React components for the UI.
- **State Management**: React Hooks and modular component architecture.

### Backend
- **Framework**: FastAPI (Python)
- **Intelligence**: RDKit (Python)
- **Security**: Rate limiting (SlowAPI) and CORS protection.
- **Tools**: Uvicorn as the ASGI server.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/doron3199/organic_web.git
   cd organic_web
   ```

2. **Setup Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

## How to Run

**Start the Backend:**
```bash
cd backend
python main.py
```
The backend will be available at `http://localhost:8000`.

**Start the Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## License
This project is licensed under the terms found in the [LICENSE](./LICENSE) file.
