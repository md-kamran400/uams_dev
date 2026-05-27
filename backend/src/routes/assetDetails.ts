import { Router } from 'express'
import { db } from '../db/index.js'
import {
  assets, assetComponents, assetFiles, users,
  submissions, breakdowns, pmPlans, spares,
  utilityTypes, sites, plants, areas,
  assetFormFieldOverrides, assetExtraFields,
  utForms, utFormSections, utFormSectionFields, utFields,
  assetChecklists, assetChecklistItems,
} from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'
import { renderPdf, renderExcel, renderCsv } from '../lib/reports/render.js'
import { buildTemplateReport, type RunContext } from '../lib/reports/engine.js'
import { utReportTemplates } from '../db/schema.js'

const router = Router()

// â”€â”€ GET /api/assets/:id/overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns the asset with enriched data for the Overview tab
router.get('/:id/overview', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const [row] = await db.select({
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
      .where(eq(assets.id, assetId))

    if (!row) { res.status(404).json({ error: 'Asset not found' }); return }

    // PM Plans summary for this asset
    const pmList = await db.select().from(pmPlans).where(eq(pmPlans.assetId, assetId))
    const latestPm = pmList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    // Recent breakdowns
    const bdList = await db.select().from(breakdowns).where(eq(breakdowns.assetId, assetId))
    const openBreakdowns = bdList.filter(b => !['Resolved', 'Closed'].includes(b.status)).length

    res.json({
      ...row,
      pmPlans: pmList,
      lastServiceDate: latestPm?.lastDone ?? null,
      nextServiceDue: latestPm?.nextDue ?? null,
      openBreakdowns,
    })
  } catch (e) {
    console.error('Asset overview error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ GET /api/assets/:id/components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id/components', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const rows = await db.select().from(assetComponents)
      .where(eq(assetComponents.assetId, assetId))
      .orderBy(assetComponents.createdAt)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

const componentSchema = z.object({
  name: z.string().min(1),
  group: z.string().min(1).default('General'),
  partNumber: z.string().optional(),
  condition: z.enum(['Good', 'Fair', 'Due for Replacement']).default('Good'),
  lastChecked: z.string().optional(),
  notes: z.string().optional(),
})

// â”€â”€ POST /api/assets/:id/components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:id/components', requireAuth, requireRole('admin', 'approver', 'engineer'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const parsed = componentSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }

    const [row] = await db.insert(assetComponents).values({
      assetId,
      ...parsed.data,
      lastChecked: parsed.data.lastChecked || null,
      partNumber: parsed.data.partNumber || '',
    }).returning()
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ PATCH /api/assets/:id/components/:cid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.patch('/:id/components/:cid', requireAuth, requireRole('admin', 'approver', 'engineer'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const cid = String(req.params.cid)
    const parsed = componentSchema.partial().safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }

    const [row] = await db.update(assetComponents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(assetComponents.id, cid), eq(assetComponents.assetId, assetId)))
      .returning()
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ DELETE /api/assets/:id/components/:cid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/:id/components/:cid', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const cid = String(req.params.cid)
    await db.delete(assetComponents)
      .where(and(eq(assetComponents.id, cid), eq(assetComponents.assetId, assetId)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Checklists ──────────────────────────────────────────────────────────────

// GET /api/assets/:id/checklists
router.get('/:id/checklists', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const checklists = await db.select().from(assetChecklists)
      .where(eq(assetChecklists.assetId, assetId))
      .orderBy(assetChecklists.createdAt)
    const items = await db.select().from(assetChecklistItems)
      .where(eq(assetChecklistItems.assetId, assetId))
      .orderBy(assetChecklistItems.sortOrder)
    const result = checklists.map(cl => ({
      ...cl,
      items: items.filter(it => it.checklistId === cl.id),
    }))
    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/assets/:id/checklists
router.post('/:id/checklists', requireAuth, requireRole('admin', 'approver', 'engineer'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const { frequency } = req.body
    if (!frequency) { res.status(400).json({ error: 'frequency is required' }); return }
    const existing = await db.select().from(assetChecklists)
      .where(and(eq(assetChecklists.assetId, assetId), eq(assetChecklists.frequency, frequency)))
    if (existing.length > 0) { res.status(400).json({ error: 'Checklist for this frequency already exists' }); return }
    const [row] = await db.insert(assetChecklists).values({ assetId, frequency }).returning()
    res.status(201).json({ ...row, items: [] })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/assets/:id/checklists/:clId
router.delete('/:id/checklists/:clId', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const clId = String(req.params.clId)
    await db.delete(assetChecklists)
      .where(and(eq(assetChecklists.id, clId), eq(assetChecklists.assetId, assetId)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

const checklistItemSchema = z.object({
  name: z.string().min(1),
  frequency: z.string().min(1),
  checkingMethod: z.string().default('Visual'),
  standard: z.string().default(''),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

// GET /api/assets/:id/checklists/:clId/items
router.get('/:id/checklists/:clId/items', requireAuth, async (req, res) => {
  try {
    const clId = String(req.params.clId)
    const rows = await db.select().from(assetChecklistItems)
      .where(eq(assetChecklistItems.checklistId, clId))
      .orderBy(assetChecklistItems.sortOrder)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/assets/:id/checklists/:clId/items
router.post('/:id/checklists/:clId/items', requireAuth, requireRole('admin', 'approver', 'engineer'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const clId = String(req.params.clId)
    const parsed = checklistItemSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const [row] = await db.insert(assetChecklistItems).values({ checklistId: clId, assetId, ...parsed.data }).returning()
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/assets/:id/checklists/:clId/items/:itemId
router.patch('/:id/checklists/:clId/items/:itemId', requireAuth, requireRole('admin', 'approver', 'engineer'), async (req, res) => {
  try {
    const itemId = String(req.params.itemId)
    const clId = String(req.params.clId)
    const parsed = checklistItemSchema.partial().safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }
    const [row] = await db.update(assetChecklistItems)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(assetChecklistItems.id, itemId), eq(assetChecklistItems.checklistId, clId)))
      .returning()
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/assets/:id/checklists/:clId/items/:itemId
router.delete('/:id/checklists/:clId/items/:itemId', requireAuth, requireRole('admin', 'approver', 'engineer'), async (req, res) => {
  try {
    const itemId = String(req.params.itemId)
    const clId = String(req.params.clId)
    await db.delete(assetChecklistItems)
      .where(and(eq(assetChecklistItems.id, itemId), eq(assetChecklistItems.checklistId, clId)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ GET /api/assets/:id/files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id/files', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const rows = await db.select({
      id: assetFiles.id,
      assetId: assetFiles.assetId,
      name: assetFiles.name,
      category: assetFiles.category,
      sizeBytes: assetFiles.sizeBytes,
      uploadedAt: assetFiles.uploadedAt,
      url: assetFiles.url,
      createdAt: assetFiles.createdAt,
      uploadedById: assetFiles.uploadedById,
      uploadedByName: users.name,
    })
      .from(assetFiles)
      .leftJoin(users, eq(assetFiles.uploadedById, users.id))
      .where(eq(assetFiles.assetId, assetId))
      .orderBy(assetFiles.uploadedAt)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

const fileSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['Manual', 'Certificate', 'Inspection Report', 'Drawing', 'Photo', 'Other']).default('Other'),
  sizeBytes: z.number().optional(),
  url: z.string().optional(),
})

// â”€â”€ POST /api/assets/:id/files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/:id/files', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const parsed = fileSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }

    const user = (req as any).user
    const [row] = await db.insert(assetFiles).values({
      assetId,
      ...parsed.data,
      uploadedById: user?.id ?? null,
    }).returning()
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ DELETE /api/assets/:id/files/:fid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.delete('/:id/files/:fid', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const fid = String(req.params.fid)
    await db.delete(assetFiles)
      .where(and(eq(assetFiles.id, fid), eq(assetFiles.assetId, assetId)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ GET /api/assets/:id/submissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id/submissions', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const rows = await db.select().from(submissions)
      .where(eq(submissions.assetId, assetId))
      .orderBy(submissions.date)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ GET /api/assets/:id/breakdowns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id/breakdowns', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const rows = await db.select().from(breakdowns)
      .where(eq(breakdowns.assetId, assetId))
      .orderBy(breakdowns.createdAt)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ GET /api/assets/:id/pm-plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/:id/pm-plans', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const rows = await db.select({
      id: pmPlans.id,
      task: pmPlans.task,
      frequency: pmPlans.frequency,
      nextDue: pmPlans.nextDue,
      lastDone: pmPlans.lastDone,
      status: pmPlans.status,
      components: pmPlans.components,
      estimatedHours: pmPlans.estimatedHours,
      completionReason: pmPlans.completionReason,
      assetId: pmPlans.assetId,
      utilityTypeId: pmPlans.utilityTypeId,
      assignedToId: pmPlans.assignedToId,
      assignedToName: users.name,
      createdAt: pmPlans.createdAt,
      updatedAt: pmPlans.updatedAt,
    })
      .from(pmPlans)
      .leftJoin(users, eq(pmPlans.assignedToId, users.id))
      .where(eq(pmPlans.assetId, assetId))
      .orderBy(pmPlans.nextDue)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// â”€â”€ GET /api/assets/:id/spares â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns spares that belong specifically to this asset
router.get('/:id/spares', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const rows = await db.select().from(spares)
      .where(eq(spares.assetId, assetId))
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/assets/:id/forms ─────────────────────────────────────────────────
// Returns utility forms for this asset's utility type
router.get('/:id/forms', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const [asset] = await db.select({ utilityTypeId: assets.utilityTypeId })
      .from(assets).where(eq(assets.id, assetId))
    if (!asset) { res.status(404).json({ error: 'Asset not found' }); return }

    const forms = await db.select().from(utForms)
      .where(eq(utForms.utilityTypeId, asset.utilityTypeId))
      .orderBy(utForms.sortOrder)
    res.json(forms)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── GET /api/assets/:id/forms/:formId ────────────────────────────────────────
// Returns form with sections, fields, and per-asset overrides + extra fields
router.get('/:id/forms/:formId', requireAuth, async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const formId = String(req.params.formId)

    const [form] = await db.select().from(utForms).where(eq(utForms.id, formId))
    if (!form) { res.status(404).json({ error: 'Form not found' }); return }

    const sections = await db.select().from(utFormSections)
      .where(eq(utFormSections.formId, formId))
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
      .where(eq(utFormSectionFields.formId, formId))
      .orderBy(utFormSectionFields.sortOrder)

    const overrides = await db.select().from(assetFormFieldOverrides)
      .where(eq(assetFormFieldOverrides.assetId, assetId))

    const extraFields = await db.select().from(assetExtraFields)
      .where(and(eq(assetExtraFields.assetId, assetId), eq(assetExtraFields.formId, formId)))

    res.json({
      ...form,
      sections: sections.map(s => ({
        ...s,
        fields: sectionFields
          .filter(f => f.sectionId === s.id)
          .map(f => {
            const override = overrides.find(o => o.formSectionFieldId === f.id)
            return { ...f, isHidden: override?.isHidden ?? false, assetRequiredOverride: override?.requiredOverride ?? null }
          }),
        extraFields: extraFields.filter(ef => ef.sectionId === s.id),
      })),
    })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── PATCH /api/assets/:id/forms/:formId/fields/:sfId ─────────────────────────
// Upsert field override (hide/show/required) for this asset
router.patch('/:id/forms/:formId/fields/:sfId', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const sfId = String(req.params.sfId)
    const parsed = z.object({
      isHidden: z.boolean().optional(),
      requiredOverride: z.boolean().nullable().optional(),
    }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }

    const [existing] = await db.select().from(assetFormFieldOverrides)
      .where(and(
        eq(assetFormFieldOverrides.assetId, assetId),
        eq(assetFormFieldOverrides.formSectionFieldId, sfId)
      ))

    if (existing) {
      const [row] = await db.update(assetFormFieldOverrides)
        .set({
          isHidden: parsed.data.isHidden ?? existing.isHidden,
          requiredOverride: parsed.data.requiredOverride !== undefined ? parsed.data.requiredOverride : existing.requiredOverride,
          updatedAt: new Date(),
        })
        .where(eq(assetFormFieldOverrides.id, existing.id))
        .returning()
      res.json(row)
    } else {
      const [row] = await db.insert(assetFormFieldOverrides).values({
        assetId,
        formSectionFieldId: sfId,
        isHidden: parsed.data.isHidden ?? false,
        requiredOverride: parsed.data.requiredOverride ?? null,
      }).returning()
      res.status(201).json(row)
    }
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/assets/:id/forms/:formId/sections/:sectionId/extra-fields ───────
router.post('/:id/forms/:formId/sections/:sectionId/extra-fields', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const formId = String(req.params.formId)
    const sectionId = String(req.params.sectionId)

    const [asset] = await db.select({ utilityTypeId: assets.utilityTypeId })
      .from(assets).where(eq(assets.id, assetId))
    if (!asset) { res.status(404).json({ error: 'Asset not found' }); return }

    const parsed = z.object({
      name: z.string().min(1),
      type: z.enum(['number', 'text', 'time', 'dropdown', 'date', 'photo', 'video']).default('number'),
      unit: z.string().optional().default(''),
      required: z.boolean().optional().default(true),
      computed: z.boolean().optional().default(false),
      formula: z.string().nullable().optional(),
      options: z.array(z.string()).optional(),
      sortOrder: z.number().optional().default(0),
    }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }

    const [row] = await db.insert(assetExtraFields).values({
      assetId, formId, sectionId,
      utilityTypeId: asset.utilityTypeId,
      ...parsed.data,
      formula: parsed.data.formula ?? null,
    }).returning()
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── DELETE /api/assets/:id/extra-fields/:efId ─────────────────────────────────
router.delete('/:id/extra-fields/:efId', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const assetId = String(req.params.id)
    const efId = String(req.params.efId)
    await db.delete(assetExtraFields)
      .where(and(eq(assetExtraFields.id, efId), eq(assetExtraFields.assetId, assetId)))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/assets/:id/reports/generate ────────────────────────
// Streams the report file directly (PDF/XLSX/CSV) — no intermediate storage.
// Accepts either `templateId` (preferred, used by the new template-driven
// admin UI) or `reportType` (legacy — resolved against the template `slug`).
const reportGenerateSchema = z.object({
  templateId: z.string().uuid().optional(),
  reportType: z.string().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['PDF', 'Excel', 'CSV']),
}).refine(d => !!d.templateId || !!d.reportType, {
  message: 'Either templateId or reportType is required',
})

router.post('/:id/reports/generate', requireAuth, async (req, res) => {
  try {
    const parsed = reportGenerateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const { fromDate, toDate, format } = parsed.data
    const assetId = String(req.params.id)
    const user = (req as any).user
    const generatedBy = user?.name ?? user?.email ?? 'UAMS'

    // Resolve templateId — either passed directly, or looked up by slug + the
    // asset's utility type.
    let templateId = parsed.data.templateId
    if (!templateId && parsed.data.reportType) {
      const [a] = await db.select({ utilityTypeId: assets.utilityTypeId })
        .from(assets).where(eq(assets.id, assetId))
      if (!a) { res.status(404).json({ error: 'Asset not found' }); return }
      const [tpl] = await db.select({ id: utReportTemplates.id })
        .from(utReportTemplates)
        .where(and(
          eq(utReportTemplates.utilityTypeId, a.utilityTypeId),
          eq(utReportTemplates.slug, parsed.data.reportType),
        ))
      if (!tpl) { res.status(404).json({ error: 'Report template not found' }); return }
      templateId = tpl.id
    }

    const ctx: RunContext = {
      fromDate, toDate,
      scope: { kind: 'asset', assetId },
      generatedBy,
    }
    const doc = await buildTemplateReport(templateId!, ctx)
    if (!doc) {
      res.status(404).json({ error: 'Template or asset not found' })
      return
    }

    if (format === 'PDF') {
      renderPdf(doc, res)
    } else if (format === 'Excel') {
      await renderExcel(doc, res)
    } else {
      renderCsv(doc, res)
    }
  } catch (e) {
    console.error('Report generation error:', e)
    if (!res.headersSent) res.status(500).json({ error: 'Server error' })
  }
})

// ── POST /api/assets/:id/reports/preview ────────────────────────
// Returns the resolved `ReportDocument` as JSON for on-screen preview.
// Same plumbing as /generate but no PDF/Excel/CSV streaming. Truncates each
// table's rows to a fixed cap so previews stay snappy.
const PREVIEW_ROW_LIMIT = 100
const reportPreviewSchema = z.object({
  templateId: z.string().uuid().optional(),
  reportType: z.string().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(d => !!d.templateId || !!d.reportType, {
  message: 'Either templateId or reportType is required',
})

router.post('/:id/reports/preview', requireAuth, async (req, res) => {
  try {
    const parsed = reportPreviewSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const assetId = String(req.params.id)
    const user = (req as any).user
    const generatedBy = user?.name ?? user?.email ?? 'UAMS'

    let templateId = parsed.data.templateId
    if (!templateId && parsed.data.reportType) {
      const [a] = await db.select({ utilityTypeId: assets.utilityTypeId })
        .from(assets).where(eq(assets.id, assetId))
      if (!a) { res.status(404).json({ error: 'Asset not found' }); return }
      const [tpl] = await db.select({ id: utReportTemplates.id })
        .from(utReportTemplates)
        .where(and(
          eq(utReportTemplates.utilityTypeId, a.utilityTypeId),
          eq(utReportTemplates.slug, parsed.data.reportType),
        ))
      if (!tpl) { res.status(404).json({ error: 'Report template not found' }); return }
      templateId = tpl.id
    }

    const ctx: RunContext = {
      fromDate: parsed.data.fromDate, toDate: parsed.data.toDate,
      scope: { kind: 'asset', assetId },
      generatedBy,
    }
    const doc = await buildTemplateReport(templateId!, ctx)
    if (!doc) { res.status(404).json({ error: 'Template or asset not found' }); return }
    const truncated = {
      ...doc,
      tables: doc.tables.map(t => ({
        ...t,
        totalRows: t.rows.length,
        rows: t.rows.slice(0, PREVIEW_ROW_LIMIT),
      })),
    }
    res.json(truncated)
  } catch (e) {
    console.error('Asset report preview error:', e)
    if (!res.headersSent) res.status(500).json({ error: 'Server error' })
  }
})

export default router
