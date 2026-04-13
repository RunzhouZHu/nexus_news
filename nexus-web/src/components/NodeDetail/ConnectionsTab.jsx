import { useConnections } from '../../api/hooks/useConnections'
import { useGraphStore } from '../../store/graphStore'
import { EDGE_TYPE_COLORS } from '../../utils/constants'

export default function ConnectionsTab() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const { data: edges } = useConnections(selectedNodeId)

  if (!edges || edges.length === 0) {
    return <p className="text-gray-600">No connections</p>
  }

  return (
    <div className="space-y-3">
      {edges.map((edge, idx) => {
        const connectedNodeId = edge.from_node === selectedNodeId ? edge.to_node : edge.from_node
        const connectedNodeTitle = edge.from_node === selectedNodeId ? edge.to_title : edge.from_title
        const edgeColor = EDGE_TYPE_COLORS[edge.type] || '#6b7280'
        const confidence = ((edge.confidence || 0) * 100).toFixed(0)

        return (
          <div key={idx} className="p-3 bg-gray-50 rounded border">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-1 text-xs text-white rounded font-medium"
                style={{ backgroundColor: edgeColor }}
              >
                {edge.type}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900">{connectedNodeTitle}</p>
            <p className="text-xs text-gray-600 mt-1">
              Confidence: {confidence}%
            </p>
          </div>
        )
      })}
    </div>
  )
}
