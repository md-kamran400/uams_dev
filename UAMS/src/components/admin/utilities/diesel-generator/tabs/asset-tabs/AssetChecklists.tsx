import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Pencil, Trash2, X, ChevronLeft, AlertTriangle, ClipboardCheck } from 'lucide-react'
import Button from '../../../../../ui/Button'
import Badge from '../../../../../ui/Badge'
import { api, type ApiAssetChecklist, type ApiAssetChecklistItem } from '../../../../../../lib/api'

const FREQ_LABELS: Record<string, string> = {
  M: 'Monthly',
  QY: 'Quarterly',
  HY: 'Half Yearly',
  Y: 'Yearly',
}

const FREQ_OPTIONS = [
  { value: 'M',  label: 'Monthly (M)' },
  { value: 'QY', label: 'Quarterly (QY)' },
  { value: 'HY', label: 'Half Yearly (HY)' },
  { value: 'Y',  label: 'Yearly (Y)' },
]

const CHECKING_METHODS = ['Visual', 'Multimeter', 'Manual', 'Gauge', 'Sensor', 'Test Run', 'Thermal', 'Other']

const FREQ_BADGE_COLORS: Record<string, string> = {
  M:  'text-blue-700 bg-blue-50',
  QY: 'text-purple-700 bg-purple-50',
  HY: 'text-amber-700 bg-amber-50',
  Y:  'text-green-700 bg-green-50',
}

type ItemForm = {
  name: string
  frequency: string
  checkingMethod: string
  standard: string
  isActive: boolean
}

const EMPTY_ITEM: ItemForm = {
  name: '',
  frequency: 'M',
  checkingMethod: 'Visual',
  standard: '',
  isActive: true,
}

export default function AssetChecklists({ assetId }: { assetId: string }) {
  const [checklists, setChecklists] = useState<ApiAssetChecklist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // View state: null = list of checklist groups; string = selected checklist id
  const [selectedChecklist, setSelectedChecklist] = useState<ApiAssetChecklist | null>(null)

  // Add checklist group modal
  const [showAddChecklist, setShowAddChecklist] = useState(false)
  const [newFreq, setNewFreq] = useState('M')
  const [isSavingCl, setIsSavingCl] = useState(false)

  // Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ApiAssetChecklistItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM)
  const [isSavingItem, setIsSavingItem] = useState(false)

  useEffect(() => {
    load()
  }, [assetId])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.assetDetails.listChecklists(assetId)
      setChecklists(data)
      // Keep selectedChecklist in sync
      if (selectedChecklist) {
        const updated = data.find(cl => cl.id === selectedChecklist.id)
        setSelectedChecklist(updated ?? null)
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load checklists')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Checklist group CRUD ──────────────────────────────────────────────────
  async function createChecklist() {
    setIsSavingCl(true)
    try {
      const created = await api.assetDetails.createChecklist(assetId, newFreq)
      setChecklists(prev => [...prev, created])
      setShowAddChecklist(false)
      setNewFreq('M')
    } catch (e: any) {
      alert(e.message ?? 'Failed to create checklist')
    } finally {
      setIsSavingCl(false)
    }
  }

  async function deleteChecklist(cl: ApiAssetChecklist) {
    if (!window.confirm(`Delete the ${FREQ_LABELS[cl.frequency] ?? cl.frequency} checklist and all its items?`)) return
    try {
      await api.assetDetails.deleteChecklist(assetId, cl.id)
      setChecklists(prev => prev.filter(c => c.id !== cl.id))
      if (selectedChecklist?.id === cl.id) setSelectedChecklist(null)
    } catch {
      alert('Failed to delete checklist')
    }
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────────
  function openAddItem() {
    if (!selectedChecklist) return
    setEditItem(null)
    setItemForm({ ...EMPTY_ITEM, frequency: selectedChecklist.frequency })
    setItemModalOpen(true)
  }

  function openEditItem(item: ApiAssetChecklistItem) {
    setEditItem(item)
    setItemForm({
      name: item.name,
      frequency: item.frequency,
      checkingMethod: item.checkingMethod,
      standard: item.standard,
      isActive: item.isActive,
    })
    setItemModalOpen(true)
  }

  async function saveItem() {
    if (!selectedChecklist || !itemForm.name) return
    setIsSavingItem(true)
    try {
      if (editItem) {
        const updated = await api.assetDetails.updateChecklistItem(assetId, selectedChecklist.id, editItem.id, itemForm)
        setChecklists(prev => prev.map(cl =>
          cl.id === selectedChecklist.id
            ? { ...cl, items: cl.items.map(it => it.id === editItem.id ? updated : it) }
            : cl
        ))
        setSelectedChecklist(prev => prev ? {
          ...prev,
          items: prev.items.map(it => it.id === editItem.id ? updated : it)
        } : prev)
      } else {
        const sortOrder = selectedChecklist.items.length
        const created = await api.assetDetails.addChecklistItem(assetId, selectedChecklist.id, { ...itemForm, sortOrder })
        setChecklists(prev => prev.map(cl =>
          cl.id === selectedChecklist.id
            ? { ...cl, items: [...cl.items, created] }
            : cl
        ))
        setSelectedChecklist(prev => prev ? { ...prev, items: [...prev.items, created] } : prev)
      }
      setItemModalOpen(false)
    } catch {
      alert('Failed to save item')
    } finally {
      setIsSavingItem(false)
    }
  }

  async function deleteItem(item: ApiAssetChecklistItem) {
    if (!selectedChecklist) return
    if (!window.confirm('Delete this checklist item?')) return
    try {
      await api.assetDetails.deleteChecklistItem(assetId, selectedChecklist.id, item.id)
      setChecklists(prev => prev.map(cl =>
        cl.id === selectedChecklist.id
          ? { ...cl, items: cl.items.filter(it => it.id !== item.id) }
          : cl
      ))
      setSelectedChecklist(prev => prev ? {
        ...prev,
        items: prev.items.filter(it => it.id !== item.id)
      } : prev)
    } catch {
      alert('Failed to delete item')
    }
  }

  async function toggleItemActive(item: ApiAssetChecklistItem) {
    if (!selectedChecklist) return
    try {
      const updated = await api.assetDetails.updateChecklistItem(assetId, selectedChecklist.id, item.id, { isActive: !item.isActive })
      setChecklists(prev => prev.map(cl =>
        cl.id === selectedChecklist.id
          ? { ...cl, items: cl.items.map(it => it.id === item.id ? updated : it) }
          : cl
      ))
      setSelectedChecklist(prev => prev ? {
        ...prev,
        items: prev.items.map(it => it.id === item.id ? updated : it)
      } : prev)
    } catch {
      alert('Failed to update item')
    }
  }

  if (isLoading) return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading checklists…</div>
  if (error) return (
    <div className="flex items-center gap-2 justify-center py-20 text-red-500 text-sm">
      <AlertTriangle size={16} />{error}
    </div>
  )

  // ── Items view (drill-down) ────────────────────────────────────────────────
  if (selectedChecklist) {
    const freqLabel = FREQ_LABELS[selectedChecklist.frequency] ?? selectedChecklist.frequency
    const items = selectedChecklist.items
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedChecklist(null)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
            >
              <ChevronLeft size={15} />
              Back
            </button>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Checklist Items - {selectedChecklist.frequency}</h3>
              <p className="text-xs text-gray-400">Manage checklist items for {freqLabel} frequency</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={openAddItem}>
            <Plus size={14} /> Add Item
          </Button>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-12">S.No</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Checked Items</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-24">Frequency</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-36">Checking Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-36">Standard</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-24">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                      No items yet. Click "+ Add Item" to add the first checklist item.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3 text-gray-500 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FREQ_BADGE_COLORS[item.frequency] ?? 'text-gray-600 bg-gray-100'}`}>
                          {item.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.checkingMethod}</td>
                      <td className="px-4 py-3 text-gray-600">{item.standard || '—'}</td>
                      <td className="px-4 py-3">
                        {item.isActive
                          ? <Badge variant="success">Active</Badge>
                          : <Badge variant="default">Inactive</Badge>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleItemActive(item)}
                            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                              item.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {item.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => openEditItem(item)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteItem(item)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add / Edit Item Modal */}
        <Dialog.Root open={itemModalOpen} onOpenChange={setItemModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <Dialog.Title className="text-base font-bold text-gray-800">
                  {editItem ? 'Edit Checklist Item' : 'Add Checklist Item'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </Dialog.Close>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Checked Item Name *</label>
                  <input
                    value={itemForm.name}
                    onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Check Engine Oil level"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Frequency</label>
                    <select
                      value={itemForm.frequency}
                      onChange={e => setItemForm(f => ({ ...f, frequency: e.target.value }))}
                      className="border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Checking Method</label>
                    <select
                      value={itemForm.checkingMethod}
                      onChange={e => setItemForm(f => ({ ...f, checkingMethod: e.target.value }))}
                      className="border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {CHECKING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Standard / Expected Value</label>
                  <input
                    value={itemForm.standard}
                    onChange={e => setItemForm(f => ({ ...f, standard: e.target.value }))}
                    placeholder="e.g. No dirt/dust, 25-26V, Green indicator lit"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <Dialog.Close asChild>
                  <Button variant="secondary" size="sm" disabled={isSavingItem}>Cancel</Button>
                </Dialog.Close>
                <Button variant="primary" size="sm" onClick={saveItem} disabled={isSavingItem || !itemForm.name}>
                  {isSavingItem ? 'Saving…' : editItem ? 'Save Changes' : 'Add Item'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </motion.div>
    )
  }

  // ── Checklist group list view ──────────────────────────────────────────────
  const usedFrequencies = checklists.map(cl => cl.frequency)
  const availableFreqs = FREQ_OPTIONS.filter(f => !usedFrequencies.includes(f.value))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">Assets Checklists</h3>
          <p className="text-xs text-gray-500">Manage maintenance checklists by frequency.</p>
        </div>
        {availableFreqs.length > 0 && (
          <Button variant="primary" size="sm" onClick={() => { setNewFreq(availableFreqs[0].value); setShowAddChecklist(true) }}>
            <Plus size={14} /> Add
          </Button>
        )}
      </div>

      {/* Checklist groups table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {checklists.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <ClipboardCheck size={20} className="text-blue-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No checklists yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "+ Add" to create a checklist for a maintenance frequency</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs w-12">S.No</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs">Frequency</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs w-24">Items</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {checklists.map((cl, idx) => (
                <motion.tr
                  key={cl.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => setSelectedChecklist(cl)}
                >
                  <td className="px-5 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${FREQ_BADGE_COLORS[cl.frequency] ?? 'text-gray-600 bg-gray-100'}`}>
                      {cl.frequency}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">{FREQ_LABELS[cl.frequency] ?? cl.frequency}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{cl.items.length} item{cl.items.length !== 1 ? 's' : ''}</td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedChecklist(cl)}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteChecklist(cl)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Checklist Modal */}
      <AnimatePresence>
        {showAddChecklist && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-800">Add Checklist</h3>
                <button onClick={() => setShowAddChecklist(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Frequency *</label>
                  <select
                    value={newFreq}
                    onChange={e => setNewFreq(e.target.value)}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {availableFreqs.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-400">Each frequency can have one checklist.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" size="sm" onClick={() => setShowAddChecklist(false)} disabled={isSavingCl} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={createChecklist} disabled={isSavingCl} className="flex-1">
                  {isSavingCl ? 'Creating…' : 'Create Checklist'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
