import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../../src/App'

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
vi.mock('@sigma/edge-curve', () => ({ default: vi.fn() }))

vi.mock('../../src/api/hooks/useTrendingNodes', () => ({
  useTrendingNodes: () => ({ data: null, isLoading: true, error: null }),
}))
vi.mock('../../src/api/hooks/useEdges', () => ({
  useEdges: () => ({ data: null }),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('Routing', () => {
  it('renders App with Header', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )
    expect(screen.getByText('Nexus')).toBeDefined()
  })

  it('shows Header on all routes', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )
    expect(screen.getByText('Nexus')).toBeDefined()
  })
})
