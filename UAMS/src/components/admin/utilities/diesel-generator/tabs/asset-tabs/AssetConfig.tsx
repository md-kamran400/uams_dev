import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings2, FileText, ArrowLeft, Eye, EyeOff, Plus, Trash2,
  ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import Button from '../../../../../ui/Button';
import Input from '../../../../../ui/Input';
import * as Dialog from '@radix-ui/react-dialog';
import {
  api, type ApiUtForm, type ApiAssetFormFull, type ApiUtField
} from '../../../../../../lib/api';

const FIELD_TYPE_COLORS: Record<string, string> = {
  number: 'bg-blue-50 text-blue-700', text: 'bg-green-50 text-green-700',
  time: 'bg-purple-50 text-purple-700', dropdown: 'bg-amber-50 text-amber-700',
  date: 'bg-pink-50 text-pink-700',
};

function FormConfigView({ assetId, form, utilityTypeId, onBack }: { assetId: string; form: ApiUtForm; utilityTypeId: string; onBack: () => void }) {
  const [config, setConfig] = useState<ApiAssetFormFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAddExtra, setShowAddExtra] = useState<{ sectionId: string } | null>(null);
  const [extraForm, setExtraForm] = useState({ name: '', type: 'number' as const, unit: '', required: true });
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [utilityFields, setUtilityFields] = useState<ApiUtField[]>([]);

  useEffect(() => {
    if (utilityTypeId) {
      api.utilityTypes.getFull(utilityTypeId).then(d => setUtilityFields(d.fields || [])).catch(console.error);
    }
  }, [utilityTypeId]);

  const reload = () => {
    setIsLoading(true);
    api.assetDetails.getFormConfig(assetId, form.id)
      .then(data => {
        setConfig(data);
        const exp: Record<string, boolean> = {};
        data.sections.forEach(s => { exp[s.id] = true; });
        setExpandedSections(exp);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { reload(); }, [assetId, form.id]);

  const toggleFieldVisibility = async (sfId: string, currentlyHidden: boolean) => {
    setIsSaving(true);
    try {
      await api.assetDetails.updateFieldOverride(assetId, form.id, sfId, { isHidden: !currentlyHidden });
      reload();
    } catch (e: any) { alert(e.message ?? 'Failed to update field.'); }
    finally { setIsSaving(false); }
  };

  const addExtraField = async (sectionId: string) => {
    if (!extraForm.name.trim()) return;
    setIsSaving(true);
    try {
      await api.assetDetails.addExtraField(assetId, form.id, sectionId, {
        name: extraForm.name.trim(),
        type: extraForm.type,
        unit: extraForm.unit || undefined,
        required: extraForm.required,
        sortOrder: 0,
      } as any);
      setShowAddExtra(null);
      setExtraForm({ name: '', type: 'number', unit: '', required: true });
      reload();
    } catch (e: any) { alert(e.message ?? 'Failed to add field.'); }
    finally { setIsSaving(false); }
  };

  const deleteExtraField = async () => {
    if (!itemToDelete) return;
    try {
      await api.assetDetails.deleteExtraField(assetId, itemToDelete);
      setItemToDelete(null);
      reload();
    } catch (e: any) { alert(e.message ?? 'Failed to delete field.'); }
  };

  if (isLoading) return <div className="py-12 text-center text-sm text-gray-400">Loading form configuration…</div>;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ArrowLeft size={15} /></button>
        <div>
          <h4 className="text-sm font-bold text-gray-800">{form.name}</h4>
          <p className="text-xs text-gray-400">Customize fields for this asset only — changes here won't affect other assets</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${form.scope === 'engineer' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
          {form.scope}
        </span>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
        <strong>Asset-level customization:</strong> Fields shown here come from the utility's default form template.
        You can hide fields or add extra fields unique to this asset. The original template is not changed.
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {(config?.sections ?? []).length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
            This form has no sections yet. Add sections in the utility Config → Forms tab.
          </div>
        )}
        {(config?.sections ?? []).map(section => {
          const visibleCount = section.fields.filter(f => !f.isHidden).length;
          const totalCount = section.fields.length + section.extraFields.length;
          return (
            <div key={section.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Section header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <button onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))} className="text-gray-400 hover:text-gray-600">
                  {expandedSections[section.id] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                <span className="flex-1 text-sm font-semibold text-gray-800">{section.name}</span>
                <span className="text-xs text-gray-400">{visibleCount}/{totalCount} visible</span>
                <button
                  onClick={() => { setShowAddExtra({ sectionId: section.id }); setExtraForm({ name: '', type: 'number', unit: '', required: true }); }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50"
                >
                  <Plus size={12} /> Add Extra Field
                </button>
              </div>

              {expandedSections[section.id] && (
                <div>
                  {section.fields.length === 0 && section.extraFields.length === 0 ? (
                    <p className="px-5 py-3 text-xs text-gray-400 italic">No fields in this section.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Field</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Source</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Visibility</th>
                          <th className="px-4 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Inherited fields */}
                        {section.fields.map(f => (
                          <tr key={f.id} className={`border-b border-gray-50 ${f.isHidden ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{f.fieldName ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FIELD_TYPE_COLORS[f.fieldType ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                                {f.fieldType ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">inherited</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => toggleFieldVisibility(f.id, f.isHidden)}
                                disabled={isSaving}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-colors ${
                                  f.isHidden
                                    ? 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600'
                                    : 'border-green-200 bg-green-50 text-green-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                                }`}
                              >
                                {f.isHidden ? <><EyeOff size={12} /> Hidden</> : <><Eye size={12} /> Visible</>}
                              </button>
                            </td>
                            <td className="px-4 py-2.5"></td>
                          </tr>
                        ))}
                        {/* Extra fields (asset-specific) */}
                        {section.extraFields.map(ef => (
                          <tr key={ef.id} className="border-b border-gray-50 bg-blue-50/30">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{ef.name}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FIELD_TYPE_COLORS[ef.type] ?? ''}`}>{ef.type}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">asset-only</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs text-green-600 flex items-center gap-1"><Eye size={12} /> Visible</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <button onClick={() => setItemToDelete(ef.id)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add extra field inline */}
                  {showAddExtra?.sectionId === section.id && (
                    <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                      <p className="text-xs font-semibold text-blue-700 mb-2">Add Asset-Specific Field</p>
                      <div className="flex items-end gap-3 flex-wrap">
                        {utilityFields.length > 0 && (
                          <div className="flex flex-col gap-1 w-full mb-1">
                            <label className="text-xs font-medium text-gray-600">Load from Utility Template (Optional)</label>
                            <select
                              className="border border-gray-300 rounded-lg px-2 py-2 text-xs text-gray-800 bg-white"
                              onChange={e => {
                                const f = utilityFields.find(uf => uf.id === e.target.value);
                                if (f) setExtraForm(prev => ({ ...prev, name: f.name, type: (f.type as any) || 'text', unit: f.unit ?? '' }));
                              }}
                            >
                              <option value="">-- Custom Field --</option>
                              {utilityFields.map(uf => <option key={uf.id} value={uf.id}>{uf.name} ({uf.type})</option>)}
                            </select>
                          </div>
                        )}
                        <div className="flex-1 min-w-[140px]">
                          <Input label="Field Name" placeholder="e.g. Oil Temperature" value={extraForm.name}
                            onChange={e => setExtraForm(v => ({ ...v, name: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-1 min-w-[100px]">
                          <label className="text-xs font-medium text-gray-600">Type</label>
                          <select value={extraForm.type} onChange={e => setExtraForm(v => ({ ...v, type: e.target.value as any }))}
                            className="border border-gray-300 rounded-lg px-2 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500">
                            <option value="number">Number</option>
                            <option value="text">Text</option>
                            <option value="time">Time</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="date">Date</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <label className="text-xs font-medium text-gray-600">Unit</label>
                          <input type="text" placeholder="°C, rpm…" value={extraForm.unit}
                            onChange={e => setExtraForm(v => ({ ...v, unit: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <input type="checkbox" id={`req-${section.id}`} checked={extraForm.required}
                            onChange={e => setExtraForm(v => ({ ...v, required: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded" />
                          <label htmlFor={`req-${section.id}`} className="text-xs text-gray-600">Required</label>
                        </div>
                        <Button variant="primary" size="sm" onClick={() => addExtraField(section.id)} disabled={isSaving || !extraForm.name.trim()}>Add</Button>
                        <Button variant="secondary" size="sm" onClick={() => setShowAddExtra(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog.Root open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Delete Field?</Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this field? This action cannot be undone.
            </Dialog.Description>
            <div className="flex items-center gap-3 justify-center">
              <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
              <Button variant="primary" className="!bg-red-600 hover:!bg-red-700 !border-red-700" onClick={deleteExtraField}>Delete</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </motion.div>
  );
}

export default function AssetConfig({ assetId, utilityTypeId }: { assetId: string; utilityTypeId: string }) {
  const [forms, setForms] = useState<ApiUtForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<ApiUtForm | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.assetDetails.listForms(assetId)
      .then(setForms)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [assetId]);

  if (selectedForm) {
    return <FormConfigView assetId={assetId} form={selectedForm} utilityTypeId={utilityTypeId} onBack={() => setSelectedForm(null)} />;
  }

  if (isLoading) return <div className="py-12 text-center text-sm text-gray-400">Loading forms…</div>;

  if (forms.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <FileText size={32} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No form templates available for this utility.</p>
        <p className="text-xs text-gray-400 mt-1">Create forms in Config → Forms tab first.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <p className="text-xs text-gray-500">
        These are the form templates for this utility. Click a form to customize which fields are visible for this specific asset or to add asset-specific fields.
      </p>
      {forms.map(f => (
        <motion.div
          key={f.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setSelectedForm(f)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{f.name}</p>
            {f.description && <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.scope === 'engineer' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
            {f.scope}
          </span>
          {f.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Default</span>}
          <Settings2 size={15} className="text-gray-300 group-hover:text-blue-400" />
        </motion.div>
      ))}
    </motion.div>
  );
}
