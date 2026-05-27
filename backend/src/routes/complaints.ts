import { Router } from 'express'
import { db } from '../db/index.js'
import { complaints, users, assets, utilityTypes, activityLog } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { generateNumber } from '../lib/utils.js'
import { z } from 'zod'

const router = Router()

const createSchema = z.object({
  description: z.string().min(5, 'Description required'),
  category: z.string().min(1, 'Category required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  location: z.string().optional(),
  assetId: z.string().uuid().optional().nullable(),
  utilityTypeId: z.string().uuid().optional().nullable(),
})

const updateSchema = z.object({
  status: z.enum(['Open', 'Assigned', 'In Progress', 'Pending', 'Closed']).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  timeTaken: z.string().optional(),
  completionDate: z.string().optional(),
  remarks: z.array(z.object({ text: z.string(), by: z.string(), date: z.string() })).optional(),
})

// GET /api/complaints
router.get('/', requireAuth, async (_req, res) => {
  try {
    const all = await db.select({
      id: complaints.id, number: complaints.number, category: complaints.category,
      location: complaints.location, description: complaints.description,
      status: complaints.status, priority: complaints.priority,
      timeTaken: complaints.timeTaken, completionDate: complaints.completionDate,
      remarks: complaints.remarks, createdAt: complaints.createdAt, updatedAt: complaints.updatedAt,
      assetId: complaints.assetId, assetName: assets.name,
      utilityTypeId: complaints.utilityTypeId, utilityTypeName: utilityTypes.name,
      reporterId: complaints.reporterId, reporterName: users.name,
    })
      .from(complaints)
      .leftJoin(assets, eq(complaints.assetId, assets.id))
      .leftJoin(utilityTypes, eq(complaints.utilityTypeId, utilityTypes.id))
      .leftJoin(users, eq(complaints.reporterId, users.id))
    res.json(all)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/complaints
router.post('/', requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const number = generateNumber('CMP')
    const [c] = await db.insert(complaints).values({
      number,
      category: parsed.data.category,
      location: parsed.data.location || null,
      description: parsed.data.description,
      priority: parsed.data.priority,
      reporterId: req.user!.id,
      assetId: parsed.data.assetId || null,
      utilityTypeId: parsed.data.utilityTypeId || null,
    }).returning()

    await db.insert(activityLog).values({
      userId: req.user!.id,
      action: `Complaint ${number} raised: ${parsed.data.description.slice(0, 60)}`,
      entityType: 'complaint',
      entityId: c.id,
    })

    res.status(201).json(c)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Complaint POST error:', msg)
    res.status(500).json({ error: 'Server error', detail: msg })
  }
})

// PATCH /api/complaints/:id
router.patch('/:id', requireAuth, requireRole('admin', 'approver', 'reviewer'), async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [c] = await db.update(complaints).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(complaints.id, String(req.params.id))).returning()
    if (!c) { res.status(404).json({ error: 'Not found' }); return }
    res.json(c)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
