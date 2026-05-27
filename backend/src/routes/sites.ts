import { Router } from 'express'
import { db } from '../db/index.js'
import { sites, plants, areas } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

// GET /api/sites — all sites
router.get('/', requireAuth, async (_req, res) => {
  try {
    const all = await db.select().from(sites)
    res.json(all)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/sites/hierarchy — sites with plants and areas
router.get('/hierarchy', requireAuth, async (_req, res) => {
  try {
    const allSites = await db.select().from(sites)
    const allPlants = await db.select().from(plants)
    const allAreas = await db.select().from(areas)

    const result = allSites.map(site => ({
      ...site,
      plants: allPlants
        .filter(p => p.siteId === site.id)
        .map(plant => ({
          ...plant,
          areas: allAreas.filter(a => a.plantId === plant.id),
        })),
    }))

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/sites
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name } = z.object({ name: z.string().min(2) }).parse(req.body)
    const [site] = await db.insert(sites).values({ name }).returning()
    res.status(201).json(site)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/sites/plants
router.post('/plants', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { siteId, name } = z.object({ siteId: z.string().uuid(), name: z.string().min(2) }).parse(req.body)
    const [plant] = await db.insert(plants).values({ siteId, name }).returning()
    res.status(201).json(plant)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/sites/areas
router.post('/areas', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { plantId, name } = z.object({ plantId: z.string().uuid(), name: z.string().min(2) }).parse(req.body)
    const [area] = await db.insert(areas).values({ plantId, name }).returning()
    res.status(201).json(area)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
