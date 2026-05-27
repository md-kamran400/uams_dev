import { Router } from 'express'
import { db } from '../db/index.js'
import { pmPlans, assets, users, utilityTypes, activityLog } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const createSchema = z.object({
  task: z.string().min(3, 'Task description required'),
  assetId: z.string().uuid('Asset required'),
  utilityTypeId: z.string().uuid('Utility type required'),
  assignedToId: z.string().uuid().optional().nullable(),
  frequency: z.string().min(1, 'Frequency required'),
  nextDue: z.string().min(1, 'Next due date required'),
  estimatedHours: z.string().optional().nullable(),
  components: z.array(z.string()).optional(),
})

const updateSchema = z.object({
  status: z.enum(['Scheduled', 'Overdue', 'Completed']).optional(),
  lastDone: z.string().optional().nullable(),
  nextDue: z.string().optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  completionReason: z.string().optional(),
  components: z.array(z.string()).optional(),
})

// GET /api/pm-plans
router.get('/', requireAuth, async (_req, res) => {
  try {
    const all = await db.select({
      id: pmPlans.id, task: pmPlans.task, frequency: pmPlans.frequency,
      nextDue: pmPlans.nextDue, lastDone: pmPlans.lastDone,
      status: pmPlans.status, components: pmPlans.components,
      estimatedHours: pmPlans.estimatedHours, completionReason: pmPlans.completionReason,
      createdAt: pmPlans.createdAt, updatedAt: pmPlans.updatedAt,
      assetId: pmPlans.assetId, assetName: assets.name,
      utilityTypeId: pmPlans.utilityTypeId, utilityTypeName: utilityTypes.name,
      assignedToId: pmPlans.assignedToId, assignedToName: users.name,
    })
      .from(pmPlans)
      .leftJoin(assets, eq(pmPlans.assetId, assets.id))
      .leftJoin(utilityTypes, eq(pmPlans.utilityTypeId, utilityTypes.id))
      .leftJoin(users, eq(pmPlans.assignedToId, users.id))
    res.json(all)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/pm-plans
router.post('/', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [plan] = await db.insert(pmPlans).values({
      task: parsed.data.task,
      assetId: parsed.data.assetId,
      utilityTypeId: parsed.data.utilityTypeId,
      assignedToId: parsed.data.assignedToId ?? null,
      frequency: parsed.data.frequency,
      nextDue: parsed.data.nextDue,
      estimatedHours: parsed.data.estimatedHours ?? null,
      components: parsed.data.components ?? [],
      status: 'Scheduled',
    }).returning()

    await db.insert(activityLog).values({
      userId: req.user!.id,
      action: `PM Plan created: ${parsed.data.task}`,
      entityType: 'pm_plan',
      entityId: plan.id,
    })

    res.status(201).json(plan)
  } catch (e) {
    console.error('PM Plans POST error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/pm-plans/:id
router.patch('/:id', requireAuth, requireRole('admin', 'approver', 'reviewer', 'engineer'), async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [plan] = await db.update(pmPlans).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(pmPlans.id, String(req.params.id))).returning()
    if (!plan) { res.status(404).json({ error: 'Not found' }); return }
    res.json(plan)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/pm-plans/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(pmPlans).where(eq(pmPlans.id, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
