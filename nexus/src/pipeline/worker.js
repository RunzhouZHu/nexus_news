// src/pipeline/worker.js
import 'dotenv/config'
import { Worker } from 'bullmq'
import { connection } from './queue.js'
import { fetchArticleText } from './stages/fetch.js'
import { runExtract } from './stages/extract.js'
import { runDeduplicate } from './stages/deduplicate.js'
import { runConnect } from './stages/connect.js'
import { runReview } from './stages/review.js'
import { runNotify } from './stages/notify.js'
import { createNode, getNodeById } from '../db/nodes.js'
import { createSource, sourceExistsByUrl } from '../db/sources.js'

const worker = new Worker('articles', async (job) => {
  const article = job.data
  console.log(`[pipeline] Processing: ${article.url}`)

  if (await sourceExistsByUrl(article.url)) {
    console.log(`[pipeline] Skipping duplicate URL: ${article.url}`)
    return
  }

  if (!article.body) {
    article.body = await fetchArticleText(article.url)
  }

  const extracted = await runExtract(article)

  const dedup = await runDeduplicate(extracted)

  let node
  if (dedup.action === 'existing') {
    node = await getNodeById(dedup.existingNodeId)
    await createSource({
      node_id: node.id,
      outlet: article.outlet,
      url: article.url,
      published_at: article.published_at,
      media_type: article.media_type ?? 'article',
    })
    console.log(`[pipeline] Merged into existing node: ${node.title}`)
    return
  }

  node = await createNode({
    title: extracted.title,
    summary: extracted.summary,
    date: extracted.date,
    tags: extracted.tags,
    embedding: extracted.embedding,
    created_by: 'ai',
  })

  await createSource({
    node_id: node.id,
    outlet: extracted.outlet,
    url: extracted.url,
    published_at: extracted.published_at,
    media_type: extracted.media_type ?? 'article',
  })

  const edges = await runConnect(node)
  await runReview(node, edges)
  await runNotify(node)

  console.log(`[pipeline] Done: "${node.title}" — ${edges.length} connections`)
}, { connection, concurrency: 3 })

worker.on('failed', (job, err) => {
  console.error(`[pipeline] Job failed: ${job?.data?.url}`, err.message)
})

console.log('[pipeline] Worker started')
