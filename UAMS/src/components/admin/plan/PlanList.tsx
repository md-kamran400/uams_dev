import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Edit2, Trash2, CheckCircle2, Clock, Archive, FileText, ChevronRight, PauseCircle } from 'lucide-react'
import { api, type ApiMaintenancePlan, type MaintenancePlanStatus } from '../../../lib/api'


const STATUS_COLORS: Record<MaintenancePlanStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Draft: 'bg-amber-100 text-amber-700',
  Paused: 'bg-orange-100 text-orange-700',
  Inactive: 'bg-red-100 text-red-700',
  Archived: 'bg-gray-100 text-gray-600',
}

const STATUS_ICONS: Record<MaintenancePlanStatus, typeof CheckCircle2> = {
  Active: CheckCircle2,
  Draft: FileText,
  Paused: PauseCircle,
  Inactive: Clock,
  Archived: Archive,
}

interface PlanListProps {
  onSelectPlan: (id: string) => void
}

interface CreateFormState {
  name: string
  year: number
  status: MaintenancePlanStatus
  description: string
  endDate: string
}

export default function PlanList({ onSelectPlan }: PlanListProps) {
  const [plans, setPlans] = useState<ApiMaintenancePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ApiMaintenancePlan | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreateFormState>({
    name: '',
    year: new Date().getFullYear(),
    status: 'Draft',
    description: '',
    endDate: '',
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setIsLoading(true)
    try {
      const data = await api.maintenancePlans.list()
      setPlans(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  function openCreate() {
    setForm({ name: '', year: new Date().getFullYear(), status: 'Draft', description: '', endDate: '' })
    setEditingPlan(null)
    setShowCreate(true)
  }

  function openEdit(plan: ApiMaintenancePlan, e: React.MouseEvent) {
    e.stopPropagation()
    setForm({ name: plan.name, year: plan.year, status: plan.status, description: plan.description ?? '', endDate: plan.endDate ?? '' })
    setEditingPlan(plan)
    setShowCreate(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        year: form.year,
        status: form.status,
        description: form.description || undefined,
        endDate: form.endDate || null,
      }
      if (editingPlan) {
        await api.maintenancePlans.update(editingPlan.id, payload)
      } else {
        await api.maintenancePlans.create(payload)
      }
      setShowCreate(false)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function togglePause(plan: ApiMaintenancePlan, e: React.MouseEvent) {
    e.stopPropagation()
    const next: MaintenancePlanStatus = plan.status === 'Paused' ? 'Active' : 'Paused'
    try {
      await api.maintenancePlans.update(plan.id, { status: next })
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.maintenancePlans.delete(id)
      setDeleteConfirm(null)
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.planCode.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: plans.length,
    active: plans.filter(p => p.status === 'Active').length,
    draft: plans.filter(p => p.status === 'Draft').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Plans', value: stats.total, color: 'text-gray-800' },
          { label: 'Active', value: stats.active, color: 'text-green-600' },
          { label: 'Draft', value: stats.draft, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search plans..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Create Plan
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan ID</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Name</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assets</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-16 text-center text-gray-400 text-sm">Loading plans…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-gray-400 text-sm">No plans found</td></tr>
            ) : filtered.map((plan, i) => {
              const StatusIcon = STATUS_ICONS[plan.status]
              return (
                <motion.tr
                  key={plan.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onSelectPlan(plan.id)}
                  className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer group transition-colors"
                >
                  <td className="px-5 py-4">
                    <span className="font-mono text-blue-600 font-semibold text-xs">{plan.planCode}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{plan.name}</span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    {plan.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{plan.description}</p>}
                  </td>
                  <td className="px-5 py-4 text-gray-600">{plan.year}</td>
                  <td className="px-5 py-4 text-gray-600 font-medium">{plan.assetCount}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}>
                      <StatusIcon size={11} />
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {(plan.status === 'Active' || plan.status === 'Paused') && (
                        <button
                          onClick={e => togglePause(plan, e)}
                          title={plan.status === 'Paused' ? 'Resume — re-enable ticket generation' : 'Pause — stop ticket generation'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            plan.status === 'Paused'
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                          }`}
                        >
                          {plan.status === 'Paused' ? <CheckCircle2 size={14} /> : <PauseCircle size={14} />}
                        </button>
                      )}
                      <button
                        onClick={e => openEdit(plan, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(plan.id) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Annual Maintenance Plan"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Year <span className="text-red-500">*</span></label>
                    <select
                      value={form.year}
                      onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 8 }, (_, i) => 2023 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as MaintenancePlanStatus }))}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(['Draft', 'Active', 'Paused', 'Inactive', 'Archived'] as MaintenancePlanStatus[]).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Tickets stop auto-generating after this date. Leave blank for open-ended.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional notes about this plan..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Plan?</h3>
              <p className="text-sm text-gray-500 mb-6">This will permanently delete this maintenance plan and all its entries. This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
