import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  saveNode, unsaveNode, getSavedNodes,
  followTopic, unfollowTopic, getFollowedTopics,
} from '../../db/users.js'

export const userRouter = Router()
userRouter.use(requireAuth)

userRouter.post('/saved/:nodeId', async (req, res) => {
  await saveNode(req.user.userId, req.params.nodeId)
  res.status(204).end()
})

userRouter.delete('/saved/:nodeId', async (req, res) => {
  await unsaveNode(req.user.userId, req.params.nodeId)
  res.status(204).end()
})

userRouter.get('/saved', async (req, res) => {
  const nodes = await getSavedNodes(req.user.userId)
  res.json({ nodes })
})

userRouter.post('/topics', async (req, res) => {
  const { tag } = req.body
  if (!tag) return res.status(400).json({ error: 'tag required' })
  await followTopic(req.user.userId, tag)
  res.status(204).end()
})

userRouter.delete('/topics/:tag', async (req, res) => {
  await unfollowTopic(req.user.userId, req.params.tag)
  res.status(204).end()
})

userRouter.get('/topics', async (req, res) => {
  const topics = await getFollowedTopics(req.user.userId)
  res.json({ topics })
})
