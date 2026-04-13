import { useAuthStore } from '../../store/authStore'

export default function AuthGuard({ children, fallback = null }) {
  const { token } = useAuthStore()

  if (!token) {
    return fallback
  }

  return children
}
