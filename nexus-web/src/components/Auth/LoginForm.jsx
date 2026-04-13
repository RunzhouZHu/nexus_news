import { useState } from 'react'
import { useLogin } from '../../api/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useLogin()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login.mutateAsync({ email, password })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6">Login</h2>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      <div>
        <label htmlFor="login-email" className="block text-sm font-medium mb-2">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium mb-2">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={login.isPending}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {login.isPending ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
