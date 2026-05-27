import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, Trash2, Check, ChevronsUpDown, User } from 'lucide-react'
import { api, type ApiAsset, type ApiUtilityType, type ApiUser, type FrequencySchedule, type FrequencyType } from '../../../lib/api'

const FREQUENCIES: FrequencyType[] = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

const FREQ_COLORS: Record<FrequencyType, string> = {
  Monthly: 'bg-blue-100 text-blue-700 border-blue-200',
  Quarterly: 'bg-purple-100 text-purple-700 border-purple-200',
  'Half Yearly': 'bg-amber-100 text-amber-700 border-amber-200',
  Yearly: 'bg-green-100 text-green-700 border-green-200',
}

interface AssetEntry {
  id: string
  selectedAssets: string[] // asset IDs
  frequencies: FrequencySchedule[]
  remarks: string
  year: number
  assignedToId: string | null
}

interface EquipmentEntry {
  id: string
  equipmentNo: string
  equipmentDesc: string
  frequencies: FrequencySchedule[]
  remarks: string
  year: number
  assignedToId: string | null
}

interface AddAssetsModalProps {
  planId: string
  planYear: number
  onClose: () => void
  onSaved: () => void
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function FrequencyPicker({
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
    <div className="space-y-3">
      {/* Frequency toggle buttons */}
      <div className="flex flex-wrap gap-2">
        {FREQUENCIES.map(freq => {
          const active = frequencies.some(f => f.frequency === freq)
          return (
            <button
              key={freq}
              type="button"
              onClick={() => toggleFreq(freq)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                active
                  ? FREQ_COLORS[freq]
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {active && <Check size={10} className="inline mr-1" />}
              {freq}
            </button>
          )
        })}
      </div>

      {/* Per-frequency config */}
      {frequencies.length > 0 && (
        <div className="space-y-2 pl-1">
          {frequencies.map(fItem => (
            <div key={fItem.frequency} className={`flex items-center gap-3 p-2.5 rounded-lg border ${FREQ_COLORS[fItem.frequency]} bg-opacity-30`}>
              <span className="text-xs font-semibold w-24 flex-shrink-0">{fItem.frequency}</span>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-gray-500">Start:</span>
                <select
                  value={fItem.startMonth}
                  onChange={e => updateFreqConfig(fItem.frequency, 'startMonth', Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
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

function EngineerSelect({ value, onChange, engineers }: { value: string | null; onChange: (id: string | null) => void; engineers: ApiUser[] }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
    >
      <option value="">— Unassigned —</option>
      {engineers.map(u => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  )
}

function AssetSelect({
  selected,
  onChange,
  assets,
  utilityTypes,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
  assets: ApiAsset[]
  utilityTypes: ApiUtilityType[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterUtility, setFilterUtility] = useState<string>('all')

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase())
      const matchesUtility = filterUtility === 'all' || a.utilityTypeId === filterUtility
      return matchesSearch && matchesUtility
    })
  }, [assets, search, filterUtility])

  // Group by utility type
  const grouped = useMemo(() => {
    const map = new Map<string, { ut: ApiUtilityType | undefined; assets: ApiAsset[] }>()
    for (const asset of filtered) {
      const utId = asset.utilityTypeId ?? 'unknown'
      if (!map.has(utId)) {
        map.set(utId, { ut: utilityTypes.find(u => u.id === utId), assets: [] })
      }
      map.get(utId)!.assets.push(asset)
    }
    return Array.from(map.entries())
  }, [filtered, utilityTypes])

  function toggleAsset(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  function toggleGroup(assetIds: string[], checked: boolean) {
    if (checked) {
      const toAdd = assetIds.filter(id => !selected.includes(id))
      onChange([...selected, ...toAdd])
    } else {
      onChange(selected.filter(id => !assetIds.includes(id)))
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <span className={selected.length === 0 ? 'text-gray-400' : 'text-gray-800'}>
          {selected.length === 0
            ? 'Select assets…'
            : `${selected.length} asset${selected.length !== 1 ? 's' : ''} selected`}
        </span>
        <ChevronsUpDown size={14} className="text-gray-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden"
          >
            {/* Search + filter */}
            <div className="p-2.5 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterUtility}
                onChange={e => setFilterUtility(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Utility Types</option>
                {utilityTypes.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            <div className="overflow-y-auto max-h-60">
              {grouped.length === 0 && (
                <div className="py-6 text-center text-xs text-gray-400">No assets found</div>
              )}
              {grouped.map(([utId, { ut, assets: groupAssets }]) => {
                const groupIds = groupAssets.map(a => a.id)
                const allChecked = groupIds.every(id => selected.includes(id))
                const someChecked = groupIds.some(id => selected.includes(id))
                return (
                  <div key={utId}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = !allChecked && someChecked }}
                        onChange={e => toggleGroup(groupIds, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs font-semibold text-gray-600">{ut?.name ?? 'Unknown'}</span>
                      <span className="text-xs text-gray-400 ml-auto">{groupAssets.length} assets</span>
                    </div>
                    {groupAssets.map(asset => (
                      <div
                        key={asset.id}
                        onClick={() => toggleAsset(asset.id)}
                        className={`flex items-center gap-2.5 px-4 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                          selected.includes(asset.id) ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          selected.includes(asset.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {selected.includes(asset.id) && <Check size={10} className="text-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{asset.name}</p>
                          <p className="text-xs text-gray-400">{asset.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            <div className="px-3 py-2 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AddAssetsModal({ planId, planYear, onClose, onSaved }: AddAssetsModalProps) {
  const [tab, setTab] = useState<'assets' | 'equipment'>('assets')
  const [step, setStep] = useState<1 | 2>(1)
  const [assets, setAssets] = useState<ApiAsset[]>([])
  const [utilityTypes, setUtilityTypes] = useState<ApiUtilityType[]>([])
  const [engineers, setEngineers] = useState<ApiUser[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [assetEntries, setAssetEntries] = useState<AssetEntry[]>([
    { id: uid(), selectedAssets: [], frequencies: [], remarks: '', year: planYear, assignedToId: null },
  ])

  const [equipmentEntries, setEquipmentEntries] = useState<EquipmentEntry[]>([
    { id: uid(), equipmentNo: '', equipmentDesc: '', frequencies: [], remarks: '', year: planYear, assignedToId: null },
  ])

  useEffect(() => {
    Promise.all([api.assets.list(), api.utilityTypes.list(), api.users.list()])
      .then(([a, u, us]) => {
        setAssets(a)
        setUtilityTypes(u)
        setEngineers(us.filter(u => u.role === 'engineer'))
      })
      .catch(console.error)
  }, [])

  function addAssetEntry() {
    setAssetEntries(e => [...e, { id: uid(), selectedAssets: [], frequencies: [], remarks: '', year: planYear, assignedToId: null }])
  }

  function removeAssetEntry(id: string) {
    setAssetEntries(e => e.filter(x => x.id !== id))
  }

  function addEquipmentEntry() {
    setEquipmentEntries(e => [...e, { id: uid(), equipmentNo: '', equipmentDesc: '', frequencies: [], remarks: '', year: planYear, assignedToId: null }])
  }

  function removeEquipmentEntry(id: string) {
    setEquipmentEntries(e => e.filter(x => x.id !== id))
  }

  function validateStep1(): string {
    if (tab === 'assets') {
      for (const entry of assetEntries) {
        if (entry.selectedAssets.length === 0) return 'Each asset entry must have at least one asset selected.'
        if (entry.frequencies.length === 0) return 'Each asset entry must have at least one frequency.'
      }
    } else {
      for (const entry of equipmentEntries) {
        if (!entry.equipmentNo.trim()) return 'Equipment No./Functional Loc. is required.'
        if (!entry.equipmentDesc.trim()) return 'Equipment Description is required.'
        if (entry.frequencies.length === 0) return 'Each equipment entry must have at least one frequency.'
      }
    }
    return ''
  }

  function handleContinue() {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError('')
    setStep(2)
  }

  async function handleSubmit() {
    setSaving(true)
    setError('')
    try {
      const entries: Parameters<typeof api.maintenancePlans.addEntries>[1] = []

      if (tab === 'assets') {
        for (const entry of assetEntries) {
          for (const assetId of entry.selectedAssets) {
            entries.push({
              assetId,
              frequencies: entry.frequencies,
              year: entry.year,
              remarks: entry.remarks || null,
              assignedToId: entry.assignedToId ?? null,
            })
          }
        }
      } else {
        for (const entry of equipmentEntries) {
          entries.push({
            equipmentNo: entry.equipmentNo,
            equipmentDesc: entry.equipmentDesc,
            frequencies: entry.frequencies,
            year: entry.year,
            remarks: entry.remarks || null,
            assignedToId: entry.assignedToId ?? null,
          })
        }
      }

      await api.maintenancePlans.addEntries(planId, entries)
      onSaved()
    } catch (e: any) {
      setError(e.message ?? 'Failed to save entries')
    } finally {
      setSaving(false)
    }
  }

  // Preview: flatten entries to summary rows
  const previewRows = tab === 'assets'
    ? assetEntries.flatMap(entry =>
        entry.selectedAssets.map(id => {
          const asset = assets.find(a => a.id === id)
          const eng = engineers.find(e => e.id === entry.assignedToId)
          return { label: asset?.name ?? id, number: undefined as string | undefined, frequencies: entry.frequencies, remarks: entry.remarks, engineer: eng?.name ?? null }
        })
      )
    : equipmentEntries.map(e => {
        const eng = engineers.find(u => u.id === e.assignedToId)
        return {
          label: e.equipmentDesc || e.equipmentNo,
          number: e.equipmentNo,
          frequencies: e.frequencies,
          remarks: e.remarks,
          engineer: eng?.name ?? null,
        }
      })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New Schedule Entry</h2>
            <div className="flex items-center gap-4 mt-2">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>{s}</div>
                  <span className={`text-xs font-medium ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                    {s === 1 ? 'Configure' : 'Preview & Confirm'}
                  </span>
                  {s === 1 && <span className="text-gray-200 mx-1">→</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="p-6 space-y-5">
              {/* Tab: Select Assets / Add Equipment */}
              <div className="flex gap-0 border-b border-gray-200">
                {(['assets', 'equipment'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'assets' ? 'Select Assets' : 'Add Equipment'}
                  </button>
                ))}
              </div>

              {tab === 'assets' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Asset Entries</p>
                    <button
                      type="button"
                      onClick={addAssetEntry}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <Plus size={13} />
                      Add Asset Entry
                    </button>
                  </div>

                  {assetEntries.map((entry, i) => (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4 relative">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">Asset Entry #{i + 1}</p>
                        {assetEntries.length > 1 && (
                          <button onClick={() => removeAssetEntry(entry.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Assets (Multiple)</label>
                        <AssetSelect
                          selected={entry.selectedAssets}
                          onChange={ids => setAssetEntries(e => e.map(x => x.id === entry.id ? { ...x, selectedAssets: ids } : x))}
                          assets={assets}
                          utilityTypes={utilityTypes}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Frequencies & Schedule Dates</label>
                        <FrequencyPicker
                          frequencies={entry.frequencies}
                          onChange={f => setAssetEntries(e => e.map(x => x.id === entry.id ? { ...x, frequencies: f } : x))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1"><User size={11} />Assign Engineer</label>
                        <EngineerSelect
                          value={entry.assignedToId}
                          onChange={id => setAssetEntries(prev => prev.map(x => x.id === entry.id ? { ...x, assignedToId: id } : x))}
                          engineers={engineers}
                        />
                        {entry.assignedToId && (
                          <p className="text-xs text-blue-600 mt-1">Tickets will be auto-created for each scheduled date.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
                          <select
                            value={entry.year}
                            onChange={e => setAssetEntries(prev => prev.map(x => x.id === entry.id ? { ...x, year: Number(e.target.value) } : x))}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {Array.from({ length: 8 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Remarks</label>
                          <input
                            value={entry.remarks}
                            onChange={e => setAssetEntries(prev => prev.map(x => x.id === entry.id ? { ...x, remarks: e.target.value } : x))}
                            placeholder="Additional notes..."
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'equipment' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Equipment List</p>
                    <button
                      type="button"
                      onClick={addEquipmentEntry}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <Plus size={13} />
                      Add Equipment
                    </button>
                  </div>

                  {equipmentEntries.map((entry, i) => (
                    <div key={entry.id} className="border border-gray-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">Equipment #{i + 1}</p>
                        {equipmentEntries.length > 1 && (
                          <button onClick={() => removeEquipmentEntry(entry.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Equipment No./Functional loc.</label>
                          <input
                            value={entry.equipmentNo}
                            onChange={e => setEquipmentEntries(prev => prev.map(x => x.id === entry.id ? { ...x, equipmentNo: e.target.value } : x))}
                            placeholder="EQ-001"
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Equipment Description</label>
                          <input
                            value={entry.equipmentDesc}
                            onChange={e => setEquipmentEntries(prev => prev.map(x => x.id === entry.id ? { ...x, equipmentDesc: e.target.value } : x))}
                            placeholder="Diesel Generator Set"
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Frequencies & Schedule Dates</label>
                        <FrequencyPicker
                          frequencies={entry.frequencies}
                          onChange={f => setEquipmentEntries(e => e.map(x => x.id === entry.id ? { ...x, frequencies: f } : x))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1"><User size={11} />Assign Engineer</label>
                        <EngineerSelect
                          value={entry.assignedToId}
                          onChange={id => setEquipmentEntries(prev => prev.map(x => x.id === entry.id ? { ...x, assignedToId: id } : x))}
                          engineers={engineers}
                        />
                        {entry.assignedToId && (
                          <p className="text-xs text-blue-600 mt-1">Tickets will be auto-created for each scheduled date.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
                          <select
                            value={entry.year}
                            onChange={e => setEquipmentEntries(prev => prev.map(x => x.id === entry.id ? { ...x, year: Number(e.target.value) } : x))}
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {Array.from({ length: 8 }, (_, i) => 2023 + i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Remarks</label>
                          <input
                            value={entry.remarks}
                            onChange={e => setEquipmentEntries(prev => prev.map(x => x.id === entry.id ? { ...x, remarks: e.target.value } : x))}
                            placeholder="Additional notes..."
                            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-gray-700">Review the entries below before confirming.</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">#</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Asset / Equipment</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Frequencies</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Assigned To</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{row.label}</p>
                          {row.number && row.number !== row.label && <p className="text-gray-400">{row.number}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {row.frequencies.map(f => (
                              <span key={f.frequency} className={`px-1.5 py-0.5 rounded text-xs font-medium border ${FREQ_COLORS[f.frequency]}`}>
                                {f.frequency} — {MONTHS[f.startMonth - 1]} {f.startDay}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{row.engineer ?? <span className="text-gray-400">Unassigned</span>}</td>
                        <td className="px-4 py-2.5 text-gray-500">{row.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <button
            onClick={step === 1 ? handleContinue : handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {step === 1 ? 'Continue to Preview →' : saving ? 'Saving…' : 'Confirm & Save'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
