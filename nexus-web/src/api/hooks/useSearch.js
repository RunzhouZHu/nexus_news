import { useQuery } from '@tanstack/react-query'
import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

export function useSearch(query) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const res = await client.get(`${API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`)
      return res.data.nodes || []
    },
    enabled: !!query && query.trim().length > 0,
  })
}
