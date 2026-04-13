import { useQuery } from '@tanstack/react-query'
import client from '../client'
import { API_ENDPOINTS } from '../endpoints'

/**
 * Fetch published edges between visible nodes.
 * Pass `nodeIds` to scope to specific nodes; omit for all published edges.
 */
export function useEdges(nodeIds) {
  const hasIds = Array.isArray(nodeIds) && nodeIds.length > 0
  return useQuery({
    queryKey: ['edges', nodeIds],
    queryFn: async () => {
      const params = hasIds ? `?nodes=${nodeIds.join(',')}` : ''
      const res = await client.get(`${API_ENDPOINTS.EDGES}${params}`)
      return res.data.edges || []
    },
    staleTime: 30_000,
  })
}
