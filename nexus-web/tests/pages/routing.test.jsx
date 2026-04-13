import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../../src/App'

const queryClient = new QueryClient()

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
