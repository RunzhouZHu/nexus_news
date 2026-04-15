import { describe, it, expect } from 'vitest'
import Graph from 'graphology'
import { computeSemanticPositions, translatePositions } from '../../src/components/Graph/layoutUtils'

function makeGraph() {
  return new Graph({ type: 'directed' })
}

describe('computeSemanticPositions', () => {
  it('places the selected node at the origin', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 5, y: 5 })
    const result = computeSemanticPositions('center', graph)
    expect(result['center']).toEqual({ x: 0, y: 0 })
  })

  it('places a CAUSED_BY neighbor on the left (x < 0)', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('cause', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'cause', 'center', { edgeType: 'CAUSED_BY' })
    const result = computeSemanticPositions('center', graph)
    expect(result['cause'].x).toBeLessThan(0)
  })

  it('places a LED_TO neighbor on the right (x > 0)', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('effect', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'center', 'effect', { edgeType: 'LED_TO' })
    const result = computeSemanticPositions('center', graph)
    expect(result['effect'].x).toBeGreaterThan(0)
  })

  it('places CONTEXT neighbor in the surrounding arc (not on left/right axis)', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('ctx', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'center', 'ctx', { edgeType: 'CONTEXT' })
    const result = computeSemanticPositions('center', graph)
    expect(Math.abs(result['ctx'].x)).toBeLessThan(5)
  })

  it('places RELATED_TO neighbor in the surrounding arc', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('rel', { x: 1, y: 1 })
    graph.addDirectedEdgeWithKey('e1', 'center', 'rel', { edgeType: 'RELATED_TO' })
    const result = computeSemanticPositions('center', graph)
    expect(Math.abs(result['rel'].x)).toBeLessThan(5)
  })

  it('distributes multiple causes vertically on the left', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('c1', { x: 0, y: 0 })
    graph.addNode('c2', { x: 0, y: 0 })
    graph.addDirectedEdgeWithKey('e1', 'c1', 'center', { edgeType: 'CAUSED_BY' })
    graph.addDirectedEdgeWithKey('e2', 'c2', 'center', { edgeType: 'CAUSED_BY' })
    const result = computeSemanticPositions('center', graph)
    expect(result['c1'].x).toBe(result['c2'].x)
    expect(result['c1'].y).not.toBe(result['c2'].y)
  })

  it('deduplicates neighbors that have multiple edges', () => {
    const graph = makeGraph()
    graph.addNode('center', { x: 0, y: 0 })
    graph.addNode('dup', { x: 0, y: 0 })
    graph.addDirectedEdgeWithKey('e1', 'dup', 'center', { edgeType: 'CAUSED_BY' })
    graph.addDirectedEdgeWithKey('e2', 'center', 'dup', { edgeType: 'CONTEXT' })
    const result = computeSemanticPositions('center', graph)
    const dupEntries = Object.entries(result).filter(([id]) => id === 'dup')
    expect(dupEntries).toHaveLength(1)
  })
})

describe('translatePositions', () => {
  it('shifts all positions by the given center offset', () => {
    const positions = { a: { x: 0, y: 0 }, b: { x: 5, y: -2 } }
    const result = translatePositions(positions, 10, 20)
    expect(result['a']).toEqual({ x: 10, y: 20 })
    expect(result['b']).toEqual({ x: 15, y: 18 })
  })
})
