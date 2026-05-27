// Pre-built report template skeletons.
//
// A skeleton is a fully-structured template (sections + columns) where some
// columns reference *named slots* instead of a concrete field. When the admin
// picks a skeleton from the gallery, the UI asks them to map each slot to one
// of the utility's `utFields` — slots are skeleton-agnostic concepts like
// "runtime field" or "consumption field". Skipped slots cause their columns
// to be omitted at instantiation time.
//
// This lets a single skeleton work for any utility (DG, Compressor, Chiller,
// Boiler …) without the admin understanding the data model — they just answer
// "what's your fuel/consumption field?" once.

export type ColumnKind = 'builtin' | 'field' | 'aggregate' | 'formula'
export type ColumnAggregate = 'sum' | 'avg' | 'min' | 'max' | 'last' | 'count'

export interface SkeletonSlot {
  /** Stable key referenced by columns in this skeleton. */
  key: string
  /** Friendly label shown in the mapping screen, e.g. "Runtime / hours field". */
  label: string
  /** One-line hint, e.g. 'How long the equipment ran (e.g. "Running Time")'. */
  hint: string
  /** If true, the admin must map this slot; the skeleton refuses to apply otherwise. */
  required?: boolean
}

export interface SkeletonColumn {
  label: string
  key: string                      // stable key (used by formula columns)
  kind: ColumnKind
  builtin?: string                 // for kind=builtin
  slot?: string                    // for kind=field/aggregate — names a slot to be filled by admin
  aggregate?: ColumnAggregate      // for kind=aggregate
  formula?: string                 // for kind=formula
  width?: number
  align?: 'left' | 'right' | 'center'
  digits?: number                  // shorthand for format.digits
}

export interface SkeletonSection {
  title: string
  source: 'submissions' | 'breakdowns' | 'pm_plans' | 'tickets' | 'spare_consumption' | 'computed'
  grouping?: 'none' | 'row' | 'date' | 'shift' | 'date_shift' | 'month' | 'status' | 'asset' | 'priority'
  utilityScopeBehavior?: 'append_asset_col' | 'collapse_per_asset' | 'skip'
  columns: SkeletonColumn[]
}

export interface ReportSkeleton {
  id: string
  name: string
  description: string
  icon: string
  defaultScope: 'asset' | 'utility' | 'both'
  /** Slots the admin must map before instantiation. */
  slots: SkeletonSlot[]
  sections: SkeletonSection[]
}

// ── Catalog ────────────────────────────────────────────────

export const SKELETONS: ReportSkeleton[] = [
  // 1. Operations Log — daily/shift log, one row per submission.
  {
    id: 'operations-log',
    name: 'Operations Log',
    description: 'Daily / shift log of operator submissions — one row per record, with date, shift, operator and the readings you choose.',
    icon: 'clipboard-list',
    defaultScope: 'both',
    slots: [
      { key: 'start_reading',  label: 'Start reading field',     hint: 'A reading taken at the start of the shift (e.g. "Start KWH")' },
      { key: 'stop_reading',   label: 'Stop reading field',      hint: 'A reading taken at the end of the shift (e.g. "Stop KWH")' },
      { key: 'output',         label: 'Output / production field', hint: 'What the equipment produced (e.g. "Total KWH")', required: true },
      { key: 'runtime',        label: 'Runtime / hours field',   hint: 'How long the equipment ran (e.g. "Running Time")' },
      { key: 'consumption',    label: 'Consumption field',       hint: 'Fuel/water/other consumption (e.g. "HSD Consumed")' },
    ],
    sections: [{
      title: 'Operations Log',
      source: 'submissions',
      grouping: 'row',
      columns: [
        { label: 'Date',     key: 'date',     kind: 'builtin', builtin: 'date',     width: 80 },
        { label: 'Shift',    key: 'shift',    kind: 'builtin', builtin: 'shift',    width: 40, align: 'center' },
        { label: 'Operator', key: 'operator', kind: 'builtin', builtin: 'operator', width: 110 },
        { label: 'Start',    key: 'start',    kind: 'field',   slot: 'start_reading', width: 55, align: 'right' },
        { label: 'Stop',     key: 'stop',     kind: 'field',   slot: 'stop_reading',  width: 55, align: 'right' },
        { label: 'Run Hrs',  key: 'runtime',  kind: 'field',   slot: 'runtime',       width: 55, align: 'right' },
        { label: 'Output',   key: 'output',   kind: 'field',   slot: 'output',        width: 60, align: 'right' },
        { label: 'Usage',    key: 'usage',    kind: 'field',   slot: 'consumption',   width: 60, align: 'right' },
        { label: 'Status',   key: 'status',   kind: 'builtin', builtin: 'status',     width: 60, align: 'center' },
      ],
    }],
  },

  // 2. Consumption Summary — daily totals + efficiency formula.
  {
    id: 'consumption-summary',
    name: 'Consumption Summary',
    description: 'Daily totals of consumption and output, with an automatic efficiency column (consumption per unit output).',
    icon: 'fuel',
    defaultScope: 'both',
    slots: [
      { key: 'consumption', label: 'Consumption field',         hint: 'Fuel/water/other consumed per record (e.g. "HSD Consumed")', required: true },
      { key: 'output',      label: 'Output / production field', hint: 'What was produced per record (e.g. "Total KWH")', required: true },
      { key: 'runtime',     label: 'Runtime field (optional)',  hint: 'Running hours per record, for the runtime total column' },
    ],
    sections: [{
      title: 'Daily Consumption',
      source: 'submissions',
      grouping: 'date',
      columns: [
        { label: 'Date',           key: 'date',         kind: 'builtin',   builtin: 'date', width: 80 },
        { label: 'Records',        key: 'records',      kind: 'aggregate', slot: 'output', aggregate: 'count', width: 60, align: 'right' },
        { label: 'Run Hrs',        key: 'sum_runtime',  kind: 'aggregate', slot: 'runtime', aggregate: 'sum', width: 65, align: 'right' },
        { label: 'Consumption',    key: 'sum_usage',    kind: 'aggregate', slot: 'consumption', aggregate: 'sum', width: 80, align: 'right' },
        { label: 'Output',         key: 'sum_output',   kind: 'aggregate', slot: 'output', aggregate: 'sum', width: 80, align: 'right' },
        { label: 'Usage / Output', key: 'efficiency',   kind: 'formula',   formula: 'sum_usage / sum_output', width: 80, align: 'right', digits: 3 },
      ],
    }],
  },

  // 3. Maintenance History — preventive maintenance plans in the period.
  {
    id: 'maintenance-history',
    name: 'Maintenance History',
    description: 'Preventive maintenance activities in the period — task, frequency, last/next due dates, assignee.',
    icon: 'wrench',
    defaultScope: 'both',
    slots: [],
    sections: [{
      title: 'Preventive Maintenance Activities',
      source: 'pm_plans',
      grouping: 'row',
      columns: [
        { label: 'Task',      key: 'task',        kind: 'builtin', builtin: 'task',        width: 160 },
        { label: 'Frequency', key: 'frequency',   kind: 'builtin', builtin: 'frequency',   width: 70, align: 'center' },
        { label: 'Last Done', key: 'last_done',   kind: 'builtin', builtin: 'last_done',   width: 80 },
        { label: 'Next Due',  key: 'next_due',    kind: 'builtin', builtin: 'next_due',    width: 80 },
        { label: 'Status',    key: 'status',      kind: 'builtin', builtin: 'status',      width: 70, align: 'center' },
        { label: 'Assigned',  key: 'assigned_to', kind: 'builtin', builtin: 'assigned_to', width: 100 },
      ],
    }],
  },

  // 4. Breakdown Report — events table + summary section.
  {
    id: 'breakdown-report',
    name: 'Breakdown Report',
    description: 'Breakdown events with downtime + labour hours, plus a per-utility summary section (events count, total downtime).',
    icon: 'trending-down',
    defaultScope: 'both',
    slots: [],
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
          { label: 'Reporter',     key: 'reporter',       kind: 'builtin', builtin: 'reporter',       width: 90 },
          { label: 'Raised',       key: 'created_at',     kind: 'builtin', builtin: 'created_at',     width: 80 },
        ],
      },
      {
        title: 'Summary',
        source: 'breakdowns',
        grouping: 'none',
        utilityScopeBehavior: 'append_asset_col',
        columns: [
          { label: 'Total events',   key: 'total',          kind: 'aggregate', aggregate: 'count' },
          { label: 'Total downtime', key: 'total_downtime', kind: 'aggregate', aggregate: 'sum' },
        ],
      },
    ],
  },

  // 5. Monthly Performance — month-grouped totals.
  {
    id: 'monthly-performance',
    name: 'Monthly Performance',
    description: 'Consolidated month-by-month view: total runtime, output, consumption, efficiency.',
    icon: 'bar-chart-2',
    defaultScope: 'both',
    slots: [
      { key: 'runtime',     label: 'Runtime field',      hint: 'Running hours per record (e.g. "Running Time")', required: true },
      { key: 'output',      label: 'Output field',       hint: 'Output per record (e.g. "Total KWH")', required: true },
      { key: 'consumption', label: 'Consumption field',  hint: 'Consumption per record (e.g. "HSD Consumed")' },
    ],
    sections: [{
      title: 'Monthly Consolidated Performance',
      source: 'submissions',
      grouping: 'month',
      columns: [
        { label: 'Month',          key: 'month',          kind: 'builtin',   builtin: 'date', width: 100 },
        { label: 'Submissions',    key: 'submissions',    kind: 'aggregate', slot: 'output', aggregate: 'count', width: 70, align: 'right' },
        { label: 'Run Hrs',        key: 'sum_runtime',    kind: 'aggregate', slot: 'runtime', aggregate: 'sum', width: 70, align: 'right' },
        { label: 'Output',         key: 'sum_output',     kind: 'aggregate', slot: 'output', aggregate: 'sum', width: 70, align: 'right' },
        { label: 'Consumption',    key: 'sum_usage',      kind: 'aggregate', slot: 'consumption', aggregate: 'sum', width: 70, align: 'right' },
        { label: 'Usage / Output', key: 'efficiency',     kind: 'formula',   formula: 'sum_usage / sum_output', width: 75, align: 'right', digits: 3 },
        { label: 'Avg Load',       key: 'avg_load',       kind: 'formula',   formula: 'sum_output / sum_runtime', width: 75, align: 'right' },
      ],
    }],
  },
]

export function findSkeleton(id: string): ReportSkeleton | null {
  return SKELETONS.find(s => s.id === id) ?? null
}
