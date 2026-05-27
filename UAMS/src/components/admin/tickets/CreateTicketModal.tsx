import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ClipboardList, AlertTriangle, Check } from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { api, type ApiTicket, type ApiUtilityType, type ApiAsset, type ApiUtForm, type ApiUser, type TicketType } from '../../../lib/api';

interface Props {
  onClose: () => void;
  onCreated: (ticket: ApiTicket) => void;
}

const TYPE_OPTIONS: { type: TicketType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    type: 'Task',
    label: 'Task',
    desc: 'Assign a form to an engineer for data collection',
    icon: <ClipboardList size={22} />,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    type: 'Breakdown',
    label: 'Breakdown',
    desc: 'Report and assign an asset breakdown',
    icon: <AlertTriangle size={22} />,
    color: 'bg-red-50 text-red-600 border-red-200',
  },
];

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;
const PRIORITY_COLOR: Record<string, string> = {
  Low: 'border-gray-200 text-gray-600',
  Medium: 'border-blue-200 text-blue-600 bg-blue-50',
  High: 'border-amber-200 text-amber-600 bg-amber-50',
  Critical: 'border-red-200 text-red-600 bg-red-50',
};

type Step = 'type' | 'details' | 'assign' | 'review';
const STEPS: Step[] = ['type', 'details', 'assign', 'review'];
const STEP_LABELS: Record<Step, string> = {
  type: 'Ticket Type',
  details: 'Asset & Form',
  assign: 'Engineer',
  review: 'Review',
};

export default function CreateTicketModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 — type
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Step 2 — details
  const [utilityTypes, setUtilityTypes] = useState<ApiUtilityType[]>([]);
  const [selectedUtId, setSelectedUtId] = useState('');
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [forms, setForms] = useState<ApiUtForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);

  // Step 3 — assign
  const [engineers, setEngineers] = useState<ApiUser[]>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [engineerHeadId, setEngineerHeadId] = useState('');
  const [additionalEngineerIds, setAdditionalEngineerIds] = useState<string[]>([]);
  const [loadingEngineers, setLoadingEngineers] = useState(false);

  // Load utility types on mount
  useEffect(() => {
    api.utilityTypes.list().then(setUtilityTypes).catch(console.error);
  }, []);

  // Load assets when utility type changes
  useEffect(() => {
    if (!selectedUtId) { setAssets([]); setSelectedAssetId(''); return; }
    setLoadingAssets(true);
    api.assets.list()
      .then(all => {
        const filtered = all.filter(a => a.utilityTypeId === selectedUtId);
        setAssets(filtered);
        setSelectedAssetId('');
      })
      .finally(() => setLoadingAssets(false));
  }, [selectedUtId]);

  // Load forms when utility type changes (for Data Entry)
  useEffect(() => {
    if (!selectedUtId || ticketType !== 'Task') { setForms([]); setSelectedFormId(''); return; }
    setLoadingForms(true);
    api.utilityTypes.listForms(selectedUtId)
      .then(f => { setForms(f); setSelectedFormId(''); })
      .finally(() => setLoadingForms(false));
  }, [selectedUtId, ticketType]);

  // Load forms per-asset when asset changes (picks up asset-specific form config)
  useEffect(() => {
    if (!selectedAssetId || ticketType !== 'Task') return;
    // If there's a form selected and it's valid for this asset, keep it;
    // otherwise, the dropdown stays showing all utility-type forms
    // (the form config per-asset is handled at fill time, not selection time)
  }, [selectedAssetId, ticketType]);

  // Load engineers when utility type changes
  useEffect(() => {
    if (!selectedUtId) { setEngineers([]); setSelectedEngineerId(''); setEngineerHeadId(''); setAdditionalEngineerIds([]); return; }
    setLoadingEngineers(true);
    api.tickets.engineersForUtility(selectedUtId)
      .then(e => { setEngineers(e); setSelectedEngineerId(''); setEngineerHeadId(''); setAdditionalEngineerIds([]); })
      .finally(() => setLoadingEngineers(false));
  }, [selectedUtId]);

  // Auto-generate title
  useEffect(() => {
    if (!ticketType) return;
    const ut = utilityTypes.find(u => u.id === selectedUtId);
    const asset = assets.find(a => a.id === selectedAssetId);
    const form = forms.find(f => f.id === selectedFormId);
    if (ticketType === 'Task' && form && asset) {
      setTitle(`${form.name} — ${asset.name || asset.serial}`);
    } else if (ticketType === 'PM Plan' && asset) {
      setTitle(`PM Plan — ${asset.name || asset.serial}`);
    } else if (ticketType === 'Breakdown' && asset) {
      setTitle(`Breakdown — ${asset.name || asset.serial}`);
    } else if (ticketType && ut) {
      setTitle(`${ticketType} — ${ut.name}`);
    }
  }, [ticketType, selectedUtId, selectedAssetId, selectedFormId, utilityTypes, assets, forms]);

  const currentStepIndex = STEPS.indexOf(step);

  const canProceedType = !!ticketType;
  const canProceedDetails = !!selectedUtId && !!selectedAssetId &&
    (ticketType !== 'Task' || !!selectedFormId);
  const next = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex]);
  };

  const back = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(STEPS[prevIndex]);
  };

  const handleCreate = async () => {
    if (!ticketType || !selectedAssetId) return;
    setIsSaving(true);
    try {
      const ticket = await api.tickets.create({
        type: ticketType,
        priority,
        title: title || `${ticketType} Ticket`,
        description: description || undefined,
        dueDate: dueDate || undefined,
        utilityTypeId: selectedUtId || undefined,
        assetId: selectedAssetId || undefined,
        formId: ticketType === 'Task' ? selectedFormId || undefined : undefined,
        assignedToId: selectedEngineerId || undefined,
        engineerHeadId: engineerHeadId || undefined,
        additionalEngineerIds: additionalEngineerIds.length > 0 ? additionalEngineerIds : undefined,
      });
      onCreated(ticket);
    } catch (e: any) {
      alert(e.message ?? 'Failed to create ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedUt = utilityTypes.find(u => u.id === selectedUtId);
  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const selectedForm = forms.find(f => f.id === selectedFormId);
  const selectedEngineer = engineers.find(e => e.id === selectedEngineerId);
  const selectedHead = engineers.find(e => e.id === engineerHeadId);
  const additionalEngineers = engineers.filter(e => additionalEngineerIds.includes(e.id));

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <Dialog.Title className="text-base font-bold text-gray-800">Raise New Ticket</Dialog.Title>
              <p className="text-xs text-gray-400 mt-0.5">Step {currentStepIndex + 1} of {STEPS.length}: {STEP_LABELS[step]}</p>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
            </Dialog.Close>
          </div>

          {/* Step indicator */}
          <div className="flex items-center px-6 py-3 gap-2 border-b border-gray-100 bg-gray-50">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < currentStepIndex ? 'bg-green-500 text-white' :
                  i === currentStepIndex ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {i < currentStepIndex ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === currentStepIndex ? 'text-blue-600' : i < currentStepIndex ? 'text-green-600' : 'text-gray-400'}`}>
                  {STEP_LABELS[s]}
                </span>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="px-6 py-5 min-h-[320px]">
            <AnimatePresence mode="wait">
              {/* STEP 1: Ticket Type */}
              {step === 'type' && (
                <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium">What kind of ticket do you want to raise?</p>
                  <div className="grid grid-cols-1 gap-3">
                    {TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => setTicketType(opt.type)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                          ticketType === opt.type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${opt.color}`}>
                          {opt.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{opt.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                        {ticketType === opt.type && <Check size={18} className="ml-auto text-blue-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Priority</label>
                      <div className="flex gap-2 flex-wrap">
                        {PRIORITY_OPTIONS.map(p => (
                          <button key={p} onClick={() => setPriority(p)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-all ${
                              priority === p ? PRIORITY_COLOR[p] + ' border-current' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Asset & Form */}
              {step === 'details' && (
                <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium">Select the utility, asset{ticketType === 'Task' ? ', and form' : ''} for this ticket.</p>

                  {/* Utility Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Utility Type *</label>
                    <select value={selectedUtId} onChange={e => setSelectedUtId(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors">
                      <option value="">Select utility…</option>
                      {utilityTypes.map(ut => <option key={ut.id} value={ut.id}>{ut.name}</option>)}
                    </select>
                  </div>

                  {/* Asset */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Asset *</label>
                    <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)}
                      disabled={!selectedUtId || loadingAssets}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50">
                      <option value="">
                        {loadingAssets ? 'Loading assets…' : selectedUtId ? 'Select asset…' : 'Select utility first'}
                      </option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name || a.serial || `AST-${a.id.slice(0, 6)}`} {a.serial ? `(${a.serial})` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedUtId && !loadingAssets && assets.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No assets found for this utility type.</p>
                    )}
                  </div>

                  {/* Form — only for Data Entry */}
                  {ticketType === 'Task' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">
                        Form *
                        {selectedAssetId && <span className="text-xs text-gray-400 ml-1">(asset-specific configuration will apply when engineer fills)</span>}
                      </label>
                      <select value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)}
                        disabled={!selectedUtId || loadingForms}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50">
                        <option value="">
                          {loadingForms ? 'Loading forms…' : selectedUtId ? 'Select form…' : 'Select utility first'}
                        </option>
                        {forms.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} {f.isDefault ? '(Default)' : ''} — {f.scope}
                          </option>
                        ))}
                      </select>
                      {selectedUtId && !loadingForms && forms.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">No forms configured for this utility. Add forms in Config → Forms.</p>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Notes / Description <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Any additional instructions for the engineer…"
                      rows={3}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Assign Engineer */}
              {step === 'assign' && (
                <motion.div key="assign" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <p className="text-sm text-gray-600 font-medium">Assign this ticket to an engineer team.</p>

                  {loadingEngineers ? (
                    <p className="text-sm text-gray-400 text-center py-8">Loading engineers…</p>
                  ) : engineers.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                      No engineers are assigned to <strong>{selectedUt?.name}</strong>. You can still create the ticket unassigned and assign later.
                    </div>
                  ) : (
                    <>
                      {/* Primary assignee */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Primary Assignee <span className="text-gray-400 font-normal normal-case">(required to fill form)</span></p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {engineers.map(eng => (
                            <button
                              key={eng.id}
                              onClick={() => setSelectedEngineerId(prev => prev === eng.id ? '' : eng.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                selectedEngineerId === eng.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {eng.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{eng.name}</p>
                                <p className="text-xs text-gray-500">{eng.email} {eng.shift ? `· Shift ${eng.shift}` : ''}</p>
                              </div>
                              {selectedEngineerId === eng.id && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Engineer Head */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Engineer Head <span className="text-gray-400 font-normal normal-case">(optional — supervises this task)</span></p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {engineers.map(eng => (
                            <button
                              key={eng.id}
                              onClick={() => setEngineerHeadId(prev => prev === eng.id ? '' : eng.id)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${
                                engineerHeadId === eng.id
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {eng.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{eng.name}</p>
                                <p className="text-xs text-gray-500">{eng.shift ? `Shift ${eng.shift}` : eng.email}</p>
                              </div>
                              {engineerHeadId === eng.id && <Check size={16} className="text-purple-600 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Additional Engineers */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Additional Team Members <span className="text-gray-400 font-normal normal-case">(optional — supporting engineers)</span></p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {engineers.map(eng => {
                            const checked = additionalEngineerIds.includes(eng.id);
                            return (
                              <button
                                key={eng.id}
                                onClick={() => setAdditionalEngineerIds(prev =>
                                  prev.includes(eng.id) ? prev.filter(id => id !== eng.id) : [...prev, eng.id]
                                )}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${
                                  checked
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                  {eng.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">{eng.name}</p>
                                  <p className="text-xs text-gray-500">{eng.shift ? `Shift ${eng.shift}` : eng.email}</p>
                                </div>
                                {checked && <Check size={16} className="text-green-600 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {!selectedEngineerId && (
                    <p className="text-xs text-gray-400 text-center">No primary engineer selected — ticket will remain Open until assigned.</p>
                  )}
                </motion.div>
              )}

              {/* STEP 4: Review */}
              {step === 'review' && (
                <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium">Review and confirm ticket details before raising.</p>

                  {/* Title override */}
                  <Input label="Ticket Title" value={title} onChange={e => setTitle(e.target.value)} />

                  <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {[
                      { label: 'Type', value: ticketType },
                      { label: 'Priority', value: priority },
                      { label: 'Due Date', value: dueDate || 'Not set' },
                      { label: 'Utility', value: selectedUt?.name ?? '—' },
                      { label: 'Asset', value: selectedAsset ? (selectedAsset.name || selectedAsset.serial || selectedAsset.id) : '—' },
                      ...(ticketType === 'Task' ? [{ label: 'Form', value: selectedForm?.name ?? '—' }] : []),
                      { label: 'Assigned To', value: selectedEngineer?.name ?? 'Unassigned' },
                      ...(selectedHead ? [{ label: 'Eng. Head', value: selectedHead.name }] : []),
                      ...(additionalEngineers.length > 0 ? [{ label: 'Team', value: additionalEngineers.map(e => e.name).join(', ') }] : []),
                      ...(description ? [{ label: 'Notes', value: description }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start gap-4 px-4 py-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">{label}</span>
                        <span className="text-sm text-gray-800 flex-1">{value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <Button variant="secondary" size="sm" onClick={step === 'type' ? onClose : back} disabled={isSaving}>
              {step === 'type' ? 'Cancel' : '← Back'}
            </Button>

            {step !== 'review' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={next}
                disabled={
                  (step === 'type' && !canProceedType) ||
                  (step === 'details' && !canProceedDetails)
                }
              >
                Continue <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleCreate} disabled={isSaving || !title.trim()}>
                {isSaving ? 'Raising Ticket…' : 'Raise Ticket'}
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
