import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGraphStore } from '../../src/store/graphStore'

// Sigma.js requires WebGL — not available in jsdom.
vi.mock('sigma', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(), off: vi.fn(), kill: vi.fn(), refresh: vi.fn(),
    getCamera: vi.fn(() => ({ enable: vi.fn(), disable: vi.fn() })),
    getMouseCaptor: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
    graphToViewport: vi.fn(() => ({ x: 0, y: 0 })),
    viewportToGraph: vi.fn(() => ({ x: 0, y: 0 })),
  })),
}))
vi.mock('graphology-layout-forceatlas2/worker', () => ({
  default: vi.fn().mockImplementation(() => ({ start: vi.fn(), stop: vi.fn() })),
}))
vi.mock('graphology-layout-forceatlas2', () => ({
  default: { inferSettings: vi.fn(() => ({})) },
}))
vi.mock('@sigma/edge-curve', () => ({ EdgeCurvedProgram: vi.fn() }))

describe('Graph Exploration Flow — store logic', () => {
  beforeEach(() => {
    useGraphStore.setState({
      selectedNodeId: null,
      selectedNode: null,
      isDetailOpen: false,
      expandedConnections: {},
      pinnedNodes: new Set(),
      collapsedEdges: new Map(),
    })
    vi.clearAllMocks()
  })

  it('selectNode stores the selected node id and opens detail', () => {
    const store = useGraphStore.getState()
    store.selectNode('trend-1', { id: 'trend-1', title: 'Trending Node 1' })
    const state = useGraphStore.getState()
    expect(state.selectedNodeId).toBe('trend-1')
    expect(state.isDetailOpen).toBe(true)
  })

  it('pins a node and preserves it across collapse', () => {
    const store = useGraphStore.getState()

    store.togglePinNode('trend-1')
    expect(useGraphStore.getState().pinnedNodes.has('trend-1')).toBe(true)

    store.toggleCollapseEdge('edge-1', new Set(['trend-2']))
    expect(useGraphStore.getState().pinnedNodes.has('trend-1')).toBe(true)
    expect(useGraphStore.getState().collapsedEdges.has('edge-1')).toBe(true)
  })

  it('hides collapsed nodes from visible set (unless pinned)', () => {
    const store = useGraphStore.getState()

    store.togglePinNode('trend-1')
    store.toggleCollapseEdge('edge-1', new Set(['trend-1', 'trend-2']))

    const state = useGraphStore.getState()
    const visible = new Set(['trend-1', 'trend-2'])
    state.collapsedEdges.forEach((hiddenNodes) => {
      hiddenNodes.forEach((id) => {
        if (!state.pinnedNodes.has(id)) visible.delete(id)
      })
    })

    expect(visible.has('trend-1')).toBe(true)   // pinned — stays visible
    expect(visible.has('trend-2')).toBe(false)  // collapsed and not pinned
  })

  it('expands connections into expandedConnections when expandNode is called', () => {
    const store = useGraphStore.getState()

    store.expandNode('trend-1', {
      nodes: [
        { id: 'conn-1', title: 'Connection 1' },
        { id: 'conn-2', title: 'Connection 2' },
      ],
      edges: [{ id: 'edge-a', from_node: 'trend-1', to_node: 'conn-1' }],
      offset: 2,
      total: 2,
      loading: false,
    })

    const state = useGraphStore.getState()
    expect(state.expandedConnections['trend-1']).toBeDefined()
    expect(state.expandedConnections['trend-1'].nodes).toHaveLength(2)
    expect(state.expandedConnections['trend-1'].edges).toHaveLength(1)
  })

  it('loads more connections and merges into existing', () => {
    const store = useGraphStore.getState()

    store.expandNode('trend-1', {
      nodes: [{ id: 'conn-1', title: 'Connection 1' }],
      edges: [],
      offset: 10,
      total: 25,
      loading: false,
    })

    store.loadMoreConnections('trend-1', {
      nodes: [{ id: 'conn-2', title: 'Connection 2' }],
      edges: [],
    })

    const state = useGraphStore.getState()
    expect(state.expandedConnections['trend-1'].nodes).toHaveLength(2)
    expect(state.expandedConnections['trend-1'].offset).toBe(11)
  })

  it('closeDetail clears selection and closes panel', () => {
    const store = useGraphStore.getState()
    store.selectNode('trend-1', { id: 'trend-1', title: 'Node' })
    store.closeDetail()
    const state = useGraphStore.getState()
    expect(state.selectedNodeId).toBeNull()
    expect(state.isDetailOpen).toBe(false)
  })
})
