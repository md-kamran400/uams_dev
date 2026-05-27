import { Router } from 'express'
import { db } from '../db/index.js'
import { maintenancePlans, maintenancePlanEntries, assets, users, utilityTypes, tickets } from '../db/schema.js'
import { eq, sql, and, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

const frequencyItemSchema = z.object({
  frequency: z.enum(['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']),
  startMonth: z.number().int().min(1).max(12),
  startDay: z.number().int().min(1).max(31),
})

const createPlanSchema = z.object({
  name: z.string().min(2, 'Plan name required'),
  year: z.number().int().min(2020).max(2100),
  status: z.enum(['Draft', 'Active', 'Paused', 'Inactive', 'Archived']).optional(),
  description: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

const updatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  year: z.number().int().optional(),
  status: z.enum(['Draft', 'Active', 'Paused', 'Inactive', 'Archived']).optional(),
  description: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

const entrySchema = z.object({
  assetId: z.string().uuid().optional().nullable(),
  equipmentNo: z.string().optional().nullable(),
  equipmentDesc: z.string().optional().nullable(),
  frequencies: z.array(frequencyItemSchema).min(1, 'At least one frequency required'),
  year: z.number().int().min(2020).max(2100),
  remarks: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
})

const bulkEntriesSchema = z.object({
  entries: z.array(entrySchema).min(1),
})

const updateEntrySchema = z.object({
  frequencies: z.array(frequencyItemSchema).optional(),
  remarks: z.string().optional().nullable(),
  actuals: z.record(z.string(), z.string().nullable()).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
})

async function nextPlanCode(): Promise<string> {
  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(maintenancePlans)
  return `PLAN-${String((cnt ?? 0) + 1).padStart(3, '0')}`
}

// GET /api/maintenance-plans
router.get('/', requireAuth, async (_req, res) => {
  try {
    const plans = await db.select({
      id: maintenancePlans.id,
      planCode: maintenancePlans.planCode,
      name: maintenancePlans.name,
      year: maintenancePlans.year,
      status: maintenancePlans.status,
      description: maintenancePlans.description,
      endDate: maintenancePlans.endDate,
      createdById: maintenancePlans.createdById,
      createdByName: users.name,
      createdAt: maintenancePlans.createdAt,
      updatedAt: maintenancePlans.updatedAt,
    })
      .from(maintenancePlans)
      .leftJoin(users, eq(maintenancePlans.createdById, users.id))
      .orderBy(sql`${maintenancePlans.createdAt} DESC`)

    const counts = await db.select({
      planId: maintenancePlanEntries.planId,
      cnt: sql<number>`count(*)::int`,
    })
      .from(maintenancePlanEntries)
      .groupBy(maintenancePlanEntries.planId)

    const countMap = Object.fromEntries(counts.map(c => [c.planId, c.cnt]))
    res.json(plans.map(p => ({ ...p, assetCount: countMap[p.id] ?? 0 })))
  } catch (e) {
    console.error('GET /maintenance-plans error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/maintenance-plans/:id
router.get('/:id', requireAuth, async (req, res) => {
  const id = String(req.params.id)
  try {
    const [plan] = await db.select({
      id: maintenancePlans.id,
      planCode: maintenancePlans.planCode,
      name: maintenancePlans.name,
      year: maintenancePlans.year,
      status: maintenancePlans.status,
      description: maintenancePlans.description,
      endDate: maintenancePlans.endDate,
      createdById: maintenancePlans.createdById,
      createdByName: users.name,
      createdAt: maintenancePlans.createdAt,
      updatedAt: maintenancePlans.updatedAt,
    })
      .from(maintenancePlans)
      .leftJoin(users, eq(maintenancePlans.createdById, users.id))
      .where(eq(maintenancePlans.id, id))

    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return }

    const entryEngineer = alias(users, 'entry_engineer')
    const entries = await db.select({
      id: maintenancePlanEntries.id,
      planId: maintenancePlanEntries.planId,
      assetId: maintenancePlanEntries.assetId,
      assetName: assets.name,
      utilityTypeId: assets.utilityTypeId,
      utilityTypeName: utilityTypes.name,
      equipmentNo: maintenancePlanEntries.equipmentNo,
      equipmentDesc: maintenancePlanEntries.equipmentDesc,
      frequencies: maintenancePlanEntries.frequencies,
      year: maintenancePlanEntries.year,
      remarks: maintenancePlanEntries.remarks,
      actuals: maintenancePlanEntries.actuals,
      assignedToId: maintenancePlanEntries.assignedToId,
      assignedToName: entryEngineer.name,
      createdAt: maintenancePlanEntries.createdAt,
    })
      .from(maintenancePlanEntries)
      .leftJoin(assets, eq(maintenancePlanEntries.assetId, assets.id))
      .leftJoin(utilityTypes, eq(assets.utilityTypeId, utilityTypes.id))
      .leftJoin(entryEngineer, eq(maintenancePlanEntries.assignedToId, entryEngineer.id))
      .where(eq(maintenancePlanEntries.planId, id))
      .orderBy(maintenancePlanEntries.createdAt)

    res.json({ ...plan, entries })
  } catch (e) {
    console.error('GET /maintenance-plans/:id error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/maintenance-plans/:id/tickets
// Returns all PM Plan tickets associated with this plan, grouped by entry id.
router.get('/:id/tickets', requireAuth, async (req, res) => {
  const id = String(req.params.id)
  try {
    const entryRows = await db.select({ id: maintenancePlanEntries.id })
      .from(maintenancePlanEntries)
      .where(eq(maintenancePlanEntries.planId, id))
    const entryIds = entryRows.map(r => r.id)
    if (entryIds.length === 0) { res.json([]); return }

    const rows = await db.select({
      id: tickets.id,
      number: tickets.number,
      status: tickets.status,
      title: tickets.title,
      dueDate: tickets.dueDate,
      submittedAt: tickets.submittedAt,
      reviewedAt: tickets.reviewedAt,
      maintenancePlanEntryId: tickets.maintenancePlanEntryId,
      assignedToId: tickets.assignedToId,
      assignedToName: users.name,
      filledValues: tickets.filledValues,
      createdAt: tickets.createdAt,
    })
      .from(tickets)
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(and(
        eq(tickets.type, 'PM Plan'),
        inArray(tickets.maintenancePlanEntryId, entryIds),
      ))
      .orderBy(tickets.dueDate)

    const withAlerts = rows.map(r => {
      const stored = (r.filledValues ?? {}) as Record<string, unknown>
      const alerts: any[] = Array.isArray(stored.__alerts) ? stored.__alerts : []
      return {
        id: r.id,
        number: r.number,
        status: r.status,
        title: r.title,
        dueDate: r.dueDate,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
        maintenancePlanEntryId: r.maintenancePlanEntryId,
        assignedToId: r.assignedToId,
        assignedToName: r.assignedToName,
        createdAt: r.createdAt,
        alertCount: alerts.length,
        criticalCount: alerts.filter((a: any) => a.severity === 'critical').length,
        highCount: alerts.filter((a: any) => a.severity === 'high').length,
      }
    })

    res.json(withAlerts)
  } catch (e) {
    console.error('GET /maintenance-plans/:id/tickets error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/maintenance-plans
router.post('/', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const parsed = createPlanSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const planCode = await nextPlanCode()
    const [plan] = await db.insert(maintenancePlans).values({
      planCode,
      name: parsed.data.name,
      year: parsed.data.year,
      status: parsed.data.status ?? 'Draft',
      description: parsed.data.description ?? null,
      endDate: parsed.data.endDate ?? null,
      createdById: req.user!.id,
    }).returning()

    res.status(201).json({ ...plan, assetCount: 0 })
  } catch (e) {
    console.error('POST /maintenance-plans error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/maintenance-plans/:id
router.patch('/:id', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  const id = String(req.params.id)
  try {
    const parsed = updatePlanSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const [plan] = await db.update(maintenancePlans)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(maintenancePlans.id, id))
      .returning()

    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return }

    if (parsed.data.status === 'Active') {
      const entries = await db.select().from(maintenancePlanEntries).where(eq(maintenancePlanEntries.planId, id))
      for (const entry of entries) {
        await generateTicketsForEntry(entry, req.user!.id)
      }
    }

    res.json(plan)
  } catch (e) {
    console.error('PATCH /maintenance-plans/:id error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/maintenance-plans/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = String(req.params.id)
  try {
    await db.delete(maintenancePlans).where(eq(maintenancePlans.id, id))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Compute which months a frequency fires in a year, returning { month (1-12), day } pairs
function computeScheduledDates(frequencies: { frequency: string; startMonth: number; startDay: number }[], year: number) {
  const dates: { month: number; day: number; frequency: string }[] = []
  for (const freq of frequencies) {
    let months: number[] = []
    const start = freq.startMonth
    if (freq.frequency === 'Monthly') {
      months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    } else if (freq.frequency === 'Quarterly') {
      let m = start; while (m <= 12) { months.push(m); m += 3 }
    } else if (freq.frequency === 'Half Yearly') {
      let m = start; while (m <= 12) { months.push(m); m += 6 }
    } else if (freq.frequency === 'Yearly') {
      months = [start]
    }
    for (const m of months) {
      dates.push({ month: m, day: freq.startDay, frequency: freq.frequency })
    }
  }
  return dates
}

async function nextTicketNumber(): Promise<string> {
  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(tickets)
  return `TKT-${String((cnt ?? 0) + 1).padStart(4, '0')}`
}

async function generateNextTicketForEntry(entry: typeof maintenancePlanEntries.$inferSelect, currentUserId: string) {
  if (!entry.assignedToId) return

  // Skip ticket creation if the parent plan is paused or has ended
  const [parentPlan] = await db.select({ status: maintenancePlans.status, endDate: maintenancePlans.endDate })
    .from(maintenancePlans).where(eq(maintenancePlans.id, entry.planId))
  if (!parentPlan) return
  if (parentPlan.status === 'Paused' || parentPlan.status === 'Inactive' || parentPlan.status === 'Archived') return
  const planEndDate = parentPlan.endDate ? new Date(parentPlan.endDate) : null

  // Fetch asset info for ticket title
  let assetName: string | null = null
  let utilityTypeId: string | null = null
  if (entry.assetId) {
    const [asset] = await db.select({ name: assets.name, utilityTypeId: assets.utilityTypeId })
      .from(assets).where(eq(assets.id, entry.assetId))
    assetName = asset?.name ?? null
    utilityTypeId = asset?.utilityTypeId ?? null
  }

  const scheduledDates = computeScheduledDates(entry.frequencies as any[], entry.year)
  if (scheduledDates.length === 0) return

  const today = new Date()
  // Sort scheduled dates ascending
  const sorted = scheduledDates
    .map(({ month, day, frequency }) => ({
      dueDate: new Date(entry.year, month - 1, day),
      frequency,
    }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const label = assetName ?? entry.equipmentDesc ?? entry.equipmentNo ?? 'Equipment'

  for (const { dueDate, frequency } of sorted) {
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // Skip dates more than 30 days in the past
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30)
    if (dueDate < thirtyDaysAgo) continue

    // Skip dates after the plan's end date
    if (planEndDate && dueDate > planEndDate) continue

    // Check if a ticket already exists for this entry + due date
    const existing = await db.select({ id: tickets.id, status: tickets.status }).from(tickets)
      .where(and(
        eq(tickets.maintenancePlanEntryId, entry.id),
        eq(tickets.dueDate, dueDateStr)
      ))

    if (existing.length > 0) {
      const isOpen = ['Open', 'Assigned', 'In Progress', 'Submitted', 'Resubmitted', 'Needs Revision'].includes(existing[0].status)
      if (isOpen) {
        // There is already an active ticket for a future slot — stop here, do not create more
        return
      }
      // Ticket exists but is closed/approved/rejected — skip this slot, check next
      continue
    }

    // No ticket yet for this slot — create ONE and stop
    const tktNum = await nextTicketNumber()
    await db.insert(tickets).values({
      number: tktNum,
      type: 'PM Plan',
      priority: 'Medium',
      status: 'Assigned',
      title: `PM \u2013 ${label} (${frequency})`,
      description: entry.remarks ?? `Preventive maintenance for ${label}`,
      dueDate: dueDateStr,
      assignedToId: entry.assignedToId,
      assetId: entry.assetId ?? null,
      utilityTypeId,
      maintenancePlanEntryId: entry.id,
      filledValues: {
        __timeline: [{
          event: 'Created',
          status: 'Assigned',
          byName: 'System',
          byId: currentUserId,
          at: new Date().toISOString(),
        }],
        __submissions: [],
      } as any,
      createdById: currentUserId,
    })
    return  // Only one ticket at a time per entry
  }
}

// Alias for backward compat within this file
const generateTicketsForEntry = generateNextTicketForEntry

// Exported so tickets.ts can call it when approving/closing a PM ticket
export { generateNextTicketForEntry as generateNextPmTicket }



// POST /api/maintenance-plans/:id/entries
router.post('/:id/entries', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  const id = String(req.params.id)
  try {
    const [plan] = await db.select({
      id: maintenancePlans.id,
      year: maintenancePlans.year,
      name: maintenancePlans.name,
      status: maintenancePlans.status,
    })
      .from(maintenancePlans).where(eq(maintenancePlans.id, id))
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return }

    const parsed = bulkEntriesSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const inserted = await db.insert(maintenancePlanEntries).values(
      parsed.data.entries.map(e => ({
        planId: id,
        assetId: e.assetId ?? null,
        equipmentNo: e.equipmentNo ?? null,
        equipmentDesc: e.equipmentDesc ?? null,
        frequencies: e.frequencies,
        year: e.year,
        remarks: e.remarks ?? null,
        assignedToId: e.assignedToId ?? null,
        actuals: {} as Record<string, string | null>,
      }))
    ).returning()

    // Auto-generate tickets for each scheduled date if an engineer is assigned
    for (const entry of inserted) {
      await generateTicketsForEntry(entry, req.user!.id)
    }

    res.status(201).json(inserted)
  } catch (e) {
    console.error('POST entries error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/maintenance-plans/:id/entries/:entryId
router.patch('/:id/entries/:entryId', requireAuth, requireRole('admin', 'approver', 'engineer'), async (req, res) => {
  const entryId = String(req.params.entryId)
  try {
    const parsed = updateEntrySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }

    const [entry] = await db.update(maintenancePlanEntries)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(maintenancePlanEntries.id, entryId))
      .returning()

    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return }
    
    // Auto-generate tickets for newly updated entry if it has an engineer and valid frequencies
    await generateTicketsForEntry(entry, req.user!.id)

    res.json(entry)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/maintenance-plans/:id/entries/:entryId
router.delete('/:id/entries/:entryId', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  const entryId = String(req.params.entryId)
  try {
    await db.delete(maintenancePlanEntries)
      .where(eq(maintenancePlanEntries.id, entryId))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
