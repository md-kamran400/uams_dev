import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Download, Ticket, ChevronLeft, ChevronRight,
  ClipboardList, Wrench, AlertTriangle, Filter, X,
} from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import { api, type ApiTicket, type TicketStatus, type TicketPriority } from '../../../lib/api';
import CreateTicketModal from './CreateTicketModal';
import TicketDetail from './TicketDetail';

const PAGE_SIZE = 10;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  'Task': <ClipboardList size={14} className="text-blue-500" />,
  'Data Entry': <ClipboardList size={14} className="text-blue-500" />,
  'PM Plan': <Wrench size={14} className="text-amber-500" />,
  'Breakdown': <AlertTriangle size={14} className="text-red-500" />,
};

const TYPE_BADGE: Record<string, string> = {
  'Task': 'bg-blue-50 text-blue-700 border border-blue-100',
  'Data Entry': 'bg-blue-50 text-blue-700 border border-blue-100',
  'PM Plan': 'bg-amber-50 text-amber-700 border border-amber-100',
  'Breakdown': 'bg-red-50 text-red-700 border border-red-100',
};

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  Open: 'default',
  Assigned: 'info',
  'In Progress': 'warning',
  Submitted: 'info',
  Resubmitted: 'warning',
  Approved: 'success',
  Rejected: 'error',
  'Needs Revision': 'warning',
  Closed: 'default',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  Low: 'text-gray-500',
  Medium: 'text-blue-600',
  High: 'text-amber-600',
  Critical: 'text-red-600',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ALL_TYPES = ['Task', 'Data Entry', 'Breakdown'] as const;
type AnyTicketType = typeof ALL_TYPES[number];
const ALL_STATUSES: TicketStatus[] = ['Open', 'Assigned', 'In Progress', 'Submitted', 'Resubmitted', 'Approved', 'Rejected', 'Needs Revision', 'Closed'];
const ALL_PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export default function Tickets({ utilityTypeId, assetId }: { utilityTypeId?: string; assetId?: string } = {}) {
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null);
  const [filterType, setFilterType] = useState<AnyTicketType | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'All'>('All');
  const [filterPriority, setFilterPriority] = useState<TicketPriority | 'All'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const load = () => {
    setIsLoading(true);
    api.tickets.list({ utilityTypeId, assetId })
      .then(setTickets)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (selectedTicket) {
    return (
      <TicketDetail
        ticketId={selectedTicket.id}
        onBack={() => setSelectedTicket(null)}
        onUpdated={updated => {
          setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        }}
        onDeleted={id => {
          setTickets(prev => prev.filter(t => t.id !== id));
          setSelectedTicket(null);
        }}
      />
    );
  }

  const nonPmTickets = tickets.filter(t => t.type !== 'PM Plan');

  const filtered = nonPmTickets.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.number.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      (t.assetName ?? '').toLowerCase().includes(q) ||
      (t.utilityTypeName ?? '').toLowerCase().includes(q) ||
      (t.assignedToName ?? '').toLowerCase().includes(q);
    const matchType = filterType === 'All' || t.type === filterType;
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchPriority = filterPriority === 'All' || t.priority === filterPriority;
    return matchSearch && matchType && matchStatus && matchPriority;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = {
    total: nonPmTickets.length,
    open: nonPmTickets.filter(t => t.status === 'Open' || t.status === 'Assigned').length,
    inProgress: nonPmTickets.filter(t => t.status === 'In Progress' || t.status === 'Submitted').length,
    closed: nonPmTickets.filter(t => t.status === 'Approved' || t.status === 'Closed' || t.status === 'Rejected').length,
  };

  const hasActiveFilters = filterType !== 'All' || filterStatus !== 'All' || filterPriority !== 'All';

  const exportData = (format: 'csv' | 'excel') => {
    const headers = ['Number', 'Type', 'Title', 'Status', 'Priority', 'Asset', 'Utility', 'Assigned To', 'Due Date', 'Created'];
    const rows = filtered.map(t => [
      t.number, t.type, t.title, t.status, t.priority,
      t.assetName ?? '', t.utilityTypeName ?? '', t.assignedToName ?? '',
      fmtDate(t.dueDate), fmtDate(t.createdAt),
    ]);
    if (format === 'csv') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'tickets.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const table = `<table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
      const blob = new Blob([`<html><head><meta charset="utf-8"/></head><body>${table}</body></html>`], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'tickets.xls'; a.click();
      URL.revokeObjectURL(url);
    }
    setShowExportMenu(false);
  };

  const isEmbedded = !!(utilityTypeId || assetId);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`space-y-6 ${isEmbedded ? '' : 'p-6'}`}
    >
      {/* Header */}
      {!isEmbedded && (
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Ticket size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Ticket Management</h1>
                <p className="text-sm text-white/70 mt-0.5">Create and track work orders across all utilities and assets.</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 flex-shrink-0"
            >
              <Plus size={15} className="mr-1" /> Raise Ticket
            </Button>
          </div>
        </motion.div>
      )}
      
      {isEmbedded && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">Tickets & Work Orders</h3>
            <p className="text-xs text-gray-500">Manage and track tickets related to this {assetId ? 'asset' : 'utility'}.</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={15} className="mr-1" /> Raise Ticket
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Tickets', value: stats.total, color: 'text-gray-800', bg: 'bg-gray-50' },
          { label: 'Open / Assigned', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Closed', value: stats.closed, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${bg} rounded-xl border border-gray-200 p-4`}
          >
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search by number, title, asset, engineer…"
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
          <Filter size={14} /> Filters {hasActiveFilters && `(${[filterType, filterStatus, filterPriority].filter(f => f !== 'All').length})`}
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => { setFilterType('All'); setFilterStatus('All'); setFilterPriority('All'); }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <X size={13} /> Clear
          </button>
        )}

        <div className="relative ml-auto">
          <button
            onClick={() => setShowExportMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[160px]">
              <button onClick={() => exportData('csv')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Export as CSV</button>
              <button onClick={() => exportData('excel')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Export as Excel</button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-3 gap-4"
        >
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {(['All', ...ALL_TYPES] as const).map(t => (
                <button key={t} onClick={() => { setFilterType(t); setCurrentPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${filterType === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {(['All', ...ALL_STATUSES] as const).map(s => (
                <button key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {(['All', ...ALL_PRIORITIES] as const).map(p => (
                <button key={p} onClick={() => { setFilterPriority(p); setCurrentPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${filterPriority === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-[800px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Ticket</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Asset / Utility</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Priority</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Assigned To</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Due Date</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">Loading tickets…</td></tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Ticket size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No tickets found. Click "Raise Ticket" to create one.</p>
                </td>
              </tr>
            ) : (
              paginated.map(ticket => (
                <motion.tr
                  key={ticket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <p className="text-xs font-mono font-semibold text-blue-600 group-hover:underline">{ticket.number}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5 truncate max-w-[200px]">{ticket.title}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_BADGE[ticket.type]}`}>
                      {TYPE_ICON[ticket.type]} {ticket.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-gray-800">{ticket.assetName ?? ticket.assetSerial ?? '—'}</p>
                    <p className="text-xs text-gray-400">{ticket.utilityTypeName ?? '—'}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold ${PRIORITY_COLOR[ticket.priority]}`}>
                      ● {ticket.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{ticket.assignedToName ?? <span className="text-gray-300">Unassigned</span>}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{fmtDate(ticket.dueDate)}</td>
                  <td className="py-3 px-4 text-xs text-gray-400">{fmtDate(ticket.createdAt)}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} tickets
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

      {/* Create Modal */}
      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </motion.div>
  );
}
