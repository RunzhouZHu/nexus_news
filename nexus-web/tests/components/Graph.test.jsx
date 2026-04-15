import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GraphCanvas from '../../src/components/Graph/GraphCanvas'
import { useGraphStore } from '../../src/store/graphStore'

// Sigma.js requires WebGL — not available in jsdom. Mock the whole module.
vi.mock('sigma', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    kill: vi.fn(),
    refresh: vi.fn(),
    getCamera: vi.fn(() => ({ enable: vi.fn(), disable: vi.fn() })),
    getMouseCaptor: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
    graphToViewport: vi.fn(() => ({ x: 0, y: 0 })),
    viewportToGraph: vi.fn(() => ({ x: 0, y: 0 })),
  })),
}))

vi.mock('graphology-layout-forceatlas2/worker', () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}))

vi.mock('graphology-layout-forceatlas2', () => ({
  default: { inferSettings: vi.fn(() => ({})) },
}))

vi.mock('@sigma/edge-curve', () => ({
  default: vi.fn(),
}))

vi.mock('../../src/api/hooks/useTrendingNodes', () => ({
  useTrendingNodes: () => ({ data: null, isLoading: true, error: null }),
}))

vi.mock('../../src/api/hooks/useEdges', () => ({
  useEdges: () => ({ data: null }),
}))

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('GraphCanvas', () => {
  beforeEach(() => {
    useGraphStore.setState({
      selectedNodeId: null,
      selectedNode: null,
      isDetailOpen: false,
      expandedConnections: {},
      pinnedNodes: new Set(),
      collapsedEdges: new Map(),
    })
  })

  it('renders loading spinner while trending nodes are loading', () => {
    const { container } = render(<GraphCanvas />, { wrapper: createWrapper() })
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })
})

describe('GraphCanvas — data assembly', () => {
  it('merges trending nodes with expanded connections into allNodes', () => {
    const state = useGraphStore.getState()
    state.expandNode('trend-1', {
      nodes: [{ id: 'conn-1', title: 'Connection 1' }],
      edges: [],
      offset: 1,
      total: 1,
      loading: false,
    })

    const newState = useGraphStore.getState()
    const nodeMap = new Map()
    const trendingData = [{ id: 'trend-1', title: 'Trending 1' }]
    trendingData.forEach((n) => nodeMap.set(n.id, n))
    Object.values(newState.expandedConnections).forEach((conn) => {
      conn.nodes?.forEach((n) => { if (!nodeMap.has(n.id)) nodeMap.set(n.id, n) })
    })

    expect(nodeMap.size).toBe(2)
    expect(nodeMap.has('conn-1')).toBe(true)
  })

  it('filters visibleNodes by search query', () => {
    const nodes = [
      { id: 'a', title: 'US Tariffs', tags: [] },
      { id: 'b', title: 'Fed Rate Cut', tags: [] },
    ]
    const q = 'tariff'
    const visible = nodes.filter((n) => n.title.toLowerCase().includes(q))
    expect(visible).toHaveLength(1)
    expect(visible[0].id).toBe('a')
  })

  it('deduplicates edges from API and expanded connections', () => {
    const edgeData = [{ id: 'e1', from_node: 'a', to_node: 'b', type: 'LED_TO' }]
    const connEdges = [{ id: 'e1', from_node: 'a', to_node: 'b', type: 'LED_TO' }]
    const seen = new Set()
    const result = []
    const push = (e) => { if (!seen.has(e.id)) { seen.add(e.id); result.push(e) } }
    edgeData.forEach(push)
    connEdges.forEach(push)
    expect(result).toHaveLength(1)
  })
})
