import { pool } from './client.js'

export async function createEdge({ from_node, to_node, type, confidence, proposed_by, status = 'pending_review' }) {
  const { rows } = await pool.query(
    `INSERT INTO edges (from_node, to_node, type, confidence, proposed_by, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [from_node, to_node, type, confidence, proposed_by, status]
  )
  return rows[0]
}

export async function getEdgesForNode(nodeId, { status = 'published' } = {}) {
  const { rows } = await pool.query(
    `SELECT e.*,
       fn.title AS from_title, fn.tags AS from_tags,
       tn.title AS to_title, tn.tags AS to_tags
     FROM edges e
     JOIN nodes fn ON fn.id = e.from_node
     JOIN nodes tn ON tn.id = e.to_node
     WHERE (e.from_node = $1 OR e.to_node = $1) AND e.status = $2`,
    [nodeId, status]
  )
  return rows
}

export async function getConnectionsForNode(nodeId, { limit = 10, offset = 0, sort = 'confidence', status = 'published' } = {}) {
  const orderBy = sort === 'confidence' ? 'e.confidence DESC' : 'e.created_at DESC'
  const { rows: edges } = await pool.query(
    `SELECT e.*,
       fn.title AS from_title, fn.tags AS from_tags,
       tn.title AS to_title, tn.tags AS to_tags
     FROM edges e
     JOIN nodes fn ON fn.id = e.from_node
     JOIN nodes tn ON tn.id = e.to_node
     WHERE (e.from_node = $1 OR e.to_node = $1) AND e.status = $2
     ORDER BY ${orderBy}
     LIMIT $3 OFFSET $4`,
    [nodeId, status, limit, offset]
  )
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM edges
     WHERE (from_node = $1 OR to_node = $1) AND status = $2`,
    [nodeId, status]
  )
  return { edges, total: countRows[0].total }
}

export async function updateEdgeStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE edges SET status=$1 WHERE id=$2 RETURNING *',
    [status, id]
  )
  return rows[0]
}

export async function getEdgesForNodes(nodeIds, { status = 'published' } = {}) {
  if (!nodeIds || nodeIds.length === 0) return []
  const placeholders = nodeIds.map((_, i) => `$${i + 2}`).join(', ')
  const { rows } = await pool.query(
    `SELECT e.*,
       fn.title AS from_title, fn.tags AS from_tags,
       tn.title AS to_title, tn.tags AS to_tags
     FROM edges e
     JOIN nodes fn ON fn.id = e.from_node
     JOIN nodes tn ON tn.id = e.to_node
     WHERE e.status = $1
       AND e.from_node IN (${placeholders})
       AND e.to_node IN (${placeholders})`,
    [status, ...nodeIds]
  )
  return rows
}

export async function getAllPublishedEdges({ limit = 500 } = {}) {
  const { rows } = await pool.query(
    `SELECT e.*,
       fn.title AS from_title, fn.tags AS from_tags,
       tn.title AS to_title, tn.tags AS to_tags
     FROM edges e
     JOIN nodes fn ON fn.id = e.from_node
     JOIN nodes tn ON tn.id = e.to_node
     WHERE e.status = 'published'
     ORDER BY e.confidence DESC
     LIMIT $1`,
    [limit]
  )
  return rows
}

export async function getPendingEdges({ limit = 50 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM edges WHERE status='pending_review' ORDER BY confidence DESC LIMIT $1`,
    [limit]
  )
  return rows
}
