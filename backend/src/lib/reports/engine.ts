// Template-driven report engine.
//
// Reads a `ut_report_templates` row (with sections + columns) and produces a
// `ReportDocument` ready for the PDF / Excel / CSV renderer. Supports both
// asset-scope (single asset) and utility-scope (all or subset of assets) runs.
//
// Replaces the hardcoded `dailyOperation` / `fuelConsumption` / etc. builders
// in `data.ts`; that file is kept only for the legacy `reportId`-keyed entry
// point used by an older client path.

import { db } from '../../db/index.js'
import {
  assets, submissions, breakdowns, pmPlans, tickets, users, utFields,
  utilityTypes,
  utReportTemplates, utReportSections, utReportSectionColumns,
} from '../../db/schema.js'
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm'
import type { ReportDocument, ReportTable } from './data.js'

// ── Public types ───────────────────────────────────────────

export type ReportScope =
  | { kind: 'asset'; assetId: string }
  | { kind: 'utility'; utilityTypeId: string; assetIds?: string[] }

export interface RunContext {
  fromDate: string
  toDate: string
  scope: ReportScope
  generatedBy: string
}

// ── Internals ──────────────────────────────────────────────

type SectionRow = typeof utReportSections.$inferSelect
type ColumnRow = typeof utReportSectionColumns.$inferSelect

interface ResolvedTemplate {
  template: typeof utReportTemplates.$inferSelect
  sections: { section: SectionRow; columns: ColumnRow[] }[]
}

async function loadTemplate(templateId: string): Promise<ResolvedTemplate | null> {
  const [tpl] = await db.select().from(utReportTemplates).where(eq(utReportTemplates.id, templateId))
  if (!tpl) return null
  const sections = await db.select().from(utReportSections)
    .where(eq(utReportSections.templateId, templateId))
    .orderBy(utReportSections.sortOrder)
  const sectionIds = sections.map(s => s.id)
  const columns = sectionIds.length
    ? await db.select().from(utReportSectionColumns)
        .where(inArray(utReportSectionColumns.sectionId, sectionIds))
        .orderBy(utReportSectionColumns.sortOrder)
    : []
  return {
    template: tpl,
    sections: sections.map(s => ({
      section: s,
      columns: columns.filter(c => c.sectionId === s.id),
    })),
  }
}

/** Resolve `{ name: id }` map so column-level field references survive renames/deletes. */
async function buildFieldNameMap(utilityTypeId: string): Promise<Map<string, string>> {
  const fields = await db.select({ id: utFields.id, name: utFields.name })
    .from(utFields).where(eq(utFields.utilityTypeId, utilityTypeId))
  const out = new Map<string, string>()
  for (const f of fields) out.set(f.id, f.name)
  return out
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? null : n
}

function fmtNumber(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}

/** Pull a field's value from a `submissions.values` blob by trying its id, its name,
 *  and any case-insensitive variation. The same JSONB carries either id-keyed or
 *  name-keyed payloads depending on which client wrote the row. */
function getFieldValue(values: Record<string, unknown>, fieldId: string | null, fieldName: string | null): unknown {
  if (fieldId && values[fieldId] !== undefined) return values[fieldId]
  if (fieldName) {
    if (values[fieldName] !== undefined) return values[fieldName]
    const lower = fieldName.toLowerCase()
    for (const k of Object.keys(values)) {
      if (k.toLowerCase() === lower) return values[k]
    }
  }
  return undefined
}

/** Evaluate a column formula. Tokens are other column keys in the same section
 *  (e.g. `sum_hsd / sum_kwh`). Only basic arithmetic is allowed. */
function evalFormula(formula: string, rowValues: Record<string, number | null>): number | null {
  let expr = formula
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
  // Substitute identifiers (longest first to avoid prefix collisions)
  const keys = Object.keys(rowValues).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    const v = rowValues[k]
    const replacement = v === null || v === undefined || Number.isNaN(v) ? '0' : String(v)
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    expr = expr.replace(new RegExp(`\\b${escaped}\\b`, 'g'), replacement)
  }
  if (!/^[\d\s+\-*/.()]*$/.test(expr)) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr || '0'})`)()
    return typeof result === 'number' && isFinite(result) ? result : null
  } catch { return null }
}

// ── Data source loaders ────────────────────────────────────

interface SubmissionRow {
  id: string; assetId: string; assetName: string; date: string; shift: string;
  status: string; operatorName: string | null; values: Record<string, unknown>;
}

async function loadSubmissions(ctx: RunContext): Promise<SubmissionRow[]> {
  const conds = [
    gte(submissions.date, ctx.fromDate),
    lte(submissions.date, ctx.toDate),
  ]
  if (ctx.scope.kind === 'asset') {
    conds.push(eq(submissions.assetId, ctx.scope.assetId))
  } else {
    conds.push(eq(submissions.utilityTypeId, ctx.scope.utilityTypeId))
    if (ctx.scope.assetIds && ctx.scope.assetIds.length > 0) {
      conds.push(inArray(submissions.assetId, ctx.scope.assetIds))
    }
  }
  const rows = await db.select({
    id: submissions.id,
    assetId: submissions.assetId,
    assetName: assets.name,
    date: submissions.date,
    shift: submissions.shift,
    status: submissions.status,
    operatorName: users.name,
    values: submissions.values,
  })
    .from(submissions)
    .leftJoin(users, eq(submissions.operatorId, users.id))
    .leftJoin(assets, eq(submissions.assetId, assets.id))
    .where(and(...conds))
    .orderBy(submissions.date, submissions.shift)

  return rows.map(r => ({
    id: r.id,
    assetId: r.assetId,
    assetName: r.assetName ?? '—',
    date: r.date,
    shift: r.shift,
    status: r.status,
    operatorName: r.operatorName,
    values: (r.values ?? {}) as Record<string, unknown>,
  }))
}

interface BreakdownRow {
  id: string; number: string; assetId: string; assetName: string;
  nature: string; status: string; priority: string;
  downtimeHours: string | null; laborHours: string | null;
  reporterName: string | null; assignedToName: string | null;
  createdAt: Date; resolvedAt: Date | null;
}

async function loadBreakdowns(ctx: RunContext): Promise<BreakdownRow[]> {
  const conds = [
    gte(breakdowns.createdAt, new Date(ctx.fromDate)),
    lte(breakdowns.createdAt, new Date(ctx.toDate + 'T23:59:59')),
  ]
  if (ctx.scope.kind === 'asset') {
    conds.push(eq(breakdowns.assetId, ctx.scope.assetId))
  } else {
    const assetIds = await resolveAssetIds(ctx)
    if (assetIds.length === 0) return []
    conds.push(inArray(breakdowns.assetId, assetIds))
  }
  const rows = await db.select({
    id: breakdowns.id,
    number: breakdowns.number,
    assetId: breakdowns.assetId,
    assetName: assets.name,
    nature: breakdowns.nature,
    status: breakdowns.status,
    priority: breakdowns.priority,
    downtimeHours: breakdowns.downtimeHours,
    laborHours: breakdowns.laborHours,
    reporterName: users.name,
    createdAt: breakdowns.createdAt,
    resolvedAt: breakdowns.resolvedAt,
  })
    .from(breakdowns)
    .leftJoin(users, eq(breakdowns.reporterId, users.id))
    .leftJoin(assets, eq(breakdowns.assetId, assets.id))
    .where(and(...conds))
    .orderBy(breakdowns.createdAt)

  // Drizzle can't easily double-join `users` for assignedTo without aliasing; the
  // assigned-to column is left null for now and only resolved if a future template
  // explicitly needs it.
  return rows.map(r => ({
    id: r.id,
    number: r.number,
    assetId: r.assetId,
    assetName: r.assetName ?? '—',
    nature: r.nature,
    status: r.status,
    priority: r.priority,
    downtimeHours: r.downtimeHours,
    laborHours: r.laborHours,
    reporterName: r.reporterName,
    assignedToName: null,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  }))
}

interface PmPlanRow {
  id: string; assetId: string; assetName: string;
  task: string; frequency: string; nextDue: string; lastDone: string | null;
  status: string; assignedToName: string | null; estimatedHours: string | null;
}

async function loadPmPlans(ctx: RunContext): Promise<PmPlanRow[]> {
  const conds: any[] = []
  // PM plans don't have a created_at filter — use lastDone/nextDue ∈ range
  conds.push(
    sql`(${pmPlans.lastDone} BETWEEN ${ctx.fromDate} AND ${ctx.toDate} OR ${pmPlans.nextDue} BETWEEN ${ctx.fromDate} AND ${ctx.toDate})`
  )
  if (ctx.scope.kind === 'asset') {
    conds.push(eq(pmPlans.assetId, ctx.scope.assetId))
  } else {
    const assetIds = await resolveAssetIds(ctx)
    if (assetIds.length === 0) return []
    conds.push(inArray(pmPlans.assetId, assetIds))
  }
  const rows = await db.select({
    id: pmPlans.id,
    assetId: pmPlans.assetId,
    assetName: assets.name,
    task: pmPlans.task,
    frequency: pmPlans.frequency,
    nextDue: pmPlans.nextDue,
    lastDone: pmPlans.lastDone,
    status: pmPlans.status,
    estimatedHours: pmPlans.estimatedHours,
    assignedToName: users.name,
  })
    .from(pmPlans)
    .leftJoin(users, eq(pmPlans.assignedToId, users.id))
    .leftJoin(assets, eq(pmPlans.assetId, assets.id))
    .where(and(...conds))
    .orderBy(pmPlans.nextDue)
  return rows.map(r => ({
    id: r.id,
    assetId: r.assetId,
    assetName: r.assetName ?? '—',
    task: r.task,
    frequency: r.frequency,
    nextDue: r.nextDue,
    lastDone: r.lastDone,
    status: r.status,
    assignedToName: r.assignedToName,
    estimatedHours: r.estimatedHours,
  }))
}

interface TicketRow {
  id: string; number: string; assetId: string | null; assetName: string | null;
  type: string; title: string; priority: string; status: string;
  dueDate: string | null; submittedAt: Date | null; createdAt: Date;
  createdByName: string | null; assignedToName: string | null;
}

async function loadTickets(ctx: RunContext): Promise<TicketRow[]> {
  const conds: any[] = [
    gte(tickets.createdAt, new Date(ctx.fromDate)),
    lte(tickets.createdAt, new Date(ctx.toDate + 'T23:59:59')),
  ]
  if (ctx.scope.kind === 'asset') {
    conds.push(eq(tickets.assetId, ctx.scope.assetId))
  } else {
    conds.push(eq(tickets.utilityTypeId, ctx.scope.utilityTypeId))
    if (ctx.scope.assetIds && ctx.scope.assetIds.length > 0) {
      conds.push(inArray(tickets.assetId, ctx.scope.assetIds))
    }
  }
  const rows = await db.select({
    id: tickets.id,
    number: tickets.number,
    assetId: tickets.assetId,
    assetName: assets.name,
    type: tickets.type,
    title: tickets.title,
    priority: tickets.priority,
    status: tickets.status,
    dueDate: tickets.dueDate,
    submittedAt: tickets.submittedAt,
    createdAt: tickets.createdAt,
    createdByName: users.name,
  })
    .from(tickets)
    .leftJoin(assets, eq(tickets.assetId, assets.id))
    .leftJoin(users, eq(tickets.createdById, users.id))
    .where(and(...conds))
    .orderBy(tickets.createdAt)
  return rows.map(r => ({
    id: r.id,
    number: r.number,
    assetId: r.assetId,
    assetName: r.assetName,
    type: r.type,
    title: r.title,
    priority: r.priority,
    status: r.status,
    dueDate: r.dueDate,
    submittedAt: r.submittedAt,
    createdAt: r.createdAt,
    createdByName: r.createdByName,
    assignedToName: null,
  }))
}

interface SpareConsumptionRow {
  date: string; assetId: string; assetName: string;
  partName: string; partCode: string | null; qty: number;
  source: 'Breakdown' | 'PM'; sourceNumber: string;
}

async function loadSpareConsumption(ctx: RunContext): Promise<SpareConsumptionRow[]> {
  // Spare usage is tracked via breakdowns.sparesUsed jsonb. Expand that.
  const bdConds = [
    gte(breakdowns.createdAt, new Date(ctx.fromDate)),
    lte(breakdowns.createdAt, new Date(ctx.toDate + 'T23:59:59')),
  ]
  if (ctx.scope.kind === 'asset') {
    bdConds.push(eq(breakdowns.assetId, ctx.scope.assetId))
  } else {
    const assetIds = await resolveAssetIds(ctx)
    if (assetIds.length === 0) return []
    bdConds.push(inArray(breakdowns.assetId, assetIds))
  }
  const bdRows = await db.select({
    id: breakdowns.id,
    number: breakdowns.number,
    assetId: breakdowns.assetId,
    assetName: assets.name,
    createdAt: breakdowns.createdAt,
    sparesUsed: breakdowns.sparesUsed,
  })
    .from(breakdowns)
    .leftJoin(assets, eq(breakdowns.assetId, assets.id))
    .where(and(...bdConds))

  const out: SpareConsumptionRow[] = []
  for (const bd of bdRows) {
    for (const su of bd.sparesUsed ?? []) {
      out.push({
        date: bd.createdAt.toISOString().slice(0, 10),
        assetId: bd.assetId,
        assetName: bd.assetName ?? '—',
        partName: su.name,
        partCode: null,
        qty: su.qty,
        source: 'Breakdown',
        sourceNumber: bd.number,
      })
    }
  }
  return out
}

async function resolveAssetIds(ctx: RunContext): Promise<string[]> {
  if (ctx.scope.kind === 'asset') return [ctx.scope.assetId]
  if (ctx.scope.assetIds && ctx.scope.assetIds.length > 0) return ctx.scope.assetIds
  const rows = await db.select({ id: assets.id })
    .from(assets).where(eq(assets.utilityTypeId, ctx.scope.utilityTypeId))
  return rows.map(r => r.id)
}

// ── Built-in column resolver ───────────────────────────────

/** Look up a built-in column value from a source row.  Returns null on miss. */
function resolveBuiltin(builtin: string, source: string, row: any): unknown {
  switch (source) {
    case 'submissions': {
      const r = row as SubmissionRow
      switch (builtin) {
        case 'date': return r.date
        case 'shift': return r.shift
        case 'operator': return r.operatorName ?? '—'
        case 'status': return r.status
        case 'asset_name': return r.assetName
      }
      return null
    }
    case 'breakdowns': {
      const r = row as BreakdownRow
      switch (builtin) {
        case 'number': return r.number
        case 'nature': return r.nature
        case 'status': return r.status
        case 'priority': return r.priority
        case 'asset_name': return r.assetName
        case 'reporter': return r.reporterName ?? '—'
        case 'created_at': return r.createdAt?.toISOString().slice(0, 10) ?? '—'
        case 'resolved_at': return r.resolvedAt?.toISOString().slice(0, 10) ?? '—'
        case 'downtime_hours': return r.downtimeHours ?? '0'
        case 'labor_hours': return r.laborHours ?? '0'
      }
      return null
    }
    case 'pm_plans': {
      const r = row as PmPlanRow
      switch (builtin) {
        case 'task': return r.task
        case 'frequency': return r.frequency
        case 'next_due': return r.nextDue
        case 'last_done': return r.lastDone ?? '—'
        case 'status': return r.status
        case 'asset_name': return r.assetName
        case 'assigned_to': return r.assignedToName ?? '—'
      }
      return null
    }
    case 'tickets': {
      const r = row as TicketRow
      switch (builtin) {
        case 'number': return r.number
        case 'asset_name': return r.assetName ?? '—'
        case 'type': return r.type
        case 'title': return r.title
        case 'priority': return r.priority
        case 'status': return r.status
        case 'due_date': return r.dueDate ?? '—'
        case 'created_at': return r.createdAt?.toISOString().slice(0, 10) ?? '—'
        case 'submitted_at': return r.submittedAt?.toISOString().slice(0, 10) ?? '—'
      }
      return null
    }
    case 'spare_consumption': {
      const r = row as SpareConsumptionRow
      switch (builtin) {
        case 'date': return r.date
        case 'asset_name': return r.assetName
        case 'part_code': return r.partCode ?? '—'
        case 'spare_name': return r.partName
        case 'qty': return r.qty
        case 'source': return `${r.source} ${r.sourceNumber}`
      }
      return null
    }
  }
  return null
}

// ── Section build ──────────────────────────────────────────

/** Compute one section as a `ReportTable`. Empty array column = no data. */
async function buildSection(
  section: SectionRow,
  columns: ColumnRow[],
  ctx: RunContext,
  idToName: Map<string, string>,
): Promise<ReportTable | null> {
  const isUtilityScope = ctx.scope.kind === 'utility'

  // Honour utility-scope behavior
  if (isUtilityScope && section.utilityScopeBehavior === 'skip') return null

  // Load source rows
  let rawRows: any[] = []
  switch (section.source) {
    case 'submissions':       rawRows = await loadSubmissions(ctx); break
    case 'breakdowns':        rawRows = await loadBreakdowns(ctx); break
    case 'pm_plans':          rawRows = await loadPmPlans(ctx); break
    case 'tickets':           rawRows = await loadTickets(ctx); break
    case 'spare_consumption': rawRows = await loadSpareConsumption(ctx); break
    case 'computed':          rawRows = await loadSubmissions(ctx); break  // computed defaults to submissions
    default:                  rawRows = []
  }

  // Apply filters (status / priority / shift)
  const filters = (section.filters ?? {}) as Record<string, unknown>
  if (Array.isArray(filters.status) && filters.status.length > 0) {
    rawRows = rawRows.filter(r => (filters.status as string[]).includes(r.status))
  }
  if (Array.isArray(filters.priority) && filters.priority.length > 0) {
    rawRows = rawRows.filter(r => (filters.priority as string[]).includes(r.priority))
  }
  if (Array.isArray(filters.shift) && filters.shift.length > 0) {
    rawRows = rawRows.filter(r => (filters.shift as string[]).includes(r.shift))
  }

  // Possibly append an asset column at utility scope
  const effectiveColumns = [...columns]
  if (isUtilityScope && section.utilityScopeBehavior === 'append_asset_col') {
    const hasAssetCol = effectiveColumns.some(c => c.kind === 'builtin' && c.builtin === 'asset_name')
    if (!hasAssetCol) {
      effectiveColumns.unshift({
        id: '__asset_col__', sectionId: section.id,
        label: 'Asset', key: 'asset_name', kind: 'builtin', builtin: 'asset_name',
        fieldId: null, fieldName: null, aggregate: null, formula: null,
        width: 100, align: 'left', format: {}, sortOrder: -1,
        createdAt: new Date(), updatedAt: new Date(),
      } as ColumnRow)
    }
  }

  // Determine grouping
  const grouping = section.grouping ?? 'row'
  let groups: { key: string; rows: any[] }[]
  if (grouping === 'none' || grouping === 'row') {
    // One group per row
    groups = rawRows.map((r, i) => ({ key: String(i), rows: [r] }))
  } else if (grouping === 'date') {
    groups = groupBy(rawRows, r => r.date ?? r.createdAt?.toISOString().slice(0, 10) ?? '—')
  } else if (grouping === 'shift') {
    groups = groupBy(rawRows, r => r.shift ?? '—')
  } else if (grouping === 'date_shift') {
    groups = groupBy(rawRows, r => `${r.date ?? '—'}|${r.shift ?? '—'}`)
  } else if (grouping === 'month') {
    groups = groupBy(rawRows, r => {
      const d = r.date ?? (r.createdAt ? r.createdAt.toISOString().slice(0, 10) : null)
      if (!d) return '—'
      return new Date(d).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    })
  } else if (grouping === 'status') {
    groups = groupBy(rawRows, r => r.status ?? '—')
  } else if (grouping === 'priority') {
    groups = groupBy(rawRows, r => r.priority ?? '—')
  } else if (grouping === 'asset') {
    groups = groupBy(rawRows, r => r.assetName ?? r.assetId ?? '—')
  } else {
    groups = rawRows.map((r, i) => ({ key: String(i), rows: [r] }))
  }

  // Render each group as one output row
  const outRows: Record<string, string | number | null>[] = []
  for (const g of groups) {
    const row: Record<string, string | number | null> = {}
    // Pass 1: builtin + field + aggregate
    for (const c of effectiveColumns) {
      row[c.key] = computeColumn(c, g, section.source, idToName)
    }
    // Pass 2: formulas (may reference other column keys)
    for (const c of effectiveColumns) {
      if (c.kind !== 'formula' || !c.formula) continue
      const numericMap: Record<string, number | null> = {}
      for (const k of Object.keys(row)) {
        const v = row[k]
        if (typeof v === 'number') numericMap[k] = v
        else if (typeof v === 'string') {
          const n = parseFloat(v.replace(/,/g, ''))
          numericMap[k] = Number.isNaN(n) ? null : n
        } else numericMap[k] = null
      }
      const result = evalFormula(c.formula, numericMap)
      row[c.key] = result === null ? '—' : fmtNumber(result, (c.format as any)?.digits ?? 2)
    }
    outRows.push(row)
  }

  return {
    title: section.title,
    columns: effectiveColumns.map(c => ({
      key: c.key, label: c.label, width: c.width,
      align: (c.align as any) ?? 'left',
    })),
    rows: outRows,
  }
}

function groupBy(rows: any[], keyFn: (r: any) => string): { key: string; rows: any[] }[] {
  const map = new Map<string, any[]>()
  for (const r of rows) {
    const k = keyFn(r)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(r)
  }
  return Array.from(map.entries()).map(([key, rows]) => ({ key, rows }))
}

function computeColumn(
  col: ColumnRow,
  group: { key: string; rows: any[] },
  source: string,
  idToName: Map<string, string>,
): string | number | null {
  const first = group.rows[0]
  const digits = (col.format as any)?.digits ?? 2

  if (col.kind === 'builtin' && col.builtin) {
    // For grouped sections, use the first row's value (e.g. date/shift)
    const v = resolveBuiltin(col.builtin, source, first)
    return v as any
  }

  if (col.kind === 'field' && (col.fieldId || col.fieldName)) {
    // Pluck `values` from each submission. For grouped sections, take the
    // first row's value (sum/avg requires an aggregate column instead).
    if (source !== 'submissions' && source !== 'computed') return null
    const v = getFieldValue(first?.values ?? {}, col.fieldId, col.fieldName ?? idToName.get(col.fieldId ?? '') ?? null)
    const n = num(v)
    if (n !== null) return fmtNumber(n, digits)
    return v === undefined || v === null ? '—' : String(v)
  }

  if (col.kind === 'aggregate' && col.aggregate) {
    // Aggregate over all rows in the group using `values[field]` for submission sources;
    // for breakdowns/pm/tickets, aggregate by built-in numeric attrs (downtime, labor).
    const nums: number[] = []
    if (source === 'submissions' || source === 'computed') {
      for (const r of group.rows) {
        const v = getFieldValue(r.values ?? {}, col.fieldId, col.fieldName ?? idToName.get(col.fieldId ?? '') ?? null)
        const n = num(v)
        if (n !== null) nums.push(n)
      }
    } else if (source === 'breakdowns') {
      // Only meaningful for downtime_hours / labor_hours when fieldName matches
      const target = (col.fieldName ?? '').toLowerCase()
      for (const r of group.rows) {
        let v: unknown
        if (target.includes('downtime')) v = r.downtimeHours
        else if (target.includes('labor') || target.includes('labour')) v = r.laborHours
        const n = num(v)
        if (n !== null) nums.push(n)
      }
    } else if (source === 'spare_consumption') {
      for (const r of group.rows) {
        const n = num(r.qty)
        if (n !== null) nums.push(n)
      }
    }
    if (nums.length === 0) {
      if (col.aggregate === 'count') return 0
      return '—'
    }
    let result: number
    switch (col.aggregate) {
      case 'sum':   result = nums.reduce((a, b) => a + b, 0); break
      case 'avg':   result = nums.reduce((a, b) => a + b, 0) / nums.length; break
      case 'min':   result = Math.min(...nums); break
      case 'max':   result = Math.max(...nums); break
      case 'last':  result = nums[nums.length - 1]; break
      case 'count': result = nums.length; break
      default:      result = 0
    }
    return fmtNumber(result, digits)
  }

  if (col.kind === 'formula') {
    // Resolved in pass 2 of buildSection. Placeholder here.
    return null
  }

  return null
}

// ── Public entry ───────────────────────────────────────────

export async function buildTemplateReport(
  templateId: string,
  ctx: RunContext,
): Promise<ReportDocument | null> {
  const resolved = await loadTemplate(templateId)
  if (!resolved) return null

  // Resolve target utility type + scope descriptor
  const utilityTypeId = resolved.template.utilityTypeId
  const idToName = await buildFieldNameMap(utilityTypeId)

  // For the document header
  const [ut] = await db.select().from(utilityTypes).where(eq(utilityTypes.id, utilityTypeId))

  let assetHeader: ReportDocument['asset']
  if (ctx.scope.kind === 'asset') {
    const [a] = await db.select().from(assets).where(eq(assets.id, ctx.scope.assetId))
    if (!a) return null
    assetHeader = {
      id: a.id, name: a.name, serial: a.serial,
      utilityTypeId: a.utilityTypeId,
      manufacturer: a.manufacturer, model: a.model,
    }
  } else {
    const utilityName = ut?.name ?? 'Utility'
    let scopeLabel = `All ${utilityName} assets`
    if (ctx.scope.assetIds && ctx.scope.assetIds.length > 0) {
      const list = await db.select({ id: assets.id, name: assets.name })
        .from(assets).where(inArray(assets.id, ctx.scope.assetIds))
      scopeLabel = list.length <= 3
        ? list.map(a => a.name).join(', ')
        : `${list.length} ${utilityName} assets`
    }
    assetHeader = {
      id: utilityTypeId, name: scopeLabel, serial: null,
      utilityTypeId, manufacturer: null, model: null,
    }
  }

  const tables: ReportTable[] = []
  for (const { section, columns } of resolved.sections) {
    const t = await buildSection(section, columns, ctx, idToName)
    if (t) tables.push(t)
  }

  return {
    reportId: resolved.template.slug,
    title: resolved.template.name,
    asset: assetHeader,
    dateRange: { from: ctx.fromDate, to: ctx.toDate },
    generatedAt: new Date().toISOString(),
    generatedBy: ctx.generatedBy,
    tables,
  }
}
