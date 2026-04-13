import { describe, it, expect } from 'vitest'
import { findDownstreamNodes } from '../../src/utils/collapseUtils'

describe('collapseUtils', () => {
  it('finds all downstream nodes from a given node', () => {
    const nodes = [
      { id: 'A' },
      { id: 'B' },
      { id: 'C' },
      { id: 'D' },
      { id: 'E' },
    ]

    const edges = [
      { id: 'edge-1', from_node: 'B', to_node: 'C' },
      { id: 'edge-2', from_node: 'B', to_node: 'D' },
      { id: 'edge-3', from_node: 'C', to_node: 'E' },
      { id: 'edge-4', from_node: 'A', to_node: 'B' },
    ]

    // Starting from B, collapse A→B: find nodes downstream of B
    const downstream = findDownstreamNodes('B', edges)

    expect(downstream).toContain('C')
    expect(downstream).toContain('D')
    expect(downstream).toContain('E')
    expect(downstream).not.toContain('A')
    expect(downstream).not.toContain('B')
  })

  it('excludes pinned nodes from downstream set', () => {
    const edges = [
      { id: 'edge-1', from_node: 'B', to_node: 'C' },
      { id: 'edge-2', from_node: 'C', to_node: 'D' },
    ]

    const pinned = new Set(['C'])
    const downstream = findDownstreamNodes('B', edges, pinned)

    expect(downstream).not.toContain('C')
    expect(downstream).toContain('D')  // D is still downstream even though C is pinned
  })
})
