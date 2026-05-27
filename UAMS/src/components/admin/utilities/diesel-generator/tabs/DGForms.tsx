import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import {
  FileText, Plus, Pencil, Trash2, X, ChevronRight,
  ArrowLeft, Settings2, Search,
  Download, GripVertical, ChevronDown, ChevronUp,
} from 'lucide-react';
import Button from '../../../../ui/Button';
import Input from '../../../../ui/Input';
import { api, type ApiUtForm, type ApiUtFormFull, type ApiUtField } from '../../../../../lib/api';
import * as XLSX from 'xlsx';

const containerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const rowVariants: Variants = { hidden: { opacity: 0, x: -6 }, visible: { opacity: 1, x: 0, transition: { duration: 0.22 } } };

const SCOPE_BADGE: Record<string, string> = {
  engineer: 'bg-purple-50 text-purple-700 border border-purple-100',
  operator: 'bg-blue-50 text-blue-700 border border-blue-100',
};

// ── Form Editor ───────────────────────────────────────────────────────────────
function FormEditor({
  form, utId, allFields, onBack, onFormUpdated,
}: {
  form: ApiUtForm;
  utId: string;
  allFields: ApiUtField[];
  onBack: () => void;
  onFormUpdated: (f: ApiUtForm) => void;
}) {
  const [fullForm, setFullForm] = useState<ApiUtFormFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddFieldModal, setShowAddFieldModal] = useState<{ sectionId: string } | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(form.name);
  const [editDesc, setEditDesc] = useState(form.description ?? '');
  const [editScope, setEditScope] = useState<'engineer' | 'operator'>(form.scope);
  const [editIsDefault, setEditIsDefault] = useState(form.isDefault);
  const [editingMeta, setEditingMeta] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.utilityTypes.getFormFull(utId, form.id)
      .then(f => {
        setFullForm(f);
        const initial: Record<string, boolean> = {};
        f.sections.forEach(s => { initial[s.id] = true; });
        setExpandedSections(initial);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [utId, form.id]);

  const reload = () => {
    api.utilityTypes.getFormFull(utId, form.id).then(setFullForm).catch(console.error);
  };

  const saveMeta = async () => {
    setIsSaving(true);
    try {
      const updated = await api.utilityTypes.updateForm(utId, form.id, {
        name: editName, description: editDesc || undefined, scope: editScope, isDefault: editIsDefault,
      });
      onFormUpdated(updated);
      setEditingMeta(false);
    } catch (e: any) { alert(e.message ?? 'Failed to update form.'); }
    finally { setIsSaving(false); }
  };

  const addSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      const sortOrder = (fullForm?.sections.length ?? 0);
      await api.utilityTypes.addSection(utId, form.id, { name: newSectionName.trim(), sortOrder });
      setNewSectionName('');
      setShowAddSection(false);
      reload();
    } catch (e: any) { alert(e.message ?? 'Failed to add section.'); }
  };

  const deleteSection = async (sectionId: string) => {
    if (!window.confirm('Delete this section and all its fields from the form?')) return;
    try {
      await api.utilityTypes.deleteSection(utId, form.id, sectionId);
      reload();
    } catch (e: any) { alert(e.message ?? 'Failed to delete section.'); }
  };

  const addFieldToSection = async (sectionId: string) => {
    if (!selectedFieldId) return;
    const section = fullForm?.sections.find(s => s.id === sectionId);
    const sortOrder = section?.fields.length ?? 0;
    try {
      await api.utilityTypes.addFieldToSection(utId, form.id, sectionId, { fieldId: selectedFieldId, sortOrder });
      setShowAddFieldModal(null);
      setSelectedFieldId('');
      reload();
    } catch (e: any) { alert(e.message ?? 'Failed to add field.'); }
  };

  const removeField = async (sectionId: string, sfId: string) => {
    try {
      await api.utilityTypes.removeFieldFromSection(utId, form.id, sectionId, sfId);
      reload();
    } catch (e: any) { alert(e.message ?? 'Failed to remove field.'); }
  };

  // Fields already in this section
  const usedFieldIds = fullForm?.sections.flatMap(s => s.fields.map(f => f.fieldId)) ?? [];
  const availableFields = allFields.filter(f => !usedFieldIds.includes(f.id));

  const TYPE_COLORS: Record<string, string> = {
    number: 'bg-blue-50 text-blue-700', text: 'bg-green-50 text-green-700',
    time: 'bg-purple-50 text-purple-700', dropdown: 'bg-amber-50 text-amber-700',
    date: 'bg-pink-50 text-pink-700',
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">{form.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCOPE_BADGE[form.scope] ?? ''}`}>
              {form.scope}
            </span>
            {form.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Default</span>}
          </div>
          {form.description && <p className="text-xs text-gray-500 mt-0.5">{form.description}</p>}
        </div>
        <button onClick={() => setEditingMeta(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Settings2 size={13} /> Edit Details
        </button>
      </div>

      {/* Meta editor (inline) */}
      {editingMeta && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Form Details</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Form Name" value={editName} onChange={e => setEditName(e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Scope</label>
              <select value={editScope} onChange={e => setEditScope(e.target.value as any)}
                className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                <option value="engineer">Engineer</option>
                <option value="operator">Operator</option>
              </select>
            </div>
            <Input label="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" id="isDefault" checked={editIsDefault} onChange={e => setEditIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Mark as default form</label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={saveMeta} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditingMeta(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading form structure…</div>
      ) : (
        <div className="space-y-3">
          {/* Sections */}
          {(fullForm?.sections ?? []).map(section => (
            <div key={section.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Section Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedSections[section.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <GripVertical size={15} className="text-gray-300" />
                <span className="flex-1 text-sm font-semibold text-gray-800">{section.name}</span>
                <span className="text-xs text-gray-400">{section.fields.length} field{section.fields.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => { setShowAddFieldModal({ sectionId: section.id }); setSelectedFieldId(''); }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50"
                >
                  <Plus size={12} /> Add Field
                </button>
                <button onClick={() => deleteSection(section.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Fields */}
              {expandedSections[section.id] && (
                <div>
                  {section.fields.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-gray-400 italic">No fields in this section yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Field Name</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Unit</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Required</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.fields.map((f, idx) => (
                          <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{f.fieldName ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[f.fieldType ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                                {f.fieldType ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{f.fieldUnit || '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                (f.requiredOverride ?? f.required)
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {(f.requiredOverride ?? f.required) ? 'Required' : 'Optional'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => removeField(section.id, f.id)}
                                className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Section */}
          {showAddSection ? (
            <div className="bg-white border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <Input
                placeholder="Section name…"
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') { setShowAddSection(false); setNewSectionName(''); } }}
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={addSection}>Add</Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowAddSection(false); setNewSectionName(''); }}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSection(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Section
            </button>
          )}
        </div>
      )}

      {/* Add Field to Section modal */}
      <Dialog.Root open={!!showAddFieldModal} onOpenChange={open => { if (!open) setShowAddFieldModal(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <Dialog.Title className="text-sm font-bold text-gray-800">Add Field to Section</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
              </Dialog.Close>
            </div>
            <div className="px-5 py-4 space-y-3">
              {availableFields.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">All available fields are already in this form.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500">Select a field from the utility's field registry to add to this section.</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {availableFields.map(f => (
                      <label key={f.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors ${selectedFieldId === f.id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <input type="radio" name="field" value={f.id} checked={selectedFieldId === f.id} onChange={() => setSelectedFieldId(f.id)} className="text-blue-600" />
                        <span className="flex-1 text-sm font-medium text-gray-800">{f.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[f.type] ?? ''}`}>{f.type}</span>
                        {f.unit && <span className="text-xs text-gray-400">{f.unit}</span>}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
              <Dialog.Close asChild><Button variant="secondary" size="sm">Cancel</Button></Dialog.Close>
              <Button variant="primary" size="sm" disabled={!selectedFieldId} onClick={() => showAddFieldModal && addFieldToSection(showAddFieldModal.sectionId)}>
                Add Field
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}

// ── Forms Table ───────────────────────────────────────────────────────────────
export default function DGForms({ utilityTypeId }: { utilityTypeId?: string }) {
  const [forms, setForms] = useState<ApiUtForm[]>([]);
  const [allFields, setAllFields] = useState<ApiUtField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [utId, setUtId] = useState<string | null>(utilityTypeId ?? null);
  const [search, setSearch] = useState('');
  const [selectedForm, setSelectedForm] = useState<ApiUtForm | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', description: '', scope: 'engineer' as 'engineer' | 'operator', isDefault: false });
  const [isSaving, setIsSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let resolvedId = utilityTypeId;
        if (!resolvedId) {
          const types = await api.utilityTypes.list();
          const dg = types.find(t => t.name === 'DG Set' || t.name === 'Diesel Generator') || types[0];
          if (!dg) return;
          resolvedId = dg.id;
        }
        setUtId(resolvedId);
        const [f, full] = await Promise.all([
          api.utilityTypes.listForms(resolvedId),
          api.utilityTypes.getFull(resolvedId),
        ]);
        setForms(f);
        setAllFields(full.fields);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    }
    load();
  }, [utilityTypeId]);

  if (selectedForm && utId) {
    return (
      <FormEditor
        form={selectedForm}
        utId={utId}
        allFields={allFields}
        onBack={() => setSelectedForm(null)}
        onFormUpdated={updated => {
          setForms(prev => prev.map(f => f.id === updated.id ? updated : f));
          setSelectedForm(updated);
        }}
      />
    );
  }

  const filtered = forms.filter(f => {
    const q = search.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q) || f.scope.toLowerCase().includes(q);
  });

  const createForm = async () => {
    if (!newForm.name.trim() || !utId) return;
    setIsSaving(true);
    try {
      const created = await api.utilityTypes.createForm(utId, {
        name: newForm.name.trim(),
        description: newForm.description || undefined,
        scope: newForm.scope,
        isDefault: newForm.isDefault,
        sortOrder: forms.length,
      });
      setForms(prev => [...prev, created]);
      setShowCreateModal(false);
      setNewForm({ name: '', description: '', scope: 'engineer', isDefault: false });
    } catch (e: any) { alert(e.message ?? 'Failed to create form.'); }
    finally { setIsSaving(false); }
  };

  const deleteForm = async (id: string) => {
    if (!utId || !window.confirm('Delete this form? All sections and field mappings will be removed.')) return;
    try {
      await api.utilityTypes.deleteForm(utId, id);
      setForms(prev => prev.filter(f => f.id !== id));
    } catch (e: any) { alert(e.message ?? 'Failed to delete form.'); }
  };

  const exportData = (format: 'csv' | 'excel') => {
    const headers = ['Form Name', 'Description', 'Scope', 'Default', 'Created'];
    const rows = filtered.map(f => [
      f.name, f.description ?? '', f.scope, f.isDefault ? 'Yes' : 'No',
      new Date(f.createdAt).toLocaleDateString('en-IN'),
    ]);
    if (format === 'csv') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'forms.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Forms');
      XLSX.writeFile(workbook, 'forms.xlsx');
    }
    setShowExportMenu(false);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-gray-800 mb-1">Form Templates</h3>
        <p className="text-xs text-gray-500">Create and manage data collection forms for this utility. Click a form to edit its sections and fields.</p>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Input placeholder="Search forms…" value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
        </div>
        {/* Export */}
        <div className="relative">
          <button onClick={() => setShowExportMenu(v => !v)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[160px]">
              <button onClick={() => exportData('csv')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Export as CSV</button>
              <button onClick={() => exportData('excel')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Export as Excel</button>
            </div>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={14} className="mr-1" /> New Form
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Forms', value: forms.length, color: 'text-gray-800' },
          { label: 'Engineer Forms', value: forms.filter(f => f.scope === 'engineer').length, color: 'text-purple-600' },
          { label: 'Operator Forms', value: forms.filter(f => f.scope === 'operator').length, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Forms Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Form Name</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Scope</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Default</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Created</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
            {isLoading ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">Loading forms…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <FileText size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No forms yet. Click "New Form" to get started.</p>
                </td>
              </tr>
            ) : (
              filtered.map(f => (
                <motion.tr
                  key={f.id}
                  variants={rowVariants}
                  onClick={() => setSelectedForm(f)}
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={13} className="text-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{f.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 max-w-[200px] truncate">{f.description ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCOPE_BADGE[f.scope] ?? ''}`}>{f.scope}</span>
                  </td>
                  <td className="py-3 px-4">
                    {f.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">Default</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedForm(f); }}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit form"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteForm(f.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete form"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 ml-1" />
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </motion.tbody>
        </table>
      </motion.div>

      {/* Create Form Modal */}
      <Dialog.Root open={showCreateModal} onOpenChange={setShowCreateModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <Dialog.Title className="text-sm font-bold text-gray-800">Create New Form</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
              </Dialog.Close>
            </div>
            <div className="px-5 py-4 space-y-4">
              <Input label="Form Name *" placeholder="e.g. Daily Log, Weekly Inspection" value={newForm.name}
                onChange={e => setNewForm(v => ({ ...v, name: e.target.value }))} />
              <Input label="Description" placeholder="What is this form for?" value={newForm.description}
                onChange={e => setNewForm(v => ({ ...v, description: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Scope</label>
                <select value={newForm.scope} onChange={e => setNewForm(v => ({ ...v, scope: e.target.value as any }))}
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                  <option value="engineer">Engineer</option>
                  <option value="operator">Operator</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newForm.isDefault} onChange={e => setNewForm(v => ({ ...v, isDefault: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Set as default form for this utility</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
              <Dialog.Close asChild><Button variant="secondary" size="sm">Cancel</Button></Dialog.Close>
              <Button variant="primary" size="sm" onClick={createForm} disabled={isSaving || !newForm.name.trim()}>
                {isSaving ? 'Creating…' : 'Create Form'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
