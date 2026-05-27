import { Router } from 'express'
import { db } from '../db/index.js'
import { breakdowns, assets, users, activityLog } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const createSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  nature: z.string().min(5, 'Nature required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
})

const updateSchema = z.object({
  status: z.enum(['Raised', 'Assigned', 'In Progress', 'Resolved', 'Closed']).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  actionTaken: z.string().optional(),
  laborHours: z.string().optional(),
  downtimeHours: z.string().optional(),
  resolvedAt: z.string().optional().nullable(),
})

// GET /api/breakdowns
router.get('/', requireAuth, async (_req, res) => {
  try {
    const all = await db.select({
      id: breakdowns.id, number: breakdowns.number, nature: breakdowns.nature,
      status: breakdowns.status, priority: breakdowns.priority,
      actionTaken: breakdowns.actionTaken, sparesUsed: breakdowns.sparesUsed,
      laborHours: breakdowns.laborHours, downtimeHours: breakdowns.downtimeHours,
      resolvedAt: breakdowns.resolvedAt, createdAt: breakdowns.createdAt, updatedAt: breakdowns.updatedAt,
      assetId: breakdowns.assetId, assetName: assets.name,
      reporterId: breakdowns.reporterId, reporterName: users.name,
    })
      .from(breakdowns)
      .leftJoin(assets, eq(breakdowns.assetId, assets.id))
      .leftJoin(users, eq(breakdowns.reporterId, users.id))
    res.json(all)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/breakdowns
router.post('/', requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const number = `BRK/${Date.now().toString().slice(-6)}/01`
    const [b] = await db.insert(breakdowns).values({
      number,
      assetId: parsed.data.assetId,
      nature: parsed.data.nature,
      priority: parsed.data.priority,
      reporterId: req.user!.id,
    }).returning()

    await db.insert(activityLog).values({
      userId: req.user!.id,
      action: `Breakdown ${number} raised: ${parsed.data.nature.slice(0, 60)}`,
      entityType: 'breakdown',
      entityId: b.id,
    })

    res.status(201).json(b)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Breakdown POST error:', msg)
    res.status(500).json({ error: 'Server error', detail: msg })
  }
})

// PATCH /api/breakdowns/:id
router.patch('/:id', requireAuth, requireRole('admin', 'approver', 'reviewer', 'engineer'), async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() }
    if (parsed.data.resolvedAt) updateData.resolvedAt = new Date(parsed.data.resolvedAt)
    const [b] = await db.update(breakdowns).set(updateData).where(eq(breakdowns.id, String(req.params.id))).returning()
    if (!b) { res.status(404).json({ error: 'Not found' }); return }
    res.json(b)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
