import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NodeHalo from '../../src/components/Graph/NodeHalo'

function makeMockSigma(viewportX = 200, viewportY = 150) {
  return {
    graphToViewport: vi.fn(() => ({ x: viewportX, y: viewportY })),
    on: vi.fn(),
    off: vi.fn(),
  }
}

function makeMockGraph(attrs = { x: 0, y: 0, size: 12 }) {
  return {
    getNodeAttributes: vi.fn(() => attrs),
  }
}

describe('NodeHalo', () => {
  it('renders nothing when nodeId is null', () => {
    const { container } = render(
      <NodeHalo
        nodeId={null}
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when sigma is null', () => {
    const { container } = render(
      <NodeHalo
        nodeId="n1"
        sigma={null}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the pin button when nodeId is set', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.getByTitle('Pin')).toBeInTheDocument()
  })

  it('shows Unpin title when node is pinned', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={true}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.getByTitle('Unpin')).toBeInTheDocument()
  })

  it('does not render Load More button when hasMore is false', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.queryByTitle('Load more')).toBeNull()
  })

  it('renders Load More button when hasMore is true', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={true}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(screen.getByTitle('Load more')).toBeInTheDocument()
  })

  it('disables Load More button and shows loading title when isLoading is true', () => {
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={true}
        isLoading={true}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    const btn = screen.getByTitle('Loading...')
    expect(btn).toBeDisabled()
  })

  it('calls onPin when pin button is clicked', () => {
    const onPin = vi.fn()
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={onPin}
        onLoadMore={vi.fn()}
      />
    )
    fireEvent.click(screen.getByTitle('Pin'))
    expect(onPin).toHaveBeenCalledOnce()
  })

  it('calls onLoadMore when Load More button is clicked', () => {
    const onLoadMore = vi.fn()
    render(
      <NodeHalo
        nodeId="n1"
        sigma={makeMockSigma()}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={true}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={onLoadMore}
      />
    )
    fireEvent.click(screen.getByTitle('Load more'))
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('registers and cleans up sigma afterRender listener', () => {
    const sigma = makeMockSigma()
    const { unmount } = render(
      <NodeHalo
        nodeId="n1"
        sigma={sigma}
        graph={makeMockGraph()}
        isPinned={false}
        hasMore={false}
        isLoading={false}
        onPin={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(sigma.on).toHaveBeenCalledWith('afterRender', expect.any(Function))
    unmount()
    expect(sigma.off).toHaveBeenCalledWith('afterRender', expect.any(Function))
  })
})
