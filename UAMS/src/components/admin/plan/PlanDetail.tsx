import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, Triangle, Square, Star, ChevronLeft, ChevronRight, Pencil, X, Check, User, Calendar, Bookmark, FileText } from 'lucide-react'
import {
  api,
  type ApiMaintenancePlanFull,
  type ApiMaintenancePlanEntry,
  type ApiPmPlanTicket,
  type ApiTicket,
  type ApiUser,
  type FrequencyType,
  type FrequencySchedule,
  type MaintenancePlanStatus,
} from '../../../lib/api'
import AddAssetsModal from './AddAssetsModal'
import TicketDetail from '../tickets/TicketDetail'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

const FREQ_SYMBOL: Record<FrequencyType, { icon: typeof Circle; label: string }> = {
  Monthly: { icon: Circle, label: 'Monthly' },
  Quarterly: { icon: Triangle, label: 'Quarterly' },
  'Half Yearly': { icon: Square, label: 'Half Yearly' },
  Yearly: { icon: Star, label: 'Yearly' },
}

const STATUS_COLORS: Record<MaintenancePlanStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Draft: 'bg-amber-100 text-amber-700',
  Paused: 'bg-orange-100 text-orange-700',
  Inactive: 'bg-red-100 text-red-700',
  Archived: 'bg-gray-100 text-gray-600',
}

interface MonthSchedule {
  freqs: FrequencyType[]
  // day per frequency, indexed by position in freqs array
  days: number[]
}

// Given a frequency config, compute which months it applies to in a given year.
// Each month gets ALL applicable frequencies with their individual startDay values.
function getScheduledMonths(entry: ApiMaintenancePlanEntry): Map<number, MonthSchedule> {
  const result = new Map<number, MonthSchedule>()

  for (const freq of entry.frequencies) {
    const start = freq.startMonth - 1
    let months: number[] = []

    if (freq.frequency === 'Monthly') {
      months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    } else if (freq.frequency === 'Quarterly') {
      let m = start
      while (m < 12) { months.push(m); m += 3 }
    } else if (freq.frequency === 'Half Yearly') {
      let m = start
      while (m < 12) { months.push(m); m += 6 }
    } else if (freq.frequency === 'Yearly') {
      months = [start]
    }

    for (const m of months) {
      if (m >= 0 && m < 12) {
        const existing = result.get(m)
        if (existing) {
          existing.freqs.push(freq.frequency)
          existing.days.push(freq.startDay)
        } else {
          result.set(m, { freqs: [freq.frequency], days: [freq.startDay] })
        }
      }
    }
  }

  return result
}

function FrequencyLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
      <span className="font-semibold text-gray-500">Frequency Legend</span>
      {(Object.entries(FREQ_SYMBOL) as [FrequencyType, typeof FREQ_SYMBOL[FrequencyType]][]).map(([freq, { label }]) => (
        <div key={freq} className="flex items-center gap-1">
          <FreqIcon freq={freq} size={12} />
          <span>{label}</span>
          <span className="text-gray-400">
            ({freq === 'Monthly' ? 'All months' : freq === 'Quarterly' ? 'Every 3 months' : freq === 'Half Yearly' ? 'Every 6 months' : 'Once a year'})
          </span>
        </div>
      ))}
    </div>
  )
}

function FreqIcon({ freq, size = 14 }: { freq: FrequencyType; size?: number }) {
  const colors: Record<FrequencyType, string> = {
    Monthly: 'text-blue-500',
    Quarterly: 'text-purple-500',
    'Half Yearly': 'text-amber-500',
    Yearly: 'text-green-500',
  }
  const { icon: Icon } = FREQ_SYMBOL[freq]
  return <Icon size={size} className={colors[freq]} />
}

// ─── Edit Entry Modal ────────────────────────────────────────────────────────

const FREQUENCIES: FrequencyType[] = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']
const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

const FREQ_COLORS: Record<FrequencyType, string> = {
  Monthly: 'bg-blue-100 text-blue-700 border-blue-200',
  Quarterly: 'bg-purple-100 text-purple-700 border-purple-200',
  'Half Yearly': 'bg-amber-100 text-amber-700 border-amber-200',
  Yearly: 'bg-green-100 text-green-700 border-green-200',
}

function InlineFrequencyPicker({
  frequencies,
  onChange,
}: {
  frequencies: FrequencySchedule[]
  onChange: (f: FrequencySchedule[]) => void
}) {
  function toggleFreq(freq: FrequencyType) {
    const existing = frequencies.find(f => f.frequency === freq)
    if (existing) {
      onChange(frequencies.filter(f => f.frequency !== freq))
    } else {
      onChange([...frequencies, { frequency: freq, startMonth: 1, startDay: 1 }])
    }
  }

  function updateFreqConfig(freq: FrequencyType, key: 'startMonth' | 'startDay', val: number) {
    onChange(frequencies.map(f => f.frequency === freq ? { ...f, [key]: val } : f))
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {FREQUENCIES.map(freq => {
          const active = frequencies.some(f => f.frequency === freq)
          return (
            <button
              key={freq}
              type="button"
              onClick={() => toggleFreq(freq)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                active ? FREQ_COLORS[freq] : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {active && <Check size={10} className="inline mr-1" />}
              {freq}
            </button>
          )
        })}
      </div>

      {frequencies.length > 0 && (
        <div className="space-y-1.5 pl-1">
          {frequencies.map(fItem => (
            <div key={fItem.frequency} className={`flex items-center gap-3 p-2 rounded-lg border ${FREQ_COLORS[fItem.frequency]}`}>
              <span className="text-xs font-semibold w-20 flex-shrink-0">{fItem.frequency}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Start:</span>
                <select
                  value={fItem.startMonth}
                  onChange={e => updateFreqConfig(fItem.frequency, 'startMonth', Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ALL_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select
                  value={fItem.startDay}
                  onChange={e => updateFreqConfig(fItem.frequency, 'startDay', Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface EditEntryModalProps {
  planId: string
  entry: ApiMaintenancePlanEntry
  onClose: () => void
  onSaved: () => void
}

function EditEntryModal({ planId, entry, onClose, onSaved }: EditEntryModalProps) {
  const [frequencies, setFrequencies] = useState<FrequencySchedule[]>(entry.frequencies)
  const [remarks, setRemarks] = useState(entry.remarks ?? '')
  const [year, setYear] = useState(entry.year)
  const [assignedToId, setAssignedToId] = useState<string | null>(entry.assignedToId)
  const [engineers, setEngineers] = useState<ApiUser[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.users.list().then(us => setEngineers(us.filter(u => u.role === 'engineer'))).catch(console.error)
  }, [])

  async function handleSave() {
    if (frequencies.length === 0) { setError('At least one frequency is required.'); return }
    setSaving(true)
    setError('')
    try {
      await api.maintenancePlans.updateEntry(planId, entry.id, { frequencies, remarks: remarks || null, assignedToId })
      onSaved()
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const label = entry.assetName ?? entry.equipmentDesc ?? entry.equipmentNo ?? 'Entry'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit Schedule Entry</h2>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Frequencies & Schedule Dates</label>
            <InlineFrequencyPicker frequencies={frequencies} onChange={setFrequencies} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><User size={11} />Assigned Engineer</label>
            <select
              value={assignedToId ?? ''}
              onChange={e => setAssignedToId(e.target.value || null)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">— Unassigned —</option>
              {engineers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Year</label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Array.from({ length: 8 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks</label>
              <input
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Ticket Status Pill (shown inside the Actual cell) ──────────────────────

const TICKET_PILL_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  Open:            { bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-200',    label: 'Open' },
  Assigned:        { bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'Assigned' },
  'In Progress':   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'In Prog' },
  Submitted:       { bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-200',  label: 'Submitted' },
  Resubmitted:     { bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-200',  label: 'Resub' },
  'Needs Revision':{ bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200',  label: 'Revise' },
  Approved:        { bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200',   label: 'Approved' },
  Rejected:        { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     label: 'Rejected' },
  Closed:          { bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200',   label: 'Closed' },
}

function TicketStatusPill({ ticket, onClick }: { ticket: ApiPmPlanTicket; onClick: () => void }) {
  const style = TICKET_PILL_STYLE[ticket.status] ?? TICKET_PILL_STYLE.Open
  const isOverdue = ticket.dueDate
    && !['Approved', 'Closed', 'Submitted', 'Resubmitted'].includes(ticket.status)
    && new Date(ticket.dueDate) < new Date()
  return (
    <button
      onClick={onClick}
      title={`${ticket.number} · ${ticket.status}${ticket.assignedToName ? ` · ${ticket.assignedToName}` : ''}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold leading-none transition-all hover:scale-105 cursor-pointer ${style.bg} ${style.text} ${
        isOverdue ? 'border-red-400 ring-1 ring-red-300' : style.border
      }`}
    >
      {style.label}
      {ticket.alertCount > 0 && (
        <span className="text-[9px] font-bold text-red-600">·{ticket.alertCount}</span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface PlanDetailProps {
  planId: string
  onBack: () => void
}

export default function PlanDetail({ planId, onBack }: PlanDetailProps) {
  const [plan, setPlan] = useState<ApiMaintenancePlanFull | null>(null)
  const [pmTickets, setPmTickets] = useState<ApiPmPlanTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddAssets, setShowAddAssets] = useState(false)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<ApiMaintenancePlanEntry | null>(null)
  const [openTicketId, setOpenTicketId] = useState<string | null>(null)

  // Horizontal scroll offset for month columns — show 5 months at a time
  const [monthOffset, setMonthOffset] = useState(0)
  const VISIBLE_MONTHS = 5

  useEffect(() => {
    load()
  }, [planId])

  async function load() {
    setIsLoading(true)
    try {
      const [data, ticketRows] = await Promise.all([
        api.maintenancePlans.get(planId),
        api.maintenancePlans.listTickets(planId).catch(() => [] as ApiPmPlanTicket[]),
      ])
      setPlan(data)
      setPmTickets(ticketRows)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  // Build a quick index: entryId -> month (0-11) -> ticket
  const ticketByEntryMonth = useMemo(() => {
    const map = new Map<string, Map<number, ApiPmPlanTicket>>()
    for (const t of pmTickets) {
      if (!t.maintenancePlanEntryId || !t.dueDate) continue
      const due = new Date(t.dueDate)
      const monthIdx = due.getMonth()
      const inner = map.get(t.maintenancePlanEntryId) ?? new Map<number, ApiPmPlanTicket>()
      // If multiple tickets fall in the same month for the same entry, keep the latest by createdAt
      const existing = inner.get(monthIdx)
      if (!existing || new Date(t.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        inner.set(monthIdx, t)
      }
      map.set(t.maintenancePlanEntryId, inner)
    }
    return map
  }, [pmTickets])

  async function deleteEntry(entryId: string) {
    try {
      await api.maintenancePlans.deleteEntry(planId, entryId)
      setDeleteEntryId(null)
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  async function toggleActual(entry: ApiMaintenancePlanEntry, monthIdx: number) {
    const key = `${entry.year}-${String(monthIdx + 1).padStart(2, '0')}`
    const current = entry.actuals[key]
    const updated = { ...entry.actuals, [key]: current ? null : 'done' }
    try {
      await api.maintenancePlans.updateEntry(planId, entry.id, { actuals: updated })
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const visibleMonths = useMemo(() => {
    return MONTHS.slice(monthOffset, monthOffset + VISIBLE_MONTHS)
  }, [monthOffset])

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading plan…</div>
  }

  if (!plan) {
    return <div className="flex items-center justify-center py-24 text-red-400 text-sm">Plan not found.</div>
  }

  if (openTicketId) {
    return (
      <TicketDetail
        ticketId={openTicketId}
        onBack={() => { setOpenTicketId(null); load() }}
        onUpdated={(_t: ApiTicket) => { /* refresh on back */ }}
        onDeleted={() => { setOpenTicketId(null); load() }}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Plans
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddAssets(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add Assets
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <CheckCircle2 size={15} />
            {plan.status === 'Active' ? 'Finalized' : 'Finalize'}
          </button>
        </div>
      </div>

      {/* Plan header card */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{plan.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[plan.status]} border border-white/20`}>
                {plan.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/70 mt-1">
              <span className="flex items-center gap-1.5"><Calendar size={14} /> Year: {plan.year}</span>
              <span className="flex items-center gap-1.5"><Bookmark size={14} /> Plan ID: {plan.planCode}</span>
              {plan.description && <span className="flex items-center gap-1.5"><FileText size={14} /> {plan.description}</span>}
            </div>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={28} className="text-white" />
          </div>
        </div>
      </div>

      {/* Frequency Legend */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3">
        <FrequencyLegend />
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {plan.entries.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus size={20} className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No entries yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Assets" to start building this plan</p>
          </div>
        ) : (
          <div>
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Showing {MONTHS[monthOffset]} – {MONTHS[Math.min(monthOffset + VISIBLE_MONTHS - 1, 11)]} (scroll to view all 12 months)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={monthOffset === 0}
                  onClick={() => setMonthOffset(o => Math.max(0, o - 1))}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={monthOffset >= 12 - VISIBLE_MONTHS}
                  onClick={() => setMonthOffset(o => Math.min(12 - VISIBLE_MONTHS, o + 1))}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-8">S.No.</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-32">Equipment No.</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-40">Description</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-10">Freq.</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-10">Year</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-32">Assigned To</th>
                    {visibleMonths.map(m => (
                      <th key={m} className="text-center px-2 py-3 font-semibold text-gray-500 min-w-[80px]" colSpan={2}>
                        {m}
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-28">Remarks</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 w-16">Actions</th>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <th colSpan={6} />
                    {visibleMonths.map(m => (
                      <React.Fragment key={m}>
                        <th className="text-center pb-2 text-gray-400 font-normal text-xs">Plan</th>
                        <th className="text-center pb-2 text-gray-400 font-normal text-xs">Actual</th>
                      </React.Fragment>
                    ))}
                    <th colSpan={2} />
                  </tr>
                </thead>
                <tbody>
                  {plan.entries.map((entry, idx) => {
                    const scheduledMonths = getScheduledMonths(entry)
                    const displayFreqs = [...new Set(entry.frequencies.map(f => f.frequency))]
                    const equip = entry.assetName ?? entry.equipmentDesc ?? '—'
                    const equipNo = entry.equipmentNo ?? '—'
                    const actualKey = (monthIdx: number) =>
                      `${entry.year}-${String(monthIdx + 1).padStart(2, '0')}`

                    return (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3 text-gray-400 font-medium">
                          {entry.assetId ? (
                            <a className="text-blue-500 underline cursor-pointer">{idx + 1}</a>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-gray-700 text-xs">{equipNo}</td>
                        <td className="px-4 py-3 text-gray-700">{equip}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {displayFreqs.map(f => <FreqIcon key={f} freq={f} size={12} />)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{entry.year}</td>
                        <td className="px-4 py-3 text-gray-700 text-xs truncate max-w-[120px]" title={entry.assignedToName ?? 'Unassigned'}>
                          {entry.assignedToName ?? <span className="text-gray-400">Unassigned</span>}
                        </td>

                        {visibleMonths.map((_, offset) => {
                          const monthIdx = monthOffset + offset
                          const sched = scheduledMonths.get(monthIdx)
                          const key = actualKey(monthIdx)
                          const actual = entry.actuals[key]
                          const ticket = ticketByEntryMonth.get(entry.id)?.get(monthIdx) ?? null
                          return (
                            <React.Fragment key={`${entry.id}-${monthIdx}`}>
                              {/* Plan cell — show each freq + its own day */}
                              <td className="text-center px-1 py-3">
                                {sched ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    {sched.freqs.map((f, fi) => (
                                      <div key={`${f}-${fi}`} className="flex flex-col items-center gap-0.5">
                                        <FreqIcon freq={f} size={11} />
                                        <span className="text-gray-500 font-medium text-xs leading-none">{ordinal(sched.days[fi])}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-200">—</span>
                                )}
                              </td>
                              {/* Actual cell — shows ticket status pill if a ticket exists, falls back to manual toggle */}
                              <td className="text-center px-1 py-3">
                                {ticket ? (
                                  <TicketStatusPill ticket={ticket} onClick={() => setOpenTicketId(ticket.id)} />
                                ) : sched ? (
                                  <button
                                    onClick={() => toggleActual(entry, monthIdx)}
                                    title={actual ? 'Mark as not done' : 'Mark as done'}
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center mx-auto transition-colors ${
                                      actual
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                                    }`}
                                  >
                                    {actual ? <CheckCircle2 size={12} /> : <span className="text-gray-300 text-xs">--</span>}
                                  </button>
                                ) : (
                                  <span className="text-gray-200">--</span>
                                )}
                              </td>
                            </React.Fragment>
                          )
                        })}

                        <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[100px]">{entry.remarks ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditEntry(entry)}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                              title="Edit entry"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteEntryId(entry.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Entry Modal */}
      {editEntry && (
        <EditEntryModal
          planId={planId}
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={async () => { setEditEntry(null); await load() }}
        />
      )}

      {/* Add Assets Modal */}
      {showAddAssets && (
        <AddAssetsModal
          planId={planId}
          planYear={plan.year}
          onClose={() => setShowAddAssets(false)}
          onSaved={async () => { setShowAddAssets(false); await load() }}
        />
      )}

      {/* Delete entry confirm */}
      {deleteEntryId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Entry?</h3>
            <p className="text-sm text-gray-500 mb-6">This schedule entry will be permanently removed from this plan.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteEntryId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => deleteEntry(deleteEntryId)} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg">Remove</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
