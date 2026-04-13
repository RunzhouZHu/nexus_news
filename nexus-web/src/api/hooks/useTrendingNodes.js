import { useQuery } from '@tanstack/react-query'
import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

export function useTrendingNodes({ limit = 10 } = {}) {
  return useQuery({
    queryKey: ['trending', limit],
    queryFn: async () => {
      const res = await client.get(API_ENDPOINTS.NODES, {
        params: {
          trending: true,
          limit,
        },
      })
      return res.data.nodes
    },
  })
}
