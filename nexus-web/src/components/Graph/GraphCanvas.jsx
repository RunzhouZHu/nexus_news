import { useMemo, useCallback } from 'react'
import { useTrendingNodes } from '../../api/hooks/useTrendingNodes'
import { useEdges } from '../../api/hooks/useEdges'
import { useFilterStore } from '../../store/filterStore'
import { useGraphStore } from '../../store/graphStore'
import SigmaGraph from './SigmaGraph'
import LoadingSpinner from '../Common/LoadingSpinner'
import client from '../../api/client'

export default function GraphCanvas() {
  const searchQuery = useFilterStore((state) => state.searchQuery)

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const expandedConnections = useGraphStore((state) => state.expandedConnections)
  const selectNode = useGraphStore((state) => state.selectNode)
  const expandNode = useGraphStore((state) => state.expandNode)
  const loadMoreConnections = useGraphStore((state) => state.loadMoreConnections)
  const setNodeLoading = useGraphStore((state) => state.setNodeLoading)
  const closeDetail = useGraphStore((state) => state.closeDetail)

  const { data: trendingData, isLoading: trendingLoading, error: trendingError } = useTrendingNodes({ limit: 10 })

  // Merge trending nodes with nodes loaded via connection expansion
  const allNodes = useMemo(() => {
    const nodeMap = new Map()
    trendingData?.forEach((node) => nodeMap.set(node.id, node))
    Object.values(expandedConnections).forEach((conn) => {
      conn.nodes?.forEach((node) => {
        if (!nodeMap.has(node.id)) nodeMap.set(node.id, node)
      })
    })
    return Array.from(nodeMap.values())
  }, [trendingData, expandedConnections])

  // Filter by search query
  const visibleNodes = useMemo(() => {
    if (!searchQuery) return allNodes
    const q = searchQuery.toLowerCase()
    return allNodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.summary?.toLowerCase().includes(q) ||
        n.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }, [allNodes, searchQuery])

  const visibleNodeIds = useMemo(() => visibleNodes.map((n) => n.id), [visibleNodes])

  const { data: edgeData } = useEdges(visibleNodeIds)

  // Merge API edges with edges from expanded connections, deduplicated
  const allEdges = useMemo(() => {
    const seen = new Set()
    const result = []
    const push = (edge) => {
      if (seen.has(edge.id)) return
      seen.add(edge.id)
      result.push(edge)
    }
    edgeData?.forEach(push)
    Object.values(expandedConnections).forEach((conn) => conn.edges?.forEach(push))
    return result
  }, [edgeData, expandedConnections])

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback(
    async (nodeId) => {
      const node = allNodes.find((n) => n.id === nodeId)
      selectNode(nodeId, node)

      if (!expandedConnections[nodeId]) {
        try {
          const res = await client.get(`/api/nodes/${nodeId}/connections`, {
            params: { limit: 10, offset: 0, sort: 'confidence' },
          })
          expandNode(nodeId, {
            nodes: res.data.nodes || [],
            edges: res.data.edges || [],
            offset: res.data.offset ?? 10,
            total: res.data.total ?? 0,
            loading: false,
          })
        } catch (err) {
          console.error('Failed to expand connections:', err)
        }
      }
    },
    [allNodes, selectNode, expandNode, expandedConnections]
  )

  const handleLoadMore = useCallback(
    async (nodeId) => {
      const existing = expandedConnections[nodeId]
      if (!existing) return
      try {
        setNodeLoading(nodeId, true)
        const res = await client.get(`/api/nodes/${nodeId}/connections`, {
          params: { limit: 10, offset: existing.offset, sort: 'confidence' },
        })
        loadMoreConnections(nodeId, {
          nodes: res.data.nodes || [],
          edges: res.data.edges || [],
        })
      } catch (err) {
        console.error('Failed to load more connections:', err)
      } finally {
        setNodeLoading(nodeId, false)
      }
    },
    [expandedConnections, loadMoreConnections, setNodeLoading]
  )

  const handleStageClick = useCallback(() => {
    closeDetail()
  }, [closeDetail])

  // ── Render ────────────────────────────────────────────────────────────────
  if (trendingError) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-center">
          <p className="text-red-400 font-semibold">Error loading graph</p>
          <p className="text-slate-400 text-sm">{trendingError?.message || 'Failed to load trending nodes'}</p>
        </div>
      </div>
    )
  }

  if (trendingLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0f172a' }}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <SigmaGraph
        nodes={visibleNodes}
        edges={allEdges}
        onNodeClick={handleNodeClick}
        onStageClick={handleStageClick}
        onLoadMore={handleLoadMore}
      />
    </div>
  )
}
