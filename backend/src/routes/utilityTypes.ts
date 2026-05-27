import { Router } from 'express'
import { db } from '../db/index.js'
import { utilityTypes, utFields, utKpis, utAlertRules, utComponents, utForms, utFormSections, utFormSectionFields, utAnalyticsLayouts } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

// GET /api/utility-types — list all with fields, KPIs, etc.
router.get('/', requireAuth, async (_req, res) => {
  try {
    const types = await db.select().from(utilityTypes)
    res.json(types)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/utility-types/:id/full — with all sub-resources
router.get('/:id/full', requireAuth, async (req, res) => {
  try {
    const [ut] = await db.select().from(utilityTypes).where(eq(utilityTypes.id, String(req.params.id)))
    if (!ut) { res.status(404).json({ error: 'Not found' }); return }

    const [fields, kpis, alertRules, components, forms] = await Promise.all([
      db.select().from(utFields).where(eq(utFields.utilityTypeId, String(req.params.id))),
      db.select().from(utKpis).where(eq(utKpis.utilityTypeId, String(req.params.id))),
      db.select().from(utAlertRules).where(eq(utAlertRules.utilityTypeId, String(req.params.id))),
      db.select().from(utComponents).where(eq(utComponents.utilityTypeId, String(req.params.id))),
      db.select().from(utForms).where(eq(utForms.utilityTypeId, String(req.params.id))),
    ])

    res.json({ ...ut, fields, kpis, alertRules, components, forms })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

const createSchema = z.object({
  name: z.string().min(2),
  icon: z.string().default('🔧'),
  category: z.string().default('General'),
  description: z.string().optional(),
})

// POST /api/utility-types
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [ut] = await db.insert(utilityTypes).values(parsed.data).returning()
    res.status(201).json(ut)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/utility-types/:id
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = createSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [ut] = await db.update(utilityTypes).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(utilityTypes.id, String(req.params.id))).returning()
    if (!ut) { res.status(404).json({ error: 'Not found' }); return }
    res.json(ut)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/utility-types/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utilityTypes).where(eq(utilityTypes.id, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

const fieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['number', 'text', 'time', 'dropdown', 'date', 'photo', 'video']).default('number'),
  unit: z.string().optional().default(''),
  required: z.boolean().optional().default(true),
  computed: z.boolean().optional().default(false),
  formula: z.string().nullable().optional(),
  options: z.array(z.string()).nullable().optional(),
  sortOrder: z.number().optional().default(0),
})

// POST /api/utility-types/:id/fields
router.post('/:id/fields', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = fieldSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [field] = await db.insert(utFields).values({ ...parsed.data, utilityTypeId: String(req.params.id) }).returning()
    res.status(201).json(field)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/utility-types/:id/fields/:fieldId
router.patch('/:id/fields/:fieldId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = fieldSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const [field] = await db.update(utFields).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(utFields.id, String(req.params.fieldId))).returning()
    if (!field) { res.status(404).json({ error: 'Not found' }); return }
    res.json(field)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/utility-types/:id/fields/:fieldId
router.delete('/:id/fields/:fieldId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utFields).where(eq(utFields.id, String(req.params.fieldId)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── KPIs ────────────────────────────────────────────────────────
const kpiSchema = z.object({
  name: z.string().min(1),
  formula: z.string().min(1),
  unit: z.string().optional().default(''),
  alertBelow: z.string().optional(),
  alertAbove: z.string().optional(),
  target: z.string().optional(),
  recommendedChart: z.enum(['area', 'bar', 'line', 'radial', 'pie', 'composed']).optional().default('line'),
})

router.post('/:id/kpis', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = kpiSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [kpi] = await db.insert(utKpis).values({ ...parsed.data, utilityTypeId: String(req.params.id) }).returning()
    res.status(201).json(kpi)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.patch('/:id/kpis/:kpiId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = kpiSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [kpi] = await db.update(utKpis).set({ ...parsed.data, updatedAt: new Date() }).where(eq(utKpis.id, String(req.params.kpiId))).returning()
    if (!kpi) return res.status(404).json({ error: 'Not found' })
    res.json(kpi)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id/kpis/:kpiId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utKpis).where(eq(utKpis.id, String(req.params.kpiId)))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── Alert Rules ──────────────────────────────────────────────────
const alertRuleSchema = z.object({
  name: z.string().min(1),
  fieldName: z.string().min(1),
  condition: z.enum(['>', '<', '==']),
  value: z.string().min(1),
  condition2: z.enum(['>', '<', '==']).nullable().optional(),
  value2: z.string().nullable().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  action: z.string().optional(),
})

router.post('/:id/alerts', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = alertRuleSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [alert] = await db.insert(utAlertRules).values({ ...parsed.data, utilityTypeId: String(req.params.id) }).returning()
    res.status(201).json(alert)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.patch('/:id/alerts/:alertId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = alertRuleSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [alert] = await db.update(utAlertRules).set({ ...parsed.data, updatedAt: new Date() }).where(eq(utAlertRules.id, String(req.params.alertId))).returning()
    if (!alert) return res.status(404).json({ error: 'Not found' })
    res.json(alert)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id/alerts/:alertId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utAlertRules).where(eq(utAlertRules.id, String(req.params.alertId)))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── Forms ────────────────────────────────────────────────────────────────────

router.get('/:id/forms', requireAuth, async (req, res) => {
  try {
    const forms = await db.select().from(utForms)
      .where(eq(utForms.utilityTypeId, String(req.params.id)))
      .orderBy(utForms.sortOrder)
    res.json(forms)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.get('/:id/forms/:formId/full', requireAuth, async (req, res) => {
  try {
    const [form] = await db.select().from(utForms).where(eq(utForms.id, String(req.params.formId)))
    if (!form) { res.status(404).json({ error: 'Not found' }); return }

    const sections = await db.select().from(utFormSections)
      .where(eq(utFormSections.formId, form.id))
      .orderBy(utFormSections.sortOrder)

    const sectionFields = await db.select({
      id: utFormSectionFields.id,
      formId: utFormSectionFields.formId,
      sectionId: utFormSectionFields.sectionId,
      fieldId: utFormSectionFields.fieldId,
      fieldName: utFields.name,
      fieldType: utFields.type,
      fieldUnit: utFields.unit,
      required: utFields.required,
      requiredOverride: utFormSectionFields.requiredOverride,
      sortOrder: utFormSectionFields.sortOrder,
      createdAt: utFormSectionFields.createdAt,
      updatedAt: utFormSectionFields.updatedAt,
    })
      .from(utFormSectionFields)
      .leftJoin(utFields, eq(utFormSectionFields.fieldId, utFields.id))
      .where(eq(utFormSectionFields.formId, form.id))
      .orderBy(utFormSectionFields.sortOrder)

    res.json({
      ...form,
      sections: sections.map(s => ({
        ...s,
        fields: sectionFields.filter(f => f.sectionId === s.id),
      })),
    })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

const formSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  scope: z.enum(['engineer', 'operator']).default('engineer'),
  isDefault: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
})

router.post('/:id/forms', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = formSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [form] = await db.insert(utForms).values({ ...parsed.data, utilityTypeId: String(req.params.id) }).returning()
    res.status(201).json(form)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.patch('/:id/forms/:formId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = formSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [form] = await db.update(utForms).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(utForms.id, String(req.params.formId))).returning()
    if (!form) return res.status(404).json({ error: 'Not found' })
    res.json(form)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id/forms/:formId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utForms).where(eq(utForms.id, String(req.params.formId)))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── Form Sections ─────────────────────────────────────────────────────────────

const sectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sortOrder: z.number().optional().default(0),
})

router.post('/:id/forms/:formId/sections', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = sectionSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [section] = await db.insert(utFormSections).values({ ...parsed.data, formId: String(req.params.formId) }).returning()
    res.status(201).json(section)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.patch('/:id/forms/:formId/sections/:sectionId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = sectionSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [section] = await db.update(utFormSections).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(utFormSections.id, String(req.params.sectionId))).returning()
    if (!section) return res.status(404).json({ error: 'Not found' })
    res.json(section)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id/forms/:formId/sections/:sectionId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utFormSections).where(eq(utFormSections.id, String(req.params.sectionId)))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── Section Fields ────────────────────────────────────────────────────────────

router.post('/:id/forms/:formId/sections/:sectionId/fields', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = z.object({
      fieldId: z.string().uuid(),
      requiredOverride: z.boolean().nullable().optional(),
      sortOrder: z.number().optional().default(0),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    const [sf] = await db.insert(utFormSectionFields).values({
      formId: String(req.params.formId),
      sectionId: String(req.params.sectionId),
      fieldId: parsed.data.fieldId,
      requiredOverride: parsed.data.requiredOverride ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    }).returning()
    res.status(201).json(sf)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id/forms/:formId/sections/:sectionId/fields/:sfId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utFormSectionFields).where(eq(utFormSectionFields.id, String(req.params.sfId)))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── Analytics layout (per-utility chart grid config) ─────────────────────────

const layoutItemSchema = z.object({
  kpiId: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  hidden: z.boolean().optional(),
  chartType: z.enum(['line', 'bar', 'area']).optional(),
})

const layoutSchema = z.object({
  items: z.array(layoutItemSchema),
})

router.get('/:id/analytics-layout', requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(utAnalyticsLayouts)
      .where(eq(utAnalyticsLayouts.utilityTypeId, String(req.params.id)))
    res.json(row ?? { items: [] })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.put('/:id/analytics-layout', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = layoutSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const utilityTypeId = String(req.params.id)
    const userId = (req as any).user?.id ?? null

    const [existing] = await db.select().from(utAnalyticsLayouts)
      .where(eq(utAnalyticsLayouts.utilityTypeId, utilityTypeId))

    if (existing) {
      const [updated] = await db.update(utAnalyticsLayouts).set({
        items: parsed.data.items,
        updatedById: userId,
        updatedAt: new Date(),
      }).where(eq(utAnalyticsLayouts.id, existing.id)).returning()
      res.json(updated)
    } else {
      const [created] = await db.insert(utAnalyticsLayouts).values({
        utilityTypeId,
        items: parsed.data.items,
        updatedById: userId,
      }).returning()
      res.status(201).json(created)
    }
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/:id/analytics-layout', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(utAnalyticsLayouts)
      .where(eq(utAnalyticsLayouts.utilityTypeId, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

export default router
