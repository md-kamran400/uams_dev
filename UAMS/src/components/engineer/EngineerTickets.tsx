import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Ticket, ClipboardList, Wrench, AlertTriangle, Clock, CheckCircle2,
  ChevronRight, ArrowLeft, XCircle, Bell, ChevronDown, ChevronUp,
  Zap, AlertCircle, Info,
} from 'lucide-react';
import Badge from '../ui/Badge';
import MediaCell from '../shared/MediaCell';
import { api, type ApiTicket, type ApiTicketFull, type ApiTriggeredAlert, type TicketStatus } from '../../lib/api';
import { User } from '../../types';
import EngineerTicketFill from './EngineerTicketFill';

interface Props {
  user: User;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  'Task': <ClipboardList size={15} className="text-blue-500" />,
  'Data Entry': <ClipboardList size={15} className="text-blue-500" />,
  'PM Plan': <Wrench size={15} className="text-amber-500" />,
  'Breakdown': <AlertTriangle size={15} className="text-red-500" />,
};

const TYPE_BG: Record<string, string> = {
  'Task': 'bg-blue-50 border-blue-100',
  'Data Entry': 'bg-blue-50 border-blue-100',
  'PM Plan': 'bg-amber-50 border-amber-100',
  'Breakdown': 'bg-red-50 border-red-100',
};

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

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ACTIVE_STATUSES: TicketStatus[] = ['Assigned', 'In Progress', 'Needs Revision'];
const SUBMITTED_STATUSES: TicketStatus[] = ['Submitted', 'Resubmitted', 'Approved', 'Rejected', 'Closed'];

const SEV_CFG: Record<string, { label: string; icon: React.ReactNode; border: string; bg: string; text: string; badge: string }> = {
  critical: { label: 'Critical', icon: <Zap size={13} />,          border: 'border-red-300',    bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700' },
  high:     { label: 'High',     icon: <AlertCircle size={13} />,   border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  medium:   { label: 'Medium',   icon: <AlertTriangle size={13} />, border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  low:      { label: 'Low',      icon: <Info size={13} />,          border: 'border-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-600' },
};

function worstSeverity(alerts: ApiTriggeredAlert[]) {
  const order = ['critical', 'high', 'medium', 'low'];
  for (const sev of order) if (alerts.some(a => a.severity === sev)) return sev;
  return 'low';
}

function TriggeredAlertSection({ alerts }: { alerts: ApiTriggeredAlert[] }) {
  const [open, setOpen] = useState(false);
  if (alerts.length === 0) return null;
  const worst = worstSeverity(alerts);
  const cfg = SEV_CFG[worst];
  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.border}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 ${cfg.bg} transition-colors`}
      >
        <div className={`flex items-center gap-2 text-sm font-semibold ${cfg.text}`}>
          <Bell size={15} />
          {alerts.length} Alert{alerts.length > 1 ? 's' : ''} Triggered
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
        </div>
        {open ? <ChevronUp size={15} className={cfg.text} /> : <ChevronDown size={15} className={cfg.text} />}
      </button>
      {open && (
        <div className="divide-y divide-gray-100 bg-white">
          {alerts.map((a, i) => {
            const c = SEV_CFG[a.severity] ?? SEV_CFG.low;
            return (
              <div key={i} className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
                    {c.icon} {c.label}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{a.name}</span>
                </div>
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{a.fieldName}</span>
                  {' '}was <span className="font-semibold text-gray-800">{a.submittedValue}</span>
                  {' '}(threshold: {a.condition} {a.threshold})
                </p>
                {a.action && (
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 mt-1">
                    Recommended action: {a.action}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryDetail({ ticket, onBack }: { ticket: ApiTicket; onBack: () => void }) {
  const [full, setFull] = useState<ApiTicketFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tickets.get(ticket.id)
      .then(setFull)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticket.id]);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={15} /> Back to Tickets
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_BG[ticket.type]}`}>
            {TYPE_ICON[ticket.type]} {ticket.type}
          </span>
          <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
          <span className="text-xs font-mono text-gray-400">{ticket.number}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{ticket.title}</h2>
        {ticket.description && <p className="text-sm text-gray-600">{ticket.description}</p>}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {ticket.assetName && (
            <div>
              <p className="text-xs text-gray-400">Asset</p>
              <p className="text-sm font-medium text-gray-800">{ticket.assetName}</p>
            </div>
          )}
          {ticket.utilityTypeName && (
            <div>
              <p className="text-xs text-gray-400">Utility</p>
              <p className="text-sm font-medium text-gray-800">{ticket.utilityTypeName}</p>
            </div>
          )}
          {ticket.submittedAt && (
            <div>
              <p className="text-xs text-gray-400">Submitted</p>
              <p className="text-sm font-medium text-gray-800">{fmtDateTime(ticket.submittedAt)}</p>
            </div>
          )}
          {ticket.dueDate && (
            <div>
              <p className="text-xs text-gray-400">Due Date</p>
              <p className="text-sm font-medium text-gray-800">{fmtDate(ticket.dueDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection / revision reason */}
      {(ticket.status === 'Rejected' || ticket.status === 'Needs Revision') && ticket.rejectionReason && (
        <div className={`border rounded-xl p-4 flex gap-3 ${ticket.status === 'Needs Revision' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <XCircle size={18} className={`flex-shrink-0 mt-0.5 ${ticket.status === 'Needs Revision' ? 'text-amber-500' : 'text-red-500'}`} />
          <div>
            <p className={`text-sm font-semibold ${ticket.status === 'Needs Revision' ? 'text-amber-700' : 'text-red-700'}`}>
              {ticket.status === 'Needs Revision' ? 'Needs Revision' : 'Rejected'}
            </p>
            <p className={`text-sm mt-0.5 ${ticket.status === 'Needs Revision' ? 'text-amber-600' : 'text-red-600'}`}>{ticket.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Triggered alerts */}
      {full && full.triggeredAlerts && full.triggeredAlerts.length > 0 && (
        <TriggeredAlertSection alerts={full.triggeredAlerts} />
      )}

      {/* Submitted data */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-400">Loading submission…</div>
      ) : full && full.filledValues && Object.keys(full.filledValues).length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">Submitted Data</p>
          {full.formData ? (
            full.formData.sections.map(section => {
              const visibleFields = section.fields.filter(f => !f.isHidden && (full.filledValues[f.id] !== undefined || full.filledValues[f.fieldId ?? ''] !== undefined));
              const extras = (section.extraFields ?? []).filter(ef => full.filledValues[ef.id] !== undefined);
              if (visibleFields.length === 0 && extras.length === 0) return null;
              return (
                <div key={section.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{section.name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {visibleFields.map(f => {
                      const val = full.filledValues[f.id] ?? full.filledValues[f.fieldId ?? ''];
                      const isMedia = f.fieldType === 'photo' || f.fieldType === 'video';
                      return (
                        <div key={f.id} className={`bg-gray-50 rounded-xl px-3 py-2.5 ${isMedia ? 'col-span-2' : ''}`}>
                          <p className="text-xs text-gray-400">{f.fieldName}{f.fieldUnit ? ` (${f.fieldUnit})` : ''}</p>
                          {isMedia && Array.isArray(val) && val.length > 0 ? (
                            <div className="mt-1">
                              <MediaCell kind={f.fieldType as 'photo' | 'video'} fileIds={val as string[]} />
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-gray-800 mt-0.5">{String(val ?? '—')}</p>
                          )}
                        </div>
                      );
                    })}
                    {extras.map(ef => (
                      <div key={ef.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-gray-400">{ef.name}{ef.unit ? ` (${ef.unit})` : ''}</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{String(full.filledValues[ef.id] ?? '—')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(full.filledValues).map(([k, v]) => (
                  <div key={k} className={`bg-gray-50 rounded-xl px-3 py-2.5 ${Array.isArray(v) ? 'col-span-2' : ''}`}>
                    <p className="text-xs text-gray-400">{k}</p>
                    {Array.isArray(v) && v.length > 0 ? (
                      <div className="mt-1">
                        <MediaCell kind="photo" fileIds={v as string[]} />
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{String(v ?? '—')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-sm text-gray-400">
          No form data was submitted for this ticket.
        </div>
      )}
    </div>
  );
}

export default function EngineerTickets({ user }: Props) {
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null);
  const [viewingHistory, setViewingHistory] = useState<ApiTicket | null>(null);

  const load = () => {
    setIsLoading(true);
    api.tickets.list()
      .then(setTickets)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Active ticket fill view
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

  // History detail view
  if (viewingHistory) {
    return (
      <HistoryDetail
        ticket={viewingHistory}
        onBack={() => setViewingHistory(null)}
      />
    );
  }

  // Engineer Tickets page excludes PM Plan tickets — those live under "PM Plans" nav item
  const nonPmTickets = tickets.filter(t => t.type !== 'PM Plan');
  const active = nonPmTickets.filter(t => ACTIVE_STATUSES.includes(t.status));
  const history = nonPmTickets.filter(t => SUBMITTED_STATUSES.includes(t.status));
  const shown = activeTab === 'active' ? active : history;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: 'active', label: 'Active', count: active.length },
          { id: 'history', label: 'History', count: history.length },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
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

      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">Loading tickets…</div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16">
          <Ticket size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {activeTab === 'active' ? 'No active tickets assigned to you.' : 'No submitted tickets yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(ticket => {
            const isActive = ACTIVE_STATUSES.includes(ticket.status);
            const isHistory = SUBMITTED_STATUSES.includes(ticket.status);
            const clickable = isActive || isHistory;
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  if (isActive) setSelectedTicket(ticket);
                  else if (isHistory) setViewingHistory(ticket);
                }}
                className={`bg-white rounded-2xl border p-5 transition-all ${
                  clickable
                    ? 'cursor-pointer hover:shadow-md hover:border-blue-200'
                    : 'cursor-default'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_BG[ticket.type]}`}>
                        {TYPE_ICON[ticket.type]} {ticket.type}
                      </span>
                      <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
                      <span className="text-xs font-mono text-gray-400">{ticket.number}</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 truncate">{ticket.title}</h3>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {ticket.assetName && (
                        <span className="text-xs text-gray-500">{ticket.assetName}</span>
                      )}
                      {ticket.utilityTypeName && (
                        <span className="text-xs text-gray-400">{ticket.utilityTypeName}</span>
                      )}
                      {ticket.dueDate && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
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
                    {ticket.alertCount != null && ticket.alertCount > 0 && (() => {
                      const sev = (ticket.criticalCount ?? 0) > 0 ? 'critical' : (ticket.highCount ?? 0) > 0 ? 'high' : 'medium';
                      const c = SEV_CFG[sev];
                      return (
                        <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${c.badge}`}>
                          <Bell size={11} />
                          {ticket.alertCount} alert{ticket.alertCount > 1 ? 's' : ''} triggered
                          {(ticket.criticalCount ?? 0) > 0 && <span className="font-semibold">· {ticket.criticalCount} critical</span>}
                        </div>
                      );
                    })()}
                  </div>
                  {clickable && (
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
                      <ChevronRight size={16} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
