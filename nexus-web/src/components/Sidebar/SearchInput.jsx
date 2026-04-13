import { useFilterStore } from '../../store/filterStore'
import Input from '../ui/Input'

export default function SearchInput() {
  const { searchQuery, setSearchQuery } = useFilterStore()

  return (
    <div className="p-4 border-b">
      <Input
        placeholder="Search nodes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />
    </div>
  )
}
