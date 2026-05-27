// Report template CRUD + utility-scope generate endpoint.
//
// Asset-scope generation lives in `assetDetails.ts` for path-shape consistency
// (`POST /api/assets/:id/reports/generate`); this router handles everything
// else under `/api/utility-types/:utilityTypeId/reports/...`.

import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import {
  utFields, utReportTemplates, utReportSections, utReportSectionColumns,
} from '../db/schema.js'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { buildTemplateReport, type RunContext } from '../lib/reports/engine.js'
import { renderPdf, renderExcel, renderCsv } from '../lib/reports/render.js'
import { SKELETONS, findSkeleton } from '../lib/reports/skeletons.js'

const router = Router({ mergeParams: true })

// ── Skeleton catalog ──────────────────────────────────────
// Lists the pre-built report skeletons admins can instantiate. The
// utility-type in the path is unused — kept for path consistency with the
// rest of the templates router.
router.get('/skeletons', requireAuth, async (_req, res) => {
  // Strip slot definitions of any internal-only fields; the frontend wants
  // a stable, minimal catalog payload.
  res.json(SKELETONS.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    defaultScope: s.defaultScope,
    slots: s.slots,
    // Hint at structure without exposing the full column tree (admins see
    // the sections after they instantiate)
    sectionCount: s.sections.length,
    sourcesUsed: Array.from(new Set(s.sections.map(sec => sec.source))),
  })))
})

// ── Instantiate a skeleton ────────────────────────────────
// Body: { skeletonId, mappings: { slotKey: fieldId | null }, name?, slug? }
//
// - Looks up the skeleton by id
// - Validates that every required slot has a fieldId
// - Inserts a template + sections + columns, resolving `slot` → fieldId/name
//   using the supplied mappings. Columns whose slot was skipped are omitted.
router.post('/from-skeleton', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const parsed = z.object({
      skeletonId: z.string().min(1),
      mappings: z.record(z.string(), z.string().uuid().nullable()),
      name: z.string().min(1).optional(),
      slug: z.string().min(1).max(60).optional(),
    }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const { skeletonId, mappings, name, slug } = parsed.data

    const skeleton = findSkeleton(skeletonId)
    if (!skeleton) { res.status(404).json({ error: 'Unknown skeleton' }); return }

    // Verify every required slot has a mapping
    for (const slot of skeleton.slots) {
      if (slot.required && !mappings[slot.key]) {
        res.status(400).json({ error: `Required slot "${slot.label}" must be mapped to a field.` })
        return
      }
    }

    // Build a fieldId → fieldName lookup for the utility (used so each
    // column's `fieldName` is denormalised on insert)
    const fieldRows = await db.select({ id: utFields.id, name: utFields.name })
      .from(utFields).where(eq(utFields.utilityTypeId, utilityTypeId))
    const fieldNameById = new Map(fieldRows.map(f => [f.id, f.name] as const))

    // Pick a unique slug (auto-suffix if collision)
    const baseSlug = slug ?? skeleton.id
    let finalSlug = baseSlug
    {
      const existing = await db.select({ slug: utReportTemplates.slug })
        .from(utReportTemplates).where(eq(utReportTemplates.utilityTypeId, utilityTypeId))
      const existingSet = new Set(existing.map(r => r.slug))
      let n = 2
      while (existingSet.has(finalSlug)) { finalSlug = `${baseSlug}-${n++}` }
    }

    // Insert the template
    const [tpl] = await db.insert(utReportTemplates).values({
      utilityTypeId,
      slug: finalSlug,
      name: name ?? skeleton.name,
      description: skeleton.description,
      icon: skeleton.icon,
      defaultScope: skeleton.defaultScope,
      sortOrder: 0,
    }).returning()

    // Insert sections + columns
    let secOrder = 0
    for (const sec of skeleton.sections) {
      const [secRow] = await db.insert(utReportSections).values({
        templateId: tpl.id,
        title: sec.title,
        source: sec.source,
        grouping: sec.grouping ?? 'row',
        filters: {},
        utilityScopeBehavior: sec.utilityScopeBehavior ?? 'append_asset_col',
        sortOrder: secOrder++,
      }).returning()

      let colOrder = 0
      for (const col of sec.columns) {
        // Resolve `slot` to a concrete fieldId. If the slot was skipped by the
        // admin (mappings[slot] is null/undefined), drop the column entirely.
        let fieldId: string | null = null
        let fieldName: string | null = null
        if (col.slot) {
          const mapped = mappings[col.slot]
          if (!mapped) continue   // skip optional, unmapped slot
          fieldId = mapped
          fieldName = fieldNameById.get(mapped) ?? null
        }
        await db.insert(utReportSectionColumns).values({
          sectionId: secRow.id,
          label: col.label,
          key: col.key,
          kind: col.kind,
          builtin: col.builtin ?? null,
          fieldId,
          fieldName,
          aggregate: col.aggregate ?? null,
          formula: col.formula ?? null,
          width: col.width ?? 80,
          align: col.align ?? 'left',
          format: col.digits !== undefined ? { digits: col.digits } : {},
          sortOrder: colOrder++,
        })
      }
    }

    res.status(201).json({ ok: true, templateId: tpl.id })
  } catch (e) {
    console.error('from-skeleton error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── List "copy candidates" — templates from OTHER utilities ───────
// Returns every template in the DB that doesn't belong to this utility, so the
// admin can pick one to clone.
router.get('/copy-candidates', requireAuth, async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const rows = await db.select({
      id: utReportTemplates.id,
      slug: utReportTemplates.slug,
      name: utReportTemplates.name,
      description: utReportTemplates.description,
      icon: utReportTemplates.icon,
      sourceUtilityTypeId: utReportTemplates.utilityTypeId,
    })
      .from(utReportTemplates)
      .where(ne(utReportTemplates.utilityTypeId, utilityTypeId))
      .orderBy(utReportTemplates.name)
    res.json(rows)
  } catch (e) {
    console.error('copy-candidates error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Copy a template from another utility ──────────────────
// Body: { sourceTemplateId }
//
// Duplicates the template (with all its sections and columns) into the target
// utility. Field references are re-resolved by name against the target's
// `utFields`: matches keep their field, unmatched columns become "unmapped"
// (`fieldId=null`, `fieldName` preserved as a hint) so the admin can fix them
// in the editor.
router.post('/copy-from', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const parsed = z.object({
      sourceTemplateId: z.string().uuid(),
      name: z.string().min(1).optional(),
      slug: z.string().min(1).max(60).optional(),
    }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }

    // Load source template (must belong to a different utility)
    const [src] = await db.select().from(utReportTemplates)
      .where(eq(utReportTemplates.id, parsed.data.sourceTemplateId))
    if (!src) { res.status(404).json({ error: 'Source template not found' }); return }
    if (src.utilityTypeId === utilityTypeId) {
      res.status(400).json({ error: 'Cannot copy a template into its own utility — use Edit instead.' })
      return
    }

    const sourceSections = await db.select().from(utReportSections)
      .where(eq(utReportSections.templateId, src.id))
      .orderBy(utReportSections.sortOrder)
    const sourceSectionIds = sourceSections.map(s => s.id)
    const sourceColumns = sourceSectionIds.length
      ? await db.select().from(utReportSectionColumns)
          .where(inArray(utReportSectionColumns.sectionId, sourceSectionIds))
          .orderBy(utReportSectionColumns.sortOrder)
      : []

    // Resolve target utility's fields by name → id
    const targetFields = await db.select({ id: utFields.id, name: utFields.name })
      .from(utFields).where(eq(utFields.utilityTypeId, utilityTypeId))
    const idByName = new Map(targetFields.map(f => [f.name.toLowerCase(), f.id] as const))

    // Pick a unique slug in the target utility
    const baseSlug = parsed.data.slug ?? src.slug
    let finalSlug = baseSlug
    {
      const existing = await db.select({ slug: utReportTemplates.slug })
        .from(utReportTemplates).where(eq(utReportTemplates.utilityTypeId, utilityTypeId))
      const existingSet = new Set(existing.map(r => r.slug))
      let n = 2
      while (existingSet.has(finalSlug)) { finalSlug = `${baseSlug}-${n++}` }
    }

    const [tpl] = await db.insert(utReportTemplates).values({
      utilityTypeId,
      slug: finalSlug,
      name: parsed.data.name ?? src.name,
      description: src.description,
      icon: src.icon,
      defaultScope: src.defaultScope,
      sortOrder: 0,
    }).returning()

    let unmappedCount = 0
    for (const sec of sourceSections) {
      const [secRow] = await db.insert(utReportSections).values({
        templateId: tpl.id,
        title: sec.title,
        source: sec.source,
        grouping: sec.grouping,
        filters: sec.filters ?? {},
        utilityScopeBehavior: sec.utilityScopeBehavior,
        sortOrder: sec.sortOrder,
      }).returning()

      const cols = sourceColumns.filter(c => c.sectionId === sec.id)
      for (const c of cols) {
        let newFieldId: string | null = null
        if (c.fieldName) {
          newFieldId = idByName.get(c.fieldName.toLowerCase()) ?? null
          if (!newFieldId && c.kind !== 'builtin' && c.kind !== 'formula') unmappedCount++
        }
        await db.insert(utReportSectionColumns).values({
          sectionId: secRow.id,
          label: c.label,
          key: c.key,
          kind: c.kind,
          builtin: c.builtin,
          fieldId: newFieldId,
          fieldName: c.fieldName,
          aggregate: c.aggregate,
          formula: c.formula,
          width: c.width,
          align: c.align,
          format: c.format ?? {},
          sortOrder: c.sortOrder,
        })
      }
    }

    res.status(201).json({ ok: true, templateId: tpl.id, unmappedColumns: unmappedCount })
  } catch (e) {
    console.error('copy-from error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── List templates for a utility type ─────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const templates = await db.select().from(utReportTemplates)
      .where(eq(utReportTemplates.utilityTypeId, utilityTypeId))
      .orderBy(utReportTemplates.sortOrder)

    const templateIds = templates.map(t => t.id)
    const sections = templateIds.length
      ? await db.select().from(utReportSections)
          .where(inArray(utReportSections.templateId, templateIds))
          .orderBy(utReportSections.sortOrder)
      : []
    const sectionIds = sections.map(s => s.id)
    const columns = sectionIds.length
      ? await db.select().from(utReportSectionColumns)
          .where(inArray(utReportSectionColumns.sectionId, sectionIds))
          .orderBy(utReportSectionColumns.sortOrder)
      : []

    const out = templates.map(t => ({
      ...t,
      sections: sections
        .filter(s => s.templateId === t.id)
        .map(s => ({ ...s, columns: columns.filter(c => c.sectionId === s.id) })),
    }))
    res.json(out)
  } catch (e) {
    console.error('list templates error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Create template ───────────────────────────────────────
const templateSchema = z.object({
  slug: z.string().min(1).max(60),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  icon: z.string().optional().default('file-text'),
  defaultScope: z.enum(['asset', 'utility', 'both']).default('both'),
  sortOrder: z.number().int().optional().default(0),
})

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const parsed = templateSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const [row] = await db.insert(utReportTemplates).values({
      utilityTypeId,
      ...parsed.data,
      description: parsed.data.description ?? null,
    }).returning()
    res.status(201).json({ ...row, sections: [] })
  } catch (e: any) {
    if (e?.code === '23505') { res.status(409).json({ error: 'Slug already exists for this utility' }); return }
    console.error('create template error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Update template ───────────────────────────────────────
router.patch('/:templateId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const templateId = String(req.params.templateId)
    const parsed = templateSchema.partial().safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }
    const [row] = await db.update(utReportTemplates)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(utReportTemplates.id, templateId), eq(utReportTemplates.utilityTypeId, utilityTypeId)))
      .returning()
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json(row)
  } catch (e) {
    console.error('update template error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Delete template ───────────────────────────────────────
router.delete('/:templateId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const templateId = String(req.params.templateId)
    await db.delete(utReportTemplates)
      .where(and(eq(utReportTemplates.id, templateId), eq(utReportTemplates.utilityTypeId, utilityTypeId)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Section CRUD ──────────────────────────────────────────
const sectionSchema = z.object({
  title: z.string().min(1),
  source: z.enum(['submissions', 'breakdowns', 'pm_plans', 'tickets', 'spare_consumption', 'computed']),
  grouping: z.enum(['none', 'row', 'date', 'shift', 'date_shift', 'month', 'status', 'asset', 'priority']).default('row'),
  filters: z.record(z.unknown()).optional().default({}),
  utilityScopeBehavior: z.enum(['append_asset_col', 'collapse_per_asset', 'skip']).default('append_asset_col'),
  sortOrder: z.number().int().optional().default(0),
})

router.post('/:templateId/sections', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const templateId = String(req.params.templateId)
    const parsed = sectionSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const [row] = await db.insert(utReportSections).values({ templateId, ...parsed.data }).returning()
    res.status(201).json({ ...row, columns: [] })
  } catch (e) {
    console.error('create section error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:templateId/sections/:sectionId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const sectionId = String(req.params.sectionId)
    const parsed = sectionSchema.partial().safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }
    const [row] = await db.update(utReportSections)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(utReportSections.id, sectionId))
      .returning()
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:templateId/sections/:sectionId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const sectionId = String(req.params.sectionId)
    await db.delete(utReportSections).where(eq(utReportSections.id, sectionId))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Column CRUD ───────────────────────────────────────────
const columnSchema = z.object({
  label: z.string().min(1),
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/i, 'Key must start with a letter and contain only letters/digits/underscores'),
  kind: z.enum(['builtin', 'field', 'aggregate', 'formula']),
  builtin: z.string().nullable().optional(),
  fieldId: z.string().uuid().nullable().optional(),
  fieldName: z.string().nullable().optional(),
  aggregate: z.enum(['sum', 'avg', 'min', 'max', 'last', 'count']).nullable().optional(),
  formula: z.string().nullable().optional(),
  width: z.number().int().min(20).max(400).optional().default(80),
  align: z.enum(['left', 'right', 'center']).optional().default('left'),
  format: z.object({
    digits: z.number().int().min(0).max(6).optional(),
    dateFormat: z.enum(['short', 'long']).optional(),
  }).optional().default({}),
  sortOrder: z.number().int().optional().default(0),
})

router.post('/:templateId/sections/:sectionId/columns', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const sectionId = String(req.params.sectionId)
    const parsed = columnSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const [row] = await db.insert(utReportSectionColumns).values({
      sectionId,
      ...parsed.data,
      builtin: parsed.data.builtin ?? null,
      fieldId: parsed.data.fieldId ?? null,
      fieldName: parsed.data.fieldName ?? null,
      aggregate: parsed.data.aggregate ?? null,
      formula: parsed.data.formula ?? null,
    }).returning()
    res.status(201).json(row)
  } catch (e) {
    console.error('create column error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:templateId/sections/:sectionId/columns/:columnId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const columnId = String(req.params.columnId)
    const parsed = columnSchema.partial().safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }
    const [row] = await db.update(utReportSectionColumns)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(utReportSectionColumns.id, columnId))
      .returning()
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:templateId/sections/:sectionId/columns/:columnId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const columnId = String(req.params.columnId)
    await db.delete(utReportSectionColumns).where(eq(utReportSectionColumns.id, columnId))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Reorder helpers (bulk patch) ──────────────────────────
router.post('/:templateId/sections/reorder', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = z.object({ order: z.array(z.string().uuid()) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }
    for (let i = 0; i < parsed.data.order.length; i++) {
      await db.update(utReportSections)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(utReportSections.id, parsed.data.order[i]))
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:templateId/sections/:sectionId/columns/reorder', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const parsed = z.object({ order: z.array(z.string()) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }
    for (let i = 0; i < parsed.data.order.length; i++) {
      await db.update(utReportSectionColumns)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(utReportSectionColumns.id, parsed.data.order[i]))
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Utility-scope generate ────────────────────────────────
const generateSchema = z.object({
  templateId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['PDF', 'Excel', 'CSV']),
  assetIds: z.array(z.string().uuid()).optional(),
})

// ── Utility-scope preview (returns JSON) ──────────────────
// Same inputs as /generate (minus `format`), but instead of streaming a file
// we return the resolved `ReportDocument` as JSON so the frontend can render
// a quick on-screen preview before the admin commits to a download. Sections
// are truncated to PREVIEW_ROW_LIMIT rows each to keep the response small.
const PREVIEW_ROW_LIMIT = 100
const previewSchema = z.object({
  templateId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assetIds: z.array(z.string().uuid()).optional(),
})

router.post('/preview', requireAuth, async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const parsed = previewSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const user = (req as any).user
    const generatedBy = user?.name ?? user?.email ?? 'UAMS'
    const ctx: RunContext = {
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      scope: { kind: 'utility', utilityTypeId, assetIds: parsed.data.assetIds },
      generatedBy,
    }
    const doc = await buildTemplateReport(parsed.data.templateId, ctx)
    if (!doc) { res.status(404).json({ error: 'Template not found' }); return }
    // Truncate each section's rows for the preview payload
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
    console.error('Utility report preview error:', e)
    if (!res.headersSent) res.status(500).json({ error: 'Server error' })
  }
})

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const utilityTypeId = String(req.params.utilityTypeId)
    const parsed = generateSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }
    const user = (req as any).user
    const generatedBy = user?.name ?? user?.email ?? 'UAMS'
    const ctx: RunContext = {
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      scope: { kind: 'utility', utilityTypeId, assetIds: parsed.data.assetIds },
      generatedBy,
    }
    const doc = await buildTemplateReport(parsed.data.templateId, ctx)
    if (!doc) { res.status(404).json({ error: 'Template not found' }); return }
    if (parsed.data.format === 'PDF') renderPdf(doc, res)
    else if (parsed.data.format === 'Excel') await renderExcel(doc, res)
    else renderCsv(doc, res)
  } catch (e) {
    console.error('Utility report generation error:', e)
    if (!res.headersSent) res.status(500).json({ error: 'Server error' })
  }
})

export default router
