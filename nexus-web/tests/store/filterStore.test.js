import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from '../../src/store/filterStore'

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({
      searchQuery: '',
      activeTags: [],
      viewMode: 'graph',
    })
  })

  it('sets search query', () => {
    useFilterStore.getState().setSearchQuery('climate change')
    expect(useFilterStore.getState().searchQuery).toBe('climate change')
  })

  it('toggles tags', () => {
    useFilterStore.getState().toggleTag('tech')
    expect(useFilterStore.getState().activeTags).toEqual(['tech'])

    useFilterStore.getState().toggleTag('tech')
    expect(useFilterStore.getState().activeTags).toEqual([])
  })

  it('adds multiple tags', () => {
    useFilterStore.getState().toggleTag('tech')
    useFilterStore.getState().toggleTag('science')
    expect(useFilterStore.getState().activeTags).toEqual(['tech', 'science'])
  })

  it('clears all tags', () => {
    useFilterStore.setState({ activeTags: ['tech', 'science'] })
    useFilterStore.getState().clearTags()
    expect(useFilterStore.getState().activeTags).toEqual([])
  })

  it('switches view mode', () => {
    useFilterStore.getState().setViewMode('list')
    expect(useFilterStore.getState().viewMode).toBe('list')

    useFilterStore.getState().setViewMode('graph')
    expect(useFilterStore.getState().viewMode).toBe('graph')
  })
})
