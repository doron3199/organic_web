export const AVAILABLE_CONDITIONS = [
    { id: 'heat', label: '🔥 Heat (\u0394)' },
    { id: 'light', label: '☀️ Light (hv)' },
    { id: 'pd_c', label: '🔘 Pd/C' },
    { id: 'lindlar', label: '🍂 Lindlar Catalyst' },
    { id: 'cold', label: '❄️ Cold (-78°C)' },
    { id: 'high_concentration', label: '🧪 High Concentration' },
] as const;

export type ConditionId = typeof AVAILABLE_CONDITIONS[number]['id'];

export const QUICK_ADD_MOLECULES: Record<string, { smiles: string, label: string, isCondition: boolean }> = {
    'h2so4': { smiles: '[OH]S(=O)(=O)[OH]', label: '🧪 H₂SO₄', isCondition: false },
    'oh': { smiles: '[OH-]', label: '🧼 OH⁻', isCondition: false },
    'h2o': { smiles: 'O', label: '💧 H₂O', isCondition: false },
    'kmno4': { smiles: '[O-][Mn](=O)(=O)=O', label: '🧪 KMnO₄', isCondition: true },
    'mcpba': { smiles: 'O=C(OO)c1cccc(Cl)c1', label: '🧪 mCPBA', isCondition: true },
    'o3': { smiles: '[O-][O+]=O', label: '🔵 O₃', isCondition: true },
    'FeBr3': { smiles: '[Fe](Br)(Br)Br', label: '🧪 FeBr₃', isCondition: true },
    'FeCl3': { smiles: '[Fe](Cl)(Cl)Cl', label: '🧪 FeCl₃', isCondition: true },
    'AlCl3': { smiles: '[Al](Cl)(Cl)Cl', label: '🧪 AlCl₃', isCondition: true },
    'NaBH4': { smiles: '[Na+].[BH4-]', label: '🧪 NaBH₄', isCondition: true },
    'h3o': { smiles: '[OH3+]', label: '🧪 H₃O⁺', isCondition: true },
    'LiAlH4': { smiles: '[Li+].[AlH4-]', label: '🧪 LiAlH₄', isCondition: true },
    'NaH': { smiles: '[NaH]', label: '🧪 NaH', isCondition: true },
    'Ether': { smiles: 'O(CC)CC', label: '🧪 Ether', isCondition: true },
    'socl2': { smiles: 'ClS(=O)Cl', label: '🧪 SOCl₂', isCondition: true },
    'pbr3': { smiles: 'BrP(Br)Br', label: '🧪 PBr₃', isCondition: true },
    'pbcl': { smiles: 'ClP(Cl)Cl', label: '🧪 PCl₃', isCondition: true },
    'pcc': { smiles: '[nH+]1ccccc1.[O-][Cr](=O)(=O)Cl', label: '🧪 PCC', isCondition: true },
    'H2CrO4': { smiles: 'O[Cr](=O)(=O)O', label: '🧪 H₂CrO₄', isCondition: true },
    'H2O2': { smiles: 'OO', label: '🧪 H₂O₂', isCondition: true },
};
