import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { graphRouter } from './routes/graph.js'
import { searchRouter } from './routes/search.js'
import { userRouter } from './routes/user.js'

export const app = express()
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api', graphRouter)
app.use('/api', searchRouter)
app.use('/api/user', userRouter)

app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})
