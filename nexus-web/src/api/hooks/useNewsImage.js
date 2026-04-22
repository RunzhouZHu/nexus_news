import { useQuery } from '@tanstack/react-query'
import client from '../client'

export function useNewsImage(title) {
  return useQuery({
    queryKey: ['newsImage', title],
    queryFn: async () => {
      const { data } = await client.get('/api/news-image', { params: { q: title } })
      return data.imageUrl
    },
    enabled: Boolean(title),
    staleTime: 1000 * 60 * 10, // 10 min — images won't change often
    retry: false,
  })
}
