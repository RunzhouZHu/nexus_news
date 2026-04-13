import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import LoginForm from '../components/Auth/LoginForm'
import RegisterForm from '../components/Auth/RegisterForm'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const { token } = useAuthStore()

  if (token) return <Navigate to="/" replace />

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow-lg">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`px-4 py-2 rounded ${
              mode === 'login'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('register')}
            className={`px-4 py-2 rounded ${
              mode === 'register'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        {mode === 'login' && <LoginForm />}
        {mode === 'register' && <RegisterForm />}
      </div>
    </div>
  )
}
