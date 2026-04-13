import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import {
  createUser, getUserByEmail,
  saveNode, unsaveNode, getSavedNodes,
  followTopic, unfollowTopic, getFollowedTopics,
} from '../../src/db/users.js'
import { createNode } from '../../src/db/nodes.js'

const emb = new Array(1536).fill(0.1)

describe('users DB', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM notifications')
    await pool.query('DELETE FROM followed_topics')
    await pool.query('DELETE FROM saved_nodes')
    await pool.query('DELETE FROM edges')
    await pool.query('DELETE FROM sources')
    await pool.query('DELETE FROM nodes')
    await pool.query('DELETE FROM users')
  })

  describe('createUser + getUserByEmail', () => {
    it('creates a user and retrieves by email', async () => {
      const user = await createUser({ email: 'a@test.com', password: 'secret123' })
      expect(user.id).toBeDefined()
      expect(user.email).toBe('a@test.com')
      expect(user.password_hash).not.toBe('secret123')

      const found = await getUserByEmail('a@test.com')
      expect(found.id).toBe(user.id)
    })
  })

  describe('saveNode / getSavedNodes', () => {
    it('saves and retrieves nodes for a user', async () => {
      const user = await createUser({ email: 'b@test.com', password: 'secret' })
      const node = await createNode({ title: 'T', summary: 'S.', date: new Date(), tags: [], embedding: emb, created_by: 'ai' })

      await saveNode(user.id, node.id)
      const saved = await getSavedNodes(user.id)
      expect(saved.length).toBe(1)
      expect(saved[0].node_id).toBe(node.id)

      await unsaveNode(user.id, node.id)
      const after = await getSavedNodes(user.id)
      expect(after.length).toBe(0)
    })
  })

  describe('followTopic / getFollowedTopics', () => {
    it('follows and retrieves topics', async () => {
      const user = await createUser({ email: 'c@test.com', password: 'secret' })
      await followTopic(user.id, 'energy')
      await followTopic(user.id, 'oil')
      const topics = await getFollowedTopics(user.id)
      expect(topics.map(t => t.tag).sort()).toEqual(['energy', 'oil'])
      await unfollowTopic(user.id, 'oil')
      const after = await getFollowedTopics(user.id)
      expect(after.length).toBe(1)
    })
  })
})
