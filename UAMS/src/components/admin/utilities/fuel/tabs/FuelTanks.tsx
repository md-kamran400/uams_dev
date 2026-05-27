import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Columns3, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import Button from '../../../../ui/Button';
import Badge from '../../../../ui/Badge';
import Input from '../../../../ui/Input';
import {
  FUEL_TANKS, TANK_COLUMN_META,
  type FuelTank, type FuelType, type TankStatus,
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

function LevelBar({ current, capacity }: { current: number; capacity: number }) {
  const pct = Math.min(100, Math.round((current / capacity) * 100));
  const color = pct < 25 ? 'bg-red-500' : pct < 50 ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

function renderCell(col: typeof TANK_COLUMN_META[number], tank: FuelTank) {
  switch (col.id) {
    case 'tankId':
      return <span className="font-semibold text-orange-600 font-mono text-sm">{tank.tankId}</span>;
    case 'status':
      return (
        <Badge variant={tank.status === 'Active' ? 'success' : tank.status === 'Maintenance' ? 'warning' : 'error'}>
          {tank.status}
        </Badge>
      );
    case 'fuelType':
      return <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{tank.fuelType}</span>;
    case 'capacityL':
      return <span className="text-sm">{tank.capacityL.toLocaleString('en-IN')} L</span>;
    case 'currentLevelL':
      return <LevelBar current={tank.currentLevelL} capacity={tank.capacityL} />;
    default:
      return <span className="text-sm">{String(tank[col.id])}</span>;
  }
}

const EMPTY_FORM: Partial<FuelTank> = {
  fuelType: 'HSD',
  status: 'Active',
};

export default function FuelTanks() {
  const [tanks, setTanks] = useState<FuelTank[]>(FUEL_TANKS);
  const [search, setSearch] = useState('');
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
    () => Object.fromEntries(TANK_COLUMN_META.map((c) => [c.id, c.defaultVisible]))
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<Partial<FuelTank>>(EMPTY_FORM);

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;
  const toggleCol = (id: string) => {
    if (visibleCols[id] && visibleCount <= 2) return;
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const visibleColDefs = TANK_COLUMN_META.filter((c) => visibleCols[c.id]);

  const filtered = tanks.filter((t) => {
    const q = search.toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || t.tankId.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
  });

  const totalCapacity = tanks.reduce((s, t) => s + t.capacityL, 0);
  const totalCurrent  = tanks.reduce((s, t) => s + t.currentLevelL, 0);

  const field = (key: keyof FuelTank) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    if (!form.name || !form.capacityL) return;
    const newTank: FuelTank = {
      id: `tank-${Date.now()}`,
      tankId: `TK-${String(tanks.length + 1).padStart(3, '0')}`,
      name: form.name ?? '',
      fuelType: (form.fuelType as FuelType) ?? 'HSD',
      capacityL: Number(form.capacityL),
      currentLevelL: Number(form.currentLevelL) || 0,
      location: form.location ?? '',
      status: (form.status as TankStatus) ?? 'Active',
      lastInspected: form.lastInspected ?? new Date().toISOString().slice(0, 10),
    };
    setTanks((prev) => [...prev, newTank]);
    setForm(EMPTY_FORM);
    setShowAddModal(false);
  };

  const deleteTank = (id: string) => setTanks((prev) => prev.filter((t) => t.id !== id));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Tanks</h3>
        <p className="text-sm text-gray-500">Fuel storage tank register — capacities, current levels, and status.</p>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search tanks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
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
              {TANK_COLUMN_META.map((col) => {
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
          Add Tank
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Tanks', value: tanks.length, color: 'text-gray-800' },
          { label: 'Total Capacity', value: `${totalCapacity.toLocaleString('en-IN')} L`, color: 'text-blue-600' },
          { label: 'Current Stock', value: `${totalCurrent.toLocaleString('en-IN')} L`, color: 'text-orange-600' },
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
                <td colSpan={visibleColDefs.length + 1} className="py-12 text-center text-sm text-gray-400">No tanks found.</td>
              </tr>
            ) : (
              filtered.map((tank) => (
                <motion.tr key={tank.id} variants={rowVariants} className="border-b border-gray-100 hover:bg-orange-50/40 transition-colors">
                  {visibleColDefs.map((col) => (
                    <td key={col.id} className="py-3 px-4 whitespace-nowrap">{renderCell(col, tank)}</td>
                  ))}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-orange-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteTank(tank.id)}
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

      {/* Add Tank Modal */}
      <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">Add Tank</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-4">
              <Input label="Tank Name" placeholder="e.g. Main HSD Tank" value={form.name ?? ''} onChange={field('name')} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Fuel Type</label>
                <select value={form.fuelType ?? 'HSD'} onChange={field('fuelType')} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors">
                  <option value="HSD">HSD</option>
                  <option value="Petrol">Petrol</option>
                  <option value="LPG">LPG</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>
              <Input label="Capacity (L)" type="number" placeholder="50000" value={String(form.capacityL ?? '')} onChange={field('capacityL')} />
              <Input label="Current Level (L)" type="number" placeholder="0" value={String(form.currentLevelL ?? '')} onChange={field('currentLevelL')} />
              <div className="col-span-2">
                <Input label="Location" placeholder="e.g. Fuel Storage, Block D" value={form.location ?? ''} onChange={field('location')} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select value={form.status ?? 'Active'} onChange={field('status')} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors">
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <Input label="Last Inspected" type="date" value={form.lastInspected ?? ''} onChange={field('lastInspected')} />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">Cancel</Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave}>Save Tank</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
