export const AVAILABLE_CONDITIONS = [
    { id: 'heat', label: '🔥 Heat (\u0394)' },
    { id: 'light', label: '☀️ Light (hv)' },
    { id: 'pd_c', label: '🔘 Pd/C' },
    { id: 'lindlar', label: '🍂 Lindlar Catalyst' },
    { id: 'cold', label: '❄️ Cold (-78°C)' },
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
};
