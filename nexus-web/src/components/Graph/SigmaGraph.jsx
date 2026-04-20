import { useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import EdgeCurveProgram from '@sigma/edge-curve'
import { useGraphStore } from '../../store/graphStore'
import NodeHalo from './NodeHalo'

// ── Visual constants ──────────────────────────────────────────────────────────
const BG_COLOR = '#0f172a'

const TAG_COLOR_MAP = {
  economy: '#38bdf8',
  geopolitics: '#f472b6',
  finance: '#34d399',
  technology: '#a78bfa',
  health: '#fb7185',
  politics: '#f472b6',
  science: '#34d399',
}

const EDGE_COLOR_MAP = {
  CAUSED_BY: '#ef4444',
  LED_TO: '#22c55e',
  RELATED_TO: '#eab308',
  CONTEXT: '#94a3b855',
}

function getNodeColor(tags) {
  if (!tags?.length) return '#94a3b8'
  return TAG_COLOR_MAP[tags[0]?.toLowerCase()] ?? '#94a3b8'
}

function getNodeSize(trendingScore = 0) {
  return 8 + Math.min(trendingScore, 1) * 10
}

// ── Graph sync helpers ────────────────────────────────────────────────────────

function syncNodes(graph, apiNodes, pinnedNodes) {
  apiNodes.forEach((node) => {
    const color = getNodeColor(node.tags)
    const size = getNodeSize(node.trending_score)
    if (graph.hasNode(node.id)) {
      graph.setNodeAttribute(node.id, 'label', node.title)
      graph.setNodeAttribute(node.id, 'color', color)
      graph.setNodeAttribute(node.id, 'size', size)
    } else {
      graph.addNode(node.id, {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        label: node.title,
        color,
        size,
        fixed: pinnedNodes.has(node.id),
      })
    }
  })
}

function syncEdges(graph, apiEdges) {
  const existingEdges = new Set(graph.edges())
  apiEdges.forEach((edge) => {
    if (existingEdges.has(edge.id)) return
    if (!graph.hasNode(edge.from_node) || !graph.hasNode(edge.to_node)) return
    graph.addDirectedEdgeWithKey(edge.id, edge.from_node, edge.to_node, {
      type: 'curved',
      color: EDGE_COLOR_MAP[edge.type] ?? '#94a3b855',
      edgeType: edge.type || 'CONTEXT',
    })
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SigmaGraph({ nodes, edges, onNodeClick, onStageClick, onLoadMore }) {
  const containerRef = useRef(null)
  const sigmaRef = useRef(null)
  const graphRef = useRef(null)
  const rafRef = useRef(null)
  const selectedNodeRef = useRef(null)
  const dragStateRef = useRef({ dragging: false, draggedNode: null })

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const pinnedNodes = useGraphStore((state) => state.pinnedNodes)
  const togglePinNode = useGraphStore((state) => state.togglePinNode)
  const expandedConnections = useGraphStore((state) => state.expandedConnections)

  // ── Mount: create Sigma instance ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph({ type: 'directed' })
    graphRef.current = graph

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeType: 'curved',
      edgeProgramClasses: { curved: EdgeCurveProgram },
      labelColor: { color: '#e2e8f0' },
      labelSize: 11,
      labelThreshold: 6,
      backgroundColor: BG_COLOR,
      nodeReducer: (node, data) => {
        const res = { ...data }
        const sel = selectedNodeRef.current
        if (sel && node !== sel) {
          try {
            const neighbors = graph.neighbors(sel)
            if (!neighbors.includes(node)) {
              res.color = (data.color || '#94a3b8') + '44'
              res.label = undefined
            }
          } catch {
            // sel may no longer be in graph
          }
        }
        if (node === sel) {
          res.highlighted = true
        }
        return res
      },
      edgeReducer: (edge, data) => {
        const res = { ...data }
        const sel = selectedNodeRef.current
        if (sel) {
          try {
            if (!graph.hasExtremity(edge, sel)) {
              const baseColor = (data.color || '#94a3b8').slice(0, 7)
              res.color = baseColor + '22'
            }
          } catch {
            // ignore
          }
        }
        return res
      },
    })
    sigmaRef.current = sigma

    // ForceAtlas2 via rAF loop (avoids Web Worker bundling issues in Vite)
    const fa2Settings = {
      gravity: 1,
      scalingRatio: 2,
      slowDown: 3,
      barnesHutOptimize: true,
    }
    let animating = true
    const runLayout = () => {
      if (!animating) return
      if (graph.order > 0) {
        forceAtlas2.assign(graph, { iterations: 1, settings: fa2Settings })
        sigma.refresh()
      }
      rafRef.current = requestAnimationFrame(runLayout)
    }
    rafRef.current = requestAnimationFrame(runLayout)

    // ── Drag handling ────────────────────────────────────────────────────────
    sigma.on('downNode', ({ node }) => {
      dragStateRef.current = { dragging: true, draggedNode: node }
      graph.setNodeAttribute(node, 'fixed', true)
      sigma.getCamera().disable()
    })

    sigma.getMouseCaptor().on('mousemovebody', (e) => {
      const { dragging, draggedNode } = dragStateRef.current
      if (!dragging || !draggedNode) return
      const pos = sigma.viewportToGraph({ x: e.x, y: e.y })
      graph.setNodeAttribute(draggedNode, 'x', pos.x)
      graph.setNodeAttribute(draggedNode, 'y', pos.y)
      sigma.refresh()
    })

    sigma.getMouseCaptor().on('mouseup', () => {
      dragStateRef.current = { dragging: false, draggedNode: null }
      sigma.getCamera().enable()
    })

    return () => {
      animating = false
      cancelAnimationFrame(rafRef.current)
      sigma.kill()
    }
  }, []) // run only once on mount

  // ── Sync nodes/edges when props change ───────────────────────────────────
  useEffect(() => {
    if (!graphRef.current || !sigmaRef.current) return
    syncNodes(graphRef.current, nodes, pinnedNodes)
    syncEdges(graphRef.current, edges)
    sigmaRef.current.refresh()
  }, [nodes, edges, pinnedNodes])

  // ── Handle node click: notify parent ───────────────────
  const handleNodeClick = useCallback(({ node }) => {
    const graph = graphRef.current
    const sigma = sigmaRef.current
    if (!graph || !sigma) return

    selectedNodeRef.current = node

    sigma.refresh()
    onNodeClick(node)
  }, [onNodeClick])

  // ── Handle stage click: release non-pinned nodes back to force ───────────
  const handleStageClick = useCallback(() => {
    const graph = graphRef.current
    const sigma = sigmaRef.current
    if (!graph || !sigma) return

    selectedNodeRef.current = null

    graph.forEachNode((id) => {
      if (!pinnedNodes.has(id)) {
        graph.setNodeAttribute(id, 'fixed', false)
      }
    })

    sigma.refresh()
    onStageClick()
  }, [pinnedNodes, onStageClick])

  // ── Wire up click events ──────────────────────────────────────────────────
  useEffect(() => {
    const sigma = sigmaRef.current
    if (!sigma) return
    sigma.on('clickNode', handleNodeClick)
    sigma.on('clickStage', handleStageClick)
    return () => {
      sigma.off('clickNode', handleNodeClick)
      sigma.off('clickStage', handleStageClick)
    }
  }, [handleNodeClick, handleStageClick])

  // ── Sync pin state from store to graphology ───────────────────────────────
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    graph.forEachNode((id) => {
      const shouldBeFixed = pinnedNodes.has(id)
      if (graph.getNodeAttribute(id, 'fixed') !== shouldBeFixed) {
        graph.setNodeAttribute(id, 'fixed', shouldBeFixed)
      }
    })
    sigmaRef.current?.refresh()
  }, [pinnedNodes])

  // ── Derive NodeHalo props from store ─────────────────────────────────────
  const connData = selectedNodeId ? expandedConnections[selectedNodeId] : null
  const hasMore = connData ? connData.offset < connData.total : false
  const isLoading = connData?.loading ?? false

  const handlePin = useCallback(() => {
    if (selectedNodeId) togglePinNode(selectedNodeId)
  }, [selectedNodeId, togglePinNode])

  const handleLoadMore = useCallback(() => {
    if (selectedNodeId) onLoadMore(selectedNodeId)
  }, [selectedNodeId, onLoadMore])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: BG_COLOR }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <NodeHalo
        nodeId={selectedNodeId}
        sigma={sigmaRef.current}
        graph={graphRef.current}
        isPinned={pinnedNodes.has(selectedNodeId)}
        hasMore={hasMore}
        isLoading={isLoading}
        onPin={handlePin}
        onLoadMore={handleLoadMore}
      />
    </div>
  )
}

SigmaGraph.propTypes = {
  nodes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string),
    trending_score: PropTypes.number,
  })).isRequired,
  edges: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    from_node: PropTypes.string.isRequired,
    to_node: PropTypes.string.isRequired,
    type: PropTypes.string,
  })).isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onStageClick: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
}
