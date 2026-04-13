import SearchInput from './SearchInput'
import FilterChips from './FilterChips'
import NodeList from './NodeList'

export default function Sidebar() {
  return (
    <div className="w-full lg:w-auto bg-white border-b lg:border-r lg:border-b-0 overflow-y-auto flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <SearchInput />
        <FilterChips />
        <NodeList />
      </div>
      <div className="border-t p-4 text-xs text-gray-500">
        💡 Tip: Click nodes on the graph to view details
      </div>
    </div>
  )
}
