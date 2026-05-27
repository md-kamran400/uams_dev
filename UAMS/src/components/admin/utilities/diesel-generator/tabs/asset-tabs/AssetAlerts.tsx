import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Trash2, Edit2, Save, X, AlertTriangle, AlertCircle, Info,
  Zap, Building2, SlidersHorizontal, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { api, type ApiUtField } from '../../../../../../lib/api';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type Condition = '>' | '<' | '==';

interface UtilityRule {
  id: string;
  name: string;
  fieldName: string;
  condition: string;
  value: string;
  condition2: string | null;
  value2: string | null;
  severity: Severity;
  action: string | null;
  isDisabled: boolean;
  overrideValue: string | null;
  overrideSeverity: Severity | null;
  hasOverride: boolean;
  overrideId: string | null;
}

interface ExtraRule {
  id: string;
  name: string;
  fieldName: string;
  condition: Condition;
  value: string;
  condition2: Condition | null;
  value2: string | null;
  severity: Severity;
  action: string | null;
}

interface AlertsPayload {
  utilityRules: UtilityRule[];
  extraRules: ExtraRule[];
}

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

const BLANK_RULE = { name: '', fieldName: '', condition: '>' as Condition, value: '', condition2: '' as Condition | '', value2: '', severity: 'medium' as Severity, action: '' };

function ExtraRuleModal({
  rule, fields, onClose, onSaved,
  onSave,
}: {
  rule: ExtraRule | null;
  fields: ApiUtField[];
  onClose: () => void;
  onSaved: () => void;
  onSave: (data: typeof BLANK_RULE) => Promise<void>;
}) {
  const [form, setForm] = useState(
    rule
      ? { name: rule.name, fieldName: rule.fieldName, condition: rule.condition, value: rule.value, condition2: (rule.condition2 ?? '') as Condition | '', value2: rule.value2 ?? '', severity: rule.severity, action: rule.action ?? '' }
      : { ...BLANK_RULE }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.name.trim()) { setError('Rule name is required.'); return; }
    if (!form.fieldName.trim()) { setError('Field is required.'); return; }
    if (!form.value.trim()) { setError('Threshold value is required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ ...form, action: form.action.trim() });
      onSaved();
    } catch { setError('Failed to save rule.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{rule ? 'Edit Asset-Specific Rule' : 'New Asset-Specific Rule'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Triggers when a submitted value crosses the threshold for this asset only</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Low Oil Pressure" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Field <span className="text-red-500">*</span></label>
              <select value={form.fieldName} onChange={e => setForm(f => ({ ...f, fieldName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Pick field…</option>
                {fields.filter(f => f.type === 'number').map(f => (
                  <option key={f.id} value={f.name}>{f.name}{f.unit ? ` (${f.unit})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condition <span className="text-red-500">*</span></label>
              <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as Condition }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(Object.entries(COND_LABELS) as [Condition, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Threshold <span className="text-red-500">*</span></label>
              <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder="e.g. 2.8" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                  {(Object.entries(COND_LABELS) as [Condition, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${form.severity === s ? `${cfg.border} ${cfg.bg}` : 'border-gray-200 hover:border-gray-300'}`}>
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
              rows={2} placeholder="e.g. Stop immediately and contact maintenance."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
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

function OverridePanel({
  rule, onSave, onCancel,
}: {
  rule: UtilityRule;
  onSave: (data: { isDisabled: boolean; overrideValue: string | null; overrideSeverity: Severity | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [isDisabled, setIsDisabled] = useState(rule.isDisabled);
  const [overrideValue, setOverrideValue] = useState(rule.overrideValue ?? '');
  const [overrideSeverity, setOverrideSeverity] = useState<Severity | ''>(rule.overrideSeverity ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({
        isDisabled,
        overrideValue: overrideValue.trim() || null,
        overrideSeverity: (overrideSeverity || null) as Severity | null,
      });
    } finally { setSaving(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 border-t border-gray-100 px-5 py-4 space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <SlidersHorizontal size={12} /> Override Settings for This Asset
      </p>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Disable this rule for asset</p>
          <p className="text-xs text-gray-500">Alert won't fire for this asset even if threshold is crossed</p>
        </div>
        <button onClick={() => setIsDisabled(v => !v)} className="text-gray-400 hover:text-blue-600 transition-colors">
          {isDisabled ? <ToggleRight size={28} className="text-blue-600" /> : <ToggleLeft size={28} />}
        </button>
      </div>

      {!isDisabled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Override Threshold</label>
            <input value={overrideValue} onChange={e => setOverrideValue(e.target.value)}
              placeholder={`Default: ${rule.value}`}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Leave blank to use utility default ({rule.value})</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Override Severity</label>
            <select value={overrideSeverity} onChange={e => setOverrideSeverity(e.target.value as Severity | '')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Use default ({rule.severity})</option>
              {(['low', 'medium', 'high', 'critical'] as Severity[]).map(s => (
                <option key={s} value={s}>{SEV[s].label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
          <Save size={11} /> {saving ? 'Saving…' : 'Save Override'}
        </button>
      </div>
    </motion.div>
  );
}

export default function AssetAlerts({ assetId, utilityTypeId }: { assetId: string; utilityTypeId: string }) {
  const [data, setData] = useState<AlertsPayload>({ utilityRules: [], extraRules: [] });
  const [fields, setFields] = useState<ApiUtField[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOverride, setOpenOverride] = useState<string | null>(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [editExtra, setEditExtra] = useState<ExtraRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ExtraRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [alertsData, full] = await Promise.all([
        fetch(`/api/assets/${assetId}/alerts`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('uams_token')}` },
        }).then(r => r.json()) as Promise<AlertsPayload>,
        api.utilityTypes.getFull(utilityTypeId),
      ]);
      setData(alertsData);
      setFields(full.fields ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [assetId]);

  async function handleOverrideSave(ruleId: string, payload: { isDisabled: boolean; overrideValue: string | null; overrideSeverity: Severity | null }) {
    await fetch(`/api/assets/${assetId}/alert-overrides/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('uams_token')}`,
      },
      body: JSON.stringify(payload),
    });
    setOpenOverride(null);
    await load();
  }

  async function handleExtraSave(formData: typeof BLANK_RULE) {
    const payload = {
      ...formData,
      condition2: formData.condition2 || null,
      value2: formData.value2.trim() || null,
    };
    if (editExtra) {
      await fetch(`/api/assets/${assetId}/alerts/${editExtra.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('uams_token')}` },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/assets/${assetId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('uams_token')}` },
        body: JSON.stringify(payload),
      });
    }
    setShowExtraModal(false);
    setEditExtra(null);
    await load();
  }

  async function handleExtraDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await fetch(`/api/assets/${assetId}/alerts/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('uams_token')}` },
      });
      setDeleteConfirm(null);
      await load();
    } finally { setDeleting(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading alert configuration…</div>;

  return (
    <div className="space-y-6">
      {/* Inherited utility rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" /> Inherited from Utility
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">These rules apply to all assets. You can disable or override them for this asset.</p>
          </div>
        </div>

        {data.utilityRules.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 py-10 text-center">
            <p className="text-sm text-gray-400">No utility-level alert rules configured yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
            {data.utilityRules.map(rule => {
              const effectiveSeverity = (rule.overrideSeverity ?? rule.severity) as Severity;
              const effectiveValue = rule.overrideValue ?? rule.value;
              const cfg = SEV[effectiveSeverity];
              const isOpen = openOverride === rule.id;

              return (
                <div key={rule.id} className={`${rule.isDisabled ? 'opacity-50' : ''}`}>
                  <div className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 group transition-colors border-l-4 ${rule.isDisabled ? 'border-gray-200' : cfg.border}`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${rule.isDisabled ? 'bg-gray-300' : cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{rule.name}</p>
                        {rule.isDisabled
                          ? <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 border border-gray-200">Disabled for this asset</span>
                          : <SeverityBadge severity={effectiveSeverity} />
                        }
                        {rule.hasOverride && !rule.isDisabled && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200">Overridden</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-500">Trigger when</span>
                        <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                          {rule.fieldName} {rule.condition} {effectiveValue}
                        </code>
                        {rule.condition2 && rule.value2 && (
                          <>
                            <span className="text-xs text-gray-400 font-semibold">OR</span>
                            <code className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                              {rule.fieldName} {rule.condition2} {rule.value2}
                            </code>
                          </>
                        )}
                        {rule.overrideValue && (
                          <span className="text-xs text-gray-400">(default: {rule.value})</span>
                        )}
                      </div>
                      {rule.action && (
                        <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                          <Zap size={10} className="mt-0.5 flex-shrink-0 text-amber-500" /> {rule.action}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setOpenOverride(isOpen ? null : rule.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
                        isOpen ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200'
                      }`}
                    >
                      <SlidersHorizontal size={12} /> Override
                    </button>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <OverridePanel
                        rule={rule}
                        onSave={payload => handleOverrideSave(rule.id, payload)}
                        onCancel={() => setOpenOverride(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Asset-specific rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Bell size={16} className="text-orange-500" /> Asset-Specific Rules
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Additional alert rules that apply only to this asset.</p>
          </div>
          <button
            onClick={() => { setEditExtra(null); setShowExtraModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
          >
            <Plus size={14} /> Add Rule
          </button>
        </div>

        {data.extraRules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Bell size={18} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">No asset-specific rules yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Add rules that only apply to this asset</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
            {data.extraRules.map((rule, ri) => {
              const cfg = SEV[rule.severity];
              return (
                <motion.div key={rule.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.03 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 group transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
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
                        <Zap size={10} className="mt-0.5 flex-shrink-0 text-amber-500" /> {rule.action}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => { setEditExtra(rule); setShowExtraModal(true); }}
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
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showExtraModal || editExtra) && (
          <ExtraRuleModal
            rule={editExtra}
            fields={fields}
            onClose={() => { setShowExtraModal(false); setEditExtra(null); }}
            onSaved={() => { setShowExtraModal(false); setEditExtra(null); load(); }}
            onSave={handleExtraSave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-1">Delete alert rule?</h3>
              <p className="text-sm text-gray-500 mb-5">This will permanently remove <strong>{deleteConfirm.name}</strong>.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                <button onClick={handleExtraDelete} disabled={deleting}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50">
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
