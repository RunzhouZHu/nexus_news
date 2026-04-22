// src/ingestion/scheduler.js
import 'dotenv/config'
import { pollTopHeadlines } from './newsapi.js'

const INTERVAL_MS = 12 * 60 * 60 * 1000

async function tick() {
  try {
    await pollTopHeadlines()
  } catch (err) {
    console.error('[scheduler] Poll failed:', err.message)
  }
}

console.log('[scheduler] Starting ingestion scheduler (12-hour interval)')
tick()
setInterval(tick, INTERVAL_MS)
