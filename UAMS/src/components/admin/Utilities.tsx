import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BellOff,
  Bell,
  Zap,
  Factory,
  Gauge,
  Power,
  BatteryCharging,
  Wind,
  AirVent,
  Fuel,
  Clock,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { UTILITIES, type Utility } from '../../data/utilities';

const ICON_MAP: Record<string, LucideIcon> = {
  ZapIcon: Zap,
  FactoryIcon: Factory,
  GaugeIcon: Gauge,
  PowerIcon: Power,
  BatteryChargingIcon: BatteryCharging,
  WindIcon: Wind,
  AirVentIcon: AirVent,
  FuelIcon: Fuel,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2 } },
};

function UtilityCard({ utility, onNavigate }: { utility: Utility; onNavigate: (page: string) => void }) {
  const Icon = ICON_MAP[utility.icon];
  const hasAlert = utility.status === 'alert';

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -2, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={() => onNavigate(utility.id)}
      className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col cursor-pointer ${
        hasAlert ? 'border-amber-200' : 'border-gray-200'
      }`}
    >
      {/* Card body */}
      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
              <Icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">{utility.name}</h3>
          </div>

          {/* Status badge */}
          {hasAlert ? (
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
          <Clock size={11} className="text-gray-400" />
          <span className="text-xs text-gray-400">Checked {utility.lastChecked}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Utilities({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [search, setSearch] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(false);

  const alertCount = UTILITIES.filter((u) => u.status === 'alert').length;
  const filtered = useMemo(() => {
    return UTILITIES.filter((u) => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.location.toLowerCase().includes(search.toLowerCase());
      const matchesAlert = alertsOnly ? u.status === 'alert' : true;
      return matchesSearch && matchesAlert;
    });
  }, [search, alertsOnly]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl"
      >
        <h1 className="text-3xl font-bold mb-2">Utilities Management</h1>
        <p className="text-blue-100">
          Monitor and manage utility systems across all facilities
        </p>
      </motion.div>

      {/* Search + Filter bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search utilities by name or location..."
            className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors bg-white"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setAlertsOnly(!alertsOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all whitespace-nowrap ${
            alertsOnly
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {alertsOnly ? <Bell size={16} /> : <BellOff size={16} />}
          {alertsOnly ? `Alerts only (${alertCount})` : 'Show alerts only'}
        </motion.button>
      </motion.div>

      {/* Results count */}
      <motion.div variants={itemVariants}>
        <p className="text-xs text-gray-500 -mt-2">
          Showing {filtered.length} of {UTILITIES.length} utilities
          {alertsOnly && ' with active alerts'}
          {search && ` matching "${search}"`}
        </p>
      </motion.div>

      {/* Grid */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((utility) => (
              <UtilityCard key={utility.id} utility={utility} onNavigate={onNavigate} />
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="col-span-full flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Search size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">No utilities found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
