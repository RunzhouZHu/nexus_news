import { Router } from 'express'

export const newsImageRouter = Router()

// In-memory cache: query → { imageUrl, expiresAt }
const cache = new Map()
const TTL_MS = 1000 * 60 * 60 * 6 // 6 hours

newsImageRouter.get('/news-image', async (req, res) => {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'q is required' })

  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) return res.status(503).json({ error: 'NewsAPI key not configured' })

  const cacheKey = q.toLowerCase().trim()
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ imageUrl: cached.imageUrl })
  }

  const url =
    `https://newsapi.org/v2/everything?` +
    `q=${encodeURIComponent(q)}&` +
    `pageSize=5&` +
    `sortBy=relevancy&` +
    `language=en&` +
    `apiKey=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) return res.status(response.status).json({ error: data.message })

  const imageUrl = data.articles?.find((a) => a.urlToImage)?.urlToImage ?? null
  cache.set(cacheKey, { imageUrl, expiresAt: Date.now() + TTL_MS })
  res.json({ imageUrl })
})
