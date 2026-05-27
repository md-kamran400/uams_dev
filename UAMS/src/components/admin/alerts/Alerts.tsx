import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, AlertTriangle, AlertCircle, Info, Search, X,
  ChevronLeft, ChevronRight, Filter, Zap, Clock,
} from 'lucide-react';
import Input from '../../ui/Input';
import { api, type ApiFlaggedTicket, type ApiTicket } from '../../../lib/api';
import TicketDetail from '../tickets/TicketDetail';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const PAGE_SIZE = 10;

const SEV_CONFIG: Record<Severity, {
  label: string; bg: string; text: string; border: string;
  badge: string; icon: typeof AlertCircle; rank: number;
}> = {
  critical: { label: 'Critical', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',    icon: AlertCircle,    rank: 4 },
  high:     { label: 'High',     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: AlertTriangle, rank: 3 },
  medium:   { label: 'Medium',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',  icon: AlertTriangle, rank: 2 },
  low:      { label: 'Low',      bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',    icon: Info,           rank: 1 },
};

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function worstSeverity(t: ApiFlaggedTicket): Severity {
  if (t.criticalCount > 0) return 'critical';
  if (t.highCount > 0) return 'high';
  if (t.triggeredAlerts.some(a => a.severity === 'medium')) return 'medium';
  return 'low';
}

function SeverityPill({ severity }: { severity: Severity }) {
  const cfg = SEV_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export default function Alerts() {
  const [tickets, setTickets] = useState<ApiFlaggedTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [utilityFilter, setUtilityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const data = await api.tickets.flagged();
      setTickets(data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const utilities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tickets) {
      if (t.utilityTypeId && t.utilityTypeName) seen.set(t.utilityTypeId, t.utilityTypeName);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter(t => {
      if (q) {
        const hay = [
          t.title, t.number, t.assetName ?? '', t.utilityTypeName ?? '', t.assignedToName ?? '',
          ...t.triggeredAlerts.map(a => `${a.fieldName} ${a.name}`),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (utilityFilter !== 'all' && t.utilityTypeId !== utilityFilter) return false;
      if (severityFilter !== 'all') {
        if (!t.triggeredAlerts.some(a => a.severity === severityFilter)) return false;
      }
      return true;
    });
  }, [tickets, search, severityFilter, utilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = useMemo(() => ({
    total: tickets.length,
    critical: tickets.filter(t => t.criticalCount > 0).length,
    high: tickets.filter(t => t.highCount > 0 && t.criticalCount === 0).length,
    totalAlerts: tickets.reduce((s, t) => s + t.alertCount, 0),
  }), [tickets]);

  const hasActiveFilters = severityFilter !== 'all' || utilityFilter !== 'all';

  if (openTicketId) {
    return (
      <div className="p-6">
        <TicketDetail
          ticketId={openTicketId}
          onBack={() => { setOpenTicketId(null); load(); }}
          onUpdated={(updated: ApiTicket) => {
            setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, status: updated.status, assignedToName: updated.assignedToName } : t));
          }}
          onDeleted={id => {
            setTickets(prev => prev.filter(t => t.id !== id));
            setOpenTicketId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { duration: 0.4 } }}
        className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Alert Flags</h1>
            <p className="text-sm text-white/70 mt-0.5">Submissions where field readings crossed configured thresholds. Click a row to open the ticket.</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Flagged Tickets',    value: counts.total,        color: 'text-gray-800',   bg: 'bg-gray-50' },
          { label: 'Total Alert Flags',  value: counts.totalAlerts,  color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'With Critical',      value: counts.critical,     color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'With High Severity', value: counts.high,         color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, color, bg }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className={`${bg} rounded-xl border border-gray-200 p-4`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search tickets, fields, asset names…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            icon={<Search size={15} />}
          />
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
            hasActiveFilters
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter size={14} /> Filters {hasActiveFilters && `(${[severityFilter, utilityFilter].filter(f => f !== 'all').length})`}
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => { setSeverityFilter('all'); setUtilityFilter('all'); }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Severity</label>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map(s => (
                <button key={s} onClick={() => { setSeverityFilter(s); setCurrentPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    severityFilter === s
                      ? s === 'all' ? 'bg-blue-600 text-white'
                        : `${SEV_CONFIG[s].badge} ring-1 ring-offset-0 ${SEV_CONFIG[s].border}`
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {s === 'all' ? 'All' : SEV_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          {utilities.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Utility</label>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => { setUtilityFilter('all'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${utilityFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  All
                </button>
                {utilities.map(u => (
                  <button key={u.id} onClick={() => { setUtilityFilter(u.id); setCurrentPage(1); }}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${utilityFilter === u.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Ticket</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Severity</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Asset / Utility</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Triggered</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Engineer</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-16 text-center text-sm text-gray-400">Loading flagged submissions…</td></tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Bell size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    {tickets.length === 0
                      ? 'No flagged submissions yet. Alert flags appear here when engineers submit readings that cross configured thresholds.'
                      : 'No results match your filters.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginated.map(ticket => {
                const sev = worstSeverity(ticket);
                const cfg = SEV_CONFIG[sev];
                const fieldsPreview = ticket.triggeredAlerts.slice(0, 3).map(a => a.fieldName);
                const extra = ticket.triggeredAlerts.length - fieldsPreview.length;
                return (
                  <motion.tr
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setOpenTicketId(ticket.id)}
                    className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors cursor-pointer group border-l-4 ${cfg.border}`}
                  >
                    <td className="py-3 px-4">
                      <p className="text-xs font-mono font-semibold text-blue-600 group-hover:underline">{ticket.number}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 truncate max-w-[260px]">{ticket.title}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityPill severity={sev} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {ticket.alertCount}
                        </span>
                        {ticket.criticalCount > 0 && sev !== 'critical' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                            {ticket.criticalCount} crit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-800">{ticket.assetName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{ticket.utilityTypeName ?? '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 items-center">
                        {fieldsPreview.length === 0 ? <span className="text-xs text-gray-400">—</span> : null}
                        {fieldsPreview.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-700">
                            <Zap size={9} className="text-amber-500" /> {f}
                          </span>
                        ))}
                        {extra > 0 && <span className="text-[11px] text-gray-500">+{extra} more</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {ticket.assignedToName ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} className="text-gray-400" /> {fmtDateTime(ticket.submittedAt)}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} flagged tickets
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - safePage) <= 2).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium ${p === safePage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
