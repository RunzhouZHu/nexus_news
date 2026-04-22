import { useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useMutation } from '@tanstack/react-query'
import client from '../client'
import { useAuthStore } from '../../store/authStore'
import { API_ENDPOINTS } from '../endpoints'

// Syncs the Clerk user into our DB and stores the DB user info.
export function useClerkSync() {
  const { isSignedIn, getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const { setUser, clearUser } = useAuthStore()

  const sync = useMutation({
    mutationFn: async ({ email }) => {
      const res = await client.post(API_ENDPOINTS.AUTH_SYNC, { email })
      return res.data
    },
    onSuccess: (data) => setUser(data.user),
  })

  useEffect(() => {
    if (isSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress
      if (email) sync.mutate({ email })
    } else if (!isSignedIn) {
      clearUser()
    }
  }, [isSignedIn, clerkUser?.id])

  return { getToken }
}
