import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'

const PIN_ANGLE = -Math.PI * 0.3      // top-right (~-54°)
const MORE_ANGLE = Math.PI * 0.3      // bottom-right (~+54°)
const HALO_RADIUS_EXTRA = 28          // px beyond node radius

function HaloButton({ x, y, icon, title, onClick, disabled }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'all',
        textAlign: 'center',
      }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.3)',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f1f5f9',
        }}
      >
        {icon}
      </button>
      <span
        style={{
          display: 'block',
          fontSize: 9,
          color: '#94a3b8',
          marginTop: 2,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {title}
      </span>
    </div>
  )
}

HaloButton.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

/**
 * Floating HTML overlay that renders radial action buttons over a selected
 * Sigma node. Stays locked to the node through zoom and pan by listening to
 * Sigma's afterRender event and re-computing viewport coordinates each frame.
 */
export default function NodeHalo({
  nodeId,
  sigma,
  graph,
  isPinned,
  hasMore,
  isLoading,
  onPin,
  onLoadMore,
}) {
  const [pos, setPos] = useState(null)

  const updatePos = useCallback(() => {
    if (!nodeId || !sigma || !graph) return
    try {
      const attrs = graph.getNodeAttributes(nodeId)
      const vp = sigma.graphToViewport({ x: attrs.x, y: attrs.y })
      setPos(vp)
    } catch {
      setPos(null)
    }
  }, [nodeId, sigma, graph])

  useEffect(() => {
    if (!nodeId || !sigma) {
      setPos(null)
      return
    }
    updatePos()
    sigma.on('afterRender', updatePos)
    return () => {
      sigma.off('afterRender', updatePos)
    }
  }, [nodeId, sigma, updatePos])

  if (!pos || !nodeId || !sigma) return null

  const nodeSize = graph?.getNodeAttributes(nodeId)?.size ?? 10
  const r = nodeSize + HALO_RADIUS_EXTRA

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <HaloButton
        x={pos.x + Math.cos(PIN_ANGLE) * r}
        y={pos.y + Math.sin(PIN_ANGLE) * r}
        icon={isPinned ? '📍' : '📌'}
        title={isPinned ? 'Unpin' : 'Pin'}
        onClick={onPin}
      />
      {hasMore && (
        <HaloButton
          x={pos.x + Math.cos(MORE_ANGLE) * r}
          y={pos.y + Math.sin(MORE_ANGLE) * r}
          icon={isLoading ? '⏳' : '➕'}
          title={isLoading ? 'Loading...' : 'Load more'}
          onClick={onLoadMore}
          disabled={isLoading}
        />
      )}
    </div>
  )
}

NodeHalo.propTypes = {
  nodeId: PropTypes.string,
  sigma: PropTypes.object,
  graph: PropTypes.object,
  isPinned: PropTypes.bool.isRequired,
  hasMore: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onPin: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
}
