import { useGraphStore } from '../../store/graphStore'
import Tabs from '../ui/Tabs'
import SourcesTab from './SourcesTab'
import ConnectionsTab from './ConnectionsTab'
import TimelineTab from './TimelineTab'
import ActionsTab from './ActionsTab'

export default function DetailSheet({ onLoadMore }) {
  const { isDetailOpen, closeDetail, selectedNode, selectedNodeId, pinnedNodes, togglePinNode, expandedConnections } =
    useGraphStore()

  if (!selectedNode || !isDetailOpen) return null

  const isPinned = pinnedNodes.has(selectedNodeId)
  const connData = expandedConnections[selectedNodeId]
  const hasMore = connData ? connData.offset < connData.total : false
  const isLoading = connData?.loading ?? false

  const tabs = [
    { label: 'Sources', content: <SourcesTab /> },
    { label: 'Connections', content: <ConnectionsTab /> },
    { label: 'Timeline', content: <TimelineTab /> },
    { label: 'Actions', content: <ActionsTab /> },
  ]

  return (
    <div
      className="fixed right-0 top-0 h-full z-40 flex flex-col shadow-2xl"
      style={{ width: 360, background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h2 className="text-lg font-semibold text-slate-100 leading-tight pr-2 flex-1">
          {selectedNode.title}
        </h2>

        {/* Quick-action buttons */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => togglePinNode(selectedNodeId)}
            title={isPinned ? 'Unpin node' : 'Pin node'}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
            style={{
              background: isPinned ? '#1d4ed8' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {isPinned ? '📍' : '📌'}
          </button>

          {hasMore && (
            <button
              onClick={() => onLoadMore?.(selectedNodeId)}
              disabled={isLoading}
              title={isLoading ? 'Loading…' : 'Load more connections'}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {isLoading ? '⏳' : '➕'}
            </button>
          )}

          <button
            onClick={closeDetail}
            title="Close"
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors text-lg leading-none"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Summary + tags */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {selectedNode.summary && (
          <p className="text-slate-400 text-sm leading-relaxed mb-2">{selectedNode.summary}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {selectedNode.tags?.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs"
              style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto">
        <Tabs tabs={tabs} dark />
      </div>
    </div>
  )
}
