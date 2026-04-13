import { useQuery } from '@tanstack/react-query'
import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

export function useConnections(nodeId, { limit = 10, offset = 0, sort = 'confidence' } = {}) {
  return useQuery({
    queryKey: ['connections', nodeId, limit, offset, sort],
    queryFn: async () => {
      const res = await client.get(API_ENDPOINTS.CONNECTIONS(nodeId), {
        params: { limit, offset, sort },
      })
      return res.data.edges
    },
    enabled: !!nodeId,
  })
}
