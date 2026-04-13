// src/pipeline/stages/review.js
import { updateNodeStatus, updateImportance } from '../../db/nodes.js'
import { updateEdgeStatus } from '../../db/edges.js'

const AUTO_PUBLISH_THRESHOLD = 0.85
const DISCARD_THRESHOLD = 0.60

export async function runReview(node, edges) {
  await updateNodeStatus(node.id, 'published')

  const results = { published: [], queued: [], discarded: [] }

  for (const edge of edges) {
    if (edge.confidence >= AUTO_PUBLISH_THRESHOLD) {
      await updateEdgeStatus(edge.id, 'published')
      results.published.push(edge.id)
    } else if (edge.confidence >= DISCARD_THRESHOLD) {
      results.queued.push(edge.id)
    } else {
      await updateEdgeStatus(edge.id, 'rejected')
      results.discarded.push(edge.id)
    }
  }

  await updateImportance(node.id)
  return results
}
