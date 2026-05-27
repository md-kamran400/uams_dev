// Two-screen modal for instantiating a report skeleton:
//   1. Browse — grid of skeleton cards
//   2. Map  — field-mapping form for the chosen skeleton
//
// Used in ReportTemplatesEditor as the "Browse gallery" entry point. Lets the
// admin go from "blank utility" to "working report" in two clicks + a few
// dropdown picks — no exposure to the underlying section/column model.

import { useEffect, useState } from 'react'
import * as Icons from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  X, ArrowLeft, AlertCircle, FileText, type LucideIcon,
} from 'lucide-react'
import Button from '../../ui/Button'
import {
  api, type ApiReportSkeleton, type ApiUtField,
} from '../../../lib/api'

function toPascalCase(s: string): string {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}
function getIcon(name: string): LucideIcon {
  const mapped = (Icons as unknown as Record<string, LucideIcon>)[toPascalCase(name)]
  return mapped ?? FileText
}

interface Props {
  open: boolean
  utilityTypeId: string
  onClose: () => void
  onCreated: () => void
}

export default function ReportSkeletonGallery({ open, utilityTypeId, onClose, onCreated }: Props) {
  const [skeletons, setSkeletons] = useState<ApiReportSkeleton[]>([])
  const [fields, setFields] = useState<ApiUtField[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ApiReportSkeleton | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true); setError(null); setSelected(null); setMappings({}); setName('')
    Promise.all([
      api.reportTemplates.listSkeletons(utilityTypeId),
      api.utilityTypes.getFull(utilityTypeId),
    ])
      .then(([sk, full]) => {
        setSkeletons(sk)
        setFields(full.fields ?? [])
      })
      .catch(e => setError(e?.message ?? 'Failed to load gallery'))
      .finally(() => setLoading(false))
  }, [open, utilityTypeId])

  function pick(skeleton: ApiReportSkeleton) {
    setSelected(skeleton)
    setName(skeleton.name)
    setMappings({})
    setError(null)
  }

  async function applyMapping() {
    if (!selected) return
    // Verify required slots are mapped
    for (const slot of selected.slots) {
      if (slot.required && !mappings[slot.key]) {
        setError(`"${slot.label}" is required.`)
        return
      }
    }
    setSaving(true); setError(null)
    try {
      // Convert empty-string mappings to null (skipped)
      const payload: Record<string, string | null> = {}
      for (const slot of selected.slots) {
        payload[slot.key] = mappings[slot.key] || null
      }
      await api.reportTemplates.instantiateSkeleton(utilityTypeId, {
        skeletonId: selected.id,
        mappings: payload,
        name: name || undefined,
      })
      onCreated()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  // Suggest a sensible default for a slot — match field name keywords if any.
  // E.g. slot "runtime" → look for a field whose name contains "run" or "time".
  function suggestForSlot(slotKey: string): string | undefined {
    const keywords: Record<string, string[]> = {
      runtime:       ['run', 'time', 'hours', 'duration'],
      output:        ['kwh', 'output', 'production', 'generated'],
      consumption:   ['hsd', 'fuel', 'consumed', 'consumption', 'usage', 'water'],
      start_reading: ['start kwh', 'start reading', 'opening'],
      stop_reading:  ['stop kwh', 'stop reading', 'closing', 'end kwh'],
    }
    const kw = keywords[slotKey]
    if (!kw) return undefined
    const numericFields = fields.filter(f => f.type === 'number' || f.type === 'time')
    for (const k of kw) {
      const match = numericFields.find(f => f.name.toLowerCase().includes(k))
      if (match) return match.id
    }
    return undefined
  }

  // Pre-populate suggestions whenever a skeleton is picked
  useEffect(() => {
    if (!selected) return
    const initial: Record<string, string> = {}
    for (const slot of selected.slots) {
      const sugg = suggestForSlot(slot.key)
      if (sugg) initial[slot.key] = sugg
    }
    setMappings(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const numericFields = fields.filter(f => f.type === 'number' || f.type === 'time')

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {selected && (
                <button onClick={() => { setSelected(null); setError(null) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ArrowLeft size={16} />
                </button>
              )}
              <Dialog.Title className="text-base font-bold text-gray-800">
                {selected ? `Set up "${selected.name}"` : 'Choose a starter template'}
              </Dialog.Title>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
            ) : !selected ? (
              // Browse screen
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {skeletons.map(sk => {
                  const Icon = getIcon(sk.icon)
                  return (
                    <button
                      key={sk.id}
                      onClick={() => pick(sk)}
                      className="text-left bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Icon size={18} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800">{sk.name}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{sk.description}</p>
                          <p className="text-[10px] text-gray-400 mt-2">
                            {sk.sectionCount} section{sk.sectionCount !== 1 ? 's' : ''}
                            {sk.slots.length > 0 && ` · ${sk.slots.length} field${sk.slots.length !== 1 ? 's' : ''} to map`}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              // Mapping screen
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                  <p className="font-semibold mb-1">{selected.name}</p>
                  <p className="leading-relaxed">{selected.description}</p>
                </div>

                {/* Name override */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Report name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Rename if you want (e.g. "Compressor Operations Log").</p>
                </div>

                {/* Slot mapping */}
                {selected.slots.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 text-center">
                    No mapping needed — this template uses built-in columns only.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Map fields ({selected.slots.length})
                    </p>
                    {selected.slots.map(slot => {
                      const required = slot.required === true
                      const value = mappings[slot.key] ?? ''
                      return (
                        <div key={slot.key} className="bg-white border border-gray-200 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-700">
                              {slot.label}
                              {required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {!required && (
                              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Optional</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mb-2">{slot.hint}</p>
                          <select
                            value={value}
                            onChange={e => setMappings(m => ({ ...m, [slot.key]: e.target.value }))}
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">— {required ? 'pick a field' : 'skip this'} —</option>
                            {numericFields.map(f => (
                              <option key={f.id} value={f.id}>{f.name}{f.unit ? ` (${f.unit})` : ''}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                    {numericFields.length === 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <AlertCircle size={14} /> No numeric fields configured yet. Add fields in Config → Fields first.
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {selected && (
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setSelected(null)} className="text-sm text-gray-500 hover:text-gray-800">Back to gallery</button>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={applyMapping} disabled={saving || !name.trim()}>
                  {saving ? 'Creating…' : 'Create report'}
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
