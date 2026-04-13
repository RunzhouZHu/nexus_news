import { useState } from 'react'
import { useFilterStore } from '../../store/filterStore'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const viewMode = useFilterStore((state) => state.viewMode)
  const setViewMode = useFilterStore((state) => state.setViewMode)

  return (
    <div className="lg:hidden fixed top-20 left-4 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-blue-600 text-white rounded-lg shadow"
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {isOpen && (
        <div className="absolute mt-2 bg-white rounded-lg shadow-lg p-4 min-w-max">
          <button
            onClick={() => {
              setViewMode(viewMode === 'graph' ? 'list' : 'graph')
              setIsOpen(false)
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
          >
            {viewMode === 'graph' ? 'Show List View' : 'Show Graph View'}
          </button>
        </div>
      )}
    </div>
  )
}
