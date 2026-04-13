import { useQuery } from '@tanstack/react-query'
import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

export function useNode(nodeId) {
  return useQuery({
    queryKey: ['node', nodeId],
    queryFn: async () => {
      const res = await client.get(API_ENDPOINTS.NODE(nodeId))
      return res.data
    },
    enabled: !!nodeId,
  })
}
