import { Router } from 'express'
import { requireClerkAuth } from '../middleware/auth.js'
import { upsertClerkUser } from '../../db/users.js'

export const authRouter = Router()

// Called by the frontend after Clerk sign-in/sign-up to ensure the user exists in our DB
authRouter.post('/sync', requireClerkAuth, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })

  const user = await upsertClerkUser({ clerkId: req.clerkId, email })
  res.json({ user: { id: user.id, email: user.email, avatar_url: user.avatar_url } })
})
