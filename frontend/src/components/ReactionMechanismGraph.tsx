import { useEffect, useMemo, useState } from 'react'
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import * as dagre from 'dagre'

import { ReactionStep, DebugReactionOutcome } from '../services/rdkit'
import MoleculeViewer from './MoleculeViewer'
import './ReactionDebugPanel.css' // We can reuse the same CSS

// Custom node component for reaction steps
interface StepNodeData extends Record<string, unknown> {
    step: ReactionStep
    onSelect?: (step: ReactionStep) => void
    onAddProduct: (smiles: string) => void
    isSelected: boolean
    interactive?: boolean
}

// Palette for distinguishing reaction groups (Open Color inspired)
const GROUP_COLORS = [
    '#3bc9db', // cyan 6
    '#f06595', // pink 6
    '#cc5de8', // grape 6
    '#51cf66', // green 6
    '#fcc419', // yellow 6
    '#ff922b', // orange 6
    '#845ef7', // violet 6
    '#339af0', // blue 6
    '#20c997', // teal 6
    '#ff6b6b', // red 6
    '#94d82d', // lime 6
    '#748ffc', // indigo 6
    '#ae3ec9', // grape 8
    '#0b7285', // cyan 9
    '#c0eb75', // lime 3
    '#ffd43b', // yellow 4
    '#ffc078', // orange 3
    '#8ce99a', // green 3
    '#63e6be', // teal 3
    '#a5d8ff', // blue 3
    '#bac8ff', // indigo 3
    '#e599f7', // grape 3
    '#faa2c1', // pink 3
    '#ffa8a8', // red 3
]

function getGroupColor(groupId?: string) {
    if (!groupId) return 'transparent'
    // More robust hash to utilize larger palette
    let hash = 0
    for (let i = 0; i < groupId.length; i++) {
        hash = (hash << 5) - hash + groupId.charCodeAt(i)
        hash |= 0 // Convert to 32bit integer
    }
    const index = Math.abs(hash) % GROUP_COLORS.length
    return GROUP_COLORS[index]
}

function StepNode({ data }: { data: StepNodeData }) {
    const { step, onSelect, onAddProduct, isSelected, interactive } = data

    // Safety check for step type
    const safeType = step.step_type || 'reaction'
    const stepTypeClass = safeType === 'carbocation_intermediate'
        ? 'carbocation'
        : safeType === 'carbocation_rearrangement'
            ? 'rearrangement'
            : safeType === 'initial'
                ? 'initial'
                : safeType === 'auto_add'
                    ? 'auto-add'
                    : 'reaction'

    // Determine label from group ID
    let mechanismLabel = '';
    if (step.group_id) {
        const lowerId = step.group_id.toLowerCase();

        if (lowerId.includes('sn2')) {
            mechanismLabel = 'SN2';
        } else if (lowerId.includes('sn1')) {
            mechanismLabel = 'SN1';
        } else if (lowerId.includes('e2')) {
            mechanismLabel = 'E2';
        } else if (lowerId.includes('e1')) {
            mechanismLabel = 'E1';
        } else {
            mechanismLabel = '';
        }
    }
    const groupColor = getGroupColor(step.group_id)

    return (
        <div
            className={`flow-node ${stepTypeClass} ${isSelected ? 'selected' : ''}`}
            onClick={() => interactive && onSelect && onSelect(step)}
            style={{
                // Add a left accent border for the group
                borderLeft: step.group_id ? `6px solid ${groupColor}` : undefined,
                // Optional: subtle glow
                boxShadow: (isSelected && step.group_id)
                    ? `0 0 0 2px var(--bg-secondary), 0 0 0 4px ${groupColor}`
                    : undefined,
                cursor: interactive ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'visible' // Allow badges to overlap
            }}
        >
            <Handle type="target" position={Position.Top} />

            {/* Mechanism Label Badge */}
            {mechanismLabel && (
                <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: groupColor,
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 10,
                    whiteSpace: 'nowrap'
                }}>
                    {mechanismLabel}
                </div>
            )}

            <div className="flow-node-header">

                <span className="step-type-badge">{safeType.replace(/_/g, ' ')}</span>
            </div>

            <div className="flow-node-products">
                {step.products && step.products.map((prod, idx) => (
                    <div key={idx} className="flow-product">
                        <MoleculeViewer
                            smiles={prod}
                            width={150}
                            height={150}
                            readOnly={true}
                        />
                        {/* Only show Add button if interactive */}
                        {interactive && (
                            <button
                                className="add-product-btn"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onAddProduct(prod)
                                }}
                                title="Add to editor"
                            >
                                +
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <Handle type="source" position={Position.Bottom} />
        </div>
    )
}

interface ReactionMechanismGraphProps {
    debugResult: DebugReactionOutcome | null
    onStepSelect?: (step: ReactionStep | null) => void
    onMoleculeUpdate: (smiles: string) => void
    selectedStep?: ReactionStep | null
    interactive?: boolean
}

export function ReactionMechanismGraph({
    debugResult,
    onStepSelect,
    onMoleculeUpdate,
    selectedStep,
    interactive = true
}: ReactionMechanismGraphProps) {
    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
    const [localError, setLocalError] = useState<string | null>(null)

    // Memoize nodeTypes
    const nodeTypes = useMemo(() => ({ stepNode: StepNode }), [])

    // Build flow nodes and edges from debug result using Dagre
    useEffect(() => {
        if (!debugResult || debugResult.steps.length === 0) {
            setNodes([])
            setEdges([])
            return
        }

        try {
            const steps = debugResult.steps
            setLocalError(null)

            const handleSelect = (step: ReactionStep) => {
                if (onStepSelect) onStepSelect(step)
            }

            // 1. Create Nodes (initially without position)
            const initialNodes: Node[] = steps.map(step => ({
                id: step.step_id,
                type: 'stepNode',
                position: { x: 0, y: 0 }, // Position will be set by dagre
                data: {
                    step,
                    onSelect: handleSelect,
                    onAddProduct: onMoleculeUpdate,
                    isSelected: selectedStep?.step_id === step.step_id,
                    interactive
                }
            }))

            // 2. Create Edges - use parent_ids if available, otherwise fall back to parent_id
            const initialEdges: Edge[] = []
            steps.forEach(step => {
                // Use parent_ids array if available, otherwise use parent_id
                const parentIds: string[] = step.parent_ids?.length
                    ? step.parent_ids
                    : (step.parent_id ? [step.parent_id] : [])

                parentIds.forEach(parentId => {
                    // Find the parent step to check if it's auto_add
                    const parentStep = steps.find(s => s.step_id === parentId)
                    const isAutoAddEdge = parentStep?.step_type === 'auto_add'

                    initialEdges.push({
                        id: `${parentId}-${step.step_id}`,
                        source: parentId,
                        target: step.step_id,
                        type: 'smoothstep',
                        animated: true,
                        style: {
                            strokeWidth: 2,
                            stroke: isAutoAddEdge ? '#22c55e' : '#6366f1',
                            strokeDasharray: isAutoAddEdge ? '5,5' : undefined
                        },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: isAutoAddEdge ? '#22c55e' : '#6366f1'
                        }
                    })
                })
            })

            // 3. Apply Dagre Layout
            const g = new dagre.graphlib.Graph()
            // Increased nodesep to make branches wider apart
            g.setGraph({ rankdir: 'TB', nodesep: 150, ranksep: 80 })
            g.setDefaultEdgeLabel(() => ({}))

            // Use slightly larger dimensions for layout to ensure spacing
            const NODE_WIDTH = 300
            const NODE_HEIGHT = 220

            initialNodes.forEach(node => {
                g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
            })

            initialEdges.forEach(edge => {
                g.setEdge(edge.source, edge.target)
            })

            dagre.layout(g)

            const layoutedNodes = initialNodes.map(node => {
                const nodeWithPosition = g.node(node.id)
                return {
                    ...node,
                    position: {
                        x: nodeWithPosition.x - NODE_WIDTH / 2,
                        y: nodeWithPosition.y - NODE_HEIGHT / 2
                    }
                }
            })

            setNodes(layoutedNodes)
            setEdges(initialEdges)

        } catch (e) {
            console.error("Layout error:", e)
            setLocalError("Graph layout failed. Showing raw list.")
            // Emergency fallback
            const fallbackNodes = debugResult.steps.map((step, i) => ({
                id: step.step_id,
                type: 'stepNode',
                position: { x: 0, y: i * 200 },
                data: {
                    step,
                    onSelect: onStepSelect ? (s: ReactionStep) => onStepSelect(s) : () => { },
                    onAddProduct: onMoleculeUpdate,
                    isSelected: false,
                    interactive
                }
            }))
            setNodes(fallbackNodes)
        }
    }, [debugResult, selectedStep, onMoleculeUpdate, setNodes, setEdges, interactive, onStepSelect])

    return (
        <div className="react-flow-host" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
            {localError && <div style={{ color: 'red', padding: '10px' }}>{localError}</div>}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={interactive}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed }
                }}
            >
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#555" />
            </ReactFlow>
        </div>
    )
}
