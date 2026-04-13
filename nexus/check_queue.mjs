import 'dotenv/config'
import { articleQueue } from './src/pipeline/queue.js'

const waiting = await articleQueue.getWaiting()
const active = await articleQueue.getActive()
const failed = await articleQueue.getFailed()
const completed = await articleQueue.getCompleted()

console.log('Waiting:', waiting.length)
console.log('Active:', active.length)
console.log('Failed:', failed.length)
console.log('Completed:', completed.length)

if (failed.length > 0) {
  console.log('Last failed job error:', failed[0]?.failedReason)
}

await articleQueue.close()
process.exit(0)
