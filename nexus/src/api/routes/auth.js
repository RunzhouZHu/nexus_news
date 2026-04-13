import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createUser, getUserByEmail } from '../../db/users.js'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  try {
    const user = await createUser({ email, password })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' })
    res.status(201).json({ token, user })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    throw err
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await getUserByEmail(email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' })
  res.status(200).json({ token, user: { id: user.id, email: user.email } })
})
