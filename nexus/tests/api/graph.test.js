import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { pool } from '../../src/db/client.js'
import { app } from '../../src/api/app.js'
import { createNode } from '../../src/db/nodes.js'
import { createEdge } from '../../src/db/edges.js'

const emb = new Array(1536).fill(0.1)

describe('graph API', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM notifications')
    await pool.query('DELETE FROM followed_topics')
    await pool.query('DELETE FROM saved_nodes')
    await pool.query('DELETE FROM edges')
    await pool.query('DELETE FROM sources')
    await pool.query('DELETE FROM nodes')
    await pool.query('DELETE FROM users')
  })

  describe('GET /api/nodes', () => {
    it('returns only published nodes', async () => {
      await createNode({ title: 'Published', summary: 'P.', date: new Date(), tags: ['energy'], embedding: emb, created_by: 'ai', status: 'published' })
      await createNode({ title: 'Draft', summary: 'D.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })
      const res = await request(app).get('/api/nodes')
      expect(res.status).toBe(200)
      expect(res.body.nodes.length).toBe(1)
      expect(res.body.nodes[0].title).toBe('Published')
    })

    it('filters by tag', async () => {
      await createNode({ title: 'Energy', summary: 'E.', date: new Date(), tags: ['energy'], embedding: emb, created_by: 'ai', status: 'published' })
      await createNode({ title: 'Politics', summary: 'P.', date: new Date(), tags: ['politics'], embedding: emb, created_by: 'ai', status: 'published' })
      const res = await request(app).get('/api/nodes?tags=energy')
      expect(res.body.nodes.length).toBe(1)
      expect(res.body.nodes[0].title).toBe('Energy')
    })
  })

  describe('GET /api/nodes/:id', () => {
    it('returns 404 for unknown node', async () => {
      const res = await request(app).get('/api/nodes/00000000-0000-0000-0000-000000000000')
      expect(res.status).toBe(404)
    })

    it('returns node with sources', async () => {
      const node = await createNode({ title: 'T', summary: 'S.', date: new Date(), tags: [], embedding: emb, created_by: 'ai', status: 'published' })
      const res = await request(app).get(`/api/nodes/${node.id}`)
      expect(res.status).toBe(200)
      expect(res.body.node.id).toBe(node.id)
      expect(Array.isArray(res.body.sources)).toBe(true)
    })
  })

  describe('GET /api/nodes/:id/connections', () => {
    it('returns published edges for a node', async () => {
      const a = await createNode({ title: 'A', summary: 'A.', date: new Date(), tags: [], embedding: emb, created_by: 'ai', status: 'published' })
      const b = await createNode({ title: 'B', summary: 'B.', date: new Date(), tags: [], embedding: emb, created_by: 'ai', status: 'published' })
      await createEdge({ from_node: a.id, to_node: b.id, type: 'LED_TO', confidence: 0.9, proposed_by: 'ai', status: 'published' })
      const res = await request(app).get(`/api/nodes/${a.id}/connections`)
      expect(res.status).toBe(200)
      expect(res.body.edges.length).toBe(1)
    })
  })
})
