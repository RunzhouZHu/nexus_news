import { pool } from './client.js'

export async function createNode({ title, summary, date, tags, embedding, created_by, status = 'pending_review' }) {
  const { rows } = await pool.query(
    `INSERT INTO nodes (title, summary, date, tags, embedding, created_by, status)
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7)
     RETURNING *`,
    [title, summary, date, `{${tags.join(',')}}`, `[${embedding.join(',')}]`, created_by, status]
  )
  return rows[0]
}

export async function getNodeById(id) {
  const { rows } = await pool.query('SELECT * FROM nodes WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function getNodesByIds(ids) {
  if (!ids || ids.length === 0) return []
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
  const { rows } = await pool.query(
    `SELECT * FROM nodes WHERE id IN (${placeholders})`,
    ids
  )
  return rows
}

export async function updateNodeStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE nodes SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, id]
  )
  return rows[0]
}

export async function getPublishedNodes({ tags, trending, limit = 100, offset = 0 } = {}) {
  let query = `SELECT * FROM nodes WHERE status='published'`
  const params = []

  if (tags && tags.length > 0) {
    params.push(tags)
    query += ` AND tags && $${params.length}::text[]`
  }

  const orderBy = trending ? 'trending_score DESC' : 'date DESC'
  params.push(limit, offset)
  query += ` ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`

  const { rows } = await pool.query(query, params)
  return rows
}

export async function findSimilarNodes(embedding, { limit = 5, threshold = 0.3 } = {}) {
  const { rows } = await pool.query(
    `SELECT *, 1 - (embedding <=> $1::vector) AS similarity
     FROM nodes
     WHERE status = 'published' AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [`[${embedding.join(',')}]`, limit]
  )
  return rows.filter(r => r.similarity > threshold)
}

export async function updateImportance(id) {
  await pool.query(
    `UPDATE nodes SET
       importance = (
         (SELECT COUNT(*) FROM sources WHERE node_id = $1) * 0.4 +
         (SELECT COUNT(*) FROM edges WHERE (from_node=$1 OR to_node=$1) AND status='published') * 0.4
       ),
       updated_at = NOW()
     WHERE id = $1`,
    [id]
  )
}

export async function updateTrendingScores() {
  await pool.query(`
    UPDATE nodes SET
      trending_score = (
        SELECT COUNT(*) FROM edges
        WHERE (from_node=nodes.id OR to_node=nodes.id)
          AND status='published'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) + (
        SELECT COUNT(*) FROM sources
        WHERE node_id=nodes.id
          AND created_at > NOW() - INTERVAL '24 hours'
      ),
      updated_at = NOW()
    WHERE status = 'published'
  `)
}
