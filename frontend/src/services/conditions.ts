export const AVAILABLE_CONDITIONS = [
    { id: 'heat', label: '🔥 Heat (\u0394)' },
    { id: 'light', label: '☀️ Light (hv)' },
    { id: 'pd_c', label: '🔘 Pd/C' },
    { id: 'lindlar', label: '🍂 Lindlar Catalyst' },
] as const;

export type ConditionId = typeof AVAILABLE_CONDITIONS[number]['id'];
