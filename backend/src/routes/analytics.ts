import { Router } from 'express'
import { db } from '../db/index.js'
import { submissions, tickets, utKpis, utFields, utFormSectionFields, assets, utilityTypes, utAlertRules } from '../db/schema.js'
import { eq, and, gte, lte, inArray, isNotNull, sql } from 'drizzle-orm'
import { requireAuth } from '../lib/auth.js'

const router = Router()

// Safe formula evaluator: replaces field name tokens with values (braced {Field Name} or bare),
// normalises common unicode operators, then evaluates the resulting math expression.
function evalFormula(formula: string, fieldValues: Record<string, number>): number | null {
  try {
    let expr = formula
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')

    // Sort by length descending so "Total KWH" matches before "Total" or "KWH"
    const sortedEntries = Object.entries(fieldValues).sort(([a], [b]) => b.length - a.length)

    for (const [name, val] of sortedEntries) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Braced form: {Field Name}
      expr = expr.replace(new RegExp(`\\{${escapedName}\\}`, 'gi'), String(val))
      // Bare form: Field Name as a standalone token (no surrounding word chars)
      expr = expr.replace(new RegExp(`(?<![A-Za-z0-9_])${escapedName}(?![A-Za-z0-9_])`, 'gi'), String(val))
    }

    // Only allow safe math characters
    if (!/^[\d\s+\-*/.()]+$/.test(expr)) return null
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr})`)()
    return typeof result === 'number' && isFinite(result) ? Math.round(result * 100) / 100 : null
  } catch {
    return null
  }
}

// GET /api/analytics
// Query params:
//   utilityTypeId, assetIds (comma-sep), from (YYYY-MM-DD), to (YYYY-MM-DD)
//   siteId / plantId / areaId — cascading location filter; narrows the
//   asset list before the existing assetIds filter is applied.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { utilityTypeId, assetIds: assetIdsRaw, from, to, siteId, plantId, areaId } = req.query as Record<string, string>

    if (!utilityTypeId) { res.status(400).json({ error: 'utilityTypeId required' }); return }

    let assetIdList = assetIdsRaw ? assetIdsRaw.split(',').filter(Boolean) : []
    const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const toDate = to ?? new Date().toISOString().slice(0, 10)

    // Apply location filter: narrow assets to those matching site/plant/area.
    // If any location filter is set we resolve to a concrete asset id list and
    // intersect with the caller-provided assetIds.
    if (siteId || plantId || areaId) {
      const locConds = [eq(assets.utilityTypeId, utilityTypeId)]
      if (siteId)  locConds.push(eq(assets.siteId, siteId))
      if (plantId) locConds.push(eq(assets.plantId, plantId))
      if (areaId)  locConds.push(eq(assets.areaId, areaId))
      const matching = await db.select({ id: assets.id }).from(assets).where(and(...locConds))
      const matchingIds = matching.map(r => r.id)
      assetIdList = assetIdList.length > 0
        ? assetIdList.filter(id => matchingIds.includes(id))
        : matchingIds
      // No assets at this location → return empty result early
      if (assetIdList.length === 0) {
        res.json({ kpis: [], alertTrend: [], assets: [] })
        return
      }
    }

    // Fetch KPIs for this utility type
    const kpis = await db.select().from(utKpis).where(eq(utKpis.utilityTypeId, utilityTypeId))
    if (kpis.length === 0) { res.json({ kpis: [], alertTrend: [] }); return }

    // Fetch fields for formula resolution
    const fieldRows = await db.select({
      sectionFieldId: utFormSectionFields.id,
      fieldName: utFields.name,
    })
      .from(utFormSectionFields)
      .leftJoin(utFields, eq(utFormSectionFields.fieldId, utFields.id))

    const fieldNameBySfId = new Map<string, string>()
    for (const row of fieldRows) {
      if (row.fieldName) fieldNameBySfId.set(row.sectionFieldId, row.fieldName)
    }

    // Fetch submissions in range
    const submissionQuery = db.select({
      id: submissions.id,
      date: submissions.date,
      assetId: submissions.assetId,
      values: submissions.values,
    }).from(submissions)
      .where(
        assetIdList.length > 0
          ? and(
              eq(submissions.utilityTypeId, utilityTypeId),
              gte(submissions.date, fromDate),
              lte(submissions.date, toDate),
              inArray(submissions.assetId, assetIdList),
            )
          : and(
              eq(submissions.utilityTypeId, utilityTypeId),
              gte(submissions.date, fromDate),
              lte(submissions.date, toDate),
            )
      )
      .orderBy(submissions.date)

    const subs = await submissionQuery

    // Also pull submitted tickets for this utility type — ticket form data lives in
    // tickets.filledValues but never writes into the submissions table, so we merge them here.
    const ticketConditions = [
      eq(tickets.utilityTypeId, utilityTypeId),
      inArray(tickets.status, ['Submitted', 'Resubmitted', 'Approved', 'Closed'] as any[]),
      isNotNull(tickets.submittedAt),
      sql`DATE(${tickets.submittedAt}) >= ${fromDate}`,
      sql`DATE(${tickets.submittedAt}) <= ${toDate}`,
    ]
    if (assetIdList.length > 0) {
      ticketConditions.push(inArray(tickets.assetId, assetIdList.filter(Boolean)) as any)
    }

    const ticketRows = await db.select({
      id: tickets.id,
      submittedAt: tickets.submittedAt,
      assetId: tickets.assetId,
      filledValues: tickets.filledValues,
    }).from(tickets).where(and(...ticketConditions as any[]))

    // Normalise ticket rows to the same shape as submission rows
    const ticketAsSubs = ticketRows
      .filter(t => t.assetId && t.submittedAt)
      .map(t => ({
        id: t.id,
        date: t.submittedAt!.toISOString().slice(0, 10),
        assetId: t.assetId!,
        values: Object.fromEntries(
          Object.entries((t.filledValues ?? {}) as Record<string, unknown>)
            .filter(([k]) => !k.startsWith('__'))
        ) as Record<string, unknown>,
      }))

    const allSubs = [...subs, ...ticketAsSubs]

    // Alert rules for trend
    const alertRules = await db.select().from(utAlertRules).where(eq(utAlertRules.utilityTypeId, utilityTypeId))

    // Build KPI series
    const kpiSeries = kpis.map(kpi => {
      const series: { date: string; value: number }[] = []

      // Group all submissions (standalone + ticket) by date
      const byDate = new Map<string, typeof allSubs>()
      for (const sub of allSubs) {
        const d = String(sub.date)
        if (!byDate.has(d)) byDate.set(d, [])
        byDate.get(d)!.push(sub)
      }

      for (const [date, dateSubs] of Array.from(byDate.entries()).sort()) {
        const values: number[] = []
        for (const sub of dateSubs) {
          const raw = sub.values as Record<string, unknown>
          // Build named field map
          const namedVals: Record<string, number> = {}
          for (const [key, val] of Object.entries(raw)) {
            if (key.startsWith('__')) continue
            const name = fieldNameBySfId.get(key) ?? key
            const num = parseFloat(String(val))
            if (!isNaN(num)) namedVals[name] = num
          }
          const result = evalFormula(kpi.formula, namedVals)
          if (result !== null) values.push(result)
        }
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length
          series.push({ date, value: Math.round(avg * 100) / 100 })
        }
      }

      return {
        id: kpi.id,
        name: kpi.name,
        unit: kpi.unit ?? '',
        formula: kpi.formula,
        recommendedChart: kpi.recommendedChart,
        target: kpi.target ? parseFloat(kpi.target) : null,
        alertBelow: kpi.alertBelow ? parseFloat(kpi.alertBelow) : null,
        alertAbove: kpi.alertAbove ? parseFloat(kpi.alertAbove) : null,
        series,
      }
    })

    // Build alert trend (count triggered alerts per day by severity)
    const alertTrendMap = new Map<string, { critical: number; high: number; medium: number; low: number }>()
    for (const sub of allSubs) {
      const d = String(sub.date)
      if (!alertTrendMap.has(d)) alertTrendMap.set(d, { critical: 0, high: 0, medium: 0, low: 0 })
      const stored = sub.values as Record<string, unknown>
      const alerts: any[] = Array.isArray(stored.__alerts) ? stored.__alerts : []
      const entry = alertTrendMap.get(d)!
      for (const a of alerts) {
        if (a.severity === 'critical') entry.critical++
        else if (a.severity === 'high') entry.high++
        else if (a.severity === 'medium') entry.medium++
        else if (a.severity === 'low') entry.low++
      }
    }

    const alertTrend = Array.from(alertTrendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }))

    // Asset list for this utility (for filter dropdown info) — restricted to
    // the location filter so the frontend's "Assets" menu mirrors the scope.
    const assetListConds = [eq(assets.utilityTypeId, utilityTypeId)]
    if (siteId)  assetListConds.push(eq(assets.siteId, siteId))
    if (plantId) assetListConds.push(eq(assets.plantId, plantId))
    if (areaId)  assetListConds.push(eq(assets.areaId, areaId))
    const assetList = await db.select({ id: assets.id, name: assets.name })
      .from(assets).where(and(...assetListConds))

    res.json({ kpis: kpiSeries, alertTrend, assets: assetList })
  } catch (e) {
    console.error('analytics error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
