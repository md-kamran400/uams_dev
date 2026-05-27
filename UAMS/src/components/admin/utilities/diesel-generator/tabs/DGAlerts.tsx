import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Trash2, Edit2, Save, X, AlertTriangle, AlertCircle,
  Info, Zap, SlidersHorizontal,
} from 'lucide-react';
import { api, type ApiUtAlertRule, type ApiUtField } from '../../../../../lib/api';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type Condition = '>' | '<' | '==';

interface RuleForm {
  name: string;
  fieldName: string;
  condition: Condition;
  value: string;
  condition2: Condition | '';
  value2: string;
  severity: Severity;
  action: string;
}

const BLANK: RuleForm = { name: '', fieldName: '', condition: '>', value: '', condition2: '', value2: '', severity: 'medium', action: '' };

const SEV: Record<Severity, { label: string; bg: string; text: string; border: string; dot: string; icon: typeof AlertCircle }> = {
  critical: { label: 'Critical', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    icon: AlertCircle },
  high:     { label: 'High',     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', icon: AlertTriangle },
  medium:   { label: 'Medium',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400',  icon: AlertTriangle },
  low:      { label: 'Low',      bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400',   icon: Info },
};

const COND_LABELS: Record<Condition, string> = {
  '>': 'Greater than (>)',
  '<': 'Less than (<)',
  '==': 'Equal to (==)',
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEV[severity];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

function RuleModal({
  utilityTypeId, rule, fields, initialFieldName, onClose, onSaved,
}: {
  utilityTypeId: string;
  rule: ApiUtAlertRule | null;
  fields: ApiUtField[];
  initialFieldName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RuleForm>(
    rule
      ? { name: rule.name, fieldName: rule.fieldName, condition: rule.condition, value: rule.value, condition2: rule.condition2 ?? '', value2: rule.value2 ?? '', severity: rule.severity, action: rule.action ?? '' }
      : { ...BLANK, fieldName: initialFieldName ?? '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.name.trim()) { setError('Rule name is required.'); return; }
    if (!form.fieldName.trim()) { setError('Field name is required.'); return; }
    if (!form.value.trim()) { setError('Threshold value is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), fieldName: form.fieldName.trim(), condition: form.condition, value: form.value.trim(), condition2: form.condition2 || null, value2: form.value2.trim() || null, severity: form.severity, action: form.action.trim() || undefined };
      if (rule) await api.utilityTypes.updateAlertRule(utilityTypeId, rule.id, payload);
      else await api.utilityTypes.addAlertRule(utilityTypeId, payload);
      onSaved();
    } catch { setError('Failed to save alert rule.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{rule ? 'Edit Alert Rule' : 'New Alert Rule'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Triggers when a submitted value crosses the threshold</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Alert Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Low Oil Pressure, High Temperature"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Field <span className="text-red-500">*</span></label>
              <select value={form.fieldName} onChange={e => setForm(f => ({ ...f, fieldName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Pick field…</option>
                {fields.filter(f => f.type === 'number').map(f => (
                  <option key={f.id} value={f.name}>{f.name}{f.unit && f.unit !== '—' ? ` (${f.unit})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condition <span className="text-red-500">*</span></label>
              <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as Condition }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(Object.entries(COND_LABELS) as [Condition, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Threshold <span className="text-red-500">*</span></label>
              <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder="e.g. 2.8"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Optional compound OR condition */}
          <div className="border border-dashed border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">OR condition (optional)</span>
              {form.condition2 && (
                <button type="button" onClick={() => setForm(f => ({ ...f, condition2: '', value2: '' }))}
                  className="ml-auto text-xs text-red-400 hover:text-red-600 font-medium">
                  Remove
                </button>
              )}
            </div>
            {form.condition2 ? (
              <div className="grid grid-cols-2 gap-3">
                <select value={form.condition2} onChange={e => setForm(f => ({ ...f, condition2: e.target.value as Condition }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(Object.entries(COND_LABELS) as [Condition, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <input value={form.value2} onChange={e => setForm(f => ({ ...f, value2: e.target.value }))}
                  placeholder="Threshold 2 (e.g. 10)"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ) : (
              <button type="button" onClick={() => setForm(f => ({ ...f, condition2: '>', value2: '' }))}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                + Add second condition (OR)
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Severity</label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as Severity[]).map(s => {
                const cfg = SEV[s]; const Icon = cfg.icon;
                return (
                  <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                      form.severity === s ? `${cfg.border} ${cfg.bg}` : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <Icon size={15} className={form.severity === s ? cfg.text : 'text-gray-400'} />
                    <span className={`text-xs font-semibold ${form.severity === s ? cfg.text : 'text-gray-400'}`}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recommended Action</label>
            <textarea value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
              placeholder="e.g. Stop DG immediately. Check oil level and report to maintenance team."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {form.name && form.fieldName && form.value && (
            <div className={`rounded-xl border p-3 ${SEV[form.severity].bg} ${SEV[form.severity].border}`}>
              <p className="text-xs font-semibold text-gray-500 mb-0.5">Preview</p>
              <p className={`text-sm font-medium ${SEV[form.severity].text}`}>
                Trigger when <strong>{form.fieldName}</strong> {form.condition} <strong>{form.value}</strong>
                {form.condition2 && form.value2 && (
                  <> OR <strong>{form.fieldName}</strong> {form.condition2} <strong>{form.value2}</strong></>
                )}
              </p>
              {form.action && <p className="text-xs text-gray-500 mt-0.5 italic">→ {form.action}</p>}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50">
            <Save size={13} /> {saving ? 'Saving…' : rule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface Props { utilityTypeId: string }

export default function DGAlerts({ utilityTypeId }: Props) {
  const [rules, setRules] = useState<ApiUtAlertRule[]>([]);
  const [fields, setFields] = useState<ApiUtField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<ApiUtAlertRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ApiUtAlertRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const full = await api.utilityTypes.getFull(utilityTypeId);
      setRules(full.alertRules ?? []);
      setFields(full.fields ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [utilityTypeId]);

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.utilityTypes.deleteAlertRule(utilityTypeId, deleteConfirm.id);
      setDeleteConfirm(null);
      await load();
    } catch { /* ignore */ } finally { setDeleting(false); }
  }

  const counts = {
    critical: rules.filter(r => r.severity === 'critical').length,
    high: rules.filter(r => r.severity === 'high').length,
    medium: rules.filter(r => r.severity === 'medium').length,
    low: rules.filter(r => r.severity === 'low').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading alert rules…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">Alert Rules</h3>
          <p className="text-sm text-gray-500 mt-0.5">Threshold-based alerts that fire when engineers submit readings outside acceptable ranges.</p>
        </div>
        <button
          onClick={() => { setEditRule(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
        >
          <Plus size={14} /> Add Alert Rule
        </button>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {(['critical', 'high', 'medium', 'low'] as Severity[]).map(s => {
          const cfg = SEV[s]; const Icon = cfg.icon;
          return (
            <div key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cfg.border} ${cfg.bg}`}>
              <Icon size={13} className={cfg.text} />
              <span className={`text-xs font-bold ${cfg.text}`}>{counts[s]}</span>
              <span className={`text-xs ${cfg.text} opacity-80`}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Bell size={22} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">No alert rules yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Alert Rule" to create your first threshold alert</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {rules.map((rule, ri) => {
              const cfg = SEV[rule.severity];
              return (
                <motion.div key={rule.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.03 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 group transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{rule.name}</p>
                      <SeverityBadge severity={rule.severity} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-500">Trigger when</span>
                      <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                        {rule.fieldName} {rule.condition} {rule.value}
                      </code>
                      {rule.condition2 && rule.value2 && (
                        <>
                          <span className="text-xs text-gray-400 font-semibold">OR</span>
                          <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {rule.fieldName} {rule.condition2} {rule.value2}
                          </code>
                        </>
                      )}
                    </div>
                    {rule.action && (
                      <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                        <Zap size={10} className="mt-0.5 flex-shrink-0 text-amber-500" />
                        {rule.action}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => { setEditRule(rule); setShowModal(true); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setDeleteConfirm(rule)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <SlidersHorizontal size={15} className="text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-800">How Alert Rules Work</p>
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
            Rules are evaluated when engineers submit logbook entries. When a reading crosses a threshold, the submission is flagged and the recommended action is shown to both the engineer and admin. Rules apply to all assets of this utility type.
          </p>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <RuleModal
            utilityTypeId={utilityTypeId}
            rule={editRule}
            fields={fields}
            onClose={() => { setShowModal(false); setEditRule(null); }}
            onSaved={async () => { setShowModal(false); setEditRule(null); await load(); }}
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
              <h3 className="text-base font-bold text-gray-900 mb-1">Delete Alert Rule?</h3>
              <p className="text-sm text-gray-500 mb-1"><strong>{deleteConfirm.name}</strong></p>
              <p className="text-xs text-gray-400 mb-5">This rule will no longer trigger during data entry.</p>
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
