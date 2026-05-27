import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { TrendingUp, TrendingDown, Droplets, ArrowDownToLine, ArrowUpFromLine, Gauge } from 'lucide-react';
import { FUEL_TANKS, FUEL_TRANSACTIONS, FUEL_CONSUMERS } from '../../../../../data/fuelData';

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

function StockGauge({ tank }: { tank: typeof FUEL_TANKS[0] }) {
  const pct = Math.round((tank.currentLevelL / tank.capacityL) * 100);
  const isLow = pct < 25;
  const isMid = pct < 50;
  const color = isLow ? 'bg-red-500' : isMid ? 'bg-amber-400' : 'bg-green-500';
  const textColor = isLow ? 'text-red-600' : isMid ? 'text-amber-600' : 'text-green-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{tank.name}</p>
          <p className="text-xs text-gray-400">{tank.tankId} · {tank.fuelType} · {tank.location}</p>
        </div>
        <span className={`text-lg font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-3 rounded-full ${color}`}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{fmt(tank.currentLevelL)} L available</span>
        <span>Capacity: {fmt(tank.capacityL)} L</span>
      </div>
    </div>
  );
}

export default function FuelOverview() {
  const stats = useMemo(() => {
    const receipts    = FUEL_TRANSACTIONS.filter((t) => t.type === 'Receipt');
    const dispensing  = FUEL_TRANSACTIONS.filter((t) => t.type === 'Dispensing');
    const totalIn     = receipts.reduce((s, t) => s + t.quantityL, 0);
    const totalOut    = dispensing.reduce((s, t) => s + t.quantityL, 0);
    const totalStock  = FUEL_TANKS.reduce((s, t) => s + t.currentLevelL, 0);
    const totalCap    = FUEL_TANKS.reduce((s, t) => s + t.capacityL, 0);
    const totalCost   = receipts.reduce((s, t) => s + t.quantityL * (t.unitCostPerL ?? 0), 0);
    const days        = 24;
    const avgDaily    = Math.round(totalOut / days);

    // top consumer by quantity
    const byConsumer = dispensing.reduce<Record<string, number>>((acc, t) => {
      const key = t.consumerName ?? 'Unknown';
      acc[key] = (acc[key] ?? 0) + t.quantityL;
      return acc;
    }, {});
    const topConsumer = Object.entries(byConsumer).sort((a, b) => b[1] - a[1])[0];

    return { totalIn, totalOut, totalStock, totalCap, totalCost, avgDaily, topConsumer, activeConsumers: FUEL_CONSUMERS.filter(c => c.status === 'Active').length };
  }, []);

  const recentActivity = useMemo(() =>
    [...FUEL_TRANSACTIONS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    []
  );

  const kpis = [
    {
      label: 'Total Stock',
      value: `${fmt(stats.totalStock)} L`,
      sub: `${Math.round((stats.totalStock / stats.totalCap) * 100)}% of capacity`,
      icon: Droplets,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Received (Apr)',
      value: `${fmt(stats.totalIn)} L`,
      sub: `₹${fmt(Math.round(stats.totalCost / 1000))}K total cost`,
      icon: ArrowDownToLine,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Consumed (Apr)',
      value: `${fmt(stats.totalOut)} L`,
      sub: `Net balance: ${stats.totalIn - stats.totalOut >= 0 ? '+' : ''}${fmt(stats.totalIn - stats.totalOut)} L`,
      icon: ArrowUpFromLine,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Daily Avg',
      value: `${fmt(stats.avgDaily)} L/day`,
      sub: `${stats.activeConsumers} active consumers`,
      icon: Gauge,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Overview</h3>
        <p className="text-sm text-gray-500">Live stock levels, consumption KPIs, and recent fuel activity.</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
            <p className="text-xs text-gray-500">{sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Top consumer highlight */}
      {stats.topConsumer && (
        <motion.div variants={itemVariants} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <TrendingUp size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Top consumer this month:</span>{' '}
            {stats.topConsumer[0]} — {fmt(stats.topConsumer[1])} L
          </p>
        </motion.div>
      )}

      {/* Tank gauges */}
      <motion.div variants={itemVariants}>
        <p className="text-sm font-semibold text-gray-700 mb-3">Tank Stock Levels</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FUEL_TANKS.map((tank) => (
            <StockGauge key={tank.id} tank={tank} />
          ))}
        </div>
      </motion.div>

      {/* Recent activity */}
      <motion.div variants={itemVariants}>
        <p className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</p>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {recentActivity.map((tx, i) => {
            const isReceipt = tx.type === 'Receipt';
            return (
              <div
                key={tx.id}
                className={`flex items-center gap-4 px-4 py-3 ${i < recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isReceipt ? 'bg-green-50' : 'bg-orange-50'}`}>
                  {isReceipt
                    ? <ArrowDownToLine size={14} className="text-green-600" />
                    : <TrendingDown size={14} className="text-orange-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {isReceipt ? `Receipt from ${tx.supplier}` : `Dispensed to ${tx.consumerName}`}
                  </p>
                  <p className="text-xs text-gray-400">{tx.tankName} · Shift {tx.shift} · {tx.date}</p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${isReceipt ? 'text-green-600' : 'text-orange-600'}`}>
                  {isReceipt ? '+' : '-'}{fmt(tx.quantityL)} L
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
