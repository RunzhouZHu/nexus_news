import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      userId: null,
      email: null,

      setAuth: (token, userId, email) => set({ token, userId, email }),
      logout: () => set({ token: null, userId: null, email: null }),
      isAuthenticated: () => !!useAuthStore.getState().token,
    }),
    {
      name: 'nexus-auth',
    }
  )
)
