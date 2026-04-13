import { describe, it, expect, beforeEach } from 'vitest'
import { useGraphLayoutStore } from '../../src/store/graphLayoutStore'

describe('graphLayoutStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphLayoutStore.setState({
      nodePositions: {},
      isLayoutManual: false,
    })
    // Clear localStorage
    localStorage.clear()
  })

  it('initializes with empty positions and grid layout', () => {
    const state = useGraphLayoutStore.getState()
    expect(state.nodePositions).toEqual({})
    expect(state.isLayoutManual).toBe(false)
  })

  it('sets node positions and enables manual layout', () => {
    const newPositions = {
      'node-1': { x: 100, y: 200 },
      'node-2': { x: 300, y: 400 },
    }
    useGraphLayoutStore.getState().setNodePositions(newPositions)

    const state = useGraphLayoutStore.getState()
    expect(state.nodePositions).toEqual(newPositions)
    expect(state.isLayoutManual).toBe(true)
  })

  it('merges new positions with existing ones', () => {
    const initial = { 'node-1': { x: 100, y: 200 } }
    useGraphLayoutStore.getState().setNodePositions(initial)

    const additional = { 'node-2': { x: 300, y: 400 } }
    useGraphLayoutStore.getState().setNodePositions(additional)

    const state = useGraphLayoutStore.getState()
    expect(state.nodePositions).toEqual({
      'node-1': { x: 100, y: 200 },
      'node-2': { x: 300, y: 400 },
    })
  })

  it('overwrites existing positions for same node id', () => {
    const pos1 = { 'node-1': { x: 100, y: 200 } }
    useGraphLayoutStore.getState().setNodePositions(pos1)

    const pos2 = { 'node-1': { x: 500, y: 600 } }
    useGraphLayoutStore.getState().setNodePositions(pos2)

    const state = useGraphLayoutStore.getState()
    expect(state.nodePositions['node-1']).toEqual({ x: 500, y: 600 })
  })

  it('resets to grid layout', () => {
    useGraphLayoutStore.getState().setNodePositions({
      'node-1': { x: 100, y: 200 },
    })

    let state = useGraphLayoutStore.getState()
    expect(state.isLayoutManual).toBe(true)

    useGraphLayoutStore.getState().resetToGridLayout()

    state = useGraphLayoutStore.getState()
    expect(state.nodePositions).toEqual({})
    expect(state.isLayoutManual).toBe(false)
  })
})
