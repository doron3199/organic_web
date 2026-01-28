import './SelectivityChart.css'
import { Selectivity } from '../data/curriculum'

interface SelectivityChartProps {
    type?: Selectivity
    percentage?: number
    label?: string
}

function SelectivityChart({ type = 'equal', percentage, label }: SelectivityChartProps) {
    let degrees = 0

    // Determine visual style based on type or explicit percentage
    if (percentage !== undefined) {
        degrees = (percentage / 100) * 360
    } else {
        switch (type) {
            case 'major':
                degrees = 350 // Almost full
                break
            case 'minor':
                degrees = 20 // Sliver
                break
            case 'trace':
                degrees = 5
                break
            case 'equal':
            default:
                degrees = 180 // Half
                break
        }
    }

    // Colors
    const primaryColor = 'var(--accent-primary)' // Blue/Green
    const secondaryColor = 'var(--bg-tertiary)' // Grey

    return (
        <div className="selectivity-chart-container">
            <div
                className="pie-chart"
                style={{
                    background: `conic-gradient(${primaryColor} 0deg ${degrees}deg, ${secondaryColor} ${degrees}deg 360deg)`
                }}
            />
            {label && <div className="chart-label">{label}</div>}
        </div>
    )
}

export default SelectivityChart
