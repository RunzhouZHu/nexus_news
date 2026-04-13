import { describe, it, expect, afterEach } from 'vitest'
import { useGraphStore } from '../../src/store/graphStore'

// Cleanup after each test to prevent cross-contamination
afterEach(() => {
  const state = useGraphStore.getState()
  useGraphStore.setState({
    selectedNodeId: null,
    selectedNode: null,
    isDetailOpen: false,
    expandedConnections: {},
    pinnedNodes: new Set(),
    collapsedEdges: new Map(),
  })
})

describe('graphStore - Node Expansion', () => {
  it('expands a node with connections', () => {
    const store = useGraphStore.getState()
    const nodeId = 'node-123'
    const connections = {
      nodes: [{ id: 'node-456', title: 'Event B' }],
      edges: [{ id: 'edge-1', from_node: nodeId, to_node: 'node-456', type: 'CAUSED_BY', confidence: 0.92 }],
      offset: 10,
      total: 45,
      loading: false,
    }

    store.expandNode(nodeId, connections)

    expect(useGraphStore.getState().expandedConnections[nodeId]).toEqual(connections)
  })
})

describe('graphStore - Node Pinning', () => {
  it('toggles pin state on a node', () => {
    const store = useGraphStore.getState()
    const nodeId = 'node-123'

    expect(useGraphStore.getState().pinnedNodes.has(nodeId)).toBe(false)
    store.togglePinNode(nodeId)
    expect(useGraphStore.getState().pinnedNodes.has(nodeId)).toBe(true)
    store.togglePinNode(nodeId)
    expect(useGraphStore.getState().pinnedNodes.has(nodeId)).toBe(false)
  })
})

describe('graphStore - Edge Collapse', () => {
  it('toggles collapse state on an edge with hidden nodes', () => {
    const store = useGraphStore.getState()
    const edgeId = 'edge-1'
    const hiddenNodeIds = new Set(['node-456', 'node-789'])

    expect(useGraphStore.getState().collapsedEdges.has(edgeId)).toBe(false)
    store.toggleCollapseEdge(edgeId, hiddenNodeIds)
    expect(useGraphStore.getState().collapsedEdges.get(edgeId)).toEqual(hiddenNodeIds)
    store.toggleCollapseEdge(edgeId, hiddenNodeIds)
    expect(useGraphStore.getState().collapsedEdges.has(edgeId)).toBe(false)
  })
})

describe('graphStore - Load More', () => {
  it('appends new nodes/edges and advances offset', () => {
    const store = useGraphStore.getState()
    const nodeId = 'node-123'

    store.expandNode(nodeId, {
      nodes: [{ id: 'node-456' }],
      edges: [],
      offset: 10,
      total: 45,
      loading: false,
    })

    store.loadMoreConnections(nodeId, {
      nodes: [{ id: 'node-789' }],
      edges: [],
    })

    const expanded = useGraphStore.getState().expandedConnections[nodeId]
    expect(expanded.nodes.length).toBe(2)
    expect(expanded.offset).toBe(11)
    expect(expanded.loading).toBe(false)
  })
})
