import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import {
  createNode, getNodeById, updateNodeStatus,
  findSimilarNodes, updateTrendingScores,
} from '../../src/db/nodes.js'

const testEmbedding = new Array(1536).fill(0.1)

describe('nodes DB', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM notifications')
    await pool.query('DELETE FROM followed_topics')
    await pool.query('DELETE FROM saved_nodes')
    await pool.query('DELETE FROM edges')
    await pool.query('DELETE FROM sources')
    await pool.query('DELETE FROM nodes')
    await pool.query('DELETE FROM users')
  })

  describe('createNode', () => {
    it('inserts a node and returns it with an id', async () => {
      const node = await createNode({
        title: 'Gas prices spike 18%',
        summary: 'Global fuel markets reacted sharply.',
        date: new Date('2025-02-03'),
        tags: ['energy', 'oil', 'OPEC'],
        embedding: testEmbedding,
        created_by: 'ai',
      })
      expect(node.id).toBeDefined()
      expect(node.title).toBe('Gas prices spike 18%')
      expect(node.tags).toEqual(['energy', 'oil', 'OPEC'])
      expect(node.status).toBe('pending_review')
    })
  })

  describe('getNodeById', () => {
    it('returns null for unknown id', async () => {
      const node = await getNodeById('00000000-0000-0000-0000-000000000000')
      expect(node).toBeNull()
    })

    it('returns the node for a known id', async () => {
      const created = await createNode({
        title: 'Test', summary: 'Test.', date: new Date(),
        tags: ['test'], embedding: testEmbedding, created_by: 'editor',
      })
      const found = await getNodeById(created.id)
      expect(found.id).toBe(created.id)
    })
  })

  describe('updateNodeStatus', () => {
    it('changes status to published', async () => {
      const node = await createNode({
        title: 'Test', summary: 'Test.', date: new Date(),
        tags: [], embedding: testEmbedding, created_by: 'ai',
      })
      const updated = await updateNodeStatus(node.id, 'published')
      expect(updated.status).toBe('published')
    })
  })

  describe('findSimilarNodes', () => {
    it('returns nodes sorted by cosine similarity', async () => {
      const a = await createNode({
        title: 'A', summary: 'A.', date: new Date(),
        tags: [], embedding: new Array(1536).fill(0.9), created_by: 'ai', status: 'published',
      })
      await pool.query('UPDATE nodes SET status=$1 WHERE id=$2', ['published', a.id])

      const results = await findSimilarNodes(new Array(1536).fill(0.9), { limit: 5 })
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe(a.id)
    })
  })
})
