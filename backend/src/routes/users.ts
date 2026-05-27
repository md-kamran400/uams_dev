import { Router } from 'express'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password min 6 chars').default('changeme123'),
  role: z.enum(['admin', 'approver', 'reviewer', 'operator', 'leadership', 'engineer']).default('operator'),
  shift: z.enum(['A', 'B', 'C']).nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'approver', 'reviewer', 'operator', 'leadership', 'engineer']).optional(),
  shift: z.enum(['A', 'B', 'C']).nullable().optional(),
  password: z.string().min(6).optional(),
})

// GET /api/users — list all users (admin only)
router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const all = await db.select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, shift: users.shift,
      assignedUtilityIds: users.assignedUtilityIds,
      createdAt: users.createdAt, updatedAt: users.updatedAt,
    }).from(users)
    res.json(all)
  } catch (e) {
    console.error('Users GET error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/users — create user (admin only)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    const [user] = await db.insert(users).values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      shift: parsed.data.shift ?? null,
    }).returning()
    const { passwordHash: _, ...safe } = user
    res.status(201).json(safe)
  } catch (e) {
    console.error('User POST error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/users/:id — update user (admin only)
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const update: Record<string, unknown> = {}
    if (parsed.data.name) update.name = parsed.data.name
    if (parsed.data.email) update.email = parsed.data.email
    if (parsed.data.role) update.role = parsed.data.role
    if (parsed.data.shift !== undefined) update.shift = parsed.data.shift
    if (parsed.data.password) update.passwordHash = await bcrypt.hash(parsed.data.password, 10)
    update.updatedAt = new Date()

    const [user] = await db.update(users).set(update).where(eq(users.id, String(req.params.id))).returning()
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    const { passwordHash: _, ...safe } = user
    res.json(safe)
  } catch (e) {
    console.error('User PATCH error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/users/:id — delete user (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(users).where(eq(users.id, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) {
    console.error('User DELETE error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/users/:id/assign-utility
router.post('/:id/assign-utility', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { utilityTypeId, action } = req.body
    if (!utilityTypeId || !['assign', 'unassign'].includes(action)) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const [user] = await db.select().from(users).where(eq(users.id, String(req.params.id)))
    if (!user) return res.status(404).json({ error: 'User not found' })

    const currentIds = user.assignedUtilityIds || []
    let nextIds = [...currentIds]

    if (action === 'assign' && !nextIds.includes(utilityTypeId)) {
      nextIds.push(utilityTypeId)
    } else if (action === 'unassign') {
      nextIds = nextIds.filter(id => id !== utilityTypeId)
    }

    await db.update(users).set({ assignedUtilityIds: nextIds }).where(eq(users.id, String(req.params.id)))
    res.json({ ok: true, assignedUtilityIds: nextIds })
  } catch (e) {
    console.error('Assign utility error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
