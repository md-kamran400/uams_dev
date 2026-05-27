import { db } from '../../db/index.js'
import { submissions, assets, breakdowns, pmPlans, users, utFields } from '../../db/schema.js'
import { and, eq, gte, lte, sql } from 'drizzle-orm'

export interface ReportContext {
  assetId: string
  fromDate: string  // YYYY-MM-DD
  toDate: string    // YYYY-MM-DD
  /** fieldId (UUID) → field display name, built once in buildReport */
  idToName?: Map<string, string>
}

export interface ReportTable {
  title: string
  columns: { key: string; label: string; width?: number; align?: 'left' | 'right' | 'center' }[]
  rows: Record<string, string | number | null>[]
}

export interface ReportDocument {
  reportId: string
  title: string
  asset: {
    id: string
    name: string
    serial: string | null
    utilityTypeId: string
    manufacturer: string | null
    model: string | null
  }
  dateRange: { from: string; to: string }
  generatedAt: string
  generatedBy: string
  /** Sequenced tables — empty array indicates "no data". */
  tables: ReportTable[]
  /** Top-line summary blocks (label/value pairs), drawn before tables. */
  summary?: { label: string; value: string }[]
}

async function loadAsset(assetId: string) {
  const [a] = await db.select().from(assets).where(eq(assets.id, assetId))
  return a ?? null
}

/** Builds a fieldId → field name map for a utility type so reports can resolve UUID-keyed submission values. */
async function buildIdToNameMap(utilityTypeId: string): Promise<Map<string, string>> {
  const fields = await db.select({ id: utFields.id, name: utFields.name })
    .from(utFields)
    .where(eq(utFields.utilityTypeId, utilityTypeId))
  const map = new Map<string, string>()
  for (const f of fields) map.set(f.id, f.name)
  return map
}

/** Adds name-keyed aliases to UUID-keyed submission values so getVal() can match by human-readable field name. */
function resolveValues(values: Record<string, unknown>, idToName: Map<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values }
  for (const [id, val] of Object.entries(values)) {
    const name = idToName.get(id)
    if (name) {
      out[name] = val
      out[name.toLowerCase()] = val
    }
  }
  return out
}

function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? null : n
}

// Resolve a field's submitted value by trying several keys: form-section-field id, raw field name (case variants)
function getVal(values: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (values[k] !== undefined) return values[k]
    const lower = k.toLowerCase()
    for (const vk of Object.keys(values)) {
      if (vk.toLowerCase() === lower) return values[vk]
    }
  }
  return undefined
}

async function loadSubmissions(ctx: ReportContext) {
  const rows = await db.select({
    id: submissions.id,
    date: submissions.date,
    shift: submissions.shift,
    status: submissions.status,
    values: submissions.values,
    operatorName: users.name,
  })
    .from(submissions)
    .leftJoin(users, eq(submissions.operatorId, users.id))
    .where(and(
      eq(submissions.assetId, ctx.assetId),
      gte(submissions.date, ctx.fromDate),
      lte(submissions.date, ctx.toDate),
    ))
    .orderBy(submissions.date, submissions.shift)

  if (!ctx.idToName || ctx.idToName.size === 0) return rows
  return rows.map(r => ({
    ...r,
    values: resolveValues((r.values ?? {}) as Record<string, unknown>, ctx.idToName!),
  }))
}

// ── Daily Operation Summary ────────────────────────────────
async function dailyOperation(ctx: ReportContext): Promise<ReportTable[]> {
  const subs = await loadSubmissions(ctx)
  const rows = subs.map(s => {
    const v = (s.values ?? {}) as Record<string, unknown>
    return {
      date: s.date,
      shift: s.shift,
      operator: s.operatorName ?? '—',
      startTime: String(getVal(v, 'Start Time', 'start_time') ?? '—'),
      stopTime: String(getVal(v, 'Stop Time', 'stop_time') ?? '—'),
      runningHours: fmt(num(getVal(v, 'Running Time', 'running_time', 'Running Hours'))),
      startKwh: fmt(num(getVal(v, 'Start KWH', 'start_kwh'))),
      stopKwh: fmt(num(getVal(v, 'Stop KWH', 'stop_kwh'))),
      totalKwh: fmt(num(getVal(v, 'Total KWH', 'total_kwh'))),
      hsdConsumed: fmt(num(getVal(v, 'HSD Consumed', 'hsd_consumed'))),
      status: s.status,
    }
  })
  return [{
    title: 'Daily Operation Summary',
    columns: [
      { key: 'date',         label: 'Date',          width: 80 },
      { key: 'shift',        label: 'Shift',         width: 40, align: 'center' },
      { key: 'operator',     label: 'Operator',      width: 110 },
      { key: 'startTime',    label: 'Start',         width: 50, align: 'center' },
      { key: 'stopTime',     label: 'Stop',          width: 50, align: 'center' },
      { key: 'runningHours', label: 'Run Hrs',       width: 55, align: 'right' },
      { key: 'totalKwh',     label: 'KWH',           width: 55, align: 'right' },
      { key: 'hsdConsumed',  label: 'HSD (L)',       width: 55, align: 'right' },
      { key: 'status',       label: 'Status',        width: 60, align: 'center' },
    ],
    rows,
  }]
}

// ── Fuel Consumption ───────────────────────────────────────
async function fuelConsumption(ctx: ReportContext): Promise<ReportTable[]> {
  const subs = await loadSubmissions(ctx)
  // Per-day aggregate
  const daily = new Map<string, { hsd: number; kwh: number; runHrs: number; count: number }>()
  for (const s of subs) {
    const v = (s.values ?? {}) as Record<string, unknown>
    const hsd = num(getVal(v, 'HSD Consumed', 'hsd_consumed')) ?? 0
    const kwh = num(getVal(v, 'Total KWH', 'total_kwh')) ?? 0
    const runHrs = num(getVal(v, 'Running Time', 'running_time')) ?? 0
    const cur = daily.get(s.date) ?? { hsd: 0, kwh: 0, runHrs: 0, count: 0 }
    cur.hsd += hsd; cur.kwh += kwh; cur.runHrs += runHrs; cur.count++
    daily.set(s.date, cur)
  }
  const rows = Array.from(daily.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, t]) => ({
    date,
    submissions: t.count,
    runningHours: fmt(t.runHrs),
    hsdConsumed: fmt(t.hsd),
    kwhGenerated: fmt(t.kwh),
    specificFuel: t.kwh > 0 ? fmt(t.hsd / t.kwh, 3) : '—',  // L/kWh
  }))
  return [{
    title: 'Daily Fuel Consumption',
    columns: [
      { key: 'date',         label: 'Date',          width: 80 },
      { key: 'submissions',  label: 'Records',       width: 60, align: 'right' },
      { key: 'runningHours', label: 'Run Hrs',       width: 65, align: 'right' },
      { key: 'hsdConsumed',  label: 'HSD (L)',       width: 70, align: 'right' },
      { key: 'kwhGenerated', label: 'KWH',           width: 70, align: 'right' },
      { key: 'specificFuel', label: 'L/kWh',         width: 70, align: 'right' },
    ],
    rows,
  }]
}

// ── KWH Generation ─────────────────────────────────────────
async function kwhGeneration(ctx: ReportContext): Promise<ReportTable[]> {
  const subs = await loadSubmissions(ctx)
  // Group by date+shift
  const rows = subs.map(s => {
    const v = (s.values ?? {}) as Record<string, unknown>
    return {
      date: s.date,
      shift: s.shift,
      startKwh: fmt(num(getVal(v, 'Start KWH', 'start_kwh'))),
      stopKwh: fmt(num(getVal(v, 'Stop KWH', 'stop_kwh'))),
      totalKwh: fmt(num(getVal(v, 'Total KWH', 'total_kwh'))),
      runningHrs: fmt(num(getVal(v, 'Running Time', 'running_time'))),
    }
  })
  return [{
    title: 'KWH Generation by Shift',
    columns: [
      { key: 'date',       label: 'Date',     width: 90 },
      { key: 'shift',      label: 'Shift',    width: 50, align: 'center' },
      { key: 'startKwh',   label: 'Start KWH', width: 80, align: 'right' },
      { key: 'stopKwh',    label: 'Stop KWH', width: 80, align: 'right' },
      { key: 'totalKwh',   label: 'KWH',      width: 80, align: 'right' },
      { key: 'runningHrs', label: 'Run Hrs',  width: 80, align: 'right' },
    ],
    rows,
  }]
}

// ── Service History ────────────────────────────────────────
async function serviceHistory(ctx: ReportContext): Promise<ReportTable[]> {
  const pmRows = await db.select({
    id: pmPlans.id,
    task: pmPlans.task,
    frequency: pmPlans.frequency,
    lastDone: pmPlans.lastDone,
    nextDue: pmPlans.nextDue,
    status: pmPlans.status,
    estimatedHours: pmPlans.estimatedHours,
    assignedToName: users.name,
  })
    .from(pmPlans)
    .leftJoin(users, eq(pmPlans.assignedToId, users.id))
    .where(and(
      eq(pmPlans.assetId, ctx.assetId),
      // Filter: events touched the date window via lastDone or nextDue
      sql`(${pmPlans.lastDone} BETWEEN ${ctx.fromDate} AND ${ctx.toDate} OR ${pmPlans.nextDue} BETWEEN ${ctx.fromDate} AND ${ctx.toDate})`,
    ))
    .orderBy(pmPlans.nextDue)

  return [{
    title: 'Preventive Maintenance Activities',
    columns: [
      { key: 'task',          label: 'Task',         width: 160 },
      { key: 'frequency',     label: 'Frequency',    width: 70, align: 'center' },
      { key: 'lastDone',      label: 'Last Done',    width: 80 },
      { key: 'nextDue',       label: 'Next Due',     width: 80 },
      { key: 'status',        label: 'Status',       width: 70, align: 'center' },
      { key: 'assignedToName', label: 'Assigned',    width: 100 },
    ],
    rows: pmRows.map(r => ({ ...r, estimatedHours: r.estimatedHours ?? '—' })),
  }]
}

// ── Downtime Analysis ──────────────────────────────────────
async function downtimeAnalysis(ctx: ReportContext): Promise<ReportTable[]> {
  const bdRows = await db.select({
    id: breakdowns.id,
    number: breakdowns.number,
    nature: breakdowns.nature,
    status: breakdowns.status,
    priority: breakdowns.priority,
    downtimeHours: breakdowns.downtimeHours,
    laborHours: breakdowns.laborHours,
    resolvedAt: breakdowns.resolvedAt,
    createdAt: breakdowns.createdAt,
    reporterName: users.name,
  })
    .from(breakdowns)
    .leftJoin(users, eq(breakdowns.reporterId, users.id))
    .where(and(
      eq(breakdowns.assetId, ctx.assetId),
      gte(breakdowns.createdAt, new Date(ctx.fromDate)),
      lte(breakdowns.createdAt, new Date(ctx.toDate + 'T23:59:59')),
    ))
    .orderBy(breakdowns.createdAt)

  const total = bdRows.reduce((s, r) => s + parseFloat(r.downtimeHours ?? '0'), 0)

  return [{
    title: 'Breakdown Events',
    columns: [
      { key: 'number',       label: 'Number',       width: 90 },
      { key: 'nature',       label: 'Nature',       width: 130 },
      { key: 'priority',     label: 'Priority',     width: 60, align: 'center' },
      { key: 'status',       label: 'Status',       width: 70, align: 'center' },
      { key: 'downtimeHours', label: 'Downtime (h)', width: 75, align: 'right' },
      { key: 'laborHours',   label: 'Labor (h)',    width: 65, align: 'right' },
      { key: 'reporterName', label: 'Reported By',  width: 90 },
      { key: 'createdAt',    label: 'Raised',       width: 80 },
    ],
    rows: bdRows.map(r => ({
      number: r.number,
      nature: r.nature,
      priority: r.priority,
      status: r.status,
      downtimeHours: fmt(parseFloat(r.downtimeHours ?? '0')),
      laborHours: fmt(parseFloat(r.laborHours ?? '0')),
      reporterName: r.reporterName ?? '—',
      createdAt: r.createdAt?.toISOString().slice(0, 10) ?? '—',
    })),
  }, {
    title: 'Summary',
    columns: [
      { key: 'label', label: 'Metric', width: 200 },
      { key: 'value', label: 'Value', width: 100, align: 'right' },
    ],
    rows: [
      { label: 'Total breakdown events',  value: bdRows.length },
      { label: 'Total downtime (hours)',  value: fmt(total) },
      { label: 'Resolved',                value: bdRows.filter(r => r.status === 'Resolved' || r.status === 'Closed').length },
      { label: 'Open / In progress',      value: bdRows.filter(r => !['Resolved', 'Closed'].includes(r.status)).length },
    ],
  }]
}

// ── Monthly Performance ────────────────────────────────────
async function monthlyPerformance(ctx: ReportContext): Promise<ReportTable[]> {
  const subs = await loadSubmissions(ctx)
  let totalHsd = 0, totalKwh = 0, totalRun = 0, submissionCount = subs.length
  for (const s of subs) {
    const v = (s.values ?? {}) as Record<string, unknown>
    totalHsd += num(getVal(v, 'HSD Consumed', 'hsd_consumed')) ?? 0
    totalKwh += num(getVal(v, 'Total KWH', 'total_kwh')) ?? 0
    totalRun += num(getVal(v, 'Running Time', 'running_time')) ?? 0
  }
  const fromDate = new Date(ctx.fromDate)
  const toDate = new Date(ctx.toDate)
  const periodHours = ((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60)) + 24

  // Breakdown totals for availability calc
  const bdRows = await db.select({
    downtimeHours: breakdowns.downtimeHours,
  }).from(breakdowns).where(and(
    eq(breakdowns.assetId, ctx.assetId),
    gte(breakdowns.createdAt, new Date(ctx.fromDate)),
    lte(breakdowns.createdAt, new Date(ctx.toDate + 'T23:59:59')),
  ))
  const downtimeHours = bdRows.reduce((s, r) => s + parseFloat(r.downtimeHours ?? '0'), 0)
  const availability = periodHours > 0 ? (1 - downtimeHours / periodHours) * 100 : 0
  const loadFactor = totalRun > 0 ? totalKwh / totalRun : 0   // kW avg
  const specificFuel = totalKwh > 0 ? totalHsd / totalKwh : 0

  return [{
    title: 'Monthly Consolidated Performance',
    columns: [
      { key: 'metric', label: 'Metric',  width: 220 },
      { key: 'value',  label: 'Value',   width: 120, align: 'right' },
    ],
    rows: [
      { metric: 'Total submissions',          value: submissionCount },
      { metric: 'Total running hours',        value: fmt(totalRun) },
      { metric: 'Total KWH generated',        value: fmt(totalKwh) },
      { metric: 'Total HSD consumed (L)',     value: fmt(totalHsd) },
      { metric: 'Specific fuel (L/kWh)',      value: fmt(specificFuel, 3) },
      { metric: 'Avg load while running (kW)', value: fmt(loadFactor) },
      { metric: 'Total downtime (h)',         value: fmt(downtimeHours) },
      { metric: 'Period availability (%)',    value: fmt(availability, 1) },
    ],
  }]
}

// ── Dispatcher ─────────────────────────────────────────────
const REPORT_TYPES: Record<string, { title: string; build: (ctx: ReportContext) => Promise<ReportTable[]> }> = {
  'daily-operation':       { title: 'Daily Operation Summary',  build: dailyOperation },
  'fuel-consumption':      { title: 'Fuel Consumption Report',  build: fuelConsumption },
  'kwh-generation':        { title: 'KWH Generation Report',    build: kwhGeneration },
  'service-history':       { title: 'Service History',          build: serviceHistory },
  'downtime-analysis':     { title: 'Downtime Analysis',        build: downtimeAnalysis },
  'monthly-performance':   { title: 'Monthly Performance',      build: monthlyPerformance },
}

export async function buildReport(reportId: string, ctx: ReportContext, generatedBy: string): Promise<ReportDocument | null> {
  const def = REPORT_TYPES[reportId]
  if (!def) return null
  const asset = await loadAsset(ctx.assetId)
  if (!asset) return null
  const idToName = await buildIdToNameMap(asset.utilityTypeId)
  const tables = await def.build({ ...ctx, idToName })
  return {
    reportId,
    title: def.title,
    asset: {
      id: asset.id, name: asset.name, serial: asset.serial,
      utilityTypeId: asset.utilityTypeId,
      manufacturer: asset.manufacturer, model: asset.model,
    },
    dateRange: { from: ctx.fromDate, to: ctx.toDate },
    generatedAt: new Date().toISOString(),
    generatedBy,
    tables,
  }
}
