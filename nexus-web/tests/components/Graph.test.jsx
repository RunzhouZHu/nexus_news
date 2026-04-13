import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GraphCanvas from '../../src/components/Graph/GraphCanvas'
import CustomNode from '../../src/components/Graph/CustomNode'
import { useGraphStore } from '../../src/store/graphStore'

vi.mock('reactflow', async () => {
  const actual = await vi.importActual('reactflow')
  return {
    ...actual,
    default: ({ children }) => <div data-testid="reactflow">{children}</div>,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom' },
    BaseEdge: ({ path, style }) => <g data-testid="base-edge" data-style={JSON.stringify(style)} d={path} />,
    EdgeLabelRenderer: ({ children }) => <div data-testid="edge-label-renderer">{children}</div>,
    getSmoothStepPath: () => ['M10 10 L100 100', 55, 55],
    getBezierPath: () => ['M10 10 C50 10 50 100 100 100', 55, 55],
  }
})

vi.mock('../../src/api/hooks/useNodes', () => ({
  useNodes: () => ({
    data: null,
    isLoading: true,
    error: null,
    isPending: true,
  }),
}))

vi.mock('../../src/components/Common/TrendingBadge', () => ({
  default: () => null,
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('GraphCanvas', () => {
  it('renders loading state initially', () => {
    const { container } = render(<GraphCanvas />, { wrapper: createWrapper() })
    // LoadingSpinner renders a div with animate-spin
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })
})

describe('CustomNode', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphStore.setState({
      selectedNodeId: null,
      selectedNode: null,
      isDetailOpen: false,
      expandedConnections: {},
      pinnedNodes: new Set(),
      collapsedEdges: new Map(),
    })
  })

  it('renders pin icon visible on hover', async () => {
    const user = userEvent.setup()
    const mockData = {
      id: 'node-1',
      title: 'Test Node',
      summary: 'Test summary',
      tags: ['test'],
      trending_score: 0,
    }

    const { container } = render(<CustomNode data={mockData} selected={false} />)

    // Find the pin icon container (the parent div with opacity-0)
    const pinIconContainer = container.querySelector('div[class*="opacity-0"]')
    expect(pinIconContainer).toBeInTheDocument()

    // Verify it has the hover:opacity-100 class (indicating hover functionality)
    expect(pinIconContainer).toHaveClass('hover:opacity-100')
    expect(pinIconContainer).toHaveClass('transition-opacity')

    // Find the pin button
    const pinButton = container.querySelector('button[title="Pin this node"]')
    expect(pinButton).toBeInTheDocument()
    expect(pinButton).toHaveTextContent('📌')
  })

  it('calls togglePinNode when pin icon is clicked', async () => {
    const user = userEvent.setup()
    const mockData = {
      id: 'node-1',
      title: 'Test Node',
      summary: 'Test summary',
      tags: ['test'],
      trending_score: 0,
    }

    const { container } = render(<CustomNode data={mockData} selected={false} />)

    // Find the pin button
    const pinButton = container.querySelector('button[title="Pin this node"]')
    expect(pinButton).toBeInTheDocument()

    await user.click(pinButton)

    // Verify the pin was toggled in the store
    const state = useGraphStore.getState()
    expect(state.pinnedNodes.has('node-1')).toBe(true)
  })

  it('renders load more button when hasMoreConnections is true', () => {
    const mockData = {
      id: 'node-1',
      title: 'Test Node',
      summary: 'Test summary',
      tags: ['test'],
      trending_score: 0,
      hasMoreConnections: true,
      loadedCount: 5,
      totalConnections: 15,
      onLoadMore: vi.fn(),
    }

    const { container } = render(<CustomNode data={mockData} selected={false} />)

    // Find all buttons and look for the load more one
    const buttons = Array.from(container.querySelectorAll('button'))
    const loadMoreButton = buttons.find((btn) => btn.textContent.includes('Load more'))

    expect(loadMoreButton).toBeInTheDocument()
  })

  it('displays correct count in load more button', () => {
    const mockData = {
      id: 'node-1',
      title: 'Test Node',
      summary: 'Test summary',
      tags: ['test'],
      trending_score: 0,
      hasMoreConnections: true,
      loadedCount: 5,
      totalConnections: 15,
      onLoadMore: vi.fn(),
    }

    const { container } = render(<CustomNode data={mockData} selected={false} />)

    // Find button with text containing "Load more"
    const buttons = Array.from(container.querySelectorAll('button'))
    const loadMoreButton = buttons.find((btn) => btn.textContent.includes('Load more'))

    expect(loadMoreButton).toHaveTextContent('Load more (showing 5 of 15)')
  })

  it('does not render load more button when hasMoreConnections is false', () => {
    const mockData = {
      id: 'node-1',
      title: 'Test Node',
      summary: 'Test summary',
      tags: ['test'],
      trending_score: 0,
      hasMoreConnections: false,
      loadedCount: 5,
      totalConnections: 5,
      onLoadMore: vi.fn(),
    }

    const { container } = render(<CustomNode data={mockData} selected={false} />)

    // Find all buttons
    const buttons = Array.from(container.querySelectorAll('button'))
    const loadMoreButton = buttons.find((btn) => btn.textContent.includes('Load more'))

    // Should not find a load more button
    expect(loadMoreButton).toBeUndefined()
  })

  it('calls onLoadMore when load more button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnLoadMore = vi.fn()

    const mockData = {
      id: 'node-1',
      title: 'Test Node',
      summary: 'Test summary',
      tags: ['test'],
      trending_score: 0,
      hasMoreConnections: true,
      loadedCount: 5,
      totalConnections: 15,
      onLoadMore: mockOnLoadMore,
    }

    const { container } = render(<CustomNode data={mockData} selected={false} />)

    // Find and click load more button
    const buttons = Array.from(container.querySelectorAll('button'))
    const loadMoreButton = buttons.find((btn) => btn.textContent.includes('Load more'))

    await user.click(loadMoreButton)

    expect(mockOnLoadMore).toHaveBeenCalled()
  })

  it('disables load more button when isLoading is true', () => {
    const mockData = {
      id: 'node-1',
      title: 'Test Node',
      summary: 'Test summary',
      tags: ['test'],
      trending_score: 0,
      hasMoreConnections: true,
      loadedCount: 5,
      totalConnections: 15,
      isLoading: true,
      onLoadMore: vi.fn(),
    }

    const { container } = render(<CustomNode data={mockData} selected={false} />)

    // Find load more button
    const buttons = Array.from(container.querySelectorAll('button'))
    const loadMoreButton = buttons.find((btn) => btn.textContent.includes('Loading'))

    expect(loadMoreButton).toBeDisabled()
    expect(loadMoreButton).toHaveTextContent('Loading...')
  })
})

describe('CustomEdge', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphStore.setState({
      selectedNodeId: null,
      selectedNode: null,
      isDetailOpen: false,
      expandedConnections: {},
      pinnedNodes: new Set(),
      collapsedEdges: new Map(),
    })
  })

  it('renders edge with correct color for CAUSED_BY type', async () => {
    const CustomEdge = (await import('../../src/components/Graph/CustomEdge')).default
    const mockEdge = {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      data: { type: 'CAUSED_BY' },
    }

    const mockProps = {
      sourceX: 0,
      sourceY: 0,
      sourcePosition: 'bottom',
      targetX: 100,
      targetY: 100,
      targetPosition: 'top',
    }

    const { container } = render(
      <CustomEdge id="edge-1" edge={mockEdge} {...mockProps} />
    )

    // BaseEdge should render with red color for CAUSED_BY
    const baseEdge = container.querySelector('[data-testid="base-edge"]')
    expect(baseEdge).toBeInTheDocument()

    const styleAttr = baseEdge.getAttribute('data-style')
    const style = JSON.parse(styleAttr)
    expect(style.stroke).toBe('#ef4444')
  })

  it('renders edge with correct color for LED_TO type', async () => {
    const CustomEdge = (await import('../../src/components/Graph/CustomEdge')).default
    const mockEdge = {
      id: 'edge-2',
      source: 'node-1',
      target: 'node-2',
      data: { type: 'LED_TO' },
    }

    const mockProps = {
      sourceX: 0,
      sourceY: 0,
      sourcePosition: 'bottom',
      targetX: 100,
      targetY: 100,
      targetPosition: 'top',
    }

    const { container } = render(
      <CustomEdge id="edge-2" edge={mockEdge} {...mockProps} />
    )

    const baseEdge = container.querySelector('[data-testid="base-edge"]')
    const styleAttr = baseEdge.getAttribute('data-style')
    const style = JSON.parse(styleAttr)
    expect(style.stroke).toBe('#22c55e')
  })

  it('renders collapse icon that is visible on edge', async () => {
    const CustomEdge = (await import('../../src/components/Graph/CustomEdge')).default
    const mockEdge = {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      data: { type: 'CAUSED_BY' },
    }

    const mockProps = {
      sourceX: 0,
      sourceY: 0,
      sourcePosition: 'bottom',
      targetX: 100,
      targetY: 100,
      targetPosition: 'top',
    }

    const { container } = render(
      <CustomEdge id="edge-1" edge={mockEdge} {...mockProps} />
    )

    // Find the collapse button
    const buttons = Array.from(container.querySelectorAll('button'))
    const collapseButton = buttons.find((btn) => btn.textContent.includes('⊖'))

    expect(collapseButton).toBeInTheDocument()
    expect(collapseButton).toHaveTextContent('⊖')
  })

  it('toggles collapse icon when button is clicked', async () => {
    const CustomEdge = (await import('../../src/components/Graph/CustomEdge')).default
    const user = userEvent.setup()
    const mockEdge = {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      data: { type: 'CAUSED_BY' },
    }

    const mockProps = {
      sourceX: 0,
      sourceY: 0,
      sourcePosition: 'bottom',
      targetX: 100,
      targetY: 100,
      targetPosition: 'top',
    }

    const { container, rerender } = render(
      <CustomEdge id="edge-1" edge={mockEdge} {...mockProps} />
    )

    // Find and click the collapse button
    let buttons = Array.from(container.querySelectorAll('button'))
    let collapseButton = buttons.find((btn) => btn.textContent.includes('⊖'))
    expect(collapseButton).toHaveTextContent('⊖')

    await user.click(collapseButton)

    // Verify the edge is collapsed in store
    const state = useGraphStore.getState()
    expect(state.collapsedEdges.has('edge-1')).toBe(true)

    // Re-render to see the icon change
    rerender(<CustomEdge id="edge-1" edge={mockEdge} {...mockProps} />)

    buttons = Array.from(container.querySelectorAll('button'))
    collapseButton = buttons.find((btn) => btn.textContent.includes('⊕') || btn.textContent.includes('⊖'))
    // After collapse, icon should change to expand
    expect(collapseButton.textContent).toContain('⊕')
  })

  it('renders edge with reduced opacity when collapsed', async () => {
    const CustomEdge = (await import('../../src/components/Graph/CustomEdge')).default
    const mockEdge = {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      data: { type: 'CAUSED_BY' },
    }

    const mockProps = {
      sourceX: 0,
      sourceY: 0,
      sourcePosition: 'bottom',
      targetX: 100,
      targetY: 100,
      targetPosition: 'top',
    }

    // Set edge as collapsed in store
    useGraphStore.setState({
      collapsedEdges: new Map([['edge-1', new Set(['node-2'])]]),
    })

    const { container } = render(
      <CustomEdge id="edge-1" edge={mockEdge} {...mockProps} />
    )

    const baseEdge = container.querySelector('[data-testid="base-edge"]')
    const styleAttr = baseEdge.getAttribute('data-style')
    const style = JSON.parse(styleAttr)
    expect(style.opacity).toBe(0.3)
  })

  it('renders CONTEXT edge with dashed strokeDasharray', async () => {
    const CustomEdge = (await import('../../src/components/Graph/CustomEdge')).default
    const mockEdge = {
      id: 'edge-3',
      source: 'node-1',
      target: 'node-2',
      data: { type: 'CONTEXT' },
    }

    const mockProps = {
      sourceX: 0,
      sourceY: 0,
      sourcePosition: 'bottom',
      targetX: 100,
      targetY: 100,
      targetPosition: 'top',
    }

    const { container } = render(
      <CustomEdge id="edge-3" edge={mockEdge} {...mockProps} />
    )

    const baseEdge = container.querySelector('[data-testid="base-edge"]')
    const styleAttr = baseEdge.getAttribute('data-style')
    const style = JSON.parse(styleAttr)
    expect(style.stroke).toBe('#94a3b8')
    expect(style.strokeDasharray).toBe('5,5')
  })
})

describe('GraphCanvas - Progressive Loading', () => {
  beforeEach(() => {
    // Reset all stores before each test
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

  it('builds allNodes from trending + expanded connections', () => {
    // Initial state: trending nodes
    const trendingData = [
      { id: 'trend-1', title: 'Trending Node 1' },
      { id: 'trend-2', title: 'Trending Node 2' },
    ]

    // Simulate expanding a node
    const state = useGraphStore.getState()
    state.expandNode('trend-1', {
      nodes: [
        { id: 'conn-1', title: 'Connection 1' },
        { id: 'conn-2', title: 'Connection 2' },
      ],
      edges: [],
      offset: 2,
      total: 2,
      loading: false,
    })

    // Verify expanded connections are stored
    const newState = useGraphStore.getState()
    expect(newState.expandedConnections['trend-1']).toBeDefined()
    expect(newState.expandedConnections['trend-1'].nodes).toHaveLength(2)

    // Simulate allNodes building logic
    const nodeMap = new Map()
    trendingData.forEach((node) => nodeMap.set(node.id, node))
    Object.values(newState.expandedConnections).forEach((conn) => {
      if (conn.nodes) {
        conn.nodes.forEach((node) => {
          if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, node)
          }
        })
      }
    })
    const allNodes = Array.from(nodeMap.values())

    expect(allNodes).toHaveLength(4)
    expect(allNodes.map((n) => n.id)).toEqual(['trend-1', 'trend-2', 'conn-1', 'conn-2'])
  })

  it('calculates visibleNodeIds excluding collapsed nodes (unless pinned)', () => {
    const state = useGraphStore.getState()

    // Setup: 4 nodes total
    const filteredNodes = [
      { id: 'trend-1', title: 'Trending 1' },
      { id: 'trend-2', title: 'Trending 2' },
      { id: 'conn-1', title: 'Connection 1' },
      { id: 'conn-2', title: 'Connection 2' },
    ]

    // Pin conn-1
    state.togglePinNode('conn-1')

    // Collapse edge that hides conn-2
    state.toggleCollapseEdge('edge-1', new Set(['conn-2']))

    const newState = useGraphStore.getState()

    // Simulate visibleNodeIds calculation
    const visible = new Set(filteredNodes.map((n) => n.id))
    newState.collapsedEdges.forEach((hiddenNodes) => {
      hiddenNodes.forEach((nodeId) => {
        if (!newState.pinnedNodes.has(nodeId)) {
          visible.delete(nodeId)
        }
      })
    })

    // Verify: conn-1 is visible (pinned), conn-2 is hidden (collapsed and not pinned)
    expect(visible.has('trend-1')).toBe(true)
    expect(visible.has('trend-2')).toBe(true)
    expect(visible.has('conn-1')).toBe(true) // pinned
    expect(visible.has('conn-2')).toBe(false) // collapsed and not pinned
  })

  it('expands connections on node click and stores them', () => {
    const state = useGraphStore.getState()
    const mockNode = { id: 'trend-1', title: 'Node to Expand' }

    // Simulate clicking a node
    state.selectNode('trend-1', mockNode)

    // Simulate API response with connections
    const connections = {
      nodes: [
        { id: 'conn-1', title: 'Connection 1' },
        { id: 'conn-2', title: 'Connection 2' },
      ],
      edges: [
        { id: 'edge-1', from_node: 'trend-1', to_node: 'conn-1' },
        { id: 'edge-2', from_node: 'trend-1', to_node: 'conn-2' },
      ],
      offset: 2,
      total: 2,
    }

    state.expandNode('trend-1', connections)

    const newState = useGraphStore.getState()
    expect(newState.selectedNodeId).toBe('trend-1')
    expect(newState.expandedConnections['trend-1']).toBeDefined()
    expect(newState.expandedConnections['trend-1'].nodes).toHaveLength(2)
    expect(newState.expandedConnections['trend-1'].edges).toHaveLength(2)
  })
})
