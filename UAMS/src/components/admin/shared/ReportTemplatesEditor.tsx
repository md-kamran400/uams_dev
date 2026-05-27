// Admin UI for building per-utility report templates.
// Drops into the utility Config sub-tabs (next to Forms/Fields/KPIs/Alerts).
//
// Pragmatic V1: a single stacked layout — template list at top with add/edit,
// each template expands inline to show its sections + columns. Reordering uses
// up/down arrow buttons (no drag-and-drop yet) for less surface area.
//
// Source of truth: backend `/api/utility-types/:id/reports`.

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  X, FileText, Layers, Columns3, Save, AlertCircle,
  Sparkles, Copy,
} from 'lucide-react'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import {
  api, type ApiReportTemplate, type ApiReportSection, type ApiReportColumn,
  type ApiUtField, type ReportSource, type ReportGrouping, type ReportColumnKind,
  type ReportAggregate, type ReportScopeBehavior,
} from '../../../lib/api'
import ReportSkeletonGallery from './ReportSkeletonGallery'
import CopyFromUtilityDialog from './CopyFromUtilityDialog'

const SOURCE_LABELS: Record<ReportSource, string> = {
  submissions:       'Submissions (operator data entries)',
  breakdowns:        'Breakdowns',
  pm_plans:          'PM Plans',
  tickets:           'Tickets',
  spare_consumption: 'Spare consumption',
  computed:          'Computed (submissions aggregations)',
}

const GROUPING_LABELS: Record<ReportGrouping, string> = {
  none:        'No grouping (single row)',
  row:         'One row per record',
  date:        'Group by date',
  shift:       'Group by shift',
  date_shift:  'Group by date + shift',
  month:       'Group by month',
  status:      'Group by status',
  asset:       'Group by asset',
  priority:    'Group by priority',
}

const SCOPE_LABELS: Record<'asset' | 'utility' | 'both', string> = {
  asset:   'Asset only',
  utility: 'Utility only',
  both:    'Both (asset + utility)',
}

const SCOPE_BEHAVIOR_LABELS: Record<ReportScopeBehavior, string> = {
  append_asset_col:   'Add Asset column when run on multiple assets',
  collapse_per_asset: 'Collapse to one row per asset',
  skip:               'Skip this section at utility scope',
}

const AGGREGATE_LABELS: Record<ReportAggregate, string> = {
  sum: 'Sum', avg: 'Average', min: 'Minimum', max: 'Maximum',
  last: 'Last value', count: 'Count',
}

// Built-in columns available per source. The set the user can pick from
// when kind=builtin — mirrors the resolver in backend/engine.ts.
const BUILTINS: Record<ReportSource, { value: string; label: string }[]> = {
  submissions: [
    { value: 'date', label: 'Date' },
    { value: 'shift', label: 'Shift' },
    { value: 'operator', label: 'Operator' },
    { value: 'status', label: 'Status' },
    { value: 'asset_name', label: 'Asset Name' },
  ],
  breakdowns: [
    { value: 'number', label: 'Number' },
    { value: 'nature', label: 'Nature' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'asset_name', label: 'Asset Name' },
    { value: 'reporter', label: 'Reporter' },
    { value: 'created_at', label: 'Raised on' },
    { value: 'resolved_at', label: 'Resolved on' },
    { value: 'downtime_hours', label: 'Downtime (h)' },
    { value: 'labor_hours', label: 'Labor (h)' },
  ],
  pm_plans: [
    { value: 'task', label: 'Task' },
    { value: 'frequency', label: 'Frequency' },
    { value: 'last_done', label: 'Last done' },
    { value: 'next_due', label: 'Next due' },
    { value: 'status', label: 'Status' },
    { value: 'asset_name', label: 'Asset Name' },
    { value: 'assigned_to', label: 'Assigned to' },
  ],
  tickets: [
    { value: 'number', label: 'Number' },
    { value: 'asset_name', label: 'Asset Name' },
    { value: 'type', label: 'Type' },
    { value: 'title', label: 'Title' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'due_date', label: 'Due date' },
    { value: 'created_at', label: 'Created on' },
    { value: 'submitted_at', label: 'Submitted on' },
  ],
  spare_consumption: [
    { value: 'date', label: 'Date' },
    { value: 'asset_name', label: 'Asset Name' },
    { value: 'part_code', label: 'Part Code' },
    { value: 'spare_name', label: 'Spare Name' },
    { value: 'qty', label: 'Qty' },
    { value: 'source', label: 'Source (Breakdown/PM)' },
  ],
  computed: [
    { value: 'date', label: 'Date' },
    { value: 'shift', label: 'Shift' },
  ],
}

// ── Component ──────────────────────────────────────────────

export default function ReportTemplatesEditor({ utilityTypeId }: { utilityTypeId: string }) {
  const [templates, setTemplates] = useState<ApiReportTemplate[]>([])
  const [fields, setFields] = useState<ApiUtField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [tplModalOpen, setTplModalOpen] = useState(false)
  const [editingTpl, setEditingTpl] = useState<ApiReportTemplate | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)

  async function refresh() {
    setLoading(true); setError(null)
    try {
      const [tpls, full] = await Promise.all([
        api.reportTemplates.list(utilityTypeId),
        api.utilityTypes.getFull(utilityTypeId),
      ])
      setTemplates(tpls)
      setFields(full.fields ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [utilityTypeId])

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm('Delete this report template? Its sections and columns will also be removed.')) return
    try {
      await api.reportTemplates.delete(utilityTypeId, id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (e: any) {
      alert('Failed to delete template: ' + (e?.message ?? 'unknown'))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Report Templates</h3>
          <p className="text-sm text-gray-500 max-w-2xl">
            Define what reports admins and engineers can generate for this utility. Each template
            holds one or more sections, and each section pulls from a chosen data source
            (submissions, breakdowns, PM plans, tickets, spare consumption). Reports run at
            asset or utility scope.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setGalleryOpen(true)}>
            <Sparkles size={15} /> Browse gallery
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCopyOpen(true)}>
            <Copy size={14} /> Copy from another utility
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setEditingTpl(null); setTplModalOpen(true) }}>
            <Plus size={15} /> Blank template
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="mx-auto mb-2 text-gray-300" size={32} />
          <p className="text-sm text-gray-500">No report templates yet. Click <span className="font-semibold">New template</span> to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tpl => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              utilityTypeId={utilityTypeId}
              fields={fields}
              expanded={expandedIds.has(tpl.id)}
              onToggle={() => toggleExpanded(tpl.id)}
              onEdit={() => { setEditingTpl(tpl); setTplModalOpen(true) }}
              onDelete={() => deleteTemplate(tpl.id)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      <Dialog.Root open={tplModalOpen} onOpenChange={setTplModalOpen}>
        <TemplateModal
          template={editingTpl}
          utilityTypeId={utilityTypeId}
          onClose={() => setTplModalOpen(false)}
          onSaved={() => { setTplModalOpen(false); refresh() }}
        />
      </Dialog.Root>

      <ReportSkeletonGallery
        open={galleryOpen}
        utilityTypeId={utilityTypeId}
        onClose={() => setGalleryOpen(false)}
        onCreated={() => { setGalleryOpen(false); refresh() }}
      />

      <CopyFromUtilityDialog
        open={copyOpen}
        utilityTypeId={utilityTypeId}
        onClose={() => setCopyOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  )
}

// ── Template card ─────────────────────────────────────────

function TemplateCard({
  template, utilityTypeId, fields, expanded, onToggle, onEdit, onDelete, onChanged,
}: {
  template: ApiReportTemplate
  utilityTypeId: string
  fields: ApiUtField[]
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onChanged: () => void
}) {
  // After adding a section or column, remember its id so the matching
  // child can default into edit mode. Cleared once consumed.
  const [autoEditSectionId, setAutoEditSectionId] = useState<string | null>(null)
  const [autoEditColumnId, setAutoEditColumnId] = useState<string | null>(null)
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{template.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {template.description || <span className="italic">No description</span>}
            <span className="ml-2 text-gray-400">· {template.sections.length} section{template.sections.length !== 1 ? 's' : ''} · {SCOPE_LABELS[template.defaultScope]}</span>
          </p>
        </div>
        <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 bg-gray-50/50">
            <div className="p-4 space-y-3">
              {template.sections.map((sec, idx) => (
                <SectionEditor
                  key={sec.id}
                  section={sec}
                  isFirst={idx === 0}
                  isLast={idx === template.sections.length - 1}
                  template={template}
                  utilityTypeId={utilityTypeId}
                  fields={fields}
                  startInEditMode={autoEditSectionId === sec.id}
                  onConsumedAutoEdit={() => setAutoEditSectionId(null)}
                  autoEditColumnId={autoEditColumnId}
                  onConsumedColumnAutoEdit={() => setAutoEditColumnId(null)}
                  onColumnAdded={(colId) => setAutoEditColumnId(colId)}
                  onMoveUp={async () => {
                    const order = template.sections.map(s => s.id)
                    ;[order[idx], order[idx - 1]] = [order[idx - 1], order[idx]]
                    await api.reportTemplates.reorderSections(utilityTypeId, template.id, order)
                    onChanged()
                  }}
                  onMoveDown={async () => {
                    const order = template.sections.map(s => s.id)
                    ;[order[idx], order[idx + 1]] = [order[idx + 1], order[idx]]
                    await api.reportTemplates.reorderSections(utilityTypeId, template.id, order)
                    onChanged()
                  }}
                  onChanged={onChanged}
                />
              ))}
              <AddSectionButton template={template} utilityTypeId={utilityTypeId}
                onAdded={(secId) => { setAutoEditSectionId(secId); onChanged() }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Section editor ────────────────────────────────────────

function SectionEditor({
  section, template, utilityTypeId, fields, isFirst, isLast, onMoveUp, onMoveDown, onChanged,
  startInEditMode, onConsumedAutoEdit, autoEditColumnId, onConsumedColumnAutoEdit, onColumnAdded,
}: {
  section: ApiReportSection
  template: ApiReportTemplate
  utilityTypeId: string
  fields: ApiUtField[]
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
  startInEditMode?: boolean
  onConsumedAutoEdit?: () => void
  autoEditColumnId?: string | null
  onConsumedColumnAutoEdit?: () => void
  onColumnAdded?: (columnId: string) => void
}) {
  const [editing, setEditing] = useState(!!startInEditMode)

  // Acknowledge the auto-edit flag so the parent clears it
  useEffect(() => {
    if (startInEditMode) onConsumedAutoEdit?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [title, setTitle] = useState(section.title)
  const [source, setSource] = useState<ReportSource>(section.source)
  const [grouping, setGrouping] = useState<ReportGrouping>(section.grouping)
  const [behavior, setBehavior] = useState<ReportScopeBehavior>(section.utilityScopeBehavior)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await api.reportTemplates.updateSection(utilityTypeId, template.id, section.id, {
        title, source, grouping, utilityScopeBehavior: behavior,
      })
      setEditing(false); onChanged()
    } catch (e: any) {
      alert('Failed to save section: ' + (e?.message ?? 'unknown'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteSection() {
    if (!window.confirm(`Delete section "${section.title}" and its ${section.columns.length} column(s)?`)) return
    try {
      await api.reportTemplates.deleteSection(utilityTypeId, template.id, section.id)
      onChanged()
    } catch (e: any) {
      alert('Failed to delete section: ' + (e?.message ?? 'unknown'))
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <Layers size={14} className="text-gray-400" />
        {editing ? (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="flex-1 text-sm font-semibold px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <p className="text-sm font-semibold text-gray-800 flex-1">{section.title}</p>
        )}
        <div className="flex items-center gap-1">
          <button disabled={isFirst} onClick={onMoveUp} className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ArrowUp size={12} />
          </button>
          <button disabled={isLast} onClick={onMoveDown} className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ArrowDown size={12} />
          </button>
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setTitle(section.title); setSource(section.source); setGrouping(section.grouping); setBehavior(section.utilityScopeBehavior) }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1 rounded text-gray-400 hover:text-blue-600">
                <Pencil size={12} />
              </button>
              <button onClick={deleteSection} className="p-1 rounded text-gray-400 hover:text-red-600">
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-3 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-gray-100 bg-gray-50/50">
        <LabeledSelect label="Source" value={source} onChange={v => setSource(v as ReportSource)} disabled={!editing} options={Object.entries(SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <LabeledSelect label="Grouping" value={grouping} onChange={v => setGrouping(v as ReportGrouping)} disabled={!editing} options={Object.entries(GROUPING_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <LabeledSelect label="At utility scope" value={behavior} onChange={v => setBehavior(v as ReportScopeBehavior)} disabled={!editing} options={Object.entries(SCOPE_BEHAVIOR_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Columns3 size={12} /> Columns ({section.columns.length})
        </div>
        {section.columns.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No columns yet.</p>
        ) : (
          <div className="space-y-1.5">
            {section.columns.map((col, idx) => (
              <ColumnRow
                key={col.id}
                column={col}
                section={section}
                template={template}
                utilityTypeId={utilityTypeId}
                fields={fields}
                isFirst={idx === 0}
                isLast={idx === section.columns.length - 1}
                startInEditMode={autoEditColumnId === col.id}
                onConsumedAutoEdit={onConsumedColumnAutoEdit}
                onMoveUp={async () => {
                  const order = section.columns.map(c => c.id)
                  ;[order[idx], order[idx - 1]] = [order[idx - 1], order[idx]]
                  await api.reportTemplates.reorderColumns(utilityTypeId, template.id, section.id, order)
                  onChanged()
                }}
                onMoveDown={async () => {
                  const order = section.columns.map(c => c.id)
                  ;[order[idx], order[idx + 1]] = [order[idx + 1], order[idx]]
                  await api.reportTemplates.reorderColumns(utilityTypeId, template.id, section.id, order)
                  onChanged()
                }}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
        <QuickAddColumnRow
          section={section} template={template} utilityTypeId={utilityTypeId} fields={fields}
          onAdded={(colId) => { onColumnAdded?.(colId); onChanged() }}
        />
      </div>
    </div>
  )
}

// ── Column row ────────────────────────────────────────────

function ColumnRow({
  column, section, template, utilityTypeId, fields, isFirst, isLast, onMoveUp, onMoveDown, onChanged,
  startInEditMode, onConsumedAutoEdit,
}: {
  column: ApiReportColumn
  section: ApiReportSection
  template: ApiReportTemplate
  utilityTypeId: string
  fields: ApiUtField[]
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChanged: () => void
  startInEditMode?: boolean
  onConsumedAutoEdit?: () => void
}) {
  const [editing, setEditing] = useState(!!startInEditMode)

  useEffect(() => {
    if (startInEditMode) onConsumedAutoEdit?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [form, setForm] = useState({
    label: column.label,
    key: column.key,
    kind: column.kind,
    builtin: column.builtin ?? '',
    fieldId: column.fieldId ?? '',
    aggregate: column.aggregate ?? '',
    formula: column.formula ?? '',
    width: column.width,
    align: column.align,
    digits: column.format?.digits ?? '',
  })

  async function save() {
    const fieldName = form.fieldId ? (fields.find(f => f.id === form.fieldId)?.name ?? null) : null
    try {
      await api.reportTemplates.updateColumn(utilityTypeId, template.id, section.id, column.id, {
        label: form.label,
        key: form.key,
        kind: form.kind as ReportColumnKind,
        builtin: form.kind === 'builtin' ? form.builtin || null : null,
        fieldId: form.kind === 'field' || form.kind === 'aggregate' ? (form.fieldId || null) : null,
        fieldName: form.kind === 'field' || form.kind === 'aggregate' ? fieldName : null,
        aggregate: form.kind === 'aggregate' ? (form.aggregate as ReportAggregate) : null,
        formula: form.kind === 'formula' ? form.formula : null,
        width: Number(form.width) || 80,
        align: form.align as 'left' | 'right' | 'center',
        format: form.digits !== '' ? { digits: Number(form.digits) } : {},
      })
      setEditing(false); onChanged()
    } catch (e: any) {
      alert('Failed to save column: ' + (e?.message ?? 'unknown'))
    }
  }

  async function del() {
    if (!window.confirm(`Delete column "${column.label}"?`)) return
    try {
      await api.reportTemplates.deleteColumn(utilityTypeId, template.id, section.id, column.id)
      onChanged()
    } catch (e: any) {
      alert('Failed to delete column: ' + (e?.message ?? 'unknown'))
    }
  }

  const builtinOptions = BUILTINS[section.source] ?? []
  const numericFields = useMemo(() => fields.filter(f => f.type === 'number' || f.type === 'time'), [fields])

  if (!editing) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 text-sm">
        <span className="flex-1 truncate">
          <span className="font-medium text-gray-800">{column.label}</span>
          <span className="text-gray-400 mx-1.5">·</span>
          <code className="text-xs text-gray-500 font-mono">{column.key}</code>
          <span className="text-gray-400 mx-1.5">·</span>
          <span className="text-xs text-gray-500">
            {column.kind === 'builtin' && `builtin:${column.builtin}`}
            {column.kind === 'field' && `field:${column.fieldName ?? '—'}`}
            {column.kind === 'aggregate' && `${column.aggregate}(${column.fieldName ?? '—'})`}
            {column.kind === 'formula' && `= ${column.formula ?? ''}`}
          </span>
        </span>
        <button disabled={isFirst} onClick={onMoveUp} className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowUp size={11} /></button>
        <button disabled={isLast} onClick={onMoveDown} className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowDown size={11} /></button>
        <button onClick={() => setEditing(true)} className="p-0.5 rounded text-gray-400 hover:text-blue-600"><Pencil size={11} /></button>
        <button onClick={del} className="p-0.5 rounded text-gray-400 hover:text-red-600"><Trash2 size={11} /></button>
      </div>
    )
  }

  return (
    <div className="p-2.5 bg-white border-2 border-blue-200 rounded-md space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="Label">
          <input className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
        </Field>
        <Field label="Key (a-z, _)">
          <input className="text-sm px-2 py-1 border border-gray-200 rounded w-full font-mono" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} />
        </Field>
        <Field label="Kind">
          <select className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as ReportColumnKind }))}>
            <option value="builtin">Built-in</option>
            <option value="field">Field (from utility)</option>
            <option value="aggregate">Aggregate of field</option>
            <option value="formula">Formula</option>
          </select>
        </Field>
        <Field label="Align">
          <select className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.align} onChange={e => setForm(f => ({ ...f, align: e.target.value as any }))}>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Field>
      </div>

      {form.kind === 'builtin' && (
        <Field label="Built-in column">
          <select className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.builtin} onChange={e => setForm(f => ({ ...f, builtin: e.target.value }))}>
            <option value="">Pick one…</option>
            {builtinOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      )}

      {form.kind === 'field' && (
        <Field label="Field">
          <select className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.fieldId} onChange={e => setForm(f => ({ ...f, fieldId: e.target.value }))}>
            <option value="">Pick a field…</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name}{f.unit ? ` (${f.unit})` : ''}</option>)}
          </select>
        </Field>
      )}

      {form.kind === 'aggregate' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Field">
            <select className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.fieldId} onChange={e => setForm(f => ({ ...f, fieldId: e.target.value }))}>
              <option value="">Pick a numeric field…</option>
              {numericFields.map(f => <option key={f.id} value={f.id}>{f.name}{f.unit ? ` (${f.unit})` : ''}</option>)}
            </select>
          </Field>
          <Field label="Aggregate">
            <select className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.aggregate} onChange={e => setForm(f => ({ ...f, aggregate: e.target.value as any }))}>
              <option value="">Pick…</option>
              {(Object.entries(AGGREGATE_LABELS) as [ReportAggregate, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
      )}

      {form.kind === 'formula' && (
        <Field label="Formula (reference other column keys, e.g. sum_hsd / sum_kwh)">
          <input className="text-sm px-2 py-1 border border-gray-200 rounded w-full font-mono" value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))} placeholder="sum_hsd / sum_kwh" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Width (PDF)">
          <input type="number" className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.width} onChange={e => setForm(f => ({ ...f, width: Number(e.target.value) }))} />
        </Field>
        <Field label="Decimal digits (optional)">
          <input type="number" className="text-sm px-2 py-1 border border-gray-200 rounded w-full" value={form.digits} onChange={e => setForm(f => ({ ...f, digits: e.target.value as any }))} placeholder="2" />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
        <button onClick={save} className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">Save</button>
      </div>
    </div>
  )
}

// ── Add-section / Add-column buttons ──────────────────────

function AddSectionButton({ template, utilityTypeId, onAdded }: { template: ApiReportTemplate; utilityTypeId: string; onAdded: (sectionId: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function add() {
    setBusy(true)
    try {
      const sec = await api.reportTemplates.addSection(utilityTypeId, template.id, {
        title: 'New Section', source: 'submissions', grouping: 'row',
        utilityScopeBehavior: 'append_asset_col', sortOrder: template.sections.length,
      })
      onAdded(sec.id)
    } finally { setBusy(false) }
  }
  return (
    <button onClick={add} disabled={busy}
      className="w-full py-2 text-xs font-medium text-blue-600 border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50">
      <Plus size={12} className="inline-block mr-1" /> Add section
    </button>
  )
}

/** Quick-add column chips.
 *
 *  Renders a horizontal row of one-click chips for the most common columns
 *  (Date / Shift / Operator / Status / Asset Name etc., from the source's
 *  built-ins), plus a "+ Pick a field…" and "+ Sum of a field…" picker, and
 *  a "+ Formula" option for power users. Every chip creates the column and
 *  flags it for auto-edit so the admin can immediately tweak its label.
 *
 *  Built-ins shown adapt to the section's source so an admin never picks an
 *  invalid combination. */
function QuickAddColumnRow({
  section, template, utilityTypeId, fields, onAdded,
}: {
  section: ApiReportSection
  template: ApiReportTemplate
  utilityTypeId: string
  fields: ApiUtField[]
  onAdded: (columnId: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState<null | 'field' | 'aggregate' | 'formula'>(null)
  // Multi-select: list of fieldIds the admin has ticked in the current picker.
  const [pickedFieldIds, setPickedFieldIds] = useState<string[]>([])
  const [pickAgg, setPickAgg] = useState<ReportAggregate>('sum')
  const [pickFormula, setPickFormula] = useState('')

  // Reset selections when the picker changes
  function openPicker(kind: 'field' | 'aggregate' | 'formula') {
    setPickerOpen(kind)
    setPickedFieldIds([])
    setPickFormula('')
  }
  function closePicker() {
    setPickerOpen(null)
    setPickedFieldIds([])
    setPickFormula('')
  }
  function toggleFieldId(id: string) {
    setPickedFieldIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function pickAllFields(list: ApiUtField[]) {
    setPickedFieldIds(list.map(f => f.id))
  }

  // Take the source's built-ins and surface the most-useful ones as chips.
  const builtinChips = (BUILTINS[section.source] ?? []).slice(0, 6)
  const numericFields = useMemo(() => fields.filter(f => f.type === 'number' || f.type === 'time'), [fields])

  async function addBuiltin(builtin: string, label: string) {
    if (busy) return
    setBusy(true)
    try {
      // Don't duplicate a built-in column if one with the same key already exists
      const baseKey = builtin
      let key = baseKey
      let n = 2
      while (section.columns.some(c => c.key === key)) { key = `${baseKey}_${n++}` }
      const col = await api.reportTemplates.addColumn(utilityTypeId, template.id, section.id, {
        label,
        key,
        kind: 'builtin',
        builtin,
        fieldId: null, fieldName: null, aggregate: null, formula: null,
        width: 80, align: 'left',
        format: {}, sortOrder: section.columns.length,
      })
      onAdded(col.id)
    } catch (e: any) {
      alert('Failed to add column: ' + (e?.message ?? 'unknown'))
    } finally {
      setBusy(false)
    }
  }

  /** Slugify a field name into a snake_case key. */
  function fieldKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  }

  /** Add a column avoiding key collisions with both existing columns and any
   *  keys already-reserved earlier in this batch (so a multi-add doesn't have
   *  two columns with the same key). */
  function reserveKey(base: string, reserved: Set<string>): string {
    if (!section.columns.some(c => c.key === base) && !reserved.has(base)) return base
    let n = 2
    while (section.columns.some(c => c.key === `${base}_${n}`) || reserved.has(`${base}_${n}`)) n++
    return `${base}_${n}`
  }

  async function addFields() {
    if (pickedFieldIds.length === 0) return
    setBusy(true)
    let lastId: string | null = null
    const reservedKeys = new Set<string>()
    try {
      let sortOrder = section.columns.length
      for (const id of pickedFieldIds) {
        const field = fields.find(f => f.id === id)
        if (!field) continue
        const key = reserveKey(fieldKey(field.name), reservedKeys)
        reservedKeys.add(key)
        const col = await api.reportTemplates.addColumn(utilityTypeId, template.id, section.id, {
          label: field.name, key,
          kind: 'field', builtin: null,
          fieldId: field.id, fieldName: field.name,
          aggregate: null, formula: null,
          width: 70, align: 'right',
          format: {}, sortOrder: sortOrder++,
        })
        lastId = col.id
      }
      closePicker()
      // For multi-add, only the LAST column auto-opens for edit — opening all
      // of them at once would be overwhelming.
      if (lastId) onAdded(lastId)
    } catch (e: any) {
      alert('Failed to add one or more columns: ' + (e?.message ?? 'unknown'))
    } finally { setBusy(false) }
  }

  async function addAggregates() {
    if (pickedFieldIds.length === 0) return
    setBusy(true)
    let lastId: string | null = null
    const reservedKeys = new Set<string>()
    try {
      let sortOrder = section.columns.length
      for (const id of pickedFieldIds) {
        const field = fields.find(f => f.id === id)
        if (!field) continue
        const key = reserveKey(`${pickAgg}_${fieldKey(field.name)}`, reservedKeys)
        reservedKeys.add(key)
        const col = await api.reportTemplates.addColumn(utilityTypeId, template.id, section.id, {
          label: `${AGGREGATE_LABELS[pickAgg]} of ${field.name}`,
          key,
          kind: 'aggregate', builtin: null,
          fieldId: field.id, fieldName: field.name,
          aggregate: pickAgg, formula: null,
          width: 80, align: 'right',
          format: {}, sortOrder: sortOrder++,
        })
        lastId = col.id
      }
      closePicker()
      if (lastId) onAdded(lastId)
    } catch (e: any) {
      alert('Failed to add one or more columns: ' + (e?.message ?? 'unknown'))
    } finally { setBusy(false) }
  }

  async function addFormula() {
    if (!pickFormula.trim()) return
    const key = reserveKey('formula', new Set<string>())
    setBusy(true)
    try {
      const col = await api.reportTemplates.addColumn(utilityTypeId, template.id, section.id, {
        label: 'Calculated',
        key,
        kind: 'formula', builtin: null,
        fieldId: null, fieldName: null,
        aggregate: null, formula: pickFormula.trim(),
        width: 80, align: 'right',
        format: { digits: 2 }, sortOrder: section.columns.length,
      })
      closePicker()
      onAdded(col.id)
    } catch (e: any) {
      alert('Failed to add column: ' + (e?.message ?? 'unknown'))
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Quick add</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {builtinChips.map(b => (
          <button key={b.value} onClick={() => addBuiltin(b.value, b.label)} disabled={busy}
            className="px-2.5 py-1 text-xs bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 rounded-full font-medium transition-colors disabled:opacity-50">
            + {b.label}
          </button>
        ))}
        {(section.source === 'submissions' || section.source === 'computed') && (
          <>
            <button onClick={() => openPicker('field')} disabled={busy}
              className="px-2.5 py-1 text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-full font-medium transition-colors disabled:opacity-50">
              + Fields…
            </button>
            <button onClick={() => openPicker('aggregate')} disabled={busy}
              className="px-2.5 py-1 text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-full font-medium transition-colors disabled:opacity-50">
              + Sum / Avg / Count…
            </button>
            <button onClick={() => openPicker('formula')} disabled={busy}
              className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-full font-medium transition-colors disabled:opacity-50">
              + Formula
            </button>
          </>
        )}
      </div>

      {/* Multi-select picker — pick many fields at once and add them as columns. */}
      {pickerOpen === 'field' && (
        <FieldCheckboxPicker
          title="Add field columns"
          subtitle="Tick the fields you want as columns. Each becomes one column."
          fields={fields}
          pickedFieldIds={pickedFieldIds}
          onToggle={toggleFieldId}
          onSelectAll={() => pickAllFields(fields)}
          onClear={() => setPickedFieldIds([])}
          onCancel={closePicker}
          onAdd={addFields}
          busy={busy}
          color="purple"
        />
      )}

      {/* Multi-select aggregate picker — one aggregate applied to many fields. */}
      {pickerOpen === 'aggregate' && (
        <FieldCheckboxPicker
          title="Add aggregate columns"
          subtitle="Pick the aggregate, then tick the numeric fields. Each becomes one column."
          fields={numericFields}
          pickedFieldIds={pickedFieldIds}
          onToggle={toggleFieldId}
          onSelectAll={() => pickAllFields(numericFields)}
          onClear={() => setPickedFieldIds([])}
          onCancel={closePicker}
          onAdd={addAggregates}
          busy={busy}
          color="purple"
          extraControls={(
            <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-100 bg-white">
              <span className="text-xs font-semibold text-gray-600">Aggregate:</span>
              <select value={pickAgg} onChange={e => setPickAgg(e.target.value as ReportAggregate)}
                className="text-sm px-2 py-1 border border-gray-200 rounded">
                {(Object.entries(AGGREGATE_LABELS) as [ReportAggregate, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span className="text-xs text-gray-400">— will be applied to every ticked field</span>
            </div>
          )}
        />
      )}

      {/* Inline picker for "+ Formula" (no multi-select here — one formula at a time) */}
      {pickerOpen === 'formula' && (
        <div className="flex items-center gap-2 p-2 bg-amber-50/50 border border-amber-200 rounded-md">
          <input value={pickFormula} onChange={e => setPickFormula(e.target.value)}
            placeholder="e.g. sum_hsd / sum_kwh — references column keys"
            className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded font-mono" />
          <button onClick={addFormula} disabled={!pickFormula.trim() || busy} className="px-2 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50">Add</button>
          <button onClick={closePicker} className="px-2 py-1 text-xs text-gray-500">Cancel</button>
        </div>
      )}
    </div>
  )
}

/** Reusable multi-select field picker.
 *
 *  Renders a scrollable checkbox list with select-all / clear shortcuts and a
 *  single "Add N column(s)" button that batches the additions. Used both for
 *  the plain "+ Fields…" picker and the "+ Sum / Avg / Count…" picker
 *  (which adds an aggregate-type selector via `extraControls`). */
// Tailwind only detects literal class names — keep palette variants here as
// static strings rather than building them via template literals.
const PICKER_COLORS = {
  purple: {
    panel: 'bg-purple-50/50 border-purple-200',
    headerBorder: 'border-purple-100',
    title: 'text-purple-800',
    checkedRow: 'bg-purple-100 text-purple-800 font-medium',
    addBtn: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
  blue: {
    panel: 'bg-blue-50/50 border-blue-200',
    headerBorder: 'border-blue-100',
    title: 'text-blue-800',
    checkedRow: 'bg-blue-100 text-blue-800 font-medium',
    addBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
} as const

function FieldCheckboxPicker({
  title, subtitle, fields, pickedFieldIds, onToggle, onSelectAll, onClear,
  onCancel, onAdd, busy, color, extraControls,
}: {
  title: string
  subtitle: string
  fields: ApiUtField[]
  pickedFieldIds: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
  onCancel: () => void
  onAdd: () => void
  busy: boolean
  color: 'purple' | 'blue'
  extraControls?: React.ReactNode
}) {
  const c = PICKER_COLORS[color]
  return (
    <div className={`border rounded-lg overflow-hidden ${c.panel}`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${c.headerBorder}`}>
        <div>
          <p className={`text-sm font-semibold ${c.title}`}>{title}</p>
          <p className="text-[11px] text-gray-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSelectAll} className="text-[11px] text-blue-600 hover:underline">Select all</button>
          <span className="text-gray-300">·</span>
          <button onClick={onClear} className="text-[11px] text-gray-500 hover:underline">Clear</button>
        </div>
      </div>

      {extraControls}

      <div className="max-h-[240px] overflow-y-auto p-2 bg-white">
        {fields.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">No fields available. Configure them in Config → Fields.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {fields.map(f => {
              const checked = pickedFieldIds.includes(f.id)
              return (
                <label key={f.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${checked ? c.checkedRow : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(f.id)}
                    className="w-3.5 h-3.5 rounded border-gray-300"
                  />
                  <span className="truncate">{f.name}{f.unit ? ` (${f.unit})` : ''}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div className={`flex items-center justify-end gap-2 px-3 py-2 border-t bg-white ${c.headerBorder}`}>
        <span className="text-xs text-gray-500 mr-auto">{pickedFieldIds.length} selected</span>
        <button onClick={onCancel} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
        <button onClick={onAdd} disabled={pickedFieldIds.length === 0 || busy}
          className={`px-3 py-1 text-xs font-medium rounded disabled:opacity-50 ${c.addBtn}`}>
          {busy ? 'Adding…' : `Add ${pickedFieldIds.length || ''} column${pickedFieldIds.length === 1 ? '' : 's'}`.trim()}
        </button>
      </div>
    </div>
  )
}

// ── Template modal (create/edit metadata) ─────────────────

function TemplateModal({ template, utilityTypeId, onClose, onSaved }: {
  template: ApiReportTemplate | null
  utilityTypeId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [slug, setSlug] = useState(template?.slug ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [icon, setIcon] = useState(template?.icon ?? 'file-text')
  const [scope, setScope] = useState<'asset' | 'utility' | 'both'>(template?.defaultScope ?? 'both')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (template) {
      setName(template.name); setSlug(template.slug); setDescription(template.description ?? '')
      setIcon(template.icon); setScope(template.defaultScope)
    } else {
      setName(''); setSlug(''); setDescription(''); setIcon('file-text'); setScope('both')
    }
    setError(null)
  }, [template])

  async function save() {
    setSaving(true); setError(null)
    try {
      if (template) {
        await api.reportTemplates.update(utilityTypeId, template.id, { name, slug, description: description || null, icon, defaultScope: scope })
      } else {
        await api.reportTemplates.create(utilityTypeId, { name, slug, description, icon, defaultScope: scope })
      }
      onSaved()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save template')
    } finally { setSaving(false) }
  }

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Dialog.Title className="text-base font-bold text-gray-800">
            {template ? 'Edit template' : 'New report template'}
          </Dialog.Title>
          <Dialog.Close asChild>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </Dialog.Close>
        </div>
        <div className="p-5 space-y-3">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Operation Summary" />
          <Input
            label="Slug"
            value={slug}
            onChange={e => setSlug(e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase())}
            placeholder="e.g. daily-operation"
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2} placeholder="What this report shows…" />
          </div>
          <Input label="Icon (lucide name)" value={icon} onChange={e => setIcon(e.target.value)} placeholder="file-text, fuel, zap, wrench…" />
          <LabeledSelect label="Default scope" value={scope} onChange={v => setScope(v as any)} options={Object.entries(SCOPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving || !name.trim() || !slug.trim()}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

// ── tiny helpers ──────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">{label}</span>
      {children}
    </label>
  )
}

function LabeledSelect({ label, value, onChange, options, disabled }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
