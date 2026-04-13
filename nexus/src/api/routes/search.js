import { Router } from 'express'
import { pool } from '../../db/client.js'

export const searchRouter = Router()

searchRouter.get('/search', async (req, res) => {
  const q = req.query.q?.trim()
  if (!q) return res.json({ nodes: [] })

  const { rows } = await pool.query(
    `SELECT * FROM nodes
     WHERE status='published'
       AND (title ILIKE $1 OR summary ILIKE $1 OR $2 = ANY(tags))
     ORDER BY trending_score DESC
     LIMIT 50`,
    [`%${q}%`, q.toLowerCase()]
  )
  res.json({ nodes: rows })
})
