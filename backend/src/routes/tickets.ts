import { Router } from 'express'
import { db } from '../db/index.js'
import {
  tickets, users, assets, utilityTypes, utForms,
  utFormSections, utFormSectionFields, utFields, assetFormFieldOverrides, assetExtraFields,
  utAlertRules, assetAlertRuleOverrides, assetExtraAlertRules, maintenancePlanEntries, maintenancePlans,
} from '../db/schema.js'
import { eq, and, desc, isNull, lte } from 'drizzle-orm'
import { requireAuth, requireRole } from '../lib/auth.js'
import { z } from 'zod'

const router = Router()

function ticketNumber() {
  return `TKT-${Date.now()}`
}

// Evaluate alert rules against submitted field values.
// values are keyed by utFormSectionField.id (UUID) — we must look up the field name → ID mapping.
async function evaluateAlerts(utilityTypeId: string | null, values: Record<string, unknown>, assetId?: string | null) {
  if (!utilityTypeId) return []
  try {
    const [utilityRules, assetOverrides, assetExtraRules] = await Promise.all([
      db.select().from(utAlertRules).where(eq(utAlertRules.utilityTypeId, utilityTypeId)),
      assetId ? db.select().from(assetAlertRuleOverrides).where(eq(assetAlertRuleOverrides.assetId, assetId)) : Promise.resolve([]),
      assetId ? db.select().from(assetExtraAlertRules).where(eq(assetExtraAlertRules.assetId, assetId)) : Promise.resolve([]),
    ])

    // Apply asset overrides to utility rules
    const effectiveUtilityRules = utilityRules
      .map(rule => {
        const ov = assetOverrides.find(o => o.utilityAlertRuleId === rule.id)
        if (ov?.isDisabled) return null
        return {
          ...rule,
          value: ov?.overrideValue ?? rule.value,
          severity: (ov?.overrideSeverity ?? rule.severity) as typeof rule.severity,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const allRules = [
      ...effectiveUtilityRules,
      ...assetExtraRules.map(r => ({ ...r, id: r.id })),
    ]

    if (allRules.length === 0) return []

    // Build a map: fieldName (lowercase trim) → list of sectionFieldIds that reference this field
    // so we can find submitted values keyed by sectionFieldId
    const fieldRows = await db.select({
      sectionFieldId: utFormSectionFields.id,
      fieldName: utFields.name,
    })
      .from(utFormSectionFields)
      .leftJoin(utFields, eq(utFormSectionFields.fieldId, utFields.id))

    const fieldMap = new Map<string, string[]>() // fieldName.lower → [sectionFieldId, ...]
    for (const row of fieldRows) {
      if (!row.fieldName) continue
      const key = row.fieldName.trim().toLowerCase()
      if (!fieldMap.has(key)) fieldMap.set(key, [])
      fieldMap.get(key)!.push(row.sectionFieldId)
    }

    const triggered: {
      ruleId: string; name: string; fieldName: string;
      condition: string; threshold: string; severity: string;
      action: string | null; submittedValue: string
    }[] = []

    for (const rule of allRules) {
      const key = rule.fieldName.trim().toLowerCase()
      const sectionFieldIds = fieldMap.get(key) ?? []

      // Try every sectionFieldId that maps to this fieldName, plus the fieldName itself as a fallback
      let rawValue: unknown = values[rule.fieldName]  // fallback: direct key match
      for (const sfId of sectionFieldIds) {
        if (values[sfId] !== undefined) {
          rawValue = values[sfId]
          break
        }
      }

      if (rawValue === undefined || rawValue === null || rawValue === '') continue
      const num = parseFloat(String(rawValue))
      if (isNaN(num)) continue
      const threshold = parseFloat(rule.value)
      if (isNaN(threshold)) continue

      let triggered_flag = false
      let matchedCondition = rule.condition
      let matchedThreshold = rule.value

      if (rule.condition === '>' && num > threshold) triggered_flag = true
      if (rule.condition === '<' && num < threshold) triggered_flag = true
      if (rule.condition === '==' && num === threshold) triggered_flag = true

      // OR: secondary compound condition
      if (!triggered_flag && rule.condition2 && rule.value2) {
        const threshold2 = parseFloat(rule.value2)
        if (!isNaN(threshold2)) {
          if (rule.condition2 === '>' && num > threshold2) { triggered_flag = true; matchedCondition = rule.condition2; matchedThreshold = rule.value2 }
          if (rule.condition2 === '<' && num < threshold2) { triggered_flag = true; matchedCondition = rule.condition2; matchedThreshold = rule.value2 }
          if (rule.condition2 === '==' && num === threshold2) { triggered_flag = true; matchedCondition = rule.condition2; matchedThreshold = rule.value2 }
        }
      }

      if (triggered_flag) {
        triggered.push({
          ruleId: rule.id,
          name: rule.name,
          fieldName: rule.fieldName,
          condition: matchedCondition,
          threshold: matchedThreshold,
          severity: rule.severity,
          action: rule.action ?? null,
          submittedValue: String(rawValue),
        })
      }
    }
    return triggered
  } catch (e) {
    console.error('evaluateAlerts error:', e)
    return []
  }
}

// Build form snapshot for a ticket's current form config
async function buildFormSnapshot(formId: string, assetId: string) {
  const sections = await db.select().from(utFormSections)
    .where(eq(utFormSections.formId, formId)).orderBy(utFormSections.sortOrder)
  const sectionFields = await db.select({
    id: utFormSectionFields.id, sectionId: utFormSectionFields.sectionId,
    fieldId: utFormSectionFields.fieldId, fieldName: utFields.name,
    fieldType: utFields.type, fieldUnit: utFields.unit, required: utFields.required,
    fieldOptions: utFields.options, fieldComputed: utFields.computed,
    fieldFormula: utFields.formula, requiredOverride: utFormSectionFields.requiredOverride,
    sortOrder: utFormSectionFields.sortOrder,
  })
    .from(utFormSectionFields)
    .leftJoin(utFields, eq(utFormSectionFields.fieldId, utFields.id))
    .where(eq(utFormSectionFields.formId, formId)).orderBy(utFormSectionFields.sortOrder)
  const overrides = await db.select().from(assetFormFieldOverrides)
    .where(eq(assetFormFieldOverrides.assetId, assetId))
  const extraFields = await db.select().from(assetExtraFields)
    .where(and(eq(assetExtraFields.assetId, assetId), eq(assetExtraFields.formId, formId)))

  return {
    sections: sections.map(s => ({
      ...s,
      fields: sectionFields.filter(f => f.sectionId === s.id).map(f => {
        const ov = overrides.find(o => o.formSectionFieldId === f.id)
        return { ...f, isHidden: ov?.isHidden ?? false, assetRequiredOverride: ov?.requiredOverride ?? null, computed: f.fieldComputed ?? false, formula: f.fieldFormula ?? null }
      }),
      extraFields: extraFields.filter(ef => ef.sectionId === s.id),
    })),
  }
}

// Strip internal metadata keys from filledValues before sending to client
function cleanValues(raw: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => !k.startsWith('__'))
  )
}

// ── GET /api/tickets ──
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const { utilityTypeId, assetId } = req.query as Record<string, string>
    const rows = await db.select({
      id: tickets.id,
      number: tickets.number,
      type: tickets.type,
      priority: tickets.priority,
      status: tickets.status,
      title: tickets.title,
      description: tickets.description,
      dueDate: tickets.dueDate,
      submittedAt: tickets.submittedAt,
      reviewedAt: tickets.reviewedAt,
      rejectionReason: tickets.rejectionReason,
      filledValues: tickets.filledValues,
      utilityTypeId: tickets.utilityTypeId,
      assetId: tickets.assetId,
      formId: tickets.formId,
      pmPlanId: tickets.pmPlanId,
      breakdownId: tickets.breakdownId,
      submissionId: tickets.submissionId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      reviewedById: tickets.reviewedById,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      utilityTypeName: utilityTypes.name,
      assetName: assets.name,
      assetSerial: assets.serial,
      formName: utForms.name,
      assignedToName: users.name,
      maintenancePlanEntryId: tickets.maintenancePlanEntryId,
      planId: maintenancePlanEntries.planId,
      planName: maintenancePlans.name,
      planStatus: maintenancePlans.status,
      planEndDate: maintenancePlans.endDate,
    })
      .from(tickets)
      .leftJoin(utilityTypes, eq(tickets.utilityTypeId, utilityTypes.id))
      .leftJoin(assets, eq(tickets.assetId, assets.id))
      .leftJoin(utForms, eq(tickets.formId, utForms.id))
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .leftJoin(maintenancePlanEntries, eq(tickets.maintenancePlanEntryId, maintenancePlanEntries.id))
      .leftJoin(maintenancePlans, eq(maintenancePlanEntries.planId, maintenancePlans.id))
      .where(
        utilityTypeId && assetId
          ? and(eq(tickets.utilityTypeId, utilityTypeId), eq(tickets.assetId, assetId))
          : utilityTypeId
            ? eq(tickets.utilityTypeId, utilityTypeId)
            : assetId
              ? eq(tickets.assetId, assetId)
              : undefined
      )
      .orderBy(desc(tickets.createdAt))

    const filtered = user.role === 'engineer'
      ? rows.filter(r => r.assignedToId === user.id)
      : rows

    const withAlerts = filtered.map(r => {
      const stored = (r.filledValues ?? {}) as Record<string, unknown>
      const alerts: any[] = Array.isArray(stored.__alerts) ? stored.__alerts : []
      return {
        ...r,
        alertCount: alerts.length,
        criticalCount: alerts.filter((a: any) => a.severity === 'critical').length,
        highCount: alerts.filter((a: any) => a.severity === 'high').length,
      }
    })

    res.json(withAlerts)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/tickets/flagged — tickets with triggered alerts ──
// Must be registered before /:id to avoid 'flagged' being treated as an id
router.get('/flagged', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const rows = await db.select({
      id: tickets.id,
      number: tickets.number,
      type: tickets.type,
      priority: tickets.priority,
      status: tickets.status,
      title: tickets.title,
      description: tickets.description,
      dueDate: tickets.dueDate,
      submittedAt: tickets.submittedAt,
      reviewedAt: tickets.reviewedAt,
      rejectionReason: tickets.rejectionReason,
      filledValues: tickets.filledValues,
      utilityTypeId: tickets.utilityTypeId,
      assetId: tickets.assetId,
      formId: tickets.formId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      reviewedById: tickets.reviewedById,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      utilityTypeName: utilityTypes.name,
      assetName: assets.name,
      assignedToName: users.name,
    })
      .from(tickets)
      .leftJoin(utilityTypes, eq(tickets.utilityTypeId, utilityTypes.id))
      .leftJoin(assets, eq(tickets.assetId, assets.id))
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .orderBy(desc(tickets.updatedAt))

    const visibleRows = user.role === 'engineer'
      ? rows.filter(r => r.assignedToId === user.id)
      : rows

    const flagged = visibleRows.filter(r => {
      const stored = (r.filledValues ?? {}) as Record<string, unknown>
      const alerts = (stored.__alerts ?? []) as unknown[]
      return alerts.length > 0
    }).map(r => {
      const stored = (r.filledValues ?? {}) as Record<string, unknown>
      const alerts = (stored.__alerts ?? []) as any[]
      return {
        ...r,
        filledValues: undefined,
        triggeredAlerts: alerts,
        alertCount: alerts.length,
        criticalCount: alerts.filter((a: any) => a.severity === 'critical').length,
        highCount: alerts.filter((a: any) => a.severity === 'high').length,
      }
    })

    res.json(flagged)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/tickets/:id ──
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticketId = String(req.params.id)
    const user = (req as any).user

    const [row] = await db.select({
      id: tickets.id,
      number: tickets.number,
      type: tickets.type,
      priority: tickets.priority,
      status: tickets.status,
      title: tickets.title,
      description: tickets.description,
      dueDate: tickets.dueDate,
      submittedAt: tickets.submittedAt,
      reviewedAt: tickets.reviewedAt,
      rejectionReason: tickets.rejectionReason,
      filledValues: tickets.filledValues,
      utilityTypeId: tickets.utilityTypeId,
      assetId: tickets.assetId,
      formId: tickets.formId,
      pmPlanId: tickets.pmPlanId,
      breakdownId: tickets.breakdownId,
      submissionId: tickets.submissionId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      reviewedById: tickets.reviewedById,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      utilityTypeName: utilityTypes.name,
      assetName: assets.name,
      assetSerial: assets.serial,
      formName: utForms.name,
      assignedToName: users.name,
      maintenancePlanEntryId: tickets.maintenancePlanEntryId,
      planId: maintenancePlanEntries.planId,
      planName: maintenancePlans.name,
      planStatus: maintenancePlans.status,
      planEndDate: maintenancePlans.endDate,
    })
      .from(tickets)
      .leftJoin(utilityTypes, eq(tickets.utilityTypeId, utilityTypes.id))
      .leftJoin(assets, eq(tickets.assetId, assets.id))
      .leftJoin(utForms, eq(tickets.formId, utForms.id))
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .leftJoin(maintenancePlanEntries, eq(tickets.maintenancePlanEntryId, maintenancePlanEntries.id))
      .leftJoin(maintenancePlans, eq(maintenancePlanEntries.planId, maintenancePlans.id))
      .where(eq(tickets.id, ticketId))

    if (!row) { res.status(404).json({ error: 'Ticket not found' }); return }

    if (user.role === 'engineer' && row.assignedToId !== user.id) {
      res.status(403).json({ error: 'Forbidden' }); return
    }

    const stored = (row.filledValues ?? {}) as Record<string, unknown>
    const rawSubmissions = (stored.__submissions ?? []) as any[]
    const timeline = (stored.__timeline ?? []) as any[]
    const latestSnapshot = stored.__formSnapshot as any

    const isSubmittedStatus = ['Submitted', 'Resubmitted', 'Approved', 'Rejected', 'Needs Revision', 'Closed'].includes(row.status)

    // For old tickets (submitted before __submissions tracking was added):
    // synthesize a submission entry from the raw filledValues + snapshot so the UI shows the data
    let submissions = rawSubmissions
    if (rawSubmissions.length === 0 && isSubmittedStatus) {
      const rawValues = cleanValues(stored)
      if (Object.keys(rawValues).length > 0 || latestSnapshot) {
        // Try to get formSnapshot — either stored or build live from form config
        let formSnapshot = latestSnapshot ?? null
        if (!formSnapshot && row.formId && row.assetId) {
          try { formSnapshot = await buildFormSnapshot(row.formId, row.assetId) } catch { /* non-fatal */ }
        }
        submissions = [{
          index: 1,
          status: row.status === 'Resubmitted' ? 'Resubmitted' : 'Submitted',
          byName: row.assignedToName ?? 'Engineer',
          byId: row.assignedToId ?? '',
          at: row.submittedAt?.toISOString() ?? row.updatedAt?.toISOString() ?? row.createdAt?.toISOString() ?? new Date().toISOString(),
          values: rawValues,
          formSnapshot,
          triggeredAlerts: (stored.__alerts ?? []) as any[],
        }]
      }
    }

    // Latest filled values = most recent submission's values, or current
    const latestValues = submissions.length > 0
      ? cleanValues(submissions[submissions.length - 1].values as Record<string, unknown>)
      : cleanValues(stored)

    // formData: for submitted/closed use snapshot; for active use live form
    let formData = null
    if ((['Task', 'Data Entry'] as string[]).includes(row.type) && row.formId && row.assetId) {
      const snap = submissions.length > 0 ? submissions[submissions.length - 1].formSnapshot : latestSnapshot
      if (snap && isSubmittedStatus) {
        formData = snap
      } else if (!isSubmittedStatus) {
        try { formData = await buildFormSnapshot(row.formId, row.assetId) } catch { /* non-fatal */ }
      }
    }

    const triggeredAlerts = (stored.__alerts ?? []) as any[]

    res.json({
      ...row,
      filledValues: latestValues,
      formData,
      submissions,
      timeline,
      triggeredAlerts,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

const createSchema = z.object({
  type: z.enum(['Task', 'Data Entry', 'PM Plan', 'Breakdown']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  utilityTypeId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  formId: z.string().uuid().optional(),
  pmPlanId: z.string().uuid().optional(),
  breakdownId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  engineerHeadId: z.string().uuid().optional(),
  additionalEngineerIds: z.array(z.string().uuid()).optional(),
})

// ── POST /api/tickets ──
router.post('/', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      return
    }
    const user = (req as any).user
    const dbType = parsed.data.type === 'Task' ? 'Data Entry' : parsed.data.type

    // Seed initial timeline entry
    const timeline = [{
      event: 'created',
      status: parsed.data.assignedToId ? 'Assigned' : 'Open',
      byName: user.name,
      byId: user.id,
      at: new Date().toISOString(),
    }]
    if (parsed.data.assignedToId) {
      timeline.push({
        event: 'assigned',
        status: 'Assigned',
        byName: user.name,
        byId: user.id,
        at: new Date().toISOString(),
      })
    }

    const [ticket] = await db.insert(tickets).values({
      number: ticketNumber(),
      type: dbType as any,
      priority: parsed.data.priority,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.assignedToId ? 'Assigned' : 'Open',
      createdById: user.id,
      dueDate: parsed.data.dueDate || null,
      utilityTypeId: parsed.data.utilityTypeId || null,
      assetId: parsed.data.assetId || null,
      formId: parsed.data.formId || null,
      pmPlanId: parsed.data.pmPlanId || null,
      breakdownId: parsed.data.breakdownId || null,
      assignedToId: parsed.data.assignedToId || null,
      filledValues: { __timeline: timeline, __submissions: [] } as any,
    }).returning()

    res.status(201).json(ticket)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

const updateSchema = z.object({
  status: z.enum(['Open', 'Assigned', 'In Progress', 'Submitted', 'Resubmitted', 'Approved', 'Rejected', 'Needs Revision', 'Closed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  engineerHeadId: z.string().uuid().nullable().optional(),
  additionalEngineerIds: z.array(z.string().uuid()).optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().optional(),
  rejectionReason: z.string().optional(),
  filledValues: z.record(z.unknown()).optional(),
})

// ── PATCH /api/tickets/:id ──
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const ticketId = String(req.params.id)
    const user = (req as any).user

    const [existing] = await db.select().from(tickets).where(eq(tickets.id, ticketId))
    if (!existing) { res.status(404).json({ error: 'Ticket not found' }); return }

    const stored = (existing.filledValues ?? {}) as Record<string, unknown>
    const existingTimeline = (stored.__timeline ?? []) as any[]
    const existingSubmissions = (stored.__submissions ?? []) as any[]

    if (user.role === 'engineer') {
      if (existing.assignedToId !== user.id) {
        res.status(403).json({ error: 'Forbidden' }); return
      }
      const parsed = z.object({
        status: z.enum(['In Progress', 'Submitted', 'Resubmitted']).optional(),
        filledValues: z.record(z.unknown()).optional(),
      }).safeParse(req.body)
      if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (parsed.data.status) {
        const wasRevision = existing.rejectionReason && existing.status === 'In Progress'
        updateData.status = (parsed.data.status === 'Submitted' && wasRevision) ? 'Resubmitted' : parsed.data.status
      }

      const finalStatus = updateData.status as string
      if (finalStatus === 'Submitted' || finalStatus === 'Resubmitted') {
        updateData.submittedAt = new Date()
        const submittedValues = parsed.data.filledValues ?? {}

        // Evaluate alert rules against submitted values (pass assetId for asset-level overrides)
        const triggeredAlerts = await evaluateAlerts(existing.utilityTypeId, submittedValues, existing.assetId)

        // Build form snapshot
        let formSnapshot = null
        if (existing.formId && existing.assetId) {
          try { formSnapshot = await buildFormSnapshot(existing.formId, existing.assetId) } catch { /* non-fatal */ }
        }

        // If existingSubmissions is empty but the ticket was previously submitted (old format OR
        // admin wiped __submissions during a "needs revision" PATCH), synthesize the original submission
        // from the raw stored values so we don't lose the history.
        let baseSubmissions = existingSubmissions
        if (baseSubmissions.length === 0 && existing.rejectionReason) {
          const rawValues = Object.fromEntries(
            Object.entries(stored).filter(([k]) => !k.startsWith('__'))
          )
          if (Object.keys(rawValues).length > 0) {
            let oldSnapshot = stored.__formSnapshot as any ?? null
            if (!oldSnapshot && existing.formId && existing.assetId) {
              try { oldSnapshot = await buildFormSnapshot(existing.formId, existing.assetId) } catch { /* non-fatal */ }
            }
            baseSubmissions = [{
              index: 1,
              status: 'Submitted',
              byName: user.name,
              byId: existing.assignedToId ?? user.id,
              at: existing.submittedAt?.toISOString() ?? existing.updatedAt?.toISOString() ?? new Date().toISOString(),
              values: rawValues,
              formSnapshot: oldSnapshot,
              triggeredAlerts: (stored.__alerts ?? []) as any[],
            }]
          }
        }

        // Append this submission to history
        const submissionEntry = {
          index: baseSubmissions.length + 1,
          status: finalStatus,
          byName: user.name,
          byId: user.id,
          at: new Date().toISOString(),
          values: submittedValues,
          formSnapshot,
          triggeredAlerts,
        }
        const newSubmissions = [...baseSubmissions, submissionEntry]

        // Append timeline event
        const newTimeline = [...existingTimeline, {
          event: finalStatus === 'Resubmitted' ? 'resubmitted' : 'submitted',
          status: finalStatus,
          byName: user.name,
          byId: user.id,
          at: new Date().toISOString(),
          alertCount: triggeredAlerts.length,
        }]

        updateData.filledValues = {
          ...submittedValues,
          __timeline: newTimeline,
          __submissions: newSubmissions,
          __formSnapshot: formSnapshot,
          __alerts: triggeredAlerts,
        }
      } else if (parsed.data.filledValues) {
        // Just saving draft values (In Progress)
        const newTimeline = parsed.data.status
          ? [...existingTimeline, { event: 'in_progress', status: 'In Progress', byName: user.name, byId: user.id, at: new Date().toISOString() }]
          : existingTimeline
        updateData.filledValues = {
          ...parsed.data.filledValues,
          __timeline: newTimeline,
          __submissions: existingSubmissions,
          __formSnapshot: stored.__formSnapshot,
        }
      }

      const [updated] = await db.update(tickets).set(updateData).where(eq(tickets.id, ticketId)).returning()
      res.json(updated)
      return
    }

    // Admin/approver
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() }); return }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status
      if (['Approved', 'Rejected', 'Needs Revision', 'Closed'].includes(parsed.data.status)) {
        updateData.reviewedAt = new Date()
        updateData.reviewedById = user.id
      }

      // Append to timeline
      const eventMap: Record<string, string> = {
        'Approved': 'approved', 'Rejected': 'rejected',
        'Needs Revision': 'needs_revision', 'Closed': 'closed',
        'Assigned': 'assigned',
      }
      const newTimeline = [...existingTimeline, {
        event: eventMap[parsed.data.status] ?? parsed.data.status.toLowerCase().replace(' ', '_'),
        status: parsed.data.status,
        byName: user.name,
        byId: user.id,
        note: parsed.data.rejectionReason ?? null,
        at: new Date().toISOString(),
      }]

      // Write timeline back into filledValues
      updateData.filledValues = {
        ...stored,
        __timeline: newTimeline,
        __submissions: existingSubmissions,
      }
    }

    if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority
    if (parsed.data.assignedToId !== undefined) {
      updateData.assignedToId = parsed.data.assignedToId
      if (parsed.data.assignedToId && existing.status === 'Open') {
        updateData.status = 'Assigned'
        // Also add assigned event to timeline
        const newTimeline = [...existingTimeline, {
          event: 'assigned',
          status: 'Assigned',
          byName: user.name,
          byId: user.id,
          at: new Date().toISOString(),
        }]
        updateData.filledValues = { ...stored, __timeline: newTimeline, __submissions: existingSubmissions }
      }
    }
    if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.rejectionReason !== undefined) updateData.rejectionReason = parsed.data.rejectionReason

    const [updated] = await db.update(tickets).set(updateData).where(eq(tickets.id, ticketId)).returning()

    // Auto-advance: when a PM Plan ticket is Approved or Closed, spawn the next scheduled ticket
    if (['Approved', 'Closed'].includes(parsed.data.status ?? '') && existing.type === 'PM Plan' && existing.maintenancePlanEntryId) {
      try {
        const [entry] = await db.select().from(maintenancePlanEntries).where(eq(maintenancePlanEntries.id, existing.maintenancePlanEntryId!))
        if (entry) {
          const { generateNextPmTicket } = await import('./maintenancePlans.js')
          await generateNextPmTicket(entry, user.id)
        }
      } catch (e) {
        console.error('Auto-advance PM ticket error:', e)
      }
    }

    res.json(updated)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/tickets/:id/revisions — derived from filledValues.__timeline ──
router.get('/:id/revisions', requireAuth, async (req, res) => {
  try {
    const ticketId = String(req.params.id)
    const [row] = await db.select({ filledValues: tickets.filledValues }).from(tickets).where(eq(tickets.id, ticketId))
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    const stored = (row.filledValues ?? {}) as Record<string, unknown>
    res.json(stored.__timeline ?? [])
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── DELETE /api/tickets/:id ──
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await db.delete(tickets).where(eq(tickets.id, String(req.params.id)))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/tickets/engineers/:utilityTypeId ──
router.get('/engineers/:utilityTypeId', requireAuth, requireRole('admin', 'approver'), async (req, res) => {
  try {
    const utId = String(req.params.utilityTypeId)
    const all = await db.select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, shift: users.shift, assignedUtilityIds: users.assignedUtilityIds,
    }).from(users)
    const engineers = all.filter(u =>
      (u.role === 'engineer' || u.role === 'operator') &&
      (u.assignedUtilityIds ?? []).includes(utId)
    )
    res.json(engineers)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
