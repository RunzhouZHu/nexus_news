import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import { createNode } from '../../src/db/nodes.js'
import { createEdge, getEdgesForNode, updateEdgeStatus } from '../../src/db/edges.js'
import { createSource, getSourcesForNode } from '../../src/db/sources.js'

const emb = new Array(1536).fill(0.1)

describe('edges DB', () => {
  let nodeA, nodeB

  beforeEach(async () => {
    await pool.query('DELETE FROM notifications')
    await pool.query('DELETE FROM followed_topics')
    await pool.query('DELETE FROM saved_nodes')
    await pool.query('DELETE FROM edges')
    await pool.query('DELETE FROM sources')
    await pool.query('DELETE FROM nodes')
    await pool.query('DELETE FROM users')
    nodeA = await createNode({ title: 'A', summary: 'A.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })
    nodeB = await createNode({ title: 'B', summary: 'B.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })
    await pool.query('UPDATE nodes SET status=$1', ['published'])
  })

  describe('createEdge', () => {
    it('creates an edge between two nodes', async () => {
      const edge = await createEdge({
        from_node: nodeA.id, to_node: nodeB.id,
        type: 'LED_TO', confidence: 0.9, proposed_by: 'ai',
      })
      expect(edge.id).toBeDefined()
      expect(edge.type).toBe('LED_TO')
      expect(edge.status).toBe('pending_review')
    })
  })

  describe('getEdgesForNode', () => {
    it('returns edges where node is from or to', async () => {
      await createEdge({ from_node: nodeA.id, to_node: nodeB.id, type: 'LED_TO', confidence: 0.9, proposed_by: 'ai' })
      const edges = await getEdgesForNode(nodeA.id, { status: 'pending_review' })
      expect(edges.length).toBe(1)
    })
  })

  describe('createSource + getSourcesForNode', () => {
    it('creates and retrieves a source', async () => {
      await pool.query('UPDATE nodes SET status=$1 WHERE id=$2', ['published', nodeA.id])
      const source = await createSource({
        node_id: nodeA.id, outlet: 'BBC', url: 'https://bbc.com/test',
        published_at: new Date(), media_type: 'article',
      })
      expect(source.outlet).toBe('BBC')
      const sources = await getSourcesForNode(nodeA.id)
      expect(sources.length).toBe(1)
    })
  })
})
