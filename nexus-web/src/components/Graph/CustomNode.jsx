import { Handle, Position } from 'reactflow'
import PropTypes from 'prop-types'
import { useGraphStore } from '../../store/graphStore'
import TrendingBadge from '../Common/TrendingBadge'
import { getTagColor } from '../../utils/constants'

export default function CustomNode({ data, selected }) {
  const selectNode = useGraphStore((state) => state.selectNode)
  const togglePinNode = useGraphStore((state) => state.togglePinNode)
  const pinnedNodes = useGraphStore((state) => state.pinnedNodes)

  const trendingScore = data?.trending_score ?? 0
  const isTrending = trendingScore > 0.5
  const nodeWidth = Math.round(Math.min(240, 160 + trendingScore * 20))
  const isPinned = pinnedNodes.has(data?.id)

  const animationStyle = data?.isCollapsing
    ? { animation: 'fadeOut 0.2s ease-in forwards' }
    : data?.animationDelay
      ? { animation: `fadeInScaleUp 0.3s ease-out ${data.animationDelay}ms both` }
      : {}

  const handleClick = () => {
    selectNode(data?.id, data)
  }

  const handleTogglePin = (e) => {
    e.stopPropagation()
    togglePinNode(data?.id)
  }

  const handleLoadMore = (e) => {
    e.stopPropagation()
    data.onLoadMore?.()
  }

  return (
    <div
      onClick={handleClick}
      style={animationStyle}
      className={`
        relative px-4 py-3 rounded-lg cursor-pointer transition-all duration-200
        ${selected
          ? 'ring-2 ring-blue-500 shadow-lg scale-105'
          : 'shadow hover:shadow-lg hover:scale-105'
        }
        ${isTrending
          ? 'bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-400'
          : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-400'
        }
      `}
      style={{ width: `${nodeWidth}px`, minWidth: '160px' }}
    >
      <Handle type="target" position={Position.Top} />

      <h3 className={`font-bold text-xs truncate ${isTrending ? 'text-red-800' : 'text-blue-800'}`}>
        {data.title}
      </h3>

      {data.summary && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-tight">
          {data.summary}
        </p>
      )}

      {data.tags && data.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1 py-0.5 rounded text-white"
              style={{ backgroundColor: getTagColor(tag) }}
            >
              {tag}
            </span>
          ))}
          {data.tags.length > 2 && (
            <span className="text-xs px-1 py-0.5 rounded bg-gray-200 text-gray-600">
              +{data.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {isTrending && (
        <div className="mt-2">
          <TrendingBadge score={trendingScore} size="sm" />
        </div>
      )}

      {/* Load more button - shows when hasMoreConnections is true */}
      {data?.hasMoreConnections && (
        <button
          onClick={handleLoadMore}
          disabled={data?.isLoading}
          className="mt-2 w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          title="Load more connections"
        >
          {data?.isLoading ? 'Loading...' : `Load more (showing ${data?.loadedCount} of ${data?.totalConnections})`}
        </button>
      )}

      {/* Pin icon - visible on hover */}
      <div className="absolute -top-2 -right-2 opacity-0 hover:opacity-100 transition-opacity">
        <button
          onClick={handleTogglePin}
          className="p-1 bg-yellow-400 rounded-full text-sm hover:bg-yellow-500"
          title="Pin this node"
        >
          📌
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

CustomNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    summary: PropTypes.string,
    trending_score: PropTypes.number,
    tags: PropTypes.arrayOf(PropTypes.string),
    hasMoreConnections: PropTypes.bool,
    loadedCount: PropTypes.number,
    totalConnections: PropTypes.number,
    isLoading: PropTypes.bool,
    isCollapsing: PropTypes.bool,
    animationDelay: PropTypes.number,
    onLoadMore: PropTypes.func,
  }),
  selected: PropTypes.bool,
}
