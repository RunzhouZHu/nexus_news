import { useNode } from '../../api/hooks/useNode'
import { useGraphStore } from '../../store/graphStore'

export default function SourcesTab() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const { data } = useNode(selectedNodeId)

  if (!data?.sources || data.sources.length === 0) {
    return <p className="text-gray-600">No sources</p>
  }

  return (
    <div className="space-y-3">
      {data.sources.map((source, idx) => (
        <div key={idx} className="p-3 bg-gray-50 rounded border">
          <p className="font-semibold text-sm">{source.outlet}</p>
          <p className="text-xs text-gray-600 mt-1">
            {new Date(source.published_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate block text-xs mt-2"
          >
            {source.url}
          </a>
        </div>
      ))}
    </div>
  )
}
