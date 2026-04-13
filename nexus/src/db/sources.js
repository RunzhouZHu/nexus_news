import { pool } from './client.js'

export async function createSource({ node_id, outlet, url, published_at, media_type }) {
  const { rows } = await pool.query(
    `INSERT INTO sources (node_id, outlet, url, published_at, media_type)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [node_id, outlet, url, published_at, media_type]
  )
  return rows[0]
}

export async function getSourcesForNode(nodeId) {
  const { rows } = await pool.query(
    'SELECT * FROM sources WHERE node_id=$1 ORDER BY published_at ASC',
    [nodeId]
  )
  return rows
}

export async function sourceExistsByUrl(url) {
  const { rows } = await pool.query('SELECT id FROM sources WHERE url=$1', [url])
  return rows.length > 0
}
