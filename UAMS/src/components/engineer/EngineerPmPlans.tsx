import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Clock, AlertTriangle, CheckCircle2, ChevronRight,
  CalendarDays, ListChecks, History,
} from 'lucide-react';
import Badge from '../ui/Badge';
import { api, type ApiTicket, type TicketStatus } from '../../lib/api';
import { User } from '../../types';
import EngineerTicketFill from './EngineerTicketFill';

interface Props {
  user: User;
}

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  Open: 'default',
  Assigned: 'info',
  'In Progress': 'warning',
  Submitted: 'info',
  Resubmitted: 'info',
  Approved: 'success',
  Rejected: 'error',
  'Needs Revision': 'warning',
  Closed: 'default',
};

const ACTIVE_STATUSES: TicketStatus[] = ['Assigned', 'In Progress', 'Needs Revision'];
const SUBMITTED_STATUSES: TicketStatus[] = ['Submitted', 'Resubmitted', 'Approved', 'Rejected', 'Closed'];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const due = new Date(iso); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

type Bucket = 'overdue' | 'thisWeek' | 'thisMonth' | 'later' | 'history';

function bucketFor(ticket: ApiTicket): Bucket {
  if (SUBMITTED_STATUSES.includes(ticket.status)) return 'history';
  const d = daysUntil(ticket.dueDate);
  if (d === null) return 'later';
  if (d < 0) return 'overdue';
  if (d <= 7) return 'thisWeek';
  if (d <= 31) return 'thisMonth';
  return 'later';
}

const BUCKET_META: Record<Bucket, { label: string; icon: React.ReactNode; tint: string; iconTint: string }> = {
  overdue:   { label: 'Overdue',     icon: <AlertTriangle size={14} />, tint: 'bg-red-50 border-red-200',       iconTint: 'text-red-600' },
  thisWeek:  { label: 'This Week',   icon: <Clock size={14} />,         tint: 'bg-amber-50 border-amber-200',   iconTint: 'text-amber-600' },
  thisMonth: { label: 'This Month',  icon: <CalendarDays size={14} />,  tint: 'bg-blue-50 border-blue-200',     iconTint: 'text-blue-600' },
  later:     { label: 'Upcoming',    icon: <ListChecks size={14} />,    tint: 'bg-gray-50 border-gray-200',     iconTint: 'text-gray-500' },
  history:   { label: 'Submitted',   icon: <History size={14} />,       tint: 'bg-green-50 border-green-200',   iconTint: 'text-green-600' },
};

export default function EngineerPmPlans({ user }: Props) {
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null);

  const load = () => {
    setIsLoading(true);
    api.tickets.list()
      .then(rows => setTickets(rows.filter(t => t.type === 'PM Plan')))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const out: Record<Bucket, ApiTicket[]> = {
      overdue: [], thisWeek: [], thisMonth: [], later: [], history: [],
    };
    for (const t of tickets) {
      out[bucketFor(t)].push(t);
    }
    return out;
  }, [tickets]);

  // Open the fill page for any PM ticket — engineer can submit even non-Data-Entry types
  if (selectedTicket) {
    return (
      <EngineerTicketFill
        user={user}
        ticket={selectedTicket}
        onBack={() => setSelectedTicket(null)}
        onSubmitted={updated => {
          setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
          setSelectedTicket(null);
        }}
      />
    );
  }

  const activeBuckets: Bucket[] = ['overdue', 'thisWeek', 'thisMonth', 'later'];
  const activeCount = activeBuckets.reduce((sum, b) => sum + grouped[b].length, 0);
  const historyCount = grouped.history.length;

  const showActive = activeTab === 'active';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
          <Wrench size={18} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Preventive Maintenance</h2>
          <p className="text-xs text-gray-500">Scheduled PM tasks assigned to you, grouped by when they're due.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { key: 'overdue',   label: 'Overdue',     value: grouped.overdue.length,   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: AlertTriangle },
          { key: 'thisWeek',  label: 'This Week',   value: grouped.thisWeek.length,  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Clock },
          { key: 'thisMonth', label: 'This Month',  value: grouped.thisMonth.length, bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: CalendarDays },
          { key: 'history',   label: 'Submitted',   value: grouped.history.length,   bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircle2 },
        ] as const).map(({ key, label, value, bg, text, border, icon: Icon }) => (
          <div key={key} className={`rounded-2xl border ${border} ${bg} p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className={text} />
            </div>
            <div>
              <p className={`text-xl font-bold ${text}`}>{value}</p>
              <p className={`text-xs font-medium ${text} opacity-80`}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: 'active', label: 'Active', count: activeCount },
          { id: 'history', label: 'History', count: historyCount },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Buckets */}
      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading PM schedule…</div>
      ) : (showActive ? activeCount : historyCount) === 0 ? (
        <div className="text-center py-16">
          <Wrench size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {showActive ? 'No active PM tasks for you right now.' : 'No submitted PM tasks yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(showActive ? activeBuckets : (['history'] as Bucket[])).map(bucket => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            const meta = BUCKET_META[bucket];
            return (
              <div key={bucket} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${meta.iconTint}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map(ticket => {
                    const isActive = ACTIVE_STATUSES.includes(ticket.status);
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-white rounded-2xl border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-amber-200 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
                              <span className="text-xs font-mono text-gray-400">{ticket.number}</span>
                              {ticket.planStatus === 'Paused' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                                  Plan Paused
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-semibold text-gray-800 truncate">{ticket.title}</h3>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {ticket.assetName && <span className="text-xs text-gray-500">{ticket.assetName}</span>}
                              {ticket.dueDate && (
                                <span className={`text-xs flex items-center gap-1 ${
                                  bucket === 'overdue' ? 'text-red-600 font-medium' : 'text-amber-600'
                                }`}>
                                  <Clock size={11} /> Due {fmtDate(ticket.dueDate)}
                                </span>
                              )}
                              {ticket.submittedAt && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Submitted {fmtDate(ticket.submittedAt)}
                                </span>
                              )}
                            </div>
                            {ticket.rejectionReason && (ticket.status === 'Rejected' || ticket.status === 'Needs Revision') && (
                              <p className={`mt-2 text-xs rounded-lg px-2.5 py-1.5 ${ticket.status === 'Needs Revision' ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                                {ticket.status === 'Needs Revision' ? 'Needs revision: ' : 'Rejected: '}{ticket.rejectionReason}
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600">
                              <ChevronRight size={16} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
