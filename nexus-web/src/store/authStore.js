import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Stores our DB user info after the Clerk sync call.
// The actual auth token comes from Clerk via getToken().
export const useAuthStore = create(
  persist(
    (set) => ({
      userId: null,
      email: null,
      avatarUrl: null,

      setUser: (user) => set({ userId: user.id, email: user.email, avatarUrl: user.avatar_url ?? null }),
      clearUser: () => set({ userId: null, email: null, avatarUrl: null }),
    }),
    { name: 'nexus-auth' }
  )
)
