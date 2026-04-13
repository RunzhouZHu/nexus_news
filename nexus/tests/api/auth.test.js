import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { pool } from '../../src/db/client.js'
import { app } from '../../src/api/app.js'

describe('auth API', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM notifications')
    await pool.query('DELETE FROM followed_topics')
    await pool.query('DELETE FROM saved_nodes')
    await pool.query('DELETE FROM edges')
    await pool.query('DELETE FROM sources')
    await pool.query('DELETE FROM nodes')
    await pool.query('DELETE FROM users')
  })

  describe('POST /api/auth/register', () => {
    it('creates a user and returns a JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@test.com', password: 'password123' })
      expect(res.status).toBe(201)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.email).toBe('user@test.com')
      expect(res.body.user.password_hash).toBeUndefined()
    })

    it('returns 409 for duplicate email', async () => {
      await request(app).post('/api/auth/register').send({ email: 'dup@test.com', password: 'pass' })
      const res = await request(app).post('/api/auth/register').send({ email: 'dup@test.com', password: 'pass' })
      expect(res.status).toBe(409)
    })
  })

  describe('POST /api/auth/login', () => {
    it('returns a JWT for valid credentials', async () => {
      await request(app).post('/api/auth/register').send({ email: 'login@test.com', password: 'pass123' })
      const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'pass123' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
    })

    it('returns 401 for wrong password', async () => {
      await request(app).post('/api/auth/register').send({ email: 'x@test.com', password: 'correct' })
      const res = await request(app).post('/api/auth/login').send({ email: 'x@test.com', password: 'wrong' })
      expect(res.status).toBe(401)
    })
  })
})
