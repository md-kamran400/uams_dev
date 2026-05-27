// Seeds the six legacy Diesel Generator report templates as editable rows in
// `ut_report_templates`. Idempotent — runs safely on a database that already
// has templates (skips any whose slug already exists for the DG utility type).
//
// Run with: tsx src/db/seed-report-templates.ts
//
// Other utility types start empty; admins build templates via the new
// Config → Reports pill in the utility detail page.

import 'dotenv/config'
import { db } from './index.js'
import {
  utilityTypes, utFields,
  utReportTemplates, utReportSections, utReportSectionColumns,
} from './schema.js'
import { and, eq } from 'drizzle-orm'

interface ColumnSeed {
  label: string
  key: string
  kind: 'builtin' | 'field' | 'aggregate' | 'formula'
  builtin?: string
  fieldName?: string             // resolved to fieldId below
  aggregate?: 'sum' | 'avg' | 'min' | 'max' | 'last' | 'count'
  formula?: string
  width?: number
  align?: 'left' | 'right' | 'center'
  format?: { digits?: number }
}

interface SectionSeed {
  title: string
  source: 'submissions' | 'breakdowns' | 'pm_plans' | 'tickets' | 'spare_consumption' | 'computed'
  grouping?: 'none' | 'row' | 'date' | 'shift' | 'date_shift' | 'month' | 'status' | 'asset' | 'priority'
  filters?: Record<string, unknown>
  utilityScopeBehavior?: 'append_asset_col' | 'collapse_per_asset' | 'skip'
  columns: ColumnSeed[]
}

interface TemplateSeed {
  slug: string
  name: string
  description: string
  icon: string
  defaultScope: 'asset' | 'utility' | 'both'
  sections: SectionSeed[]
}

const DG_TEMPLATES: TemplateSeed[] = [
  {
    slug: 'daily-operation',
    name: 'Daily Operation Summary',
    description: 'Start/stop times, running hours, shift-wise KWH and HSD consumption per day.',
    icon: 'file-text',
    defaultScope: 'both',
    sections: [{
      title: 'Daily Operation Summary',
      source: 'submissions',
      grouping: 'row',
      columns: [
        { label: 'Date',    key: 'date',    kind: 'builtin', builtin: 'date',    width: 80 },
        { label: 'Shift',   key: 'shift',   kind: 'builtin', builtin: 'shift',   width: 40, align: 'center' },
        { label: 'Operator', key: 'operator', kind: 'builtin', builtin: 'operator', width: 110 },
        { label: 'Start',   key: 'start_time', kind: 'field', fieldName: 'Start Time', width: 50, align: 'center' },
        { label: 'Stop',    key: 'stop_time',  kind: 'field', fieldName: 'Stop Time',  width: 50, align: 'center' },
        { label: 'Run Hrs', key: 'running_hours', kind: 'field', fieldName: 'Running Time', width: 55, align: 'right' },
        { label: 'KWH',     key: 'total_kwh', kind: 'field', fieldName: 'Total KWH', width: 55, align: 'right' },
        { label: 'HSD (L)', key: 'hsd_consumed', kind: 'field', fieldName: 'HSD Consumed', width: 55, align: 'right' },
        { label: 'Status',  key: 'status', kind: 'builtin', builtin: 'status', width: 60, align: 'center' },
      ],
    }],
  },
  {
    slug: 'fuel-consumption',
    name: 'Fuel Consumption Report',
    description: 'HSD consumed daily/weekly/monthly with trend analysis and cost breakdown.',
    icon: 'fuel',
    defaultScope: 'both',
    sections: [{
      title: 'Daily Fuel Consumption',
      source: 'submissions',
      grouping: 'date',
      columns: [
        { label: 'Date',         key: 'date',         kind: 'builtin', builtin: 'date', width: 80 },
        { label: 'Records',      key: 'records',      kind: 'aggregate', aggregate: 'count', fieldName: 'Date', width: 60, align: 'right' },
        { label: 'Run Hrs',      key: 'sum_run',      kind: 'aggregate', aggregate: 'sum', fieldName: 'Running Time', width: 65, align: 'right' },
        { label: 'HSD (L)',      key: 'sum_hsd',      kind: 'aggregate', aggregate: 'sum', fieldName: 'HSD Consumed', width: 70, align: 'right' },
        { label: 'KWH',          key: 'sum_kwh',      kind: 'aggregate', aggregate: 'sum', fieldName: 'Total KWH', width: 70, align: 'right' },
        { label: 'L/kWh',        key: 'specific_fuel', kind: 'formula', formula: 'sum_hsd / sum_kwh', width: 70, align: 'right', format: { digits: 3 } },
      ],
    }],
  },
  {
    slug: 'kwh-generation',
    name: 'KWH Generation Report',
    description: 'Total kilowatt-hours generated per shift, day, week or month.',
    icon: 'zap',
    defaultScope: 'both',
    sections: [{
      title: 'KWH Generation by Shift',
      source: 'submissions',
      grouping: 'row',
      columns: [
        { label: 'Date',      key: 'date',       kind: 'builtin', builtin: 'date',    width: 90 },
        { label: 'Shift',     key: 'shift',      kind: 'builtin', builtin: 'shift',   width: 50, align: 'center' },
        { label: 'Start KWH', key: 'start_kwh',  kind: 'field', fieldName: 'Start KWH', width: 80, align: 'right' },
        { label: 'Stop KWH',  key: 'stop_kwh',   kind: 'field', fieldName: 'Stop KWH',  width: 80, align: 'right' },
        { label: 'KWH',       key: 'total_kwh',  kind: 'field', fieldName: 'Total KWH', width: 80, align: 'right' },
        { label: 'Run Hrs',   key: 'running',    kind: 'field', fieldName: 'Running Time', width: 80, align: 'right' },
      ],
    }],
  },
  {
    slug: 'service-history',
    name: 'Service History',
    description: 'Log of all maintenance activities, parts replaced, and engineer notes.',
    icon: 'wrench',
    defaultScope: 'both',
    sections: [{
      title: 'Preventive Maintenance Activities',
      source: 'pm_plans',
      grouping: 'row',
      columns: [
        { label: 'Task',      key: 'task',       kind: 'builtin', builtin: 'task',       width: 160 },
        { label: 'Frequency', key: 'frequency',  kind: 'builtin', builtin: 'frequency',  width: 70, align: 'center' },
        { label: 'Last Done', key: 'last_done',  kind: 'builtin', builtin: 'last_done',  width: 80 },
        { label: 'Next Due',  key: 'next_due',   kind: 'builtin', builtin: 'next_due',   width: 80 },
        { label: 'Status',    key: 'status',     kind: 'builtin', builtin: 'status',     width: 70, align: 'center' },
        { label: 'Assigned',  key: 'assigned_to', kind: 'builtin', builtin: 'assigned_to', width: 100 },
      ],
    }],
  },
  {
    slug: 'downtime-analysis',
    name: 'Downtime Analysis',
    description: 'Breakdown of planned vs. unplanned downtime with root-cause tags.',
    icon: 'trending-down',
    defaultScope: 'both',
    sections: [
      {
        title: 'Breakdown Events',
        source: 'breakdowns',
        grouping: 'row',
        columns: [
          { label: 'Number',       key: 'number',         kind: 'builtin', builtin: 'number',         width: 90 },
          { label: 'Nature',       key: 'nature',         kind: 'builtin', builtin: 'nature',         width: 130 },
          { label: 'Priority',     key: 'priority',       kind: 'builtin', builtin: 'priority',       width: 60, align: 'center' },
          { label: 'Status',       key: 'status',         kind: 'builtin', builtin: 'status',         width: 70, align: 'center' },
          { label: 'Downtime (h)', key: 'downtime_hours', kind: 'builtin', builtin: 'downtime_hours', width: 75, align: 'right' },
          { label: 'Labor (h)',    key: 'labor_hours',    kind: 'builtin', builtin: 'labor_hours',    width: 65, align: 'right' },
          { label: 'Reported By',  key: 'reporter',       kind: 'builtin', builtin: 'reporter',       width: 90 },
          { label: 'Raised',       key: 'created_at',     kind: 'builtin', builtin: 'created_at',     width: 80 },
        ],
      },
      {
        title: 'Summary',
        source: 'breakdowns',
        grouping: 'none',
        utilityScopeBehavior: 'skip',
        columns: [
          { label: 'Total events',    key: 'total',   kind: 'aggregate', aggregate: 'count', fieldName: 'Number', width: 200 },
          { label: 'Total downtime',  key: 'total_downtime', kind: 'aggregate', aggregate: 'sum', fieldName: 'Downtime Hours', width: 100, align: 'right' },
        ],
      },
    ],
  },
  {
    slug: 'monthly-performance',
    name: 'Monthly Performance',
    description: 'Consolidated monthly view: availability %, load factor, fuel efficiency.',
    icon: 'bar-chart-2',
    defaultScope: 'both',
    sections: [{
      title: 'Monthly Consolidated Performance',
      source: 'submissions',
      grouping: 'month',
      columns: [
        { label: 'Month',                   key: 'month',          kind: 'builtin', builtin: 'date',           width: 100 },
        { label: 'Submissions',             key: 'submissions',    kind: 'aggregate', aggregate: 'count', fieldName: 'Date', width: 70, align: 'right' },
        { label: 'Run Hrs',                 key: 'sum_run',        kind: 'aggregate', aggregate: 'sum', fieldName: 'Running Time', width: 70, align: 'right' },
        { label: 'KWH',                     key: 'sum_kwh',        kind: 'aggregate', aggregate: 'sum', fieldName: 'Total KWH', width: 70, align: 'right' },
        { label: 'HSD (L)',                 key: 'sum_hsd',        kind: 'aggregate', aggregate: 'sum', fieldName: 'HSD Consumed', width: 70, align: 'right' },
        { label: 'L/kWh',                   key: 'specific_fuel',  kind: 'formula', formula: 'sum_hsd / sum_kwh', width: 70, align: 'right', format: { digits: 3 } },
        { label: 'Avg Load (kW)',           key: 'avg_load',       kind: 'formula', formula: 'sum_kwh / sum_run', width: 80, align: 'right' },
      ],
    }],
  },
]

async function findUtilityTypeIdByName(name: string): Promise<string | null> {
  const rows = await db.select({ id: utilityTypes.id })
    .from(utilityTypes)
    .where(eq(utilityTypes.name, name))
  return rows[0]?.id ?? null
}

async function resolveFieldId(utilityTypeId: string, fieldName: string): Promise<string | null> {
  const rows = await db.select({ id: utFields.id, name: utFields.name })
    .from(utFields)
    .where(eq(utFields.utilityTypeId, utilityTypeId))
  const match = rows.find(r => r.name.toLowerCase() === fieldName.toLowerCase())
  return match?.id ?? null
}

async function seedTemplate(utilityTypeId: string, tpl: TemplateSeed) {
  // Idempotent: skip if a template with this slug already exists for this utility
  const [existing] = await db.select().from(utReportTemplates).where(and(
    eq(utReportTemplates.utilityTypeId, utilityTypeId),
    eq(utReportTemplates.slug, tpl.slug),
  ))
  if (existing) {
    console.log(`  ↩ ${tpl.slug} already exists, skipping`)
    return
  }

  const [tplRow] = await db.insert(utReportTemplates).values({
    utilityTypeId,
    slug: tpl.slug,
    name: tpl.name,
    description: tpl.description,
    icon: tpl.icon,
    defaultScope: tpl.defaultScope,
    sortOrder: 0,
  }).returning()

  let sectionOrder = 0
  for (const sec of tpl.sections) {
    const [secRow] = await db.insert(utReportSections).values({
      templateId: tplRow.id,
      title: sec.title,
      source: sec.source,
      grouping: sec.grouping ?? 'row',
      filters: sec.filters ?? {},
      utilityScopeBehavior: sec.utilityScopeBehavior ?? 'append_asset_col',
      sortOrder: sectionOrder++,
    }).returning()

    let colOrder = 0
    for (const col of sec.columns) {
      const fieldId = col.fieldName ? await resolveFieldId(utilityTypeId, col.fieldName) : null
      await db.insert(utReportSectionColumns).values({
        sectionId: secRow.id,
        label: col.label,
        key: col.key,
        kind: col.kind,
        builtin: col.builtin ?? null,
        fieldId,
        fieldName: col.fieldName ?? null,
        aggregate: col.aggregate ?? null,
        formula: col.formula ?? null,
        width: col.width ?? 80,
        align: col.align ?? 'left',
        format: col.format ?? {},
        sortOrder: colOrder++,
      })
    }
  }
  console.log(`  ✓ ${tpl.slug} (${tpl.sections.length} section(s))`)
}

async function main() {
  console.log('🌱 Seeding Diesel Generator report templates...')
  const dgId = await findUtilityTypeIdByName('Diesel Generator')
  if (!dgId) {
    console.log('⚠️  Diesel Generator utility type not found — run the main seed first.')
    process.exit(0)
  }
  console.log(`  Utility: Diesel Generator (${dgId})`)
  for (const tpl of DG_TEMPLATES) {
    await seedTemplate(dgId, tpl)
  }
  console.log('✅ Report template seed complete.')
  process.exit(0)
}

main().catch(e => {
  console.error('Seed error:', e)
  process.exit(1)
})
