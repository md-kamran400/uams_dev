import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Pencil, Trash2, X, Package, AlertTriangle, Search, Download } from 'lucide-react';
import Button from '../../../../../ui/Button';
import Badge from '../../../../../ui/Badge';
import Input from '../../../../../ui/Input';
import { api, type ApiSpare } from '../../../../../../lib/api';

type StockStatus = 'Adequate' | 'Low' | 'Critical' | 'Out of Stock';

const STATUS_BADGE: Record<StockStatus, 'success' | 'warning' | 'error' | 'default'> = {
  'Adequate':     'success',
  'Low':          'warning',
  'Critical':     'error',
  'Out of Stock': 'error',
};

function deriveStatus(qty: number, reorder: number): StockStatus {
  if (qty === 0) return 'Out of Stock';
  if (qty <= reorder * 0.5) return 'Critical';
  if (qty < reorder) return 'Low';
  return 'Adequate';
}

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

const EMPTY_FORM: Partial<ApiSpare & { category: string }> = { unit: 'Pcs' };

export default function AssetInventory({ assetId, utilityTypeId }: { assetId: string; utilityTypeId: string }) {
  const [items, setItems] = useState<ApiSpare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiSpare | null>(null);
  const [form, setForm] = useState<Partial<ApiSpare>>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.assetDetails.listSpares(assetId)
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [assetId]);

  const getStatus = (item: ApiSpare): StockStatus =>
    deriveStatus(item.currentQty, item.minStock);

  const stats = {
    total: items.length,
    adequate: items.filter(i => getStatus(i) === 'Adequate').length,
    lowOrCritical: items.filter(i => ['Low', 'Critical'].includes(getStatus(i))).length,
    outOfStock: items.filter(i => getStatus(i) === 'Out of Stock').length,
  };

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (item: ApiSpare) => { setEditTarget(item); setForm({ ...item }); setModalOpen(true); };

  const deleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await api.spares.delete(itemToDelete);
      setItems(prev => prev.filter(i => i.id !== itemToDelete));
      setItemToDelete(null);
    } catch { alert('Failed to delete.'); }
  };

  const filteredItems = items.filter(i => 
    !search || 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.partCode.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    const headers = ['Item', 'Part No.', 'Qty in Stock', 'Reorder Level', 'Unit Cost', 'Status'];
    const rows = filteredItems.map(i => [
      i.name, i.partCode, `${i.currentQty} ${i.unit}`, `${i.minStock} ${i.unit}`, String(i.unitCost), getStatus(i)
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'inventory.csv'; a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.partCode) { alert('Item name and part code are required.'); return; }
    setIsSaving(true);
    try {
      if (editTarget) {
        const updated = await api.spares.update(editTarget.id, form);
        setItems(prev => prev.map(i => i.id === editTarget.id ? updated : i));
      } else {
        const created = await api.spares.create({ name: form.name!, partCode: form.partCode!, ...form, utilityTypeId, assetId });
        setItems(prev => [...prev, created]);
      }
      setModalOpen(false);
    } catch (e: any) { alert(e.message ?? 'Failed to save.'); }
    finally { setIsSaving(false); }
  };

  const f = (key: keyof ApiSpare) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  if (isLoading) return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading inventory...</div>;
  if (error) return <div className="flex items-center gap-2 justify-center py-20 text-red-500 text-sm"><AlertTriangle size={16} />{error}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">Consumables & Spare Parts</h3>
          <p className="text-xs text-gray-500">Track stock levels and reorder thresholds for this utility type.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors h-10">
              <Download size={14} /> Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[160px]">
                <button onClick={exportCsv} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Export as CSV</button>
              </div>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={openAdd} className="h-10"><Plus size={14} /> Add Item</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Items',    value: stats.total,           color: 'text-gray-800'  },
          { label: 'Adequate',       value: stats.adequate,        color: 'text-green-600' },
          { label: 'Low / Critical', value: stats.lowOrCritical,   color: 'text-amber-600' },
          { label: 'Out of Stock',   value: stats.outOfStock,      color: 'text-red-600'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-[700px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {['Item', 'Part No.', 'Qty in Stock', 'Reorder Level', 'Unit Cost (₹)', 'Status', 'Actions'].map(h => (
                <th key={h} className="py-3 px-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Package size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No spare parts found.</p>
                </td>
              </tr>
            ) : filteredItems.map(item => {
              const status = getStatus(item);
              return (
                <motion.tr key={item.id} variants={rowVariants} initial="hidden" animate="visible" className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{item.partCode}</td>
                  <td className="py-3 px-4">
                    <span className={`font-mono text-sm font-semibold ${item.currentQty === 0 ? 'text-red-600' : item.currentQty < item.minStock ? 'text-amber-600' : 'text-gray-800'}`}>
                      {item.currentQty} {item.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{item.minStock} {item.unit}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">₹{Number(item.unitCost).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4"><Badge variant={STATUS_BADGE[status]}>{status}</Badge></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setItemToDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">{editTarget ? 'Edit Item' : 'Add Spare Part'}</Dialog.Title>
              <Dialog.Close asChild><button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button></Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Input label="Item Name" placeholder="e.g. Oil Filter" value={form.name ?? ''} onChange={f('name')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Part Code" placeholder="OF-KG2-001" value={form.partCode ?? ''} onChange={f('partCode')} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Unit</label>
                  <select value={form.unit ?? 'Pcs'} onChange={f('unit')} className="border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500">
                    {['Pcs', 'L', 'kg', 'm', 'Set'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <Input label="Current Qty" type="number" placeholder="0" value={String(form.currentQty ?? '')} onChange={f('currentQty')} />
                <Input label="Reorder Level" type="number" placeholder="0" value={String(form.minStock ?? '')} onChange={f('minStock')} />
                <Input label="Unit Cost (₹)" type="number" placeholder="0" value={String(form.unitCost ?? '')} onChange={f('unitCost')} />
                <Input label="Location" placeholder="Store-A" value={form.location ?? ''} onChange={f('location')} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild><Button variant="secondary" size="sm" disabled={isSaving}>Cancel</Button></Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Dialog */}
      <Dialog.Root open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">Delete Item?</Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-6">
              Are you sure you want to remove this spare part from inventory? This action cannot be undone.
            </Dialog.Description>
            <div className="flex items-center gap-3 justify-center">
              <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
              <Button variant="primary" className="!bg-red-600 hover:!bg-red-700 !border-red-700" onClick={deleteItem}>Delete</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
