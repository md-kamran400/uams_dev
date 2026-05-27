import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Plus, ArrowUpDown, Pencil, Trash2, Check, X, ChevronDown, ChevronLeft, ChevronRight, Delete, Bell, AlertTriangle, AlertCircle, Info, Save, Zap } from 'lucide-react';
import Button from '../../../../ui/Button';
import Badge from '../../../../ui/Badge';
import Input from '../../../../ui/Input';
import { api, type ApiUtField, type ApiUtAlertRule } from '../../../../../lib/api';

type FieldType = 'number' | 'text' | 'time' | 'dropdown' | 'date' | 'photo' | 'video';

// ─── constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const OP_BUTTONS: { display: string; value: string }[] = [
  { display: '+',  value: '+' },
  { display: '−',  value: '-' },
  { display: '×',  value: '*' },
  { display: '÷',  value: '/' },
  { display: '(',  value: '(' },
  { display: ')',  value: ')' },
];

// ─── formula token ────────────────────────────────────────────────────────────
interface FToken {
  id:    string;
  type:  'field' | 'operator' | 'number';
  value: string;
}

let _tid = 0;
const mkId = () => `t${++_tid}`;

function serializeTokens(tokens: FToken[]): string {
  if (!tokens.length) return '—';
  return tokens.map((t) => t.value).join(' ');
}

/** Greedy parse of a formula string back into tokens. */
function parseTokens(formula: string, fieldNames: string[]): FToken[] {
  if (!formula || formula === '—') return [];
  const sorted = [...fieldNames].sort((a, b) => b.length - a.length);
  const tokens: FToken[] = [];
  let rem = formula.trim();

  while (rem.length > 0) {
    rem = rem.trimStart();
    if (!rem) break;

    // Try field (greedy / longest first)
    let hit = false;
    for (const name of sorted) {
      if (rem.startsWith(name)) {
        const after = rem.slice(name.length);
        if (!after || after[0] === ' ' || '+-*/()'.includes(after[0])) {
          tokens.push({ id: mkId(), type: 'field', value: name });
          rem = after;
          hit = true;
          break;
        }
      }
    }
    if (hit) continue;

    // Operator / paren
    if ('+-*/()'.includes(rem[0])) {
      tokens.push({ id: mkId(), type: 'operator', value: rem[0] });
      rem = rem.slice(1);
      continue;
    }

    // Number (including negative)
    const numM = rem.match(/^-?\d*\.?\d+/);
    if (numM) {
      tokens.push({ id: mkId(), type: 'number', value: numM[0] });
      rem = rem.slice(numM[0].length);
      continue;
    }

    rem = rem.slice(1); // unknown — skip
  }

  return tokens;
}

// ─── animation variants ───────────────────────────────────────────────────────
const containerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.35, ease: 'easeOut' } },
};
const rowVariants: Variants = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.22, ease: 'easeOut' } },
};

// ─── badge + filter meta ──────────────────────────────────────────────────────
type BadgeVariant = 'info' | 'default' | 'success' | 'warning';
const TYPE_BADGE: Record<FieldType, BadgeVariant> = {
  time: 'info', number: 'default', text: 'success', dropdown: 'warning', date: 'default',
  photo: 'info', video: 'info',
};
const TYPE_OPTIONS: { value: FieldType | 'all'; label: string }[] = [
  { value: 'all',      label: 'All Types' },
  { value: 'time',     label: 'Time' },
  { value: 'number',   label: 'Number' },
  { value: 'text',     label: 'Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'photo',    label: 'Photo' },
  { value: 'video',    label: 'Video' },
];

const EMPTY_FORM: Partial<ApiUtField> = {
  type: 'number', unit: '—', required: false, computed: false, formula: null, options: []
};

// ─── Alert types ──────────────────────────────────────────────────────────────
type Severity = 'low' | 'medium' | 'high' | 'critical';
type Condition = '>' | '<' | '==';

const SEV_CFG: Record<Severity, { label: string; bg: string; text: string; border: string; dot: string; icon: typeof AlertCircle }> = {
  critical: { label: 'Critical', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    icon: AlertCircle },
  high:     { label: 'High',     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', icon: AlertTriangle },
  medium:   { label: 'Medium',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400',  icon: AlertTriangle },
  low:      { label: 'Low',      bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400',   icon: Info },
};

interface AlertForm {
  name: string; condition: Condition; value: string;
  condition2: Condition | ''; value2: string;
  severity: Severity; action: string;
}
const BLANK_ALERT: AlertForm = { name: '', condition: '>', value: '', condition2: '', value2: '', severity: 'medium', action: '' };

function FieldAlertPanel({
  utilityTypeId, field, onClose,
}: {
  utilityTypeId: string;
  field: ApiUtField;
  onClose: () => void;
}) {
  const [rules, setRules] = useState<ApiUtAlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AlertForm>(BLANK_ALERT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const full = await api.utilityTypes.getFull(utilityTypeId);
      setRules((full.alertRules ?? []).filter(r => r.fieldName === field.name));
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [utilityTypeId, field.name]);

  function startEdit(rule: ApiUtAlertRule) {
    setEditingId(rule.id);
    setForm({ name: rule.name, condition: rule.condition, value: rule.value, condition2: rule.condition2 ?? '', value2: rule.value2 ?? '', severity: rule.severity, action: rule.action ?? '' });
    setError('');
  }
  function cancelEdit() { setEditingId(null); setForm(BLANK_ALERT); setError(''); }

  async function save() {
    if (!form.name.trim() || !form.value.trim()) { setError('Name and threshold are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), fieldName: field.name, condition: form.condition, value: form.value.trim(), condition2: form.condition2 || null, value2: form.value2.trim() || null, severity: form.severity, action: form.action.trim() || undefined };
      if (editingId) await api.utilityTypes.updateAlertRule(utilityTypeId, editingId, payload);
      else await api.utilityTypes.addAlertRule(utilityTypeId, payload);
      setEditingId(null); setForm(BLANK_ALERT);
      await load();
    } catch { setError('Failed to save.'); } finally { setSaving(false); }
  }

  async function del(ruleId: string) {
    if (!window.confirm('Delete this alert rule?')) return;
    try { await api.utilityTypes.deleteAlertRule(utilityTypeId, ruleId); await load(); } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center">
              <Bell size={15} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Alert Rules for <span className="text-blue-600">{field.name}</span></p>
              <p className="text-xs text-gray-400">{field.unit && field.unit !== '—' ? `Unit: ${field.unit}` : 'No unit'} · {field.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Existing rules */}
          {loading ? (
            <div className="text-center py-6 text-sm text-gray-400">Loading…</div>
          ) : rules.length === 0 && !editingId ? (
            <div className="text-center py-6 text-sm text-gray-400">No alert rules for this field yet.</div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => {
                const cfg = SEV_CFG[rule.severity];
                const isEditing = editingId === rule.id;
                return (
                  <div key={rule.id} className={`rounded-xl border p-3 ${isEditing ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
                    {isEditing ? (
                      <div className="space-y-3">
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rule name"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as Condition }))}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value=">">Greater than (&gt;)</option>
                            <option value="<">Less than (&lt;)</option>
                            <option value="==">Equal to (==)</option>
                          </select>
                          <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="Threshold"
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        {/* OR compound condition */}
                        <div className="border border-dashed border-gray-200 rounded-lg p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">OR condition (optional)</span>
                            {form.condition2 && (
                              <button type="button" onClick={() => setForm(f => ({ ...f, condition2: '', value2: '' }))}
                                className="ml-auto text-[10px] text-red-400 hover:text-red-600 font-medium">Remove</button>
                            )}
                          </div>
                          {form.condition2 ? (
                            <div className="grid grid-cols-2 gap-2">
                              <select value={form.condition2} onChange={e => setForm(f => ({ ...f, condition2: e.target.value as Condition }))}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value=">">Greater than (&gt;)</option>
                                <option value="<">Less than (&lt;)</option>
                                <option value="==">Equal to (==)</option>
                              </select>
                              <input value={form.value2} onChange={e => setForm(f => ({ ...f, value2: e.target.value }))} placeholder="Threshold 2"
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                          ) : (
                            <button type="button" onClick={() => setForm(f => ({ ...f, condition2: '>', value2: '' }))}
                              className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ Add second condition (OR)</button>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          {(['low', 'medium', 'high', 'critical'] as Severity[]).map(s => (
                            <button key={s} onClick={() => setForm(f => ({ ...f, severity: s }))} type="button"
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.severity === s ? `${SEV_CFG[s].bg} ${SEV_CFG[s].text} ${SEV_CFG[s].border}` : 'border-gray-200 text-gray-500'}`}>
                              {SEV_CFG[s].label}
                            </button>
                          ))}
                        </div>
                        <input value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} placeholder="Recommended action (optional)"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        {error && <p className="text-xs text-red-600">{error}</p>}
                        <div className="flex gap-2">
                          <button onClick={cancelEdit} className="flex-1 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button onClick={save} disabled={saving} className="flex-1 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800">{rule.name}</p>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {field.name} {rule.condition} {rule.value}
                            </code>
                            {rule.condition2 && rule.value2 && (
                              <>
                                <span className="text-[10px] font-bold text-gray-400">OR</span>
                                <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {field.name} {rule.condition2} {rule.value2}
                                </code>
                              </>
                            )}
                          </div>
                          {rule.action && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Zap size={10} className="text-amber-500" /> {rule.action}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(rule)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={12} /></button>
                          <button onClick={() => del(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new rule form */}
          {!editingId && (
            <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add New Rule</p>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rule name (e.g. Low Pressure)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as Condition }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value=">">Greater than (&gt;)</option>
                  <option value="<">Less than (&lt;)</option>
                  <option value="==">Equal to (==)</option>
                </select>
                <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="Threshold value"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              {/* OR compound condition */}
              <div className="border border-dashed border-gray-200 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">OR condition (optional)</span>
                  {form.condition2 && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, condition2: '', value2: '' }))}
                      className="ml-auto text-[10px] text-red-400 hover:text-red-600 font-medium">Remove</button>
                  )}
                </div>
                {form.condition2 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <select value={form.condition2} onChange={e => setForm(f => ({ ...f, condition2: e.target.value as Condition }))}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value=">">Greater than (&gt;)</option>
                      <option value="<">Less than (&lt;)</option>
                      <option value="==">Equal to (==)</option>
                    </select>
                    <input value={form.value2} onChange={e => setForm(f => ({ ...f, value2: e.target.value }))} placeholder="Threshold 2"
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                ) : (
                  <button type="button" onClick={() => setForm(f => ({ ...f, condition2: '>', value2: '' }))}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ Add second condition (OR)</button>
                )}
              </div>
              <div className="flex gap-1.5">
                {(['low', 'medium', 'high', 'critical'] as Severity[]).map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, severity: s }))} type="button"
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.severity === s ? `${SEV_CFG[s].bg} ${SEV_CFG[s].text} ${SEV_CFG[s].border}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {SEV_CFG[s].label}
                  </button>
                ))}
              </div>
              <input value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} placeholder="Recommended action (optional)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button onClick={save} disabled={saving || !form.name.trim() || !form.value.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-colors">
                <Save size={13} /> {saving ? 'Saving…' : 'Add Alert Rule'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export default function DGFields({ utilityTypeId }: { utilityTypeId?: string }) {
  const [fields, setFields]         = useState<ApiUtField[]>([]);
  const [alertRules, setAlertRules] = useState<ApiUtAlertRule[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [utId, setUtId]             = useState<string | null>(utilityTypeId ?? null);
  const [alertField, setAlertField] = useState<ApiUtField | null>(null);

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<FieldType | 'all'>('all');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc' | null>(null);
  const [page, setPage]             = useState(1);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<ApiUtField | null>(null);
  const [form, setForm]             = useState<Partial<ApiUtField>>(EMPTY_FORM);
  const [isSaving, setIsSaving]     = useState(false);

  // formula builder state
  const [fTokens, setFTokens]       = useState<FToken[]>([]);
  const [numInput, setNumInput]     = useState('');

  // ── fetch real data ───────────────────────────────────────────────
  useEffect(() => {
    async function fetch() {
      try {
        if (utilityTypeId) {
          setUtId(utilityTypeId);
          const full = await api.utilityTypes.getFull(utilityTypeId);
          setFields(full.fields);
          setAlertRules(full.alertRules ?? []);
        } else {
          const types = await api.utilityTypes.list();
          const dg = types.find(t => t.name === 'DG Set');
          if (dg) {
            setUtId(dg.id);
            const full = await api.utilityTypes.getFull(dg.id);
            setFields(full.fields);
            setAlertRules(full.alertRules ?? []);
          }
        }
      } catch (e) {
        console.error("Failed to load fields", e)
      } finally {
        setIsLoading(false);
      }
    }
    fetch();
  }, [utilityTypeId]);

  // Refresh alert rules after the side panel closes
  async function refreshAlertRules() {
    if (!utId) return;
    try {
      const full = await api.utilityTypes.getFull(utId);
      setAlertRules(full.alertRules ?? []);
    } catch { /* ignore */ }
  }

  const rulesByField = alertRules.reduce<Record<string, ApiUtAlertRule[]>>((acc, r) => {
    (acc[r.fieldName] ??= []).push(r);
    return acc;
  }, {});

  const SEV_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  function topSeverity(rules: ApiUtAlertRule[]): Severity {
    return rules.reduce<Severity>((acc, r) => (SEV_RANK[r.severity] > SEV_RANK[acc] ? r.severity : acc), 'low');
  }

  useEffect(() => { setPage(1); }, [search, typeFilter, sortDir]);

  // ── filter / sort / paginate ──────────────────────────────────────────────
  const processed = fields
    .filter(
      (f) =>
        (!search || f.name.toLowerCase().includes(search.toLowerCase())) &&
        (typeFilter === 'all' || f.type === typeFilter),
    )
    .sort((a, b) => {
      if (sortDir === 'asc')  return a.name.localeCompare(b.name);
      if (sortDir === 'desc') return b.name.localeCompare(a.name);
      return a.sortOrder - b.sortOrder;
    });

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated  = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // operand fields available in formula (numeric/time, excl. self)
  const operandFields = fields.filter(
    (f) => (f.type === 'number' || f.type === 'time') && f.id !== editTarget?.id,
  );

  // ── sort cycle ────────────────────────────────────────────────────────────
  const cycleSort = () => setSortDir((p) => (p === null ? 'asc' : p === 'asc' ? 'desc' : null));
  const sortLabel = sortDir === 'asc' ? 'A → Z' : sortDir === 'desc' ? 'Z → A' : 'Sort';

  // ── modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFTokens([]);
    setNumInput('');
    setModalOpen(true);
  };

  const openEdit = (field: ApiUtField) => {
    setEditTarget(field);
    setForm({ ...field });
    setFTokens(
      field.computed && field.formula
        ? parseTokens(field.formula, fields.map((f) => f.name))
        : [],
    );
    setNumInput('');
    setModalOpen(true);
  };

  const deleteField = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this field? This action cannot be undone.') && utId) {
      try {
        await api.utilityTypes.deleteField(utId, id);
        setFields((prev) => prev.filter((f) => f.id !== id));
      } catch (e) { alert("Failed to delete") }
    }
  };

  // ── formula token actions ─────────────────────────────────────────────────
  const addField    = (name: string) =>
    setFTokens((prev) => [...prev, { id: mkId(), type: 'field',    value: name }]);
  const addOperator = (op: string) =>
    setFTokens((prev) => [...prev, { id: mkId(), type: 'operator', value: op   }]);
  const addNumber   = () => {
    if (!numInput.trim()) return;
    setFTokens((prev) => [...prev, { id: mkId(), type: 'number',   value: numInput.trim() }]);
    setNumInput('');
  };
  const removeToken = (id: string) =>
    setFTokens((prev) => prev.filter((t) => t.id !== id));
  const clearFormula = () => setFTokens([]);

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name?.trim() || !utId) return;
    setIsSaving(true);
    try {
      const payload: Partial<ApiUtField> = {
        name: form.name.trim(),
        type: form.type ?? 'number',
        unit: form.unit ?? '',
        required: form.required ?? false,
        computed: form.computed ?? false,
        formula: form.computed ? serializeTokens(fTokens) : null,
        options: form.type === 'dropdown' ? (form.options ?? []) : null,
        sortOrder: form.sortOrder ?? 0,
      };

      if (editTarget) {
        const updated = await api.utilityTypes.updateField(utId, editTarget.id, payload);
        setFields((prev) => prev.map((f) => (f.id === editTarget.id ? updated : f)));
      } else {
        const created = await api.utilityTypes.addField(utId, payload);
        setFields((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (e) {
      alert("Failed to save field");
    } finally {
      setIsSaving(false);
    }
  };

  const canCompute     = form.type !== 'dropdown' && form.type !== 'text' && form.type !== 'photo' && form.type !== 'video';
  const formulaPreview = serializeTokens(fTokens);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">

      {/* Header */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Field Registry</h3>
        <p className="text-sm text-gray-500">
          Define the parameters and measurements captured in each DG operation log entry.
        </p>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Input
            placeholder="Search fields…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              {TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? 'All Types'}
              <ChevronDown size={13} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[150px]">
              {TYPE_OPTIONS.map((opt) => (
                <DropdownMenu.Item
                  key={opt.value}
                  onSelect={() => setTypeFilter(opt.value as FieldType | 'all')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer outline-none select-none hover:bg-gray-50
                    ${typeFilter === opt.value ? 'font-semibold text-blue-700' : 'text-gray-700'}`}
                >
                  {typeFilter === opt.value && <Check size={12} className="text-blue-600" />}
                  <span className={typeFilter === opt.value ? '' : 'ml-4'}>{opt.label}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          onClick={cycleSort}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors
            ${sortDir ? 'border-blue-400 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          <ArrowUpDown size={14} />
          {sortLabel}
        </button>

        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={15} className="mr-1" />
          Add Field
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-[700px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {['ID', 'Field Name', 'Type', 'Unit', 'Req', 'Computed', 'Formula / Options', 'Actions'].map((h) => (
                <th key={h} className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
            {isLoading ? (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-500">Loading fields dynamically from API...</td></tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-400">No fields match your filters.</td>
              </tr>
            ) : (
              paginated.map((field) => {
                const fieldRules = rulesByField[field.name] ?? [];
                const hasAlerts = fieldRules.length > 0;
                const sev = hasAlerts ? topSeverity(fieldRules) : null;
                const sevCfg = sev ? SEV_CFG[sev] : null;
                return (
                <motion.tr key={field.id} variants={rowVariants} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-gray-400">{field.id.split('-')[0]}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{field.name}</span>
                      {hasAlerts && sevCfg && (
                        <span
                          title={`${fieldRules.length} alert rule${fieldRules.length > 1 ? 's' : ''} configured · highest: ${sevCfg.label}`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${sevCfg.bg} ${sevCfg.text} ${sevCfg.border}`}
                        >
                          <Bell size={9} className="flex-shrink-0" />
                          {fieldRules.length}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={TYPE_BADGE[field.type]}>
                      {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-600">{field.unit}</td>
                  <td className="py-3 px-4">
                    {field.required ? <Check size={15} className="text-green-600" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    {field.computed ? <Check size={15} className="text-green-600" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    {!field.computed && field.type !== 'dropdown'
                      ? <span className="text-gray-300 text-sm">—</span>
                      : <span className="font-mono text-xs text-gray-600">{field.computed ? field.formula : field.options?.join(', ')}</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {field.type === 'number' && utId && (
                        <button
                          onClick={() => setAlertField(field)}
                          title={hasAlerts ? `Manage ${fieldRules.length} alert rule${fieldRules.length > 1 ? 's' : ''}` : 'Add alert rules for this field'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            hasAlerts
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'text-gray-400 hover:bg-amber-100 hover:text-amber-600'
                          }`}
                        >
                          <Bell size={14} fill={hasAlerts ? 'currentColor' : 'none'} />
                        </button>
                      )}
                      <button onClick={() => openEdit(field)} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteField(field.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
                );
              })
            )}
          </motion.tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, processed.length)} of {processed.length} fields
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                    ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                {editTarget ? 'Edit Field' : 'Add New Field'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Field Name */}
              <Input
                label="Field Name"
                placeholder="e.g. Start Time"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />

              {/* Type */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const t = e.target.value as FieldType;
                    const noCompute = t === 'dropdown' || t === 'text' || t === 'photo' || t === 'video';
                    setForm((f) => ({
                      ...f,
                      type: t,
                      computed: noCompute ? false : f.computed,
                    }));
                  }}
                  className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="number">Number</option>
                  <option value="time">Time</option>
                  <option value="text">Text</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="photo">Photo (evidence)</option>
                  <option value="video">Video (evidence)</option>
                </select>
              </div>

              {/* Unit */}
              <Input
                label="Unit"
                placeholder="kWh, L, hrs, — for none"
                value={form.unit ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />

              {/* Required toggle */}
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setForm((f) => ({ ...f, required: !f.required }))}
              >
                <div className={`w-10 h-6 rounded-full flex-shrink-0 flex items-center px-1 transition-colors ${form.required ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.required ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Required field</span>
              </div>

              {/* Computed toggle */}
              <div
                className={`flex items-center gap-3 select-none ${canCompute ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                onClick={() => {
                  if (!canCompute) return;
                  setForm((f) => ({ ...f, computed: !f.computed }));
                  if (!form.computed) setFTokens([]);
                }}
              >
                <div className={`w-10 h-6 rounded-full flex-shrink-0 flex items-center px-1 transition-colors ${form.computed ? 'bg-purple-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.computed ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Computed field</span>
              </div>

              {/* ── Formula Builder ── */}
              {form.computed && canCompute && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Formula</label>
                    <span className="text-xs text-gray-400">auto-calculated from other fields</span>
                  </div>

                  {/* Token strip */}
                  <div className="min-h-[46px] flex flex-wrap gap-1.5 items-center p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    {fTokens.length === 0 && (
                      <span className="text-sm text-gray-400 italic">Build your formula below…</span>
                    )}
                    {fTokens.map((tok) => (
                      <span
                        key={tok.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium select-none
                          ${tok.type === 'field'    ? 'bg-blue-100 text-blue-800' : ''}
                          ${tok.type === 'operator' ? 'bg-gray-200 text-gray-700 font-mono' : ''}
                          ${tok.type === 'number'   ? 'border border-amber-400 text-amber-700 bg-amber-50 font-mono' : ''}
                        `}
                      >
                        {tok.value}
                        <button
                          onClick={() => removeToken(tok.id)}
                          className="hover:opacity-60 transition-opacity ml-0.5 flex-shrink-0"
                        >
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                    {fTokens.length > 0 && (
                      <button
                        onClick={clearFormula}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Delete size={13} />
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Input panel */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {/* Field row */}
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 flex-shrink-0">Field</span>
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) { addField(e.target.value); e.target.value = ''; } }}
                        className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="">Pick a field to insert…</option>
                        {operandFields.map((f) => (
                          <option key={f.id} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="text-gray-400 flex-shrink-0 pointer-events-none" />
                    </div>

                    {/* Operator row */}
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 flex-shrink-0">Operator</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {OP_BUTTONS.map(({ display, value }) => (
                          <button
                            key={value}
                            onClick={() => addOperator(value)}
                            className="w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-100 hover:border-gray-400 transition-colors"
                          >
                            {display}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Number row */}
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 flex-shrink-0">Number</span>
                      <input
                        type="number"
                        value={numInput}
                        onChange={(e) => setNumInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNumber()}
                        placeholder="e.g. 100"
                        className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none font-mono placeholder:text-gray-400 placeholder:font-sans"
                      />
                      <button
                        onClick={addNumber}
                        disabled={!numInput.trim()}
                        className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={13} />
                        Insert
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  {formulaPreview !== '—' && fTokens.length > 0 && (
                    <div className="flex items-baseline gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">Preview</span>
                      <span className="font-mono text-sm text-gray-700 break-all">{formulaPreview}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Dropdown options */}
              {form.type === 'dropdown' && (
                <Input
                  label="Options (comma-separated)"
                  placeholder="Clear, Cloudy, Rainy, Stormy"
                  value={form.options?.join(', ') ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm" disabled={isSaving}>Cancel</Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editTarget ? 'Save Changes' : 'Save Field'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Field Alert Rules Panel */}
      <AnimatePresence>
        {alertField && utId && (
          <FieldAlertPanel
            key={alertField.id}
            utilityTypeId={utId}
            field={alertField}
            onClose={() => { setAlertField(null); refreshAlertRules(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
