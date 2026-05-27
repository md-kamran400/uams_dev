import { Router } from 'express'
import { db } from '../db/index.js'
import { spares } from '../db/schema.js'
import { eq, and, isNull } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  partCode: z.string().min(1, 'Part code required'),
  unit: z.string().default('Pcs'),
  minStock: z.coerce.number().int().default(0),
  currentQty: z.coerce.number().int().default(0),
  unitCost: z.string().default('0'),
  utilityTypeId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  location: z.string().nullable().optional(),
})

const qtySchema = z.object({
  currentQty: z.coerce.number().int(),
})

// GET /api/spares?assetId=&utilityTypeId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { assetId, utilityTypeId } = req.query as Record<string, string>
    let rows
    if (assetId) {
      rows = await db.select().from(spares).where(eq(spares.assetId, assetId))
    } else if (utilityTypeId) {
      // utility-level spares: linked to utility but no specific asset
      rows = await db.select().from(spares).where(
        and(eq(spares.utilityTypeId, utilityTypeId), isNull(spares.assetId))
      )
    } else {
      rows = await db.select().from(spares)
    }
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/spares
router.post('/', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [spare] = await db.insert(spares).values({
      name: parsed.data.name,
      partCode: parsed.data.partCode,
      unit: parsed.data.unit,
      minStock: parsed.data.minStock,
      currentQty: parsed.data.currentQty,
      unitCost: parsed.data.unitCost,
      utilityTypeId: parsed.data.utilityTypeId ?? null,
      assetId: parsed.data.assetId ?? null,
      location: parsed.data.location ?? null,
    }).returning()
    res.status(201).json(spare)
  } catch (e) {
    console.error('Spare POST error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/spares/:id/qty
router.patch('/:id/qty', requireAuth, async (req, res) => {
  try {
    const parsed = qtySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' })
      return
    }
    await db.update(spares).set({ currentQty: parsed.data.currentQty, updatedAt: new Date() })
      .where(eq(spares.id, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/spares/:id
router.patch('/:id', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const parsed = createSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [spare] = await db.update(spares).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(spares.id, String(req.params.id))).returning()
    if (!spare) { res.status(404).json({ error: 'Not found' }); return }
    res.json(spare)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/spares/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(spares).where(eq(spares.id, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
