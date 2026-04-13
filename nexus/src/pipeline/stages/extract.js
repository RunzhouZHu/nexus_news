// src/pipeline/stages/extract.js
import { extractEvent, embedText } from '../../llm/client.js'

export async function runExtract(article) {
  // article: { title, body, outlet, url, published_at, media_type }
  const extracted = await extractEvent(article)
  const embedding = await embedText(`${extracted.title}. ${extracted.summary}`)
  return {
    title: extracted.title,
    summary: extracted.summary,
    date: new Date(extracted.date),
    tags: extracted.tags,
    embedding,
    outlet: article.outlet,
    url: article.url,
    published_at: article.published_at,
    media_type: article.media_type,
  }
}
