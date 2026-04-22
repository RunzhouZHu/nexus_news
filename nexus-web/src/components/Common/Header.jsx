import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { isSignedIn, signOut } = useAuth()
  const { user } = useUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const email = user?.primaryEmailAddress?.emailAddress

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Nexus</h1>
        {isSignedIn && (
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
