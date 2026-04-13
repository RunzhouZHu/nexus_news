// src/pipeline/stages/deduplicate.js
import { findSimilarNodes } from '../../db/nodes.js'
import { deduplicateEvent } from '../../llm/client.js'

export async function runDeduplicate(candidate) {
  const similar = await findSimilarNodes(candidate.embedding, { limit: 5, threshold: 0.85 })
  if (similar.length === 0) return { action: 'new' }
  const result = await deduplicateEvent(candidate, similar)
  if (result.match && result.matchedId) {
    return { action: 'existing', existingNodeId: result.matchedId }
  }
  return { action: 'new' }
}
