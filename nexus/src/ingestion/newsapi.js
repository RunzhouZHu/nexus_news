// src/ingestion/newsapi.js
import { enqueueArticle } from '../pipeline/queue.js'
import { sourceExistsByUrl } from '../db/sources.js'

const NEWSAPI_BASE = 'https://newsapi.org/v2'

export async function pollTopHeadlines() {
  const url = `${NEWSAPI_BASE}/top-headlines?language=en&pageSize=100&apiKey=${process.env.NEWSAPI_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NewsAPI error: ${res.status} ${await res.text()}`)
  const data = await res.json()

  let enqueued = 0
  for (const article of data.articles ?? []) {
    if (!article.url || !article.title) continue
    if (await sourceExistsByUrl(article.url)) continue

    await enqueueArticle({
      title: article.title,
      body: article.content ?? article.description ?? '',
      outlet: article.source?.name ?? 'Unknown',
      url: article.url,
      published_at: new Date(article.publishedAt),
      media_type: 'article',
    })
    enqueued++
  }

  console.log(`[ingest] Enqueued ${enqueued} new articles from NewsAPI`)
  return enqueued
}
