import { useMutation } from '@tanstack/react-query'
import client from '../client'
import { useAuthStore } from '../../store/authStore'
import { API_ENDPOINTS } from '../endpoints'

function useAuthMutation(endpoint) {
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const res = await client.post(endpoint, { email, password })
      return res.data
    },
    onSuccess: (data) => {
      useAuthStore.setState({
        token: data.token,
        userId: data.user.id,
        email: data.user.email,
      })
    },
    onError: (error) => {
      console.error('Auth error:', error.response?.data?.error || error.message)
    },
  })
}

export function useRegister() {
  return useAuthMutation(API_ENDPOINTS.AUTH_REGISTER)
}

export function useLogin() {
  return useAuthMutation(API_ENDPOINTS.AUTH_LOGIN)
}
