import { useQuery } from '@tanstack/react-query'
import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

export function useNodes({ tags = [], trending = false, limit = 100, offset = 0 } = {}) {
  return useQuery({
    queryKey: ['nodes', { tags, trending, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit,
        offset,
      })
      if (tags.length > 0) params.append('tags', tags.join(','))
      if (trending) params.append('trending', 'true')

      const res = await client.get(`${API_ENDPOINTS.NODES}?${params.toString()}`)
      return res.data.nodes
    },
  })
}
