import { Router } from 'express'
import { db } from '../db/index.js'
import { assets, sites, plants, areas, utilityTypes } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const createSchema = z.object({
  name: z.string().min(2, 'Asset name required'),
  utilityTypeId: z.string().uuid('Invalid utility type'),
  siteId: z.string().uuid('Invalid site'),
  plantId: z.string().uuid('Invalid plant'),
  areaId: z.string().uuid('Invalid area'),
  status: z.enum(['Active', 'Under Maintenance', 'Inactive']).default('Active'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  installDate: z.string().optional(),
  ratedKva: z.string().optional(),
})

const updateSchema = createSchema.partial()

// GET /api/assets — all assets with joins
router.get('/', requireAuth, async (_req, res) => {
  try {
    const all = await db.select({
      id: assets.id,
      name: assets.name,
      status: assets.status,
      manufacturer: assets.manufacturer,
      model: assets.model,
      serial: assets.serial,
      installDate: assets.installDate,
      ratedKva: assets.ratedKva,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
      utilityTypeId: assets.utilityTypeId,
      utilityTypeName: utilityTypes.name,
      utilityTypeIcon: utilityTypes.icon,
      siteId: assets.siteId,
      siteName: sites.name,
      plantId: assets.plantId,
      plantName: plants.name,
      areaId: assets.areaId,
      areaName: areas.name,
    })
      .from(assets)
      .leftJoin(utilityTypes, eq(assets.utilityTypeId, utilityTypes.id))
      .leftJoin(sites, eq(assets.siteId, sites.id))
      .leftJoin(plants, eq(assets.plantId, plants.id))
      .leftJoin(areas, eq(assets.areaId, areas.id))
    res.json(all)
  } catch (e) {
    console.error('Assets GET error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/assets/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [asset] = await db.select().from(assets).where(eq(assets.id, String(req.params.id)))
    if (!asset) { res.status(404).json({ error: 'Not found' }); return }
    res.json(asset)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/assets — create asset (admin/approver)
router.post('/', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [asset] = await db.insert(assets).values({
      name: parsed.data.name,
      utilityTypeId: parsed.data.utilityTypeId,
      siteId: parsed.data.siteId,
      plantId: parsed.data.plantId,
      areaId: parsed.data.areaId,
      status: parsed.data.status,
      manufacturer: parsed.data.manufacturer || null,
      model: parsed.data.model || null,
      serial: parsed.data.serial || null,
      installDate: parsed.data.installDate || null,
      ratedKva: parsed.data.ratedKva || null,
    }).returning()
    res.status(201).json(asset)
  } catch (e) {
    console.error('Asset POST error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/assets/:id
router.patch('/:id', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [asset] = await db.update(assets).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(assets.id, String(req.params.id))).returning()
    if (!asset) { res.status(404).json({ error: 'Not found' }); return }
    res.json(asset)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/assets/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(assets).where(eq(assets.id, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
