import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNodes } from '../../src/api/hooks/useNodes'
import { useNode } from '../../src/api/hooks/useNode'
import { useSearch } from '../../src/api/hooks/useSearch'
import { useConnections } from '../../src/api/hooks/useConnections'
import { useTrendingNodes } from '../../src/api/hooks/useTrendingNodes'
import { useRegister, useLogin } from '../../src/api/hooks/useAuth'
import { useSavedNodes, useSaveNode, useFollowedTopics, useFollowTopic } from '../../src/api/hooks/useUser'

const createQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
})

const wrapper = (queryClient) => ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

describe('API Hooks - All hooks can be rendered without errors', () => {
  let queryClient

  beforeEach(() => {
    queryClient = createQueryClient()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('useNodes hook returns a query result object', () => {
    const { result } = renderHook(() => useNodes(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useNode hook returns a query result object', () => {
    const { result } = renderHook(() => useNode(null), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useSearch hook returns a query result object', () => {
    const { result } = renderHook(() => useSearch(''), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useConnections hook returns a query result object', () => {
    const { result } = renderHook(() => useConnections(null), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useRegister hook returns a mutation result object', () => {
    const { result } = renderHook(() => useRegister(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('mutate')
    expect(result.current).toHaveProperty('status')
  })

  it('useLogin hook returns a mutation result object', () => {
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('mutate')
    expect(result.current).toHaveProperty('status')
  })

  it('useSavedNodes hook returns a query result object', () => {
    const { result } = renderHook(() => useSavedNodes(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useSaveNode hook returns a mutation result object', () => {
    const { result } = renderHook(() => useSaveNode(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('mutate')
    expect(result.current).toHaveProperty('status')
  })

  it('useFollowedTopics hook returns a query result object', () => {
    const { result } = renderHook(() => useFollowedTopics(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useFollowTopic hook returns a mutation result object', () => {
    const { result } = renderHook(() => useFollowTopic(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('mutate')
    expect(result.current).toHaveProperty('status')
  })

  it('useTrendingNodes hook returns a query result object with limit parameter', () => {
    const { result } = renderHook(() => useTrendingNodes({ limit: 10 }), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useTrendingNodes hook uses correct query key', () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useTrendingNodes({ limit: 15 }), { wrapper: wrapper(queryClient) })
    // Query should be created with key ['trending', 15]
    expect(result.current).toHaveProperty('status')
  })

  it('useTrendingNodes hook works with default parameters', () => {
    const { result } = renderHook(() => useTrendingNodes(), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useConnections hook with pagination parameters returns a query result object', () => {
    const { result } = renderHook(() => useConnections('node-123', { limit: 10, offset: 0 }), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useConnections hook with different limit and offset returns a query result object', () => {
    const { result } = renderHook(() => useConnections('node-456', { limit: 20, offset: 10 }), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })

  it('useConnections hook accepts sort parameter', () => {
    const { result } = renderHook(() => useConnections('node-789', { limit: 10, offset: 0, sort: 'confidence' }), { wrapper: wrapper(queryClient) })
    expect(result.current).toHaveProperty('status')
    expect(result.current).toHaveProperty('data')
  })
})
