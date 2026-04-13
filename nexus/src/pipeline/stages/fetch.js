// src/pipeline/stages/fetch.js
export async function fetchArticleText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NexusBot/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`)
  const html = await res.text()
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000)
}
