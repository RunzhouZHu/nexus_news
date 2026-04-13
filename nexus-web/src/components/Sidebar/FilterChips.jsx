import { useFilterStore } from '../../store/filterStore'

const SUGGESTED_TAGS = ['energy', 'politics', 'technology', 'health', 'climate']

export default function FilterChips() {
  const { activeTags, toggleTag, clearTags } = useFilterStore()

  return (
    <div className="p-4 border-b">
      <div className="text-sm font-semibold mb-2">Tags</div>
      <div className="flex flex-wrap gap-2 mb-2">
        {SUGGESTED_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded text-sm transition ${
              activeTags.includes(tag)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      {activeTags.length > 0 && (
        <button
          onClick={clearTags}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
