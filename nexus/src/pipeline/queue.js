// src/pipeline/queue.js
import 'dotenv/config'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

export const articleQueue = new Queue('articles', { connection })

export async function enqueueArticle(article) {
  await articleQueue.add('process', article, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
