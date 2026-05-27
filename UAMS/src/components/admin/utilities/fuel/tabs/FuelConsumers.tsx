import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Columns3, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import Button from '../../../../ui/Button';
import Badge from '../../../../ui/Badge';
import Input from '../../../../ui/Input';
import {
  FUEL_CONSUMERS, CONSUMER_COLUMN_META,
  type FuelConsumer, type ConsumerType, type FuelType,
} from '../../../../../data/fuelData';

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

const TYPE_COLORS: Record<ConsumerType, string> = {
  Vehicle: 'bg-blue-50 text-blue-700',
  Forklift: 'bg-purple-50 text-purple-700',
  'DG Set': 'bg-amber-50 text-amber-700',
  Other: 'bg-gray-100 text-gray-600',
};

function renderCell(col: typeof CONSUMER_COLUMN_META[number], c: FuelConsumer) {
  switch (col.id) {
    case 'consumerId':
      return <span className="font-semibold text-orange-600 font-mono text-sm">{c.consumerId}</span>;
    case 'type':
      return <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[c.type]}`}>{c.type}</span>;
    case 'status':
      return <Badge variant={c.status === 'Active' ? 'success' : 'error'}>{c.status}</Badge>;
    case 'fuelType':
      return <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.fuelType}</span>;
    case 'tankCapacityL':
      return <span className="text-sm">{c.tankCapacityL} L</span>;
    default:
      return <span className="text-sm">{String(c[col.id])}</span>;
  }
}

const EMPTY_FORM: Partial<FuelConsumer> = {
  type: 'Vehicle',
  fuelType: 'HSD',
  status: 'Active',
};

export default function FuelConsumers() {
  const [consumers, setConsumers] = useState<FuelConsumer[]>(FUEL_CONSUMERS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ConsumerType | 'All'>('All');
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CONSUMER_COLUMN_META.map((c) => [c.id, c.defaultVisible]))
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<Partial<FuelConsumer>>(EMPTY_FORM);

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;
  const toggleCol = (id: string) => {
    if (visibleCols[id] && visibleCount <= 2) return;
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const visibleColDefs = CONSUMER_COLUMN_META.filter((c) => visibleCols[c.id]);

  const filtered = consumers.filter((c) => {
    const q = search.toLowerCase();
    const matchType = typeFilter === 'All' || c.type === typeFilter;
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.consumerId.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.registrationNo.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const stats = {
    total: consumers.length,
    active: consumers.filter(c => c.status === 'Active').length,
    vehicles: consumers.filter(c => c.type === 'Vehicle').length,
    forklifts: consumers.filter(c => c.type === 'Forklift').length,
    dgSets: consumers.filter(c => c.type === 'DG Set').length,
  };

  const field = (key: keyof FuelConsumer) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    if (!form.name || !form.registrationNo) return;
    const newConsumer: FuelConsumer = {
      id: `c-${Date.now()}`,
      consumerId: `${form.type?.slice(0, 2).toUpperCase() ?? 'OT'}-${String(consumers.length + 1).padStart(3, '0')}`,
      name: form.name ?? '',
      type: (form.type as ConsumerType) ?? 'Vehicle',
      registrationNo: form.registrationNo ?? '',
      department: form.department ?? '',
      fuelType: (form.fuelType as FuelType) ?? 'HSD',
      tankCapacityL: Number(form.tankCapacityL) || 0,
      status: 'Active',
    };
    setConsumers((prev) => [...prev, newConsumer]);
    setForm(EMPTY_FORM);
    setShowAddModal(false);
  };

  const deleteConsumer = (id: string) => setConsumers((prev) => prev.filter((c) => c.id !== id));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Consumers</h3>
        <p className="text-sm text-gray-500">Registered vehicles, forklifts, DG sets, and equipment that draw fuel.</p>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search consumers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['All', 'Vehicle', 'Forklift', 'DG Set', 'Other'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                typeFilter === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Columns3 size={15} />
              Columns
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[190px]">
              <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Show / Hide Columns</p>
              {CONSUMER_COLUMN_META.map((col) => {
                const checked = visibleCols[col.id];
                const disabled = checked && visibleCount <= 2;
                return (
                  <DropdownMenu.CheckboxItem
                    key={col.id}
                    checked={checked}
                    onCheckedChange={() => toggleCol(col.id)}
                    disabled={disabled}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer outline-none select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-gray-700">{col.label}</span>
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
          <Plus size={15} className="mr-1" />
          Add Consumer
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-800' },
          { label: 'Active', value: stats.active, color: 'text-green-600' },
          { label: 'Vehicles', value: stats.vehicles, color: 'text-blue-600' },
          { label: 'Forklifts', value: stats.forklifts, color: 'text-purple-600' },
          { label: 'DG Sets', value: stats.dgSets, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-[600px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {visibleColDefs.map((col) => (
                <th key={col.id} className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">{col.label}</th>
              ))}
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">Actions</th>
            </tr>
          </thead>
          <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={visibleColDefs.length + 1} className="py-12 text-center text-sm text-gray-400">No consumers match your filter.</td>
              </tr>
            ) : (
              filtered.map((consumer) => (
                <motion.tr key={consumer.id} variants={rowVariants} className="border-b border-gray-100 hover:bg-orange-50/40 transition-colors">
                  {visibleColDefs.map((col) => (
                    <td key={col.id} className="py-3 px-4 whitespace-nowrap">{renderCell(col, consumer)}</td>
                  ))}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-orange-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteConsumer(consumer.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </motion.tbody>
        </table>
      </motion.div>

      {/* Add Consumer Modal */}
      <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">Register Consumer</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-4">
              <Input label="Name" placeholder="e.g. Toyota Forklift #4" value={form.name ?? ''} onChange={field('name')} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select value={form.type ?? 'Vehicle'} onChange={field('type')} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors">
                  <option value="Vehicle">Vehicle</option>
                  <option value="Forklift">Forklift</option>
                  <option value="DG Set">DG Set</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Input label="Registration / Asset ID" placeholder="GJ-05-XX-0000" value={form.registrationNo ?? ''} onChange={field('registrationNo')} />
              <Input label="Department" placeholder="e.g. Warehouse" value={form.department ?? ''} onChange={field('department')} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Fuel Type</label>
                <select value={form.fuelType ?? 'HSD'} onChange={field('fuelType')} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors">
                  <option value="HSD">HSD</option>
                  <option value="Petrol">Petrol</option>
                  <option value="LPG">LPG</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>
              <Input label="Tank Capacity (L)" type="number" placeholder="60" value={String(form.tankCapacityL ?? '')} onChange={field('tankCapacityL')} />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">Cancel</Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave}>Save Consumer</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
