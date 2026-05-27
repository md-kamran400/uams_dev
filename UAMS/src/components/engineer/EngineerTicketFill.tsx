import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, ClipboardList, Wrench, AlertTriangle, CheckCircle2, AlertCircle, X, Bell } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import MediaField from '../shared/MediaField';
import { api, type ApiTicket, type ApiTicketFull, type TicketStatus, type ApiAssetChecklist, type ApiUtAlertRule } from '../../lib/api';
import { User } from '../../types';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const SEV_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

const SEV_FIELD_TINT: Record<Severity, { border: string; bg: string; text: string; chip: string; ring: string }> = {
  critical: { border: 'border-red-400',    bg: 'bg-red-50',    text: 'text-red-700',    chip: 'bg-red-100 text-red-700',       ring: 'focus:ring-red-400' },
  high:     { border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', chip: 'bg-orange-100 text-orange-700', ring: 'focus:ring-orange-400' },
  medium:   { border: 'border-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700',  chip: 'bg-amber-100 text-amber-700',   ring: 'focus:ring-amber-400' },
  low:      { border: 'border-blue-300',   bg: 'bg-blue-50',   text: 'text-blue-700',   chip: 'bg-blue-100 text-blue-700',     ring: 'focus:ring-blue-400' },
};

function evalRule(rule: ApiUtAlertRule, val: string): boolean {
  const num = parseFloat(val);
  if (!isFinite(num)) return false;
  const t = parseFloat(rule.value);
  if (rule.condition === '>' && num > t) return true;
  if (rule.condition === '<' && num < t) return true;
  if (rule.condition === '==' && num === t) return true;
  // OR: secondary compound condition
  if (rule.condition2 && rule.value2) {
    const t2 = parseFloat(rule.value2);
    if (isFinite(t2)) {
      if (rule.condition2 === '>' && num > t2) return true;
      if (rule.condition2 === '<' && num < t2) return true;
      if (rule.condition2 === '==' && num === t2) return true;
    }
  }
  return false;
}

function describeRule(rule: ApiUtAlertRule): string {
  let desc = `${rule.condition} ${rule.value}`;
  if (rule.condition2 && rule.value2) {
    desc += ` OR ${rule.condition2} ${rule.value2}`;
  }
  return desc;
}

interface Props {
  user: User;
  ticket: ApiTicket;
  onBack: () => void;
  onSubmitted: (updated: ApiTicket) => void;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  'Task': <ClipboardList size={15} className="text-blue-500" />,
  'Data Entry': <ClipboardList size={15} className="text-blue-500" />,
  'PM Plan': <Wrench size={15} className="text-amber-500" />,
  'Breakdown': <AlertTriangle size={15} className="text-red-500" />,
};

function evalFormula(formula: string, currentValues: Record<string, string>, allFields: { id: string; fieldName: string | null }[]): string {
  try {
    let expr = formula;
    for (const field of allFields) {
      if (!field.fieldName) continue;
      const val = parseFloat(currentValues[field.id] ?? '0') || 0;
      expr = expr.replace(new RegExp(`\\b${field.fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), String(val));
    }
    if (/^[\d\s+\-*/().]+$/.test(expr)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      if (typeof result === 'number' && isFinite(result)) {
        return Number(result.toFixed(4)).toString();
      }
    }
  } catch { /* ignore */ }
  return '';
}

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  Open: 'default',
  Assigned: 'info',
  'In Progress': 'warning',
  Submitted: 'info',
  Resubmitted: 'info',
  Approved: 'success',
  Rejected: 'error',
  'Needs Revision': 'warning',
  Closed: 'default',
};

export default function EngineerTicketFill({ ticket: ticketSummary, onBack, onSubmitted }: Props) {
  const [ticket, setTicket] = useState<ApiTicketFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  const [checklists, setChecklists] = useState<ApiAssetChecklist[]>([]);
  const [alertRules, setAlertRules] = useState<ApiUtAlertRule[]>([]);

  useEffect(() => {
    api.tickets.get(ticketSummary.id)
      .then(t => {
        setTicket(t);
        // Pre-fill with existing values (preserve arrays for photo/video fields)
        const existing: Record<string, any> = {};
        if (t.filledValues) {
          for (const [k, v] of Object.entries(t.filledValues)) {
            existing[k] = Array.isArray(v) ? v : String(v);
          }
        }
        // Compute initial values for computed fields
        if (t.formData) {
          const allFields = t.formData.sections.flatMap(s => s.fields.filter(f => !f.isHidden));
          for (const f of allFields) {
            if (f.computed && f.formula && !existing[f.id]) {
              const computed = evalFormula(f.formula, existing, allFields);
              if (computed) existing[f.id] = computed;
            }
          }
        }
        setValues(existing);
        // Mark as In Progress if Assigned or Needs Revision (engineer opened it)
        if (t.status === 'Assigned' || t.status === 'Needs Revision') {
          api.tickets.update(t.id, { status: 'In Progress' }).catch(() => {});
        }

        if (t.utilityTypeId) {
          api.utilityTypes.getFull(t.utilityTypeId)
            .then(full => setAlertRules(full.alertRules ?? []))
            .catch(() => {});
        }

        if (t.type === 'PM Plan' && t.assetId) {
          const m = t.title.match(/\((Monthly|Quarterly|Half Yearly|Yearly)\)$/);
          const freqFull = m ? m[1] : null;
          // Asset checklists use short codes: M, QY, HY, Y
          const FREQ_CODE: Record<string, string> = {
            'Monthly': 'M', 'Quarterly': 'QY', 'Half Yearly': 'HY', 'Yearly': 'Y',
          };
          const freqCode = freqFull ? FREQ_CODE[freqFull] : null;
          if (freqCode) {
            api.assetDetails.listChecklists(t.assetId).then(list => {
              // Match both the short code AND the full name (future-proof)
              setChecklists(list.filter(c => c.frequency === freqCode || c.frequency === freqFull));
            }).catch(console.error);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [ticketSummary.id]);

  function setValue(fieldId: string, val: string) {
    setValues(prev => {
      const next = { ...prev, [fieldId]: val };
      // Recompute computed fields that depend on other fields
      const allFields = ticket?.formData?.sections.flatMap(s => s.fields.filter(f => !f.isHidden)) ?? [];
      for (const f of allFields) {
        if (f.computed && f.formula) {
          next[f.id] = evalFormula(f.formula, next, allFields);
        }
      }
      return next;
    });
    if (errors[fieldId]) setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
  }

  function validate(): boolean {
    if (!ticket?.formData) return true;
    const newErrors: Record<string, string> = {};
    for (const section of ticket.formData.sections) {
      for (const field of section.fields) {
        if (field.isHidden || field.computed) continue;
        const isRequired = !!(field.assetRequiredOverride ?? field.requiredOverride ?? field.required ?? false);
        const val = values[field.id];
        const isMedia = field.fieldType === 'photo' || field.fieldType === 'video';
        const isEmpty = isMedia
          ? (!val || (Array.isArray(val) && val.length === 0))
          : (!val || (typeof val === 'string' && val.trim() === ''));
        if (isRequired && isEmpty) {
          newErrors[field.id] = field.fieldName ?? field.id;
        }
      }
      for (const ef of section.extraFields ?? []) {
        if (ef.required && (!values[ef.id] || values[ef.id].trim() === '')) {
          newErrors[ef.id] = ef.name;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSaveDraft() {
    if (!ticket) return;
    setIsSaving(true);
    try {
      await api.tickets.update(ticket.id, { filledValues: values });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (!ticket) return;
    if (!validate()) { setShowSubmitConfirm(false); return; }
    setIsSaving(true);
    try {
      const allItems = checklists.flatMap(c => c.items);
      const submitValues: Record<string, unknown> = { ...values };
      if (allItems.length > 0) {
        submitValues.__checklistSnapshot = allItems
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(it => ({
            id: it.id,
            name: it.name,
            checkingMethod: it.checkingMethod,
            standard: it.standard ?? null,
            checked: values[`cl_${it.id}`] === 'true',
            remark: (values[`cl_${it.id}_remark`] ?? '').trim() || null,
          }));
      }
      const updated = await api.tickets.update(ticket.id, {
        status: 'Submitted',
        filledValues: submitValues,
      });
      onSubmitted(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setShowSubmitConfirm(false);
    }
  }

  function renderField(
    fieldId: string,
    fieldName: string | null,
    fieldType: string | null,
    fieldUnit: string | null,
    required: boolean,
    options: string[] | null,
    computed?: boolean,
  ) {
    const val = values[fieldId] ?? '';
    const err = errors[fieldId];

    // Find alert rules whose fieldName matches this field (admin keys alerts by fieldName)
    const fieldRules = fieldName ? alertRules.filter(r => r.fieldName === fieldName) : [];
    let triggered: ApiUtAlertRule | null = null;
    if (val && fieldRules.length > 0) {
      for (const r of fieldRules) {
        if (evalRule(r, val) && (!triggered || SEV_RANK[r.severity] > SEV_RANK[triggered.severity])) {
          triggered = r;
        }
      }
    }
    const triggeredTint = triggered ? SEV_FIELD_TINT[triggered.severity] : null;

    const baseClass = `w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 transition-colors ${
      err
        ? 'border-red-300 bg-red-50 focus:ring-red-400'
        : triggeredTint
          ? `${triggeredTint.border} ${triggeredTint.bg} ${triggeredTint.ring}`
          : 'border-gray-200 focus:ring-blue-500'
    }`;

    // Photo / video evidence — render MediaField with camera + gallery buttons
    if (fieldType === 'photo' || fieldType === 'video') {
      const ids: string[] = Array.isArray(values[fieldId]) ? values[fieldId] : [];
      return (
        <div key={fieldId} className="sm:col-span-2 space-y-1">
          <MediaField
            kind={fieldType as 'photo' | 'video'}
            fieldName={fieldName ?? fieldId}
            required={required}
            value={ids}
            onChange={(next) => { setValues(prev => ({ ...prev, [fieldId]: next })); if (errors[fieldId]) setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; }); }}
            error={err}
          />
        </div>
      );
    }

    return (
      <div key={fieldId} className="space-y-1">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          {fieldName ?? fieldId}
          {fieldUnit && <span className="text-xs text-gray-400">({fieldUnit})</span>}
          {required && !computed && <span className="text-red-500">*</span>}
          {computed && (
            <span className="text-[10px] font-medium bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Auto</span>
          )}
          {fieldRules.length > 0 && !computed && (
            <span
              title={fieldRules.map(r => `${r.severity.toUpperCase()}: ${describeRule(r)}${r.action ? ` — ${r.action}` : ''}`).join('\n')}
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full"
            >
              <Bell size={9} /> Alert
            </span>
          )}
        </label>
        {computed ? (
          <div className="w-full text-sm border border-blue-100 bg-blue-50 rounded-xl px-3 py-2.5 text-blue-800 font-mono">
            {val !== '' ? val : <span className="text-blue-400 italic">Calculated automatically</span>}
          </div>
        ) : fieldType === 'dropdown' && options && options.length > 0 ? (
          <select value={val} onChange={e => setValue(fieldId, e.target.value)} className={baseClass}>
            <option value="">— Select —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : fieldType === 'date' ? (
          <input type="date" value={val} onChange={e => setValue(fieldId, e.target.value)} className={baseClass} />
        ) : fieldType === 'time' ? (
          <input type="time" value={val} onChange={e => setValue(fieldId, e.target.value)} className={baseClass} />
        ) : fieldType === 'number' ? (
          <input type="number" value={val} onChange={e => setValue(fieldId, e.target.value)} placeholder="0" className={baseClass} />
        ) : (
          <input type="text" value={val} onChange={e => setValue(fieldId, e.target.value)} placeholder="Enter value" className={baseClass} />
        )}
        {err && <p className="text-xs text-red-500">{err}</p>}
        {fieldRules.length > 0 && !computed && !err && (
          <div className="flex flex-wrap gap-1 items-center pt-0.5">
            {fieldRules.map(r => {
              const tint = SEV_FIELD_TINT[r.severity];
              const isHit = triggered?.id === r.id;
              return (
                <span
                  key={r.id}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${
                    isHit
                      ? `${tint.chip} ${tint.border} ring-1 ring-current`
                      : `bg-white border-gray-200 text-gray-500`
                  }`}
                >
                  <Bell size={8} className={isHit ? '' : tint.text} />
                  {r.severity[0].toUpperCase() + r.severity.slice(1)}: {describeRule(r)}
                </span>
              );
            })}
          </div>
        )}
        {triggered && triggeredTint && (
          <p className={`text-[11px] font-medium flex items-center gap-1 ${triggeredTint.text}`}>
            <AlertTriangle size={11} />
            {triggered.name} threshold crossed{triggered.action ? ` — ${triggered.action}` : '.'}
          </p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm text-gray-400">Loading ticket…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={15} /> Back
        </button>
        <p className="text-red-500 text-sm">Ticket not found.</p>
      </div>
    );
  }

  // Non-Data Entry: no form to fill, just acknowledge
  if (((ticket.type as string) !== 'Task' && (ticket.type as string) !== 'Data Entry') || !ticket.formData) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
              {TYPE_ICON[ticket.type]} {ticket.type}
            </span>
            <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
            <span className="text-xs font-mono text-gray-400">{ticket.number}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{ticket.title}</h2>
          {ticket.description && <p className="text-sm text-gray-600">{ticket.description}</p>}
          {ticket.assetName && (
            <p className="text-sm text-gray-500"><span className="font-medium">Asset:</span> {ticket.assetName}</p>
          )}
          {ticket.dueDate && (
            <p className="text-sm text-gray-500"><span className="font-medium">Due:</span> {new Date(ticket.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          )}

          {ticket.type === 'PM Plan' && checklists.flatMap(c => c.items).length > 0 && (() => {
            const items = checklists.flatMap(c => c.items).sort((a, b) => a.sortOrder - b.sortOrder);
            const checkedCount = items.filter(it => values[`cl_${it.id}`] === 'true').length;
            const pct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
            return (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <h3 className="text-sm font-bold text-gray-900">Checklist</h3>
                  <span className="text-xs font-medium text-gray-500">{checkedCount} / {items.length} done</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <motion.div
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.25 }}
                    className={`h-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  />
                </div>
                <div className="space-y-2">
                  {items.map(item => {
                    const checked = values[`cl_${item.id}`] === 'true';
                    const remarkKey = `cl_${item.id}_remark`;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border transition-colors ${checked ? 'border-green-200 bg-green-50/40' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <label className="flex items-start gap-3 p-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => setValue(`cl_${item.id}`, e.target.checked ? 'true' : 'false')}
                            className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight ${checked ? 'text-gray-700' : 'text-gray-900'}`}>{item.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Method: <span className="font-medium text-gray-700">{item.checkingMethod}</span>
                              {item.standard && <span className="ml-2 pl-2 border-l border-gray-300">Standard: <span className="font-medium text-gray-700">{item.standard}</span></span>}
                            </p>
                          </div>
                          {checked && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />}
                        </label>
                        <div className="px-3 pb-3 pl-10">
                          <input
                            type="text"
                            value={values[remarkKey] ?? ''}
                            onChange={e => setValue(remarkKey, e.target.value)}
                            placeholder="Optional remark…"
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" size="sm" onClick={onBack}>Back</Button>
            <Button variant="primary" size="sm" onClick={() => setShowSubmitConfirm(true)} disabled={isSaving}>
              <Send size={14} className="mr-1.5" /> Mark as Submitted
            </Button>
          </div>
        </div>

        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Ticket?</h3>
              <p className="text-sm text-gray-500 mb-5">Mark this ticket as submitted for admin review.</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowSubmitConfirm(false)}>Cancel</Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={handleSubmit} disabled={isSaving}>Submit</Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
            <span className="text-xs font-mono text-gray-400">{ticket.number}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{ticket.title}</h2>
          {ticket.assetName && <p className="text-sm text-gray-500 mt-0.5">{ticket.assetName} · {ticket.utilityTypeName}</p>}
        </div>
      </div>

      {/* Paused plan banner */}
      {ticketSummary.planStatus === 'Paused' && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Plan Paused</p>
            <p className="text-sm text-orange-700 mt-0.5">
              {ticketSummary.planName ? `"${ticketSummary.planName}" is paused.` : 'This PM plan is paused.'} You can still complete this ticket, but no new tickets will be generated until the plan is resumed.
            </p>
          </div>
        </div>
      )}

      {/* Revision banner */}
      {ticketSummary.rejectionReason && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Revision Required</p>
            <p className="text-sm text-amber-700 mt-0.5">{ticketSummary.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Form sections */}
      {ticket.formData.sections.map(section => {
        const visibleFields = section.fields.filter(f => !f.isHidden);
        const extraFields = section.extraFields ?? [];
        if (visibleFields.length === 0 && extraFields.length === 0) return null;
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">{section.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleFields.map(f => {
                const required = !!(f.assetRequiredOverride ?? f.requiredOverride ?? f.required);
                return renderField(f.id, f.fieldName, f.fieldType, f.fieldUnit, required, f.fieldOptions, f.computed);
              })}
              {extraFields.map(ef =>
                renderField(ef.id, ef.name, ef.type, ef.unit, ef.required, ef.options)
              )}
            </div>
          </div>
        );
      })}

      {/* Validation error banner */}
      {showValidationBanner && Object.keys(errors).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-20 z-10 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-lg"
        >
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">Required fields missing</p>
            <p className="text-xs text-red-600 mt-0.5">
              Please fill in: {Object.values(errors).join(', ')}
            </p>
          </div>
          <button onClick={() => setShowValidationBanner(false)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Action bar */}
      <div className="sticky bottom-4 flex gap-3 bg-white/90 backdrop-blur rounded-2xl border border-gray-200 shadow-lg p-4">
        <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
          Save Draft
        </Button>
        <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={() => {
          const valid = validate();
          if (valid) {
            setShowValidationBanner(false);
            setShowSubmitConfirm(true);
          } else {
            setShowValidationBanner(true);
          }
        }} disabled={isSaving}>
          <Send size={14} className="mr-1.5" /> Submit
        </Button>
      </div>

      {/* Submit confirm */}
      {showSubmitConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <CheckCircle2 size={36} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Submit Form?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              Once submitted, your data will be sent to the admin for review. You won't be able to edit after submitting.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowSubmitConfirm(false)}>Cancel</Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
