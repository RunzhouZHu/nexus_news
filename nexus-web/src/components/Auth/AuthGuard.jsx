import { useAuth } from '@clerk/clerk-react'

export default function AuthGuard({ children, fallback = null }) {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) return null
  if (!isSignedIn) return fallback

  return children
}
