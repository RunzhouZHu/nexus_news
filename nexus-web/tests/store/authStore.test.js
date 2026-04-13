import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../src/store/authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({ token: null, userId: null, email: null })
  })

  it('sets auth state', () => {
    useAuthStore.getState().setAuth('token123', 'user-id', 'user@test.com')

    const state = useAuthStore.getState()
    expect(state.token).toBe('token123')
    expect(state.userId).toBe('user-id')
    expect(state.email).toBe('user@test.com')
  })

  it('logs out', () => {
    useAuthStore.getState().setAuth('token123', 'user-id', 'user@test.com')
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.userId).toBeNull()
    expect(state.email).toBeNull()
  })

  it('checks authentication status', () => {
    useAuthStore.setState({ token: null })
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)

    useAuthStore.setState({ token: 'token123' })
    expect(useAuthStore.getState().isAuthenticated()).toBe(true)
  })
})
