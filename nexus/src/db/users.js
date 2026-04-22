import bcrypt from 'bcrypt'
import { pool } from './client.js'

export async function createUser({ email, password }) {
  const password_hash = await bcrypt.hash(password, 10)
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, avatar_url, created_at',
    [email, password_hash]
  )
  return rows[0]
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email])
  return rows[0] ?? null
}

export async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, avatar_url, created_at FROM users WHERE id=$1',
    [id]
  )
  return rows[0] ?? null
}

export async function getUserByClerkId(clerkId) {
  const { rows } = await pool.query(
    'SELECT id, email, avatar_url, clerk_id, created_at FROM users WHERE clerk_id=$1',
    [clerkId]
  )
  return rows[0] ?? null
}

export async function upsertClerkUser({ clerkId, email }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, clerk_id)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
     RETURNING id, email, avatar_url, clerk_id, created_at`,
    [email, clerkId]
  )
  return rows[0]
}

export async function saveNode(userId, nodeId) {
  await pool.query(
    'INSERT INTO saved_nodes (user_id, node_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [userId, nodeId]
  )
}

export async function unsaveNode(userId, nodeId) {
  await pool.query('DELETE FROM saved_nodes WHERE user_id=$1 AND node_id=$2', [userId, nodeId])
}

export async function getSavedNodes(userId) {
  const { rows } = await pool.query(
    `SELECT sn.*, n.title, n.summary, n.tags, n.date, n.trending_score
     FROM saved_nodes sn JOIN nodes n ON n.id=sn.node_id
     WHERE sn.user_id=$1 ORDER BY sn.saved_at DESC`,
    [userId]
  )
  return rows
}

export async function followTopic(userId, tag) {
  await pool.query(
    'INSERT INTO followed_topics (user_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [userId, tag]
  )
}

export async function unfollowTopic(userId, tag) {
  await pool.query('DELETE FROM followed_topics WHERE user_id=$1 AND tag=$2', [userId, tag])
}

export async function getFollowedTopics(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM followed_topics WHERE user_id=$1 ORDER BY followed_at DESC',
    [userId]
  )
  return rows
}

export async function getUsersFollowingAnyTag(tags) {
  const { rows } = await pool.query(
    'SELECT DISTINCT user_id FROM followed_topics WHERE tag = ANY($1::text[])',
    [tags]
  )
  return rows.map(r => r.user_id)
}

export async function createNotification({ userId, nodeId, triggerTag }) {
  await pool.query(
    'INSERT INTO notifications (user_id, node_id, trigger_tag) VALUES ($1,$2,$3)',
    [userId, nodeId, triggerTag]
  )
}
