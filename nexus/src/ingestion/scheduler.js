// src/ingestion/scheduler.js
import 'dotenv/config'
import { pollTopHeadlines } from './newsapi.js'

const INTERVAL_MS = 5 * 60 * 1000

async function tick() {
  try {
    await pollTopHeadlines()
  } catch (err) {
    console.error('[scheduler] Poll failed:', err.message)
  }
}

console.log('[scheduler] Starting ingestion scheduler (5-min interval)')
tick()
setInterval(tick, INTERVAL_MS)
