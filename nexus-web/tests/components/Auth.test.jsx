import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginForm from '../../src/components/Auth/LoginForm'
import RegisterForm from '../../src/components/Auth/RegisterForm'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

const queryClient = new QueryClient()

const Wrapper = ({ children }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </BrowserRouter>
)

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm />, { wrapper: Wrapper })
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
  })

  it('renders login button', () => {
    render(<LoginForm />, { wrapper: Wrapper })
    const button = screen.getByRole('button', { name: /login/i })
    expect(button).toBeDefined()
  })
})

describe('RegisterForm', () => {
  it('renders all input fields', () => {
    render(<RegisterForm />, { wrapper: Wrapper })
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByLabelText('Confirm Password')).toBeDefined()
  })

  it('renders register button', () => {
    render(<RegisterForm />, { wrapper: Wrapper })
    const button = screen.getByRole('button', { name: /register/i })
    expect(button).toBeDefined()
  })
})

