import { Router } from 'express'
import { db } from '../db/index.js'
import { submissions, assets, utilityTypes, users, activityLog } from '../db/schema.js'
import { eq, gte, and, lte } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { today } from '../lib/utils.js'
import { z } from 'zod'

const router = Router()

const createSchema = z.object({
  utilityTypeId: z.string().uuid('Utility type required'),
  assetId: z.string().uuid('Asset required'),
  formId: z.string().uuid().optional(),
  shift: z.enum(['A', 'B', 'C'], { message: 'Shift required' }),
  values: z.record(z.string(), z.unknown()).default({}),
})

const reviewSchema = z.object({
  status: z.enum(['Approved', 'Rejected', 'Under Review']),
  rejectionReason: z.string().optional(),
})

// GET /api/submissions — with filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { from, to, utilityTypeId, status } = req.query as Record<string, string>

    let query = db.select({
      id: submissions.id,
      date: submissions.date,
      shift: submissions.shift,
      status: submissions.status,
      values: submissions.values,
      rejectionReason: submissions.rejectionReason,
      createdAt: submissions.createdAt,
      assetId: submissions.assetId,
      assetName: assets.name,
      utilityTypeId: submissions.utilityTypeId,
      utilityTypeName: utilityTypes.name,
      operatorId: submissions.operatorId,
      operatorName: users.name,
    })
      .from(submissions)
      .leftJoin(assets, eq(submissions.assetId, assets.id))
      .leftJoin(utilityTypes, eq(submissions.utilityTypeId, utilityTypes.id))
      .leftJoin(users, eq(submissions.operatorId, users.id))

    const conditions = []
    if (from) conditions.push(gte(submissions.date, from))
    if (to) conditions.push(lte(submissions.date, to))
    if (utilityTypeId) conditions.push(eq(submissions.utilityTypeId, utilityTypeId))
    if (status) conditions.push(eq(submissions.status, status as 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'))

    const result = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query

    res.json(result)
  } catch (e) {
    console.error('Submissions GET error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/submissions — create (any authenticated user)
router.post('/', requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const operatorId = req.user!.id
    const [sub] = await db.insert(submissions).values({
      utilityTypeId: parsed.data.utilityTypeId,
      assetId: parsed.data.assetId,
      formId: parsed.data.formId ?? null,
      operatorId,
      shift: parsed.data.shift,
      values: parsed.data.values,
      status: 'Submitted',
      date: today(),
    }).returning()

    await db.insert(activityLog).values({
      userId: operatorId,
      action: `Submitted reading for shift ${parsed.data.shift}`,
      entityType: 'submission',
      entityId: sub.id,
    })

    res.status(201).json(sub)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Submissions POST error:', msg)
    res.status(500).json({ error: 'Server error', detail: msg })
  }
})

// PATCH /api/submissions/:id — review (approver/admin)
router.patch('/:id', requireAuth, requireRole('admin', 'approver', 'reviewer'), async (req, res) => {
  try {
    const parsed = reviewSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [sub] = await db.update(submissions).set({
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason ?? null,
      approvedBy: parsed.data.status === 'Approved' ? req.user!.id : null,
      updatedAt: new Date(),
    }).where(eq(submissions.id, String(req.params.id))).returning()
    if (!sub) { res.status(404).json({ error: 'Not found' }); return }

    await db.insert(activityLog).values({
      userId: req.user!.id,
      action: `Submission ${String(req.params.id)} marked as ${parsed.data.status}`,
      entityType: 'submission',
      entityId: sub.id,
    })

    res.json(sub)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
