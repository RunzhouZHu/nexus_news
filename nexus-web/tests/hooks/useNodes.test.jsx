import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNodes } from '../../src/api/hooks/useNodes'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useNodes', () => {
  it('returns pending state initially', () => {
    const { result } = renderHook(() => useNodes(), { wrapper: createWrapper() })
    expect(result.current.status).toBe('loading')
  })
})
