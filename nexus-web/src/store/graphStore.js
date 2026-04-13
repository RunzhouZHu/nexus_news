import { create } from 'zustand'

export const useGraphStore = create((set) => ({
  selectedNodeId: null,
  selectedNode: null,
  isDetailOpen: false,

  selectNode: (nodeId, nodeData) => set({
    selectedNodeId: nodeId,
    selectedNode: nodeData,
    isDetailOpen: true,
  }),
  closeDetail: () => set({
    selectedNodeId: null,
    selectedNode: null,
    isDetailOpen: false,
  }),

  // NEW: Track expanded connections for each node
  expandedConnections: {},  // { nodeId: { nodes, edges, offset, total, loading } }

  // NEW: Pinned nodes (won't be hidden on collapse)
  pinnedNodes: new Set(),

  // NEW: Collapsed edges and their hidden nodes
  collapsedEdges: new Map(),  // edgeId → Set of hidden node IDs

  // NEW: Expand a node with its connections
  expandNode: (nodeId, connections) => set((state) => ({
    expandedConnections: {
      ...state.expandedConnections,
      [nodeId]: connections,
    },
  })),

  // NEW: Toggle pin state on a node
  togglePinNode: (nodeId) => set((state) => {
    const newPinned = new Set(state.pinnedNodes)
    if (newPinned.has(nodeId)) {
      newPinned.delete(nodeId)
    } else {
      newPinned.add(nodeId)
    }
    return { pinnedNodes: newPinned }
  }),

  // NEW: Toggle collapse state on an edge
  toggleCollapseEdge: (edgeId, hiddenNodeIds) => set((state) => {
    const newCollapsed = new Map(state.collapsedEdges)
    if (newCollapsed.has(edgeId)) {
      newCollapsed.delete(edgeId)
    } else {
      newCollapsed.set(edgeId, hiddenNodeIds)
    }
    return { collapsedEdges: newCollapsed }
  }),

  // NEW: Load more connections for a node
  loadMoreConnections: (nodeId, newBatch) => set((state) => {
    const existing = state.expandedConnections[nodeId]
    if (!existing) return {}

    return {
      expandedConnections: {
        ...state.expandedConnections,
        [nodeId]: {
          ...existing,
          nodes: [...existing.nodes, ...newBatch.nodes],
          edges: [...existing.edges, ...newBatch.edges],
          offset: existing.offset + newBatch.nodes.length,
          loading: false,
        },
      },
    }
  }),

  // NEW: Set loading state for a node
  setNodeLoading: (nodeId, loading) => set((state) => {
    const existing = state.expandedConnections[nodeId]
    if (!existing) return {}

    return {
      expandedConnections: {
        ...state.expandedConnections,
        [nodeId]: {
          ...existing,
          loading,
        },
      },
    }
  }),
}))
