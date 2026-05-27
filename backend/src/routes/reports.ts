import { Router } from 'express'
import { db } from '../db/index.js'
import { submissions, assets, utilityTypes } from '../db/schema.js'
import { eq, gte, and, lte } from 'drizzle-orm'
import { requireAuth } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const reportSchema = z.object({
  reportType: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  utilityTypeId: z.string().uuid().optional(),
})

// POST /api/reports/generate — generate report data
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const parsed = reportSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const { reportType, fromDate, toDate, utilityTypeId } = parsed.data
    const fromStr = new Date(fromDate).toISOString().slice(0, 10)
    const toStr = new Date(toDate).toISOString().slice(0, 10)

    const conditions = [
      gte(submissions.date, fromStr),
      lte(submissions.date, toStr),
    ]
    if (utilityTypeId) conditions.push(eq(submissions.utilityTypeId, utilityTypeId))

    const result = await db.select({
      date: submissions.date,
      shift: submissions.shift,
      utilityName: utilityTypes.name,
      assetName: assets.name,
      status: submissions.status,
      values: submissions.values,
    })
      .from(submissions)
      .leftJoin(assets, eq(submissions.assetId, assets.id))
      .leftJoin(utilityTypes, eq(submissions.utilityTypeId, utilityTypes.id))
      .where(and(...conditions))

    type Row = typeof result[number]

    function groupBy(rows: Row[], keyFn: (r: Row) => string): Record<string, Row[]> {
      const out: Record<string, Row[]> = {}
      for (const row of rows) {
        const k = keyFn(row)
        ;(out[k] ??= []).push(row)
      }
      return out
    }

    const grouped: Record<string, Row[]> =
      reportType === 'Shift-wise Performance'
        ? groupBy(result, r => `${r.date}_${r.shift}`)
        : reportType === 'Monthly Consolidated'
          ? groupBy(result, r => new Date(r.date).toLocaleString('default', { month: 'long', year: 'numeric' }))
          : groupBy(result, r => r.date)

    res.json({
      reportType,
      dateRange: { from: fromDate, to: toDate },
      totalRecords: result.length,
      data: Object.entries(grouped).map(([key, records]) => ({
        period: key,
        count: records.length,
        statuses: {
          submitted: records.filter(r => r.status === 'Submitted').length,
          approved: records.filter(r => r.status === 'Approved').length,
          rejected: records.filter(r => r.status === 'Rejected').length,
        },
      })),
    })
  } catch (e) {
    console.error('Report generation error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/reports/dashboard — KPI summary for dashboard
router.get('/dashboard', requireAuth, async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const fromStr = thirtyDaysAgo.toISOString().slice(0, 10)
    const toStr = new Date().toISOString().slice(0, 10)

    const subs = await db.select({
      date: submissions.date,
      shift: submissions.shift,
      status: submissions.status,
    })
      .from(submissions)
      .where(and(gte(submissions.date, fromStr), lte(submissions.date, toStr)))

    const total = subs.length
    const approved = subs.filter(s => s.status === 'Approved').length
    const rejected = subs.filter(s => s.status === 'Rejected').length
    const pending = subs.filter(s => s.status === 'Submitted' || s.status === 'Under Review').length

    res.json({
      totalSubmissions: total,
      approved,
      rejected,
      pending,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      period: { from: fromStr, to: toStr },
    })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
