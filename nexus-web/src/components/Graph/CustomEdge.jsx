import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'
import PropTypes from 'prop-types'
import { useGraphStore } from '../../store/graphStore'

const EDGE_COLORS = {
  CAUSED_BY: '#ef4444',      // red
  LED_TO: '#22c55e',         // green
  RELATED_TO: '#eab308',     // yellow
  CONTEXT: '#94a3b8',        // gray
}

const EDGE_STYLES = {
  CAUSED_BY: { strokeWidth: 2 },
  LED_TO: { strokeWidth: 2 },
  RELATED_TO: { strokeWidth: 2 },
  CONTEXT: { strokeWidth: 2, strokeDasharray: '5,5' },
}

export default function CustomEdge({ id, source, target, data, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const toggleCollapseEdge = useGraphStore((state) => state.toggleCollapseEdge)
  const collapsedEdges = useGraphStore((state) => state.collapsedEdges)

  const edgeType = data?.type || 'CONTEXT'
  const color = EDGE_COLORS[edgeType] || '#94a3b8'
  const isCollapsed = collapsedEdges.has(id)

  const handleCollapseClick = (e) => {
    e.stopPropagation()
    toggleCollapseEdge(id, new Set([target]))
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          opacity: isCollapsed ? 0.3 : 1,
          ...EDGE_STYLES[edgeType],
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            pointerEvents: 'all',
          }}
          className="text-gray-600 bg-white px-1 rounded"
        >
          {edgeType}
          <button
            onClick={handleCollapseClick}
            className="ml-1 text-xs bg-gray-300 hover:bg-gray-400 rounded px-1"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '⊕' : '⊖'}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

CustomEdge.propTypes = {
  id: PropTypes.string.isRequired,
  source: PropTypes.string,
  target: PropTypes.string,
  data: PropTypes.shape({
    type: PropTypes.string,
  }),
  sourceX: PropTypes.number.isRequired,
  sourceY: PropTypes.number.isRequired,
  targetX: PropTypes.number.isRequired,
  targetY: PropTypes.number.isRequired,
  sourcePosition: PropTypes.string,
  targetPosition: PropTypes.string,
}
