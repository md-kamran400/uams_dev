import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Plus, Trash2, Edit2, Save, X, LineChart as LineIcon, BarChart3, AreaChart, Target,
  TrendingUp, TrendingDown, Info,
} from 'lucide-react';
import { api, type ApiUtKpi, type ApiUtField } from '../../../../../lib/api';

type ChartType = 'line' | 'bar' | 'area';

interface KpiForm {
  name: string;
  formula: string;
  unit: string;
  target: string;
  alertBelow: string;
  alertAbove: string;
  recommendedChart: ChartType;
}

const BLANK: KpiForm = {
  name: '', formula: '', unit: '', target: '', alertBelow: '', alertAbove: '', recommendedChart: 'line',
};

const CHART_ICON: Record<ChartType, typeof LineIcon> = { line: LineIcon, bar: BarChart3, area: AreaChart };
const CHART_LABEL: Record<ChartType, string> = { line: 'Line', bar: 'Bar', area: 'Area' };

function KpiModal({
  utilityTypeId, kpi, fields, onClose, onSaved,
}: {
  utilityTypeId: string;
  kpi: ApiUtKpi | null;
  fields: ApiUtField[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<KpiForm>(
    kpi
      ? {
          name: kpi.name,
          formula: kpi.formula,
          unit: kpi.unit ?? '',
          target: kpi.target ?? '',
          alertBelow: kpi.alertBelow ?? '',
          alertAbove: kpi.alertAbove ?? '',
          recommendedChart: (['line', 'bar', 'area'].includes(kpi.recommendedChart) ? kpi.recommendedChart : 'line') as ChartType,
        }
      : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const numericFields = fields.filter(f => f.type === 'number' || f.type === 'time');

  function insertField(name: string) {
    setForm(f => ({ ...f, formula: f.formula + (f.formula && !f.formula.endsWith(' ') ? ' ' : '') + `{${name}}` }));
  }

  function insertOp(op: string) {
    setForm(f => ({ ...f, formula: f.formula + (f.formula && !f.formula.endsWith(' ') ? ' ' : '') + op + ' ' }));
  }

  async function save() {
    if (!form.name.trim()) { setError('KPI name is required.'); return; }
    if (!form.formula.trim()) { setError('Formula is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(),
        formula: form.formula.trim(),
        unit: form.unit.trim(),
        target: form.target.trim() || undefined,
        alertBelow: form.alertBelow.trim() || undefined,
        alertAbove: form.alertAbove.trim() || undefined,
        recommendedChart: form.recommendedChart,
      };
      if (kpi) await api.utilityTypes.updateKpi(utilityTypeId, kpi.id, payload);
      else await api.utilityTypes.addKpi(utilityTypeId, payload);
      onSaved();
    } catch { setError('Failed to save KPI.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{kpi ? 'Edit KPI' : 'New KPI'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Define a formula using field names like {'{Running Time}'} to compute KPI values from submissions</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">KPI Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Fuel Efficiency, Daily Output"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Formula <span className="text-red-500">*</span></label>
            <textarea
              value={form.formula}
              onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
              placeholder="e.g. {Diesel Consumed} / {Running Time}"
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <p className="text-xs text-gray-400 mt-1">Use {'{Field Name}'} to reference submitted values. Operators: + − × ÷ ( )</p>

            {/* Operator chips */}
            <div className="flex gap-1.5 mt-2">
              {['+', '-', '*', '/', '(', ')'].map(op => (
                <button key={op} type="button" onClick={() => insertOp(op)}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 font-mono text-sm hover:bg-gray-100">
                  {op}
                </button>
              ))}
            </div>

            {/* Available fields */}
            {numericFields.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Available Fields — click to insert</p>
                <div className="flex flex-wrap gap-1.5">
                  {numericFields.map(f => (
                    <button key={f.id} type="button" onClick={() => insertField(f.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 border border-blue-200">
                      {f.name}{f.unit && f.unit !== '—' ? <span className="opacity-60">·{f.unit}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {numericFields.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                No numeric fields defined yet. Add number/time fields in the Fields tab first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit</label>
              <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="e.g. L/hr, kWh, %"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target</label>
              <input value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                placeholder="e.g. 0.8"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <TrendingDown size={11} className="text-amber-500" /> Alert Below
              </label>
              <input value={form.alertBelow} onChange={e => setForm(f => ({ ...f, alertBelow: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <TrendingUp size={11} className="text-red-500" /> Alert Above
              </label>
              <input value={form.alertAbove} onChange={e => setForm(f => ({ ...f, alertAbove: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Recommended Chart</label>
            <div className="grid grid-cols-3 gap-2">
              {(['line', 'bar', 'area'] as ChartType[]).map(c => {
                const Icon = CHART_ICON[c];
                return (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, recommendedChart: c }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      form.recommendedChart === c ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-500'
                    }`}>
                    <Icon size={18} />
                    <span className="text-xs font-semibold">{CHART_LABEL[c]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50">
            <Save size={13} /> {saving ? 'Saving…' : kpi ? 'Update KPI' : 'Create KPI'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface Props { utilityTypeId: string }

export default function DGKpis({ utilityTypeId }: Props) {
  const [kpis, setKpis] = useState<ApiUtKpi[]>([]);
  const [fields, setFields] = useState<ApiUtField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editKpi, setEditKpi] = useState<ApiUtKpi | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ApiUtKpi | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const full = await api.utilityTypes.getFull(utilityTypeId);
      setKpis(full.kpis ?? []);
      setFields(full.fields ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [utilityTypeId]);

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.utilityTypes.deleteKpi(utilityTypeId, deleteConfirm.id);
      setDeleteConfirm(null);
      await load();
    } catch { /* ignore */ } finally { setDeleting(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading KPIs…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">KPI Definitions</h3>
          <p className="text-sm text-gray-500 mt-0.5">Formulas computed from submitted readings — shown as charts in the Analytics page.</p>
        </div>
        <button
          onClick={() => { setEditKpi(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
        >
          <Plus size={14} /> Add KPI
        </button>
      </div>

      {kpis.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BarChart2 size={22} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">No KPIs defined yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add KPI" to define your first formula</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kpis.map(kpi => {
            const ChartIcon = CHART_ICON[(['line', 'bar', 'area'].includes(kpi.recommendedChart) ? kpi.recommendedChart : 'line') as ChartType];
            return (
              <div key={kpi.id} className="bg-white rounded-2xl border border-gray-200 p-4 group hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <ChartIcon size={15} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{kpi.name}</p>
                      {kpi.unit && <p className="text-xs text-gray-400">{kpi.unit}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => { setEditKpi(kpi); setShowModal(true); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setDeleteConfirm(kpi)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <code className="block text-xs font-mono text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 mb-2 break-all">
                  {kpi.formula}
                </code>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {kpi.target && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      <Target size={10} /> Target {kpi.target}
                    </span>
                  )}
                  {kpi.alertBelow && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      <TrendingDown size={10} /> &lt; {kpi.alertBelow}
                    </span>
                  )}
                  {kpi.alertAbove && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                      <TrendingUp size={10} /> &gt; {kpi.alertAbove}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Info size={15} className="text-blue-600" />
        </div>
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-semibold mb-0.5">How KPIs work</p>
          KPIs are computed daily by averaging the formula across all submissions of the day. Field names in {'{braces}'} are replaced with submitted values, then evaluated. Charts show up in the Analytics page under the selected utility.
          {fields.filter(f => f.type === 'number').length === 0 && (
            <p className="mt-1 text-amber-700">⚠ No numeric fields yet — add them in the Fields tab before defining KPIs.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <KpiModal
            utilityTypeId={utilityTypeId}
            kpi={editKpi}
            fields={fields}
            onClose={() => { setShowModal(false); setEditKpi(null); }}
            onSaved={async () => { setShowModal(false); setEditKpi(null); await load(); }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Delete KPI?</h3>
              <p className="text-sm text-gray-500 mb-1"><strong>{deleteConfirm.name}</strong></p>
              <p className="text-xs text-gray-400 mb-5">Charts for this KPI will disappear from Analytics.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
