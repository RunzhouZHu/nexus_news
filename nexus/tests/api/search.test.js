import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { pool } from '../../src/db/client.js'
import { app } from '../../src/api/app.js'
import { createNode } from '../../src/db/nodes.js'

const emb = new Array(1536).fill(0.1)

describe('search API', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM notifications')
    await pool.query('DELETE FROM followed_topics')
    await pool.query('DELETE FROM saved_nodes')
    await pool.query('DELETE FROM edges')
    await pool.query('DELETE FROM sources')
    await pool.query('DELETE FROM nodes')
    await pool.query('DELETE FROM users')
  })

  describe('GET /api/search', () => {
    it('returns nodes matching title keyword', async () => {
      await createNode({ title: 'Gas prices spike', summary: 'Fuel costs.', date: new Date(), tags: ['energy'], embedding: emb, created_by: 'ai', status: 'published' })
      await createNode({ title: 'Airline cancellations', summary: 'Flights cut.', date: new Date(), tags: ['travel'], embedding: emb, created_by: 'ai', status: 'published' })
      const res = await request(app).get('/api/search?q=gas')
      expect(res.status).toBe(200)
      expect(res.body.nodes.length).toBe(1)
      expect(res.body.nodes[0].title).toMatch(/gas/i)
    })
  })
})
