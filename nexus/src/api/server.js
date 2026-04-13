// src/api/server.js
import 'dotenv/config'
import { app } from './app.js'
import { updateTrendingScores } from '../db/nodes.js'

// Start worker and scheduler only in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_WORKER === 'true') {
  import('../pipeline/worker.js')
  import('../ingestion/scheduler.js')
}

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`Nexus API running on :${PORT}`))

setInterval(async () => {
  try {
    await updateTrendingScores()
    console.log('[trending] Scores refreshed')
  } catch (err) {
    console.error('[trending] Refresh failed:', err.message)
  }
}, 10 * 60 * 1000)
