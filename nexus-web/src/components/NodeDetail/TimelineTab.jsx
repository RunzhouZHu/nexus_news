import { useNode } from '../../api/hooks/useNode'
import { useGraphStore } from '../../store/graphStore'

export default function TimelineTab() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const { data } = useNode(selectedNodeId)

  if (!data?.node) {
    return <p className="text-gray-600">No timeline data</p>
  }

  const node = data.node
  const eventDate = node.date
    ? new Date(node.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const publishedDate = node.created_at
    ? new Date(node.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-3">
      {eventDate && (
        <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-600">
          <p className="text-xs font-semibold text-blue-900">Event Date</p>
          <p className="text-sm text-blue-700 mt-1">{eventDate}</p>
        </div>
      )}
      {publishedDate && (
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-xs font-semibold text-gray-900">Published Date</p>
          <p className="text-sm text-gray-700 mt-1">{publishedDate}</p>
        </div>
      )}
      {!eventDate && !publishedDate && (
        <p className="text-gray-600">No timeline data available</p>
      )}
    </div>
  )
}
