import { Router } from 'express'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { signToken } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const { email, password } = parsed.data
    const [user] = await db.select().from(users).where(eq(users.email, email))
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role })
    const { passwordHash: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (e) {
    console.error('Login error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/me — validate token & return current user
router.post('/me', async (req, res) => {
  // requireAuth middleware is applied at the router level for this route
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id))
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    const { passwordHash: _, ...safeUser } = user
    res.json(safeUser)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
