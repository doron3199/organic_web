export const AVAILABLE_CONDITIONS = [
    { id: 'heat', label: '🔥 Heat (\u0394)' },
    { id: 'light', label: '☀️ Light (hv)' },
    { id: 'acid', label: '🧪 Acid (H+)' },
    { id: 'base', label: '🧼 Base (OH-)' },
    { id: 'h2o', label: '💧 Water' },
    { id: 'pd_c', label: '🔘 Pd/C' },
    { id: 'lindlar', label: '🍂 Lindlar Catalyst' },
] as const;

export type ConditionId = typeof AVAILABLE_CONDITIONS[number]['id'];
