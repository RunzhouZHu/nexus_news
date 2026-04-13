import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'
import { useEdges } from '../../api/hooks/useEdges'
import { useTrendingNodes } from '../../api/hooks/useTrendingNodes'
import { useFilterStore } from '../../store/filterStore'
import { useGraphStore } from '../../store/graphStore'
import { useGraphLayoutStore } from '../../store/graphLayoutStore'
import CustomNode from './CustomNode'
import CustomEdge from './CustomEdge'
import LoadingSpinner from '../Common/LoadingSpinner'
import client from '../../api/client'

const nodeTypes = {
  custom: CustomNode,
}

const edgeTypes = {
  custom: CustomEdge,
}

export default function GraphCanvas() {
  const searchQuery = useFilterStore((state) => state.searchQuery)
  const activeTags = useFilterStore((state) => state.activeTags)
  // selectedNodeId reserved for phase 2: node detail panel interactions
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)

  // Progressive loading: track expanded connections and pinned nodes
  const expandedConnections = useGraphStore((state) => state.expandedConnections)
  const pinnedNodes = useGraphStore((state) => state.pinnedNodes)
  const collapsedEdges = useGraphStore((state) => state.collapsedEdges)
  const selectNode = useGraphStore((state) => state.selectNode)
  const expandNode = useGraphStore((state) => state.expandNode)
  const loadMoreConnections = useGraphStore((state) => state.loadMoreConnections)
  const setNodeLoading = useGraphStore((state) => state.setNodeLoading)

  // Animation: track which nodes are mid-collapse for fade-out effect
  const [collapsingNodeIds, setCollapsingNodeIds] = useState(new Set())
  const prevCollapsedEdgesRef = useRef(collapsedEdges)

  useEffect(() => {
    const allHidden = new Set()
    collapsedEdges.forEach((hidden) => {
      hidden.forEach((id) => allHidden.add(id))
    })

    if (allHidden.size > 0) {
      setCollapsingNodeIds(allHidden)
      const timer = setTimeout(() => setCollapsingNodeIds(new Set()), 200)
      return () => clearTimeout(timer)
    }

    prevCollapsedEdgesRef.current = collapsedEdges
  }, [collapsedEdges])

  // Layout store: manages persisted node positions
  const nodePositions = useGraphLayoutStore((state) => state.nodePositions)
  const isLayoutManual = useGraphLayoutStore((state) => state.isLayoutManual)
  const setNodePositions = useGraphLayoutStore((state) => state.setNodePositions)

  // Load trending nodes instead of all nodes (progressive loading)
  const { data: trendingData, isLoading: trendingLoading, error: trendingError } = useTrendingNodes({ limit: 10 })

  // Build allNodes from trending nodes + expanded connections
  const allNodes = useMemo(() => {
    const nodeMap = new Map()

    // Add trending nodes
    if (trendingData) {
      trendingData.forEach((node) => {
        nodeMap.set(node.id, node)
      })
    }

    // Add nodes from expanded connections
    Object.values(expandedConnections).forEach((conn) => {
      if (conn.nodes && Array.isArray(conn.nodes)) {
        conn.nodes.forEach((node) => {
          if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, node)
          }
        })
      }
    })

    return Array.from(nodeMap.values())
  }, [trendingData, expandedConnections])

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase()

    return allNodes.filter((node) => {
      const matchesSearch =
        !searchQuery ||
        node.title.toLowerCase().includes(lowerQuery) ||
        (node.summary &&
          node.summary.toLowerCase().includes(lowerQuery)) ||
        (node.tags &&
          node.tags.some((tag) =>
            tag.toLowerCase().includes(lowerQuery)
          ))
      return matchesSearch
    })
  }, [allNodes, searchQuery])

  // Calculate visible node IDs: include all nodes EXCEPT collapsed ones (unless pinned)
  const visibleNodeIds = useMemo(() => {
    const visible = new Set(filteredNodes.map((n) => n.id))

    // Remove nodes hidden by collapsed edges (unless they're pinned)
    collapsedEdges.forEach((hiddenNodes) => {
      hiddenNodes.forEach((nodeId) => {
        if (!pinnedNodes.has(nodeId)) {
          visible.delete(nodeId)
        }
      })
    })

    return visible
  }, [filteredNodes, collapsedEdges, pinnedNodes])

  // Collect visible node IDs so we only fetch edges between them
  const visibleNodeIdsArray = useMemo(
    () => Array.from(visibleNodeIds),
    [visibleNodeIds]
  )

  const { data: edgeData } = useEdges(visibleNodeIdsArray)

  // Handle node click: fetch connections and expand if not already expanded
  const handleNodeClick = useCallback(
    async (nodeId) => {
      const node = allNodes.find((n) => n.id === nodeId)
      selectNode(nodeId, node)

      // Only fetch if not already expanded
      if (!expandedConnections[nodeId]) {
        try {
          const res = await client.get(`/api/nodes/${nodeId}/connections`, {
            params: { limit: 10, offset: 0, sort: 'confidence' },
          })
          expandNode(nodeId, {
            nodes: res.data.nodes || [],
            edges: res.data.edges || [],
            offset: res.data.offset || 10,
            total: res.data.total || 0,
            loading: false,
          })
        } catch (err) {
          console.error('Failed to expand connections:', err)
        }
      }
    },
    [selectNode, expandNode, expandedConnections, allNodes]
  )

  // Handle load more: fetch the next page of connections for a node
  const handleLoadMore = useCallback(
    async (nodeId) => {
      const existing = expandedConnections[nodeId]
      if (!existing) return

      try {
        setNodeLoading(nodeId, true)
        const res = await client.get(`/api/nodes/${nodeId}/connections`, {
          params: {
            limit: 10,
            offset: existing.offset,
            sort: 'confidence',
          },
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

  // Create React Flow nodes with grid layout or saved positions
  // Position nodes in grid: 4 columns, 300px spacing (default)
  // Or use saved positions if user has dragged (isLayoutManual = true)
  // With 10 trending nodes + expanded, creates adaptive canvas area
  const flowNodes = useMemo(() => {
    const cols = 4
    const spacing = 300
    const xOffset = 50
    const yOffset = 50
    const trendingCount = trendingData?.length ?? 10
    let staggerAccum = 0

    return allNodes
      .map((node, index) => {
        // Check if we have a saved position for this node
        const savedPos = nodePositions[node.id]
        const shouldUseSavedPos = isLayoutManual && savedPos

        // Nodes beyond the initial trending batch are newly expanded — stagger them
        const isNewlyExpanded = index >= trendingCount
        if (isNewlyExpanded) staggerAccum += 30

        return {
          id: node.id,
          data: {
            ...node,
            label: node.title,
            isPinned: pinnedNodes.has(node.id),
            hasMoreConnections: (expandedConnections[node.id]?.offset || 0) < (expandedConnections[node.id]?.total || 0),
            loadedCount: expandedConnections[node.id]?.offset || 0,
            totalConnections: expandedConnections[node.id]?.total || 0,
            animationDelay: isNewlyExpanded ? staggerAccum : 0,
            isCollapsing: collapsingNodeIds.has(node.id),
            isLoading: expandedConnections[node.id]?.loading || false,
            onLoadMore: () => handleLoadMore(node.id),
          },
          position: shouldUseSavedPos
            ? savedPos
            : {
                x: (index % cols) * spacing + xOffset,
                y: Math.floor(index / cols) * spacing + yOffset,
              },
          type: 'custom',
          hidden: !visibleNodeIds.has(node.id),
        }
      })
      .filter((n) => n.hidden === false)
  }, [allNodes, visibleNodeIds, nodePositions, isLayoutManual, expandedConnections, pinnedNodes, trendingData, collapsingNodeIds, handleLoadMore])

  // Convert API edges → React Flow edges, keeping only edges where both
  // endpoints are currently visible. Deduplicate by edge id.
  const flowEdges = useMemo(() => {
    if (!edgeData) return []
    const visibleSet = new Set(visibleNodeIds)
    const seen = new Set()

    // Also include edges from expanded connections
    const allEdges = [...(edgeData || [])]
    Object.values(expandedConnections).forEach((conn) => {
      if (conn.edges && Array.isArray(conn.edges)) {
        allEdges.push(...conn.edges)
      }
    })

    return allEdges.reduce((acc, edge) => {
      if (
        seen.has(edge.id) ||
        !visibleSet.has(edge.from_node) ||
        !visibleSet.has(edge.to_node)
      ) return acc
      seen.add(edge.id)
      acc.push({
        id: edge.id,
        source: edge.from_node,
        target: edge.to_node,
        data: {
          type: edge.type || 'CONTEXT',
        },
        type: 'custom',
      })
      return acc
    }, [])
  }, [edgeData, visibleNodeIds, expandedConnections])

  // Wrap handleNodeClick to pass only nodeId to React Flow
  const onNodeClick = useCallback(
    (event, node) => {
      handleNodeClick(node.id)
    },
    [handleNodeClick]
  )

  // Handle node position changes from dragging
  const handleNodesChange = useCallback(
    (changes) => {
      // Filter for position changes only
      const positionChanges = changes.filter((change) => change.type === 'position')

      if (positionChanges.length > 0) {
        // Extract positions from changes
        const newPositions = positionChanges.reduce((acc, change) => {
          if (change.position) {
            acc[change.id] = change.position
          }
          return acc
        }, {})

        // Update store (merges with existing and sets isLayoutManual=true)
        setNodePositions(newPositions)
      }
    },
    [setNodePositions]
  )

  if (trendingError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error loading graph</p>
          <p className="text-gray-600 text-sm">{trendingError?.message || 'Failed to load trending nodes'}</p>
        </div>
      </div>
    )
  }

  if (trendingLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white rounded-lg shadow relative">
      {/* Reset Layout Button */}
      {isLayoutManual && (
        <button
          onClick={() => useGraphLayoutStore.setState({ nodePositions: {}, isLayoutManual: false })}
          className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition-colors"
          title="Reset nodes to grid layout"
        >
          Reset Layout
        </button>
      )}
      <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={handleNodesChange} onNodeClick={onNodeClick} fitView>
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={() => '#0ea5e9'}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  )
}
