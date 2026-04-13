import { useFilterStore } from '../../store/filterStore'
import { useGraphStore } from '../../store/graphStore'
import { useSearch } from '../../api/hooks/useSearch'

export default function NodeList() {
  const { searchQuery } = useFilterStore()
  const { selectNode } = useGraphStore()
  const { data: results = [], isLoading } = useSearch(searchQuery)

  if (!searchQuery) {
    return null
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Searching...
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No results found
      </div>
    )
  }

  return (
    <div className="p-4 border-b">
      <div className="text-sm font-semibold mb-3">Search Results</div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((node) => (
          <button
            key={node.id}
            onClick={() => selectNode(node.id, node)}
            className="w-full text-left p-2 hover:bg-blue-50 rounded transition"
          >
            <div className="font-medium text-sm truncate">{node.title}</div>
            <div className="text-xs text-gray-600 truncate">{node.summary}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
