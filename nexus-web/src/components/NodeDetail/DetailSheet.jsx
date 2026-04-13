import { useGraphStore } from '../../store/graphStore'
import Modal from '../ui/Modal'
import Tabs from '../ui/Tabs'
import SourcesTab from './SourcesTab'
import ConnectionsTab from './ConnectionsTab'
import TimelineTab from './TimelineTab'
import ActionsTab from './ActionsTab'

export default function DetailSheet() {
  const { isDetailOpen, closeDetail, selectedNode } = useGraphStore()

  if (!selectedNode) return null

  const tabs = [
    { label: 'Sources', content: <SourcesTab /> },
    { label: 'Connections', content: <ConnectionsTab /> },
    { label: 'Timeline', content: <TimelineTab /> },
    { label: 'Actions', content: <ActionsTab /> },
  ]

  return (
    <Modal
      isOpen={isDetailOpen}
      onClose={closeDetail}
      title={selectedNode.title}
    >
      <div className="mb-4">
        <p className="text-gray-700 mb-3">{selectedNode.summary}</p>
        <div className="flex flex-wrap gap-2">
          {selectedNode.tags?.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <Tabs tabs={tabs} />
    </Modal>
  )
}
