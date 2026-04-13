import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GraphCanvas from '../../src/components/Graph/GraphCanvas'
import { useGraphStore } from '../../src/store/graphStore'

vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow')
  return {
    ...actual,
    default: ({ children, onNodeClick, nodes }) => (
      <div data-testid="reactflow">
        {nodes?.map((node) => (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            className="cursor-pointer rounded-lg"
            onClick={() => onNodeClick?.({}, node)}
          >
            {node.data?.title}
          </div>
        ))}
        {children}
      </div>
    ),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom' },
    BaseEdge: () => null,
    EdgeLabelRenderer: ({ children }) => <div>{children}</div>,
    getSmoothStepPath: () => ['M0 0', 0, 0],
    getBezierPath: () => ['M0 0 C0 0 0 0 0 0', 0, 0],
  }
})

vi.mock('../../src/components/Graph/CustomNode', () => ({
  default: ({ data }) => (
    <div data-testid="custom-node" className="cursor-pointer rounded-lg">
      {data?.title}
    </div>
  ),
}))

vi.mock('../../src/components/Graph/CustomEdge', () => ({
  default: () => null,
}))

vi.mock('../../src/api/hooks/useEdges', () => ({
  useEdges: () => ({ data: [], isLoading: false }),
}))

vi.mock('../../src/components/Common/TrendingBadge', () => ({
  default: () => null,
}))

const TRENDING_NODES = [
  { id: 'trend-1', title: 'Trending Node 1', summary: 'Summary 1', trending_score: 0.9 },
  { id: 'trend-2', title: 'Trending Node 2', summary: 'Summary 2', trending_score: 0.7 },
]

vi.mock('../../src/api/hooks/useTrendingNodes', () => ({
  useTrendingNodes: () => ({
    data: TRENDING_NODES,
    isLoading: false,
    error: null,
  }),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Graph Exploration Flow', () => {
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

  it('starts with trending nodes only', async () => {
    const { container } = render(<GraphCanvas />, { wrapper: createWrapper() })

    await waitFor(() => {
      const nodes = container.querySelectorAll('[data-testid^="node-"]')
      expect(nodes.length).toBe(2)
    })
  })

  it('selects a node on click and stores it in graphStore', async () => {
    const { container } = render(<GraphCanvas />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(container.querySelector('[data-testid="node-trend-1"]')).not.toBeNull()
    })

    fireEvent.click(container.querySelector('[data-testid="node-trend-1"]'))

    await waitFor(() => {
      const store = useGraphStore.getState()
      expect(store.selectedNodeId).toBe('trend-1')
    })
  })

  it('pins a node and preserves it across collapse', () => {
    const store = useGraphStore.getState()
    const nodeId = 'trend-1'

    store.togglePinNode(nodeId)
    expect(useGraphStore.getState().pinnedNodes.has(nodeId)).toBe(true)

    // Collapse an edge hiding a different node
    store.toggleCollapseEdge('edge-1', new Set(['trend-2']))

    // Pinned node is unaffected
    expect(useGraphStore.getState().pinnedNodes.has(nodeId)).toBe(true)
    expect(useGraphStore.getState().collapsedEdges.has('edge-1')).toBe(true)
  })

  it('hides collapsed nodes from visible set (unless pinned)', () => {
    const store = useGraphStore.getState()

    store.togglePinNode('trend-1')
    store.toggleCollapseEdge('edge-1', new Set(['trend-1', 'trend-2']))

    const state = useGraphStore.getState()
    const allNodeIds = ['trend-1', 'trend-2']
    const visible = new Set(allNodeIds)

    state.collapsedEdges.forEach((hiddenNodes) => {
      hiddenNodes.forEach((id) => {
        if (!state.pinnedNodes.has(id)) visible.delete(id)
      })
    })

    expect(visible.has('trend-1')).toBe(true)  // pinned — stays visible
    expect(visible.has('trend-2')).toBe(false) // collapsed and not pinned
  })

  it('expands connections into allNodes when expandNode is called', () => {
    const store = useGraphStore.getState()

    store.expandNode('trend-1', {
      nodes: [
        { id: 'conn-1', title: 'Connection 1' },
        { id: 'conn-2', title: 'Connection 2' },
      ],
      edges: [
        { id: 'edge-a', from_node: 'trend-1', to_node: 'conn-1' },
      ],
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
})
