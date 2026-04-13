import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

export function useSavedNodes() {
  return useQuery({
    queryKey: ['user', 'saved'],
    queryFn: async () => {
      const res = await client.get(API_ENDPOINTS.USER_SAVED)
      return res.data.nodes || []
    },
  })
}

export function useSaveNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nodeId) => {
      await client.post(API_ENDPOINTS.USER_SAVED_NODE(nodeId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'saved'] })
    },
    onError: (error) => {
      console.error('Failed to save node:', error.response?.data?.error || error.message)
    },
  })
}

export function useFollowedTopics() {
  return useQuery({
    queryKey: ['user', 'topics'],
    queryFn: async () => {
      const res = await client.get(API_ENDPOINTS.USER_TOPICS)
      return res.data.topics || []
    },
  })
}

export function useFollowTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tag) => {
      await client.post(API_ENDPOINTS.USER_TOPICS, { tag })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'topics'] })
    },
    onError: (error) => {
      console.error('Failed to follow topic:', error.response?.data?.error || error.message)
    },
  })
}
