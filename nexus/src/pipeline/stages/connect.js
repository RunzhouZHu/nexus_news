// src/pipeline/stages/connect.js
import { pool } from '../../db/client.js'
import { createEdge } from '../../db/edges.js'
import { findConnections } from '../../llm/client.js'
import { findSimilarNodes } from '../../db/nodes.js'

export async function runConnect(node) {
  const { rows: tagMatches } = await pool.query(
    `SELECT * FROM nodes
     WHERE status='published' AND id != $1 AND tags && $2::text[]
     ORDER BY trending_score DESC LIMIT 20`,
    [node.id, node.tags.length > 0 ? `{${node.tags.join(',')}}` : '{}']
  )

  const embeddingArr = Array.isArray(node.embedding)
    ? node.embedding
    : typeof node.embedding === 'string'
      ? node.embedding.replace(/^\[|\]$/g, '').split(',').map(Number)
      : null
  const vectorMatches = embeddingArr
    ? await findSimilarNodes(embeddingArr, { limit: 10, threshold: 0.7 })
    : []

  const seen = new Set()
  const candidates = [...tagMatches, ...vectorMatches].filter(n => {
    if (seen.has(n.id) || n.id === node.id) return false
    seen.add(n.id)
    return true
  }).slice(0, 20)

  if (candidates.length === 0) return []

  const connections = await findConnections(node, candidates)
  const created = []

  for (const conn of connections) {
    if (conn.confidence < 0.5) continue
    const connectedNode = candidates.find(c => c.id === conn.nodeId)
    if (!connectedNode) continue
    try {
      const edge = await createEdge({
        from_node: node.id,
        to_node: conn.nodeId,
        type: conn.type,
        confidence: conn.confidence,
        proposed_by: 'ai',
      })
      created.push(edge)
    } catch (err) {
      // Unique constraint violation (duplicate edge) — skip silently
      if (err.code !== '23505') throw err
    }
  }

  return created
}
