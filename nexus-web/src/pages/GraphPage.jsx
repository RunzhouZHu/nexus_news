import GraphCanvas from '../components/Graph/GraphCanvas'
import Sidebar from '../components/Sidebar/Sidebar'
import DetailSheet from '../components/NodeDetail/DetailSheet'
import MobileMenu from '../components/Common/MobileMenu'
import { useFilterStore } from '../store/filterStore'

export default function GraphPage() {
  const viewMode = useFilterStore((state) => state.viewMode)

  return (
    <>
      <MobileMenu />
      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        {/* Sidebar: hidden on mobile, shown on desktop */}
        <div className="hidden lg:block w-1/5 border-r overflow-y-auto">
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 ${viewMode === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            <GraphCanvas />
          </div>
          <div className={`flex-1 overflow-y-auto lg:hidden ${viewMode === 'list' ? 'block' : 'hidden'}`}>
            <Sidebar />
          </div>
        </div>
      </div>

      <DetailSheet />
    </>
  )
}
