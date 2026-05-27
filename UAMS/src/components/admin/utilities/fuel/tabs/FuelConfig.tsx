import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Plus, Trash2, Save } from 'lucide-react';
import Button from '../../../../ui/Button';
import Input from '../../../../ui/Input';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const DEFAULT_FUEL_TYPES = ['HSD', 'Petrol', 'LPG', 'CNG'];
const DEFAULT_CONSUMER_TYPES = ['Vehicle', 'Forklift', 'DG Set', 'Other'];
const DEFAULT_SHIFTS = [
  { label: 'Shift A', start: '06:00', end: '14:00' },
  { label: 'Shift B', start: '14:00', end: '22:00' },
  { label: 'Shift C', start: '22:00', end: '06:00' },
];

export default function FuelConfig() {
  const [fuelTypes, setFuelTypes] = useState(DEFAULT_FUEL_TYPES);
  const [newFuelType, setNewFuelType] = useState('');
  const [consumerTypes, setConsumerTypes] = useState(DEFAULT_CONSUMER_TYPES);
  const [newConsumerType, setNewConsumerType] = useState('');
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [thresholds, setThresholds] = useState({ lowStockPct: 20, criticalStockPct: 10, maxDailyL: 2000 });
  const [costTracking, setCostTracking] = useState(true);
  const [shiftTracking, setShiftTracking] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-8 max-w-2xl"
    >
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Configuration</h3>
        <p className="text-sm text-gray-500">Manage fuel types, consumer categories, shifts, and alert thresholds for this client.</p>
      </motion.div>

      {/* Fuel Types */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Fuel Types</p>
        <div className="flex flex-wrap gap-2">
          {fuelTypes.map((ft) => (
            <span key={ft} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-lg">
              {ft}
              {fuelTypes.length > 1 && (
                <button onClick={() => setFuelTypes(f => f.filter(x => x !== ft))} className="hover:text-red-600 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add fuel type…"
            value={newFuelType}
            onChange={(e) => setNewFuelType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFuelType.trim() && !fuelTypes.includes(newFuelType.trim())) {
                setFuelTypes(f => [...f, newFuelType.trim()]);
                setNewFuelType('');
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (newFuelType.trim() && !fuelTypes.includes(newFuelType.trim())) {
                setFuelTypes(f => [...f, newFuelType.trim()]);
                setNewFuelType('');
              }
            }}
          >
            <Plus size={14} />
          </Button>
        </div>
      </motion.div>

      {/* Consumer Types */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Consumer Categories</p>
        <div className="flex flex-wrap gap-2">
          {consumerTypes.map((ct) => (
            <span key={ct} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg">
              {ct}
              {consumerTypes.length > 1 && (
                <button onClick={() => setConsumerTypes(f => f.filter(x => x !== ct))} className="hover:text-red-600 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add category…"
            value={newConsumerType}
            onChange={(e) => setNewConsumerType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newConsumerType.trim() && !consumerTypes.includes(newConsumerType.trim())) {
                setConsumerTypes(f => [...f, newConsumerType.trim()]);
                setNewConsumerType('');
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (newConsumerType.trim() && !consumerTypes.includes(newConsumerType.trim())) {
                setConsumerTypes(f => [...f, newConsumerType.trim()]);
                setNewConsumerType('');
              }
            }}
          >
            <Plus size={14} />
          </Button>
        </div>
      </motion.div>

      {/* Shift Settings */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Shift Tracking</p>
          <button
            onClick={() => setShiftTracking(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${shiftTracking ? 'bg-orange-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${shiftTracking ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        {shiftTracking && (
          <div className="space-y-2">
            {shifts.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 w-16">{s.label}</span>
                <input type="time" value={s.start} onChange={(e) => setShifts(sh => sh.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400" />
                <span className="text-xs text-gray-400">to</span>
                <input type="time" value={s.end} onChange={(e) => setShifts(sh => sh.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400" />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Alert Thresholds */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Alert Thresholds</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Low Stock (%)</label>
            <input
              type="number"
              min={0} max={100}
              value={thresholds.lowStockPct}
              onChange={(e) => setThresholds(t => ({ ...t, lowStockPct: Number(e.target.value) }))}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Critical Stock (%)</label>
            <input
              type="number"
              min={0} max={100}
              value={thresholds.criticalStockPct}
              onChange={(e) => setThresholds(t => ({ ...t, criticalStockPct: Number(e.target.value) }))}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Max Daily Dispense (L)</label>
            <input
              type="number"
              min={0}
              value={thresholds.maxDailyL}
              onChange={(e) => setThresholds(t => ({ ...t, maxDailyL: Number(e.target.value) }))}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
        </div>
      </motion.div>

      {/* Toggles */}
      <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Feature Toggles</p>
        {[
          { label: 'Cost Tracking', sub: 'Track unit cost per litre and total spend', value: costTracking, toggle: () => setCostTracking(v => !v) },
        ].map(({ label, sub, value, toggle }) => (
          <div key={label} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
            <button
              onClick={toggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-orange-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </motion.div>

      {/* Save */}
      <motion.div variants={itemVariants}>
        <Button variant="primary" onClick={handleSave}>
          <Save size={15} className="mr-1.5" />
          {saved ? 'Saved!' : 'Save Configuration'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
