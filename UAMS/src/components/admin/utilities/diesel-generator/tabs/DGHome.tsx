import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Package, AlertTriangle, CheckCircle2, Wrench, ClipboardList,
  TrendingUp, Zap, Activity, BoxesIcon, RotateCcw,
} from 'lucide-react';
import Badge from '../../../../ui/Badge';
import {
  api,
  type ApiAsset, type ApiBreakdown, type ApiPmPlan, type ApiSubmission,
  type ApiSpare, type ApiTicket,
} from '../../../../../lib/api';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRelative(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function deriveStockStatus(qty: number, min: number) {
  if (qty === 0) return 'Out of Stock';
  if (qty <= min * 0.5) return 'Critical';
  if (qty < min) return 'Low';
  return 'Adequate';
}

interface Props {
  utilityTypeId: string;
}

export default function DGHome({ utilityTypeId }: Props) {
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [breakdowns, setBreakdowns] = useState<ApiBreakdown[]>([]);
  const [pmPlans, setPmPlans] = useState<ApiPmPlan[]>([]);
  const [submissions, setSubmissions] = useState<ApiSubmission[]>([]);
  const [spares, setSpares] = useState<ApiSpare[]>([]);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.assets.list(),
      api.breakdowns.list(),
      api.pmPlans.list(),
      api.submissions.list({ utilityTypeId }),
      api.spares.list({ utilityTypeId }),
      api.tickets.list({ utilityTypeId }),
    ]).then(([a, b, p, s, sp, t]) => {
      const utAssets = a.filter(x => x.utilityTypeId === utilityTypeId);
      setAssets(utAssets);
      const assetIds = new Set(utAssets.map(x => x.id));
      setBreakdowns(b.filter(x => assetIds.has(x.assetId)));
      setPmPlans(p.filter(x => x.utilityTypeId === utilityTypeId));
      setSubmissions(s.slice(0, 10));
      setSpares(sp);
      setTickets(t.slice(0, 10));
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [utilityTypeId]);

  const operational = assets.filter(a => a.status === 'Active').length;
  const maintenance = assets.filter(a => a.status === 'Under Maintenance').length;
  const offline = assets.filter(a => a.status === 'Inactive').length;
  const openBreakdowns = breakdowns.filter(b => !['Resolved', 'Closed'].includes(b.status));
  const overduePm = pmPlans.filter(p => p.status === 'Overdue');
  const dueSoonPm = pmPlans.filter(p => p.status === 'Scheduled');
  const lowStock = spares.filter(s => ['Low', 'Critical', 'Out of Stock'].includes(deriveStockStatus(s.currentQty, s.minStock)));
  const pendingTickets = tickets.filter(t => ['Submitted', 'Resubmitted'].includes(t.status));
  const recentSubmissions = submissions.slice(0, 5);
  const recentBreakdowns = openBreakdowns.slice(0, 4);
  const recentPm = [...overduePm, ...dueSoonPm].slice(0, 4);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">

      {/* ── KPI strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Assets',    value: assets.length,          icon: Package,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Operational',     value: operational,            icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Under Maint.',    value: maintenance,            icon: Wrench,       color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Offline',         value: offline,                icon: Zap,          color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'Open Breakdowns', value: openBreakdowns.length,  icon: AlertTriangle,color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'Pending Review',  value: pendingTickets.length,  icon: ClipboardList,color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} custom={i} variants={cardVariants}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <Icon size={18} className={kpi.color} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Alert strip — only shown when there are active issues ── */}
      {(overduePm.length > 0 || openBreakdowns.length > 0 || lowStock.length > 0 || pendingTickets.length > 0) && (
        <motion.div custom={6} variants={cardVariants}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap gap-3">
          <p className="text-xs font-semibold text-amber-700 w-full mb-1 flex items-center gap-1.5">
            <Activity size={13} /> Action Required
          </p>
          {overduePm.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
              {overduePm.length} overdue PM{overduePm.length > 1 ? 's' : ''}
            </span>
          )}
          {openBreakdowns.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
              {openBreakdowns.length} open breakdown{openBreakdowns.length > 1 ? 's' : ''}
            </span>
          )}
          {lowStock.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
              {lowStock.length} low/critical stock item{lowStock.length > 1 ? 's' : ''}
            </span>
          )}
          {pendingTickets.length > 0 && (
            <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
              {pendingTickets.length} ticket{pendingTickets.length > 1 ? 's' : ''} awaiting review
            </span>
          )}
        </motion.div>
      )}

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Asset status list */}
        <motion.div custom={7} variants={cardVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Assets</h3>
            <span className="text-xs text-gray-400">{assets.length} total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {assets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No assets registered.</p>
            ) : assets.slice(0, 6).map(asset => {
              const color = asset.status === 'Active' ? 'bg-green-500' : asset.status === 'Under Maintenance' ? 'bg-amber-500' : 'bg-red-500';
              const label = asset.status === 'Active' ? 'Operational' : asset.status;
              return (
                <div key={asset.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{asset.name}</p>
                    <p className="text-xs text-gray-400">{asset.serial ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-medium ${asset.status === 'Active' ? 'text-green-600' : asset.status === 'Under Maintenance' ? 'text-amber-600' : 'text-red-600'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent logbook submissions */}
        <motion.div custom={8} variants={cardVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Recent Logbook Entries</h3>
            <TrendingUp size={14} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No entries yet.</p>
            ) : recentSubmissions.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{sub.assetName ?? '—'}</p>
                  <p className="text-xs text-gray-400">{fmtDate(sub.date)} · Shift {sub.shift} · {sub.operatorName ?? '—'}</p>
                </div>
                <Badge variant={sub.status === 'Approved' ? 'success' : sub.status === 'Rejected' ? 'error' : 'info'}>
                  {sub.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pending tickets */}
        <motion.div custom={9} variants={cardVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Tickets Awaiting Review</h3>
            <ClipboardList size={14} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={24} className="text-green-300" />
                <p className="text-sm text-gray-400">All caught up!</p>
              </div>
            ) : pendingTickets.slice(0, 5).map(ticket => (
              <div key={ticket.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{ticket.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ticket.assetName ?? '—'} · {fmtRelative(ticket.submittedAt)}</p>
                </div>
                {ticket.status === 'Resubmitted' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    <RotateCcw size={10} /> Revised
                  </span>
                ) : (
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex-shrink-0">New</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Second row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Open breakdowns */}
        <motion.div custom={10} variants={cardVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Open Breakdowns</h3>
            <div className="flex items-center gap-1.5">
              {openBreakdowns.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center">
                  {openBreakdowns.length}
                </span>
              )}
              <AlertTriangle size={14} className={openBreakdowns.length > 0 ? 'text-red-400' : 'text-gray-300'} />
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentBreakdowns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={24} className="text-green-300" />
                <p className="text-sm text-gray-400">No open breakdowns.</p>
              </div>
            ) : recentBreakdowns.map(bd => (
              <div key={bd.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  bd.priority === 'Critical' ? 'bg-red-500' : bd.priority === 'High' ? 'bg-orange-500' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{bd.nature}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{bd.assetName ?? '—'} · {fmtRelative(bd.createdAt)}</p>
                </div>
                <Badge variant={bd.status === 'In Progress' ? 'warning' : 'default'}>{bd.status}</Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* PM Plan status */}
        <motion.div custom={11} variants={cardVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Maintenance Schedule</h3>
            <Wrench size={14} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {recentPm.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={24} className="text-green-300" />
                <p className="text-sm text-gray-400">No maintenance tasks due.</p>
              </div>
            ) : recentPm.map(pm => (
              <div key={pm.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pm.status === 'Overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{pm.task}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pm.assetName ?? '—'} · Due {fmtDate(pm.nextDue)}</p>
                </div>
                <Badge variant={pm.status === 'Overdue' ? 'error' : 'warning'}>{pm.status}</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Inventory alerts ─────────────────────────────────── */}
      {lowStock.length > 0 && (
        <motion.div custom={12} variants={cardVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Inventory Alerts</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">
                {lowStock.length}
              </span>
              <BoxesIcon size={14} className="text-amber-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {lowStock.slice(0, 6).map(spare => {
              const st = deriveStockStatus(spare.currentQty, spare.minStock);
              const isOut = st === 'Out of Stock';
              const isCrit = st === 'Critical';
              return (
                <div key={spare.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOut || isCrit ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{spare.name}</p>
                    <p className="text-xs text-gray-400">{spare.currentQty} / {spare.minStock} {spare.unit} min</p>
                  </div>
                  <Badge variant={isOut || isCrit ? 'error' : 'warning'}>{st}</Badge>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

    </motion.div>
  );
}
