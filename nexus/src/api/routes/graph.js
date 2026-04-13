import { Router } from 'express'
import { getPublishedNodes, getNodeById, getNodesByIds } from '../../db/nodes.js'
import { getEdgesForNode, getEdgesForNodes, getAllPublishedEdges, getConnectionsForNode } from '../../db/edges.js'
import { getSourcesForNode } from '../../db/sources.js'

export const graphRouter = Router()

graphRouter.get('/nodes', async (req, res) => {
  const tags = req.query.tags ? req.query.tags.split(',') : []
  const trending = req.query.trending === 'true'
  const limit = Math.min(parseInt(req.query.limit ?? '100'), 500)
  const offset = parseInt(req.query.offset ?? '0')
  const nodes = await getPublishedNodes({ tags, trending, limit, offset })
  res.json({ nodes })
})

graphRouter.get('/nodes/:id', async (req, res) => {
  const node = await getNodeById(req.params.id)
  if (!node || node.status !== 'published') return res.status(404).json({ error: 'Not found' })
  const sources = await getSourcesForNode(req.params.id)
  res.json({ node, sources })
})

graphRouter.get('/nodes/:id/connections', async (req, res) => {
  const node = await getNodeById(req.params.id)
  if (!node) return res.status(404).json({ error: 'Not found' })

  const limit = Math.min(parseInt(req.query.limit ?? '10'), 50)
  const offset = parseInt(req.query.offset ?? '0')
  const sort = req.query.sort === 'created_at' ? 'created_at' : 'confidence'

  const { edges, total } = await getConnectionsForNode(req.params.id, { limit, offset, sort })

  // Collect the IDs of connected nodes (the other end of each edge)
  const connectedIds = [...new Set(
    edges.map((e) => e.from_node === req.params.id ? e.to_node : e.from_node)
  )]
  const nodes = await getNodesByIds(connectedIds)

  res.json({ nodes, edges, total, offset })
})

// Bulk edges: GET /api/edges?nodes=id1,id2,... or /api/edges for all published
graphRouter.get('/edges', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '500'), 2000)
  if (req.query.nodes) {
    const nodeIds = req.query.nodes.split(',').filter(Boolean)
    const edges = await getEdgesForNodes(nodeIds)
    return res.json({ edges })
  }
  const edges = await getAllPublishedEdges({ limit })
  res.json({ edges })
})
