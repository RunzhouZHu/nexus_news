import { verifyToken } from '@clerk/express'
import { getUserByClerkId } from '../../db/users.js'

async function verifyClerkToken(req) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const payload = await verifyToken(header.slice(7), {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

// Used on routes that need a fully-synced DB user (saved nodes, topics, etc.)
export async function requireAuth(req, res, next) {
  const clerkId = await verifyClerkToken(req)
  if (!clerkId) return res.status(401).json({ error: 'Missing or invalid token' })

  const user = await getUserByClerkId(clerkId)
  if (!user) return res.status(401).json({ error: 'Account not synced. Call /api/auth/sync first.' })

  req.user = { userId: user.id, clerkId }
  next()
}

// Used on the sync endpoint — only needs a valid Clerk token, no DB user required
export async function requireClerkAuth(req, res, next) {
  const clerkId = await verifyClerkToken(req)
  if (!clerkId) return res.status(401).json({ error: 'Missing or invalid token' })
  req.clerkId = clerkId
  next()
}
