import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { email, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Nexus</h1>
        {email && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
