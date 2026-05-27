import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, Plus, Pencil, Trash2, X, Copy, AlertTriangle, Search, Download } from 'lucide-react';
import Button from '../../../../../ui/Button';
import Badge from '../../../../../ui/Badge';
import Input from '../../../../../ui/Input';
import { api, type ApiAssetComponent } from '../../../../../../lib/api';
import * as XLSX from 'xlsx';

type Condition = 'Good' | 'Fair' | 'Due for Replacement';

const GROUPS = ['Engine', 'Alternator', 'Control Panel', 'Cooling', 'Fuel System', 'General'];

const CONDITION_BADGE: Record<Condition, { variant: 'success' | 'warning' | 'error' }> = {
  'Good':                { variant: 'success' },
  'Fair':                { variant: 'warning' },
  'Due for Replacement': { variant: 'error'   },
};

const accordionBody: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded:  { height: 'auto', opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
};

const EMPTY_FORM: Partial<ApiAssetComponent> = { group: 'Engine', condition: 'Good' };

export default function AssetComponents({ assetId }: { assetId: string }) {
  const [components, setComponents] = useState<ApiAssetComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Engine: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiAssetComponent | null>(null);
  const [form, setForm] = useState<Partial<ApiAssetComponent>>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.assetDetails.listComponents(assetId)
      .then(setComponents)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [assetId]);

  const toggleGroup = (g: string) =>
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }));

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (c: ApiAssetComponent) => { setEditTarget(c); setForm({ ...c }); setModalOpen(true); };

  const deleteComp = async (id: string) => {
    if (!window.confirm('Delete this component?')) return;
    try {
      await api.assetDetails.deleteComponent(assetId, id);
      setComponents(prev => prev.filter(c => c.id !== id));
    } catch { alert('Failed to delete component.'); }
  };

  const handleSave = async () => {
    if (!form.name || !form.group) return;
    setIsSaving(true);
    try {
      if (editTarget) {
        const updated = await api.assetDetails.updateComponent(assetId, editTarget.id, form);
        setComponents(prev => prev.map(c => c.id === editTarget.id ? updated : c));
      } else {
        const created = await api.assetDetails.addComponent(assetId, form);
        setComponents(prev => [...prev, created]);
      }
      setModalOpen(false);
    } catch { alert('Failed to save component.'); }
    finally { setIsSaving(false); }
  };

  const f = (key: keyof ApiAssetComponent) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const searchedComponents = search
    ? components.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.partNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
        c.group.toLowerCase().includes(search.toLowerCase())
      )
    : components;
  const groupsPresent = GROUPS.filter(g => searchedComponents.some(c => c.group === g));
  const dueCount = components.filter(c => c.condition === 'Due for Replacement').length;

  const exportData = (format: 'csv' | 'excel') => {
    const headers = ['Name', 'Group', 'Part No.', 'Condition', 'Last Checked', 'Notes'];
    const rows = searchedComponents.map((c: ApiAssetComponent) => [
      c.name, c.group, c.partNumber ?? '', c.condition,
      c.lastChecked ? new Date(c.lastChecked).toLocaleDateString('en-IN') : '',
      c.notes ?? ''
    ]);
    if (format === 'csv') {
      const csv = [headers, ...rows].map((r: any[]) => r.map((col: any) => `"${String(col).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'components.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Components');
      XLSX.writeFile(workbook, 'components.xlsx');
    }
    setShowExportMenu(false);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading components...</div>;
  if (error) return <div className="flex items-center gap-2 justify-center py-20 text-red-500 text-sm"><AlertTriangle size={16} />{error}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">Component Registry</h3>
          <p className="text-xs text-gray-500">
            {components.length} components across {GROUPS.filter(g => components.some(c => c.group === g)).length} groups
            {dueCount > 0 && <span className="ml-2 text-red-600 font-medium">· {dueCount} due for replacement</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Download size={13} /> Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[140px]">
                <button onClick={() => exportData('csv')} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">Export as CSV</button>
                <button onClick={() => exportData('excel')} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">Export as Excel</button>
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={openAdd}><Copy size={14} /> Load Template</Button>
          <Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} /> Add Component</Button>
        </div>
      </div>

      {/* Search */}
      <Input placeholder="Search components by name, part number, group…" value={search}
        onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />

      {/* Accordion Groups */}
      {search && searchedComponents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-400">
          No components match "{search}"
        </div>
      ) : null}
      {groupsPresent.map(group => {
        const groupComps = searchedComponents.filter(c => c.group === group);
        const isOpen = !!openGroups[group];
        const groupDue = groupComps.filter(c => c.condition === 'Due for Replacement').length;
        return (
          <div key={group} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-800">{group}</span>
                <span className="text-xs text-gray-400">{groupComps.length} components</span>
                {groupDue > 0 && <Badge variant="error">{groupDue} due</Badge>}
              </div>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} className="text-gray-400" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="body"
                  variants={accordionBody}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="min-w-[600px] w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          {['Component', 'Part No.', 'Condition', 'Last Checked', 'Actions'].map(h => (
                            <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupComps.map(comp => (
                          <tr key={comp.id} className="border-t border-gray-100 hover:bg-blue-50 transition-colors">
                            <td className="py-3 px-4 text-sm text-gray-800 font-medium">{comp.name}</td>
                            <td className="py-3 px-4 font-mono text-xs text-gray-500">{comp.partNumber || '—'}</td>
                            <td className="py-3 px-4">
                              <Badge variant={CONDITION_BADGE[comp.condition as Condition]?.variant ?? 'default'}>
                                {comp.condition}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {comp.lastChecked ? new Date(comp.lastChecked).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(comp)} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => deleteComp(comp.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {groupComps.length === 0 && (
                          <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-400">No components in this group yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {components.length === 0 && !isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400 mb-3">No components registered for this asset yet.</p>
          <Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} /> Add First Component</Button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                {editTarget ? 'Edit Component' : 'Add Component'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Input label="Component Name" placeholder="e.g. Engine Block" value={form.name ?? ''} onChange={f('name')} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Group</label>
                <select value={form.group ?? 'Engine'} onChange={f('group')} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors">
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <Input label="Part Number" placeholder="e.g. EB-KG2-001" value={form.partNumber ?? ''} onChange={f('partNumber')} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Condition</label>
                <select value={form.condition ?? 'Good'} onChange={f('condition')} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Due for Replacement">Due for Replacement</option>
                </select>
              </div>
              <Input label="Last Checked" type="date" value={form.lastChecked ?? ''} onChange={f('lastChecked')} />
              <Input label="Notes (optional)" placeholder="Any observations..." value={form.notes ?? ''} onChange={f('notes')} />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild><Button variant="secondary" size="sm" disabled={isSaving}>Cancel</Button></Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Component'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
