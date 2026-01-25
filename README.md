# ⚗️ Organic Chemistry Solver

A modern, frontend-only web application for drawing organic molecules and predicting chemical reactions. Built with React, TypeScript, and Vite with a beautiful dark theme.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6)

## ✨ Features

- **Molecule Editor**: Draw and visualize organic molecules using SMILES notation
- **Reaction Predictor**: Select from 10 common organic reactions and predict products
- **Mechanism Viewer**: View step-by-step reaction mechanisms
- **Formula Calculator**: Automatically calculate molecular formulas
- **Dark Theme**: Beautiful, modern dark UI with smooth animations
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd organic_web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🧪 How to Use

1. **Enter a Molecule**: Type SMILES notation in the editor (e.g., `CCO` for ethanol) or click a quick example
2. **Select a Reaction**: Choose from reactions like SN2, E2, esterification, etc.
3. **Run the Reaction**: Click "Run Reaction" to predict products
4. **View Results**: See the predicted products, formulas, and reaction mechanism

## 📚 Supported Reactions

- **SN2 Nucleophilic Substitution**
- **E2 Elimination**
- **Acid-Base Reactions**
- **Fischer Esterification**
- **Alkene Hydration**
- **Alcohol Oxidation**
- **Carbonyl Reduction**
- **Aldol Condensation**
- **Grignard Reaction**
- **Alkene Halogenation**

## 🎨 Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Vanilla CSS with custom properties
- **Chemistry Engine**: Custom reaction rules (RDKit.js integration ready)

## 📁 Project Structure

```
organic_web/
├── src/
│   ├── components/
│   │   ├── MoleculeEditor.tsx    # Molecule drawing component
│   │   ├── MoleculeEditor.css
│   │   ├── ReactionPanel.tsx     # Reaction selection & results
│   │   └── ReactionPanel.css
│   ├── services/
│   │   ├── rdkit.ts             # RDKit wrapper  (mock mode)
│   │   └── reactions.ts         # Reaction rules database
│   ├── App.tsx                   # Main application
│   ├── App.css
│   ├── index.css                 # Global styles & theme
│   └── main.tsx                  # Entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🔮 Future Enhancements

- [ ] Full RDKit.js integration for SMILES parsing
- [ ] Interactive molecule drawing (Ketcher integration)
- [ ] 3D molecule visualization
- [ ] More reaction types
- [ ] Retrosynthesis planner
- [ ] Save/load molecules
- [ ] Export to common chemical formats (MOL, SDF)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for learning or building upon it.

## 🙏 Acknowledgments

- RDKit - Chemistry toolkit
- SMILES notation standard
- React and Vite communities

---

**Made with ⚗️ and ❤️ for chemistry students**
