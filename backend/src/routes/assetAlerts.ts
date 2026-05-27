import { Router } from 'express'
import { db } from '../db/index.js'
import {
  utAlertRules, assetAlertRuleOverrides, assetExtraAlertRules,
  assets, utilityTypes,
} from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router({ mergeParams: true })

// GET /api/assets/:id/alerts
// Returns: { utilityRules: [...with override info], extraRules: [...] }
router.get('/:id/alerts', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const [asset] = await db.select({ utilityTypeId: assets.utilityTypeId })
      .from(assets).where(eq(assets.id, assetId))
    if (!asset) { res.status(404).json({ error: 'Asset not found' }); return }

    const [utilityRules, overrides, extraRules] = await Promise.all([
      db.select().from(utAlertRules).where(eq(utAlertRules.utilityTypeId, asset.utilityTypeId)),
      db.select().from(assetAlertRuleOverrides).where(eq(assetAlertRuleOverrides.assetId, assetId)),
      db.select().from(assetExtraAlertRules).where(eq(assetExtraAlertRules.assetId, assetId)),
    ])

    const utilityRulesWithOverrides = utilityRules.map(rule => {
      const ov = overrides.find(o => o.utilityAlertRuleId === rule.id)
      return {
        ...rule,
        isDisabled: ov?.isDisabled ?? false,
        overrideValue: ov?.overrideValue ?? null,
        overrideSeverity: ov?.overrideSeverity ?? null,
        hasOverride: !!ov,
        overrideId: ov?.id ?? null,
      }
    })

    res.json({ utilityRules: utilityRulesWithOverrides, extraRules })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

const overrideSchema = z.object({
  isDisabled: z.boolean().optional(),
  overrideValue: z.string().nullable().optional(),
  overrideSeverity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
})

// PUT /api/assets/:id/alert-overrides/:ruleId  — upsert override for a utility-level rule
router.put('/:id/alert-overrides/:ruleId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const utilityAlertRuleId = String(req.params.ruleId)
    const parsed = overrideSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }

    const existing = await db.select().from(assetAlertRuleOverrides)
      .where(and(
        eq(assetAlertRuleOverrides.assetId, assetId),
        eq(assetAlertRuleOverrides.utilityAlertRuleId, utilityAlertRuleId),
      ))

    if (existing.length > 0) {
      const [updated] = await db.update(assetAlertRuleOverrides)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(assetAlertRuleOverrides.id, existing[0].id))
        .returning()
      res.json(updated)
    } else {
      const [created] = await db.insert(assetAlertRuleOverrides)
        .values({ assetId, utilityAlertRuleId, ...parsed.data })
        .returning()
      res.status(201).json(created)
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

const extraRuleSchema = z.object({
  name: z.string().min(1),
  fieldName: z.string().min(1),
  condition: z.enum(['>', '<', '==']),
  value: z.string().min(1),
  condition2: z.enum(['>', '<', '==']).nullable().optional(),
  value2: z.string().nullable().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  action: z.string().optional(),
})

// POST /api/assets/:id/alerts  — create asset-specific alert rule
router.post('/:id/alerts', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const [asset] = await db.select({ utilityTypeId: assets.utilityTypeId })
      .from(assets).where(eq(assets.id, assetId))
    if (!asset) { res.status(404).json({ error: 'Asset not found' }); return }

    const parsed = extraRuleSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }

    const [rule] = await db.insert(assetExtraAlertRules)
      .values({ ...parsed.data, assetId, utilityTypeId: asset.utilityTypeId })
      .returning()
    res.status(201).json(rule)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/assets/:id/alerts/:ruleId  — update asset-specific rule
router.patch('/:id/alerts/:ruleId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = extraRuleSchema.partial().safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }

    const [rule] = await db.update(assetExtraAlertRules)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(
        eq(assetExtraAlertRules.id, String(req.params.ruleId)),
        eq(assetExtraAlertRules.assetId, String(req.params.id)),
      ))
      .returning()
    if (!rule) { res.status(404).json({ error: 'Not found' }); return }
    res.json(rule)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/assets/:id/alerts/:ruleId  — delete asset-specific rule
router.delete('/:id/alerts/:ruleId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(assetExtraAlertRules)
      .where(and(
        eq(assetExtraAlertRules.id, String(req.params.ruleId)),
        eq(assetExtraAlertRules.assetId, String(req.params.id)),
      ))
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
