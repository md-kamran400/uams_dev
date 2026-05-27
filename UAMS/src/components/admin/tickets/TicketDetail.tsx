import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Trash2, CheckCircle2, XCircle, Clock,
  ClipboardList, Wrench, AlertTriangle, Calendar, Edit2, Save, X,
  FileText, Activity, Info, ChevronRight, RotateCcw,
} from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import MediaCell from '../../shared/MediaCell';
import { api, type ApiTicketFull, type ApiTicket, type TicketStatus, type TicketPriority, type ApiUser, type ApiTicketSubmission, type ApiTicketFormData } from '../../../lib/api';

interface Props {
  ticketId: string;
  onBack: () => void;
  onUpdated: (ticket: ApiTicket) => void;
  onDeleted: (id: string) => void;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  'Task': <ClipboardList size={15} />,
  'Data Entry': <ClipboardList size={15} />,
  'PM Plan': <Wrench size={15} />,
  'Breakdown': <AlertTriangle size={15} />,
};

const TYPE_COLOR: Record<string, string> = {
  'Task': 'bg-blue-50 text-blue-600 border-blue-200',
  'Data Entry': 'bg-blue-50 text-blue-600 border-blue-200',
  'PM Plan': 'bg-amber-50 text-amber-600 border-amber-200',
  'Breakdown': 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  Open: 'default', Assigned: 'info', 'In Progress': 'warning',
  Submitted: 'info', Resubmitted: 'warning', Approved: 'success', Rejected: 'error', 'Needs Revision': 'warning', Closed: 'default',
};

const PRIORITY_DOT: Record<TicketPriority, string> = {
  Low: 'bg-gray-400', Medium: 'bg-blue-500', High: 'bg-amber-500', Critical: 'bg-red-500',
};
const PRIORITY_TEXT: Record<TicketPriority, string> = {
  Low: 'text-gray-600', Medium: 'text-blue-600', High: 'text-amber-600', Critical: 'text-red-600',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Tab = 'overview' | 'submission' | 'timeline';

export default function TicketDetail({ ticketId, onBack, onUpdated, onDeleted }: Props) {
  const [ticket, setTicket] = useState<ApiTicketFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [engineers, setEngineers] = useState<ApiUser[]>([]);
  const [activeSubmission, setActiveSubmission] = useState<number | null>(null); // index into ticket.submissions
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revisionReason, setRevisionReason] = useState('');

  const [editingAssignee, setEditingAssignee] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [editingPriority, setEditingPriority] = useState(false);
  const [newPriority, setNewPriority] = useState<TicketPriority>('Medium');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');

  const loadTicket = async (id: string) => {
    const t = await api.tickets.get(id);
    setTicket(t);
    setNewAssigneeId(t.assignedToId ?? '');
    setNewPriority(t.priority);
    setNewDueDate(t.dueDate ? t.dueDate.split('T')[0] : '');
    if (t.utilityTypeId) {
      api.tickets.engineersForUtility(t.utilityTypeId).then(setEngineers).catch(() => {});
    }
    return t;
  };

  useEffect(() => {
    setIsLoading(true);
    loadTicket(ticketId).catch(console.error).finally(() => setIsLoading(false));
  }, [ticketId]);

  // After every patch, re-fetch the full joined ticket so onUpdated has correct names
  async function patch(data: Parameters<typeof api.tickets.update>[1]) {
    if (!ticket) return;
    setSaving(true);
    try {
      await api.tickets.update(ticket.id, data);
      const fresh = await loadTicket(ticket.id);
      onUpdated(fresh);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!ticket) return;
    setSaving(true);
    try {
      await api.tickets.delete(ticket.id);
      onDeleted(ticket.id);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) return;
    await patch({ status: 'Rejected', rejectionReason: rejectionReason.trim() });
    setShowRejectModal(false);
    setRejectionReason('');
  }

  async function handleRevision() {
    if (!revisionReason.trim()) return;
    await patch({ status: 'Needs Revision', rejectionReason: revisionReason.trim() });
    setShowRevisionModal(false);
    setRevisionReason('');
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading ticket…</p>
      </div>
    </div>
  );

  if (!ticket) return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={15} /> Back
      </button>
      <p className="text-red-500 text-sm">Ticket not found.</p>
    </div>
  );

  const canApprove = ticket.status === 'Submitted' || ticket.status === 'Resubmitted';
  const canClose = ticket.status === 'Approved';
  const isResolved = ['Approved', 'Rejected', 'Closed'].includes(ticket.status);
  const canSendForRevision = ticket.status === 'Submitted' || ticket.status === 'Resubmitted';
  const hasSubmission = ticket.filledValues && Object.keys(ticket.filledValues).length > 0;

  const submissions = ticket.submissions ?? [];
  const timeline = ticket.timeline ?? [];

  const TABS: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <Info size={14} />, show: true },
    { id: 'submission', label: `Submissions${submissions.length > 0 ? ` (${submissions.length})` : ''}`, icon: <FileText size={14} />, show: !!hasSubmission || submissions.length > 0 },
    { id: 'timeline', label: 'Timeline', icon: <Activity size={14} />, show: true },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      {/* Top hero bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-5">
          {/* Breadcrumb */}
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Tickets
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              {/* Chips row */}
              <div className="flex items-center gap-2 flex-wrap mb-2.5">
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {ticket.number}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${TYPE_COLOR[ticket.type]}`}>
                  {TYPE_ICON[ticket.type]} {ticket.type}
                </span>
                <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${PRIORITY_TEXT[ticket.priority]}`}>
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
                  {ticket.priority}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{ticket.title}</h1>
              {ticket.description && (
                <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">{ticket.description}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {canApprove && (
                <>
                  <Button variant="primary" size="sm" onClick={() => patch({ status: 'Approved' })} disabled={saving}>
                    <CheckCircle2 size={14} /> Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRevisionModal(true)} disabled={saving}
                    className="border-amber-200 text-amber-600 hover:bg-amber-50">
                    <RotateCcw size={14} /> Send for Revision
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRejectModal(true)} disabled={saving}
                    className="border-red-200 text-red-600 hover:bg-red-50">
                    <XCircle size={14} /> Reject
                  </Button>
                </>
              )}
              {canClose && (
                <Button variant="outline" size="sm" onClick={() => patch({ status: 'Closed' })} disabled={saving}>
                  <Clock size={14} /> Close Ticket
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={saving}
                className="border-red-200 text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Resubmitted banner */}
          {ticket.status === 'Resubmitted' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
              <RotateCcw size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-700">Resubmitted after revision</p>
                <p className="text-sm text-blue-600 mt-0.5">The engineer has corrected and resubmitted this ticket for your review.</p>
              </div>
            </div>
          )}

          {/* Rejection / revision banner */}
          {(ticket.status === 'Rejected' || ticket.status === 'Needs Revision') && ticket.rejectionReason && (
            <div className={`mt-4 border rounded-xl p-3.5 flex items-start gap-3 ${ticket.status === 'Needs Revision' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              {ticket.status === 'Needs Revision'
                ? <RotateCcw size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                : <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-sm font-semibold ${ticket.status === 'Needs Revision' ? 'text-amber-700' : 'text-red-700'}`}>
                  {ticket.status === 'Needs Revision' ? 'Sent for Revision' : 'Rejected'}
                </p>
                <p className={`text-sm mt-0.5 ${ticket.status === 'Needs Revision' ? 'text-amber-600' : 'text-red-600'}`}>{ticket.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Metadata strip */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-gray-100">
            <MetaCell label="Asset">
              <p className="text-sm font-semibold text-gray-800">{ticket.assetName ?? ticket.assetSerial ?? '—'}</p>
              {ticket.utilityTypeName && <p className="text-xs text-gray-400 mt-0.5">{ticket.utilityTypeName}</p>}
            </MetaCell>
            <MetaCell label="Assigned To">
              {ticket.assignedToName ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                    {ticket.assignedToName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{ticket.assignedToName}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Unassigned</span>
              )}
            </MetaCell>
            <MetaCell label="Due Date">
              <p className={`text-sm font-medium ${ticket.dueDate ? 'text-gray-800' : 'text-gray-400'}`}>
                {fmtDate(ticket.dueDate)}
              </p>
            </MetaCell>
            <MetaCell label="Form">
              <p className="text-sm font-medium text-gray-800">{ticket.formName ?? '—'}</p>
            </MetaCell>
          </div>
          {/* Team members row (if any) */}
          {(ticket.engineerHeadId || (ticket.additionalEngineerIds?.length ?? 0) > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
              {ticket.engineerHeadId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Head:</span>
                  <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
                    {engineers.find(e => e.id === ticket.engineerHeadId)?.name.charAt(0).toUpperCase() ?? 'H'}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{engineers.find(e => e.id === ticket.engineerHeadId)?.name ?? ticket.engineerHeadId}</span>
                </div>
              )}
              {(ticket.additionalEngineerIds?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Team:</span>
                  <div className="flex -space-x-1.5">
                    {(ticket.additionalEngineerIds ?? []).map(id => {
                      const eng = engineers.find(e => e.id === id);
                      return (
                        <div key={id} title={eng?.name ?? id} className="w-6 h-6 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-green-700 text-xs font-bold">
                          {(eng?.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-500">{(ticket.additionalEngineerIds ?? []).length} member{(ticket.additionalEngineerIds ?? []).length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0 mt-5 -mb-px">
            {TABS.filter(t => t.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: editable fields */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700">Ticket Details</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {/* Priority */}
                    <EditableRow
                      label="Priority"
                      editable={!isResolved}
                      editing={editingPriority}
                      onEdit={() => setEditingPriority(true)}
                      onCancel={() => { setEditingPriority(false); setNewPriority(ticket.priority); }}
                      onSave={async () => { await patch({ priority: newPriority }); setEditingPriority(false); }}
                      saving={saving}
                      display={
                        <span className={`flex items-center gap-2 text-sm font-semibold ${PRIORITY_TEXT[ticket.priority]}`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
                          {ticket.priority}
                        </span>
                      }
                    >
                      <select value={newPriority} onChange={e => setNewPriority(e.target.value as TicketPriority)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {(['Low', 'Medium', 'High', 'Critical'] as TicketPriority[]).map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </EditableRow>

                    {/* Assigned To */}
                    <EditableRow
                      label="Assigned To"
                      editable={!isResolved}
                      editing={editingAssignee}
                      onEdit={() => setEditingAssignee(true)}
                      onCancel={() => { setEditingAssignee(false); setNewAssigneeId(ticket.assignedToId ?? ''); }}
                      onSave={async () => { await patch({ assignedToId: newAssigneeId || null }); setEditingAssignee(false); }}
                      saving={saving}
                      display={
                        ticket.assignedToName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                              {ticket.assignedToName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{ticket.assignedToName}</p>
                              <p className="text-xs text-gray-400">Engineer</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not assigned</span>
                        )
                      }
                    >
                      <select value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— Unassigned —</option>
                        {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </EditableRow>

                    {/* Due Date */}
                    <EditableRow
                      label="Due Date"
                      editable={!isResolved}
                      editing={editingDueDate}
                      onEdit={() => setEditingDueDate(true)}
                      onCancel={() => { setEditingDueDate(false); setNewDueDate(ticket.dueDate ? ticket.dueDate.split('T')[0] : ''); }}
                      onSave={async () => { await patch({ dueDate: newDueDate || null }); setEditingDueDate(false); }}
                      saving={saving}
                      display={
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar size={14} className="text-gray-400" />
                          {fmtDate(ticket.dueDate)}
                        </div>
                      }
                    >
                      <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </EditableRow>

                    {/* Asset (read-only) */}
                    <div className="px-5 py-4 flex items-center justify-between">
                      <p className="text-sm text-gray-500 w-32 flex-shrink-0">Asset</p>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{ticket.assetName ?? ticket.assetSerial ?? '—'}</p>
                        {ticket.utilityTypeName && <p className="text-xs text-gray-400">{ticket.utilityTypeName}</p>}
                      </div>
                    </div>

                    {ticket.formName && (
                      <div className="px-5 py-4 flex items-center justify-between">
                        <p className="text-sm text-gray-500 w-32 flex-shrink-0">Form</p>
                        <p className="text-sm font-medium text-gray-800 flex-1">{ticket.formName}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: status card */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Status</h3>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
                  </div>

                  {!isResolved && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Actions</p>
                      {canApprove && (
                        <button onClick={() => patch({ status: 'Approved' })} disabled={saving}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50">
                          <CheckCircle2 size={15} className="text-green-600" /> Approve submission
                        </button>
                      )}
                      {canSendForRevision && (
                        <button onClick={() => setShowRevisionModal(true)} disabled={saving}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50">
                          <RotateCcw size={15} className="text-amber-600" /> Send for revision
                        </button>
                      )}
                      {canApprove && (
                        <button onClick={() => setShowRejectModal(true)} disabled={saving}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
                          <XCircle size={15} className="text-red-600" /> Reject submission
                        </button>
                      )}
                      {canClose && (
                        <button onClick={() => patch({ status: 'Closed' })} disabled={saving}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
                          <Clock size={15} className="text-gray-500" /> Close ticket
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {hasSubmission && (
                  <button onClick={() => setActiveTab('submission')}
                    className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left hover:bg-blue-100 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">View Submission</p>
                        <p className="text-xs text-blue-500 mt-0.5">
                          {ticket.submittedAt ? `Submitted ${fmtDate(ticket.submittedAt)}` : 'Form data available'}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'submission' && (
            <motion.div key="submission" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {submissions.length === 0 ? (
                <div className="text-center py-20">
                  <FileText size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No form data has been submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Submission selector tabs */}
                  {submissions.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {submissions.map((sub, i) => (
                        <button key={i}
                          onClick={() => setActiveSubmission(activeSubmission === i ? null : i)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            (activeSubmission === i || (activeSubmission === null && i === submissions.length - 1))
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                          }`}>
                          {sub.status === 'Resubmitted' ? `Resubmission #${i}` : `Submission #${sub.index}`}
                          <span className="ml-1.5 opacity-70">{fmtDate(sub.at)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Show selected submission (default: latest) */}
                  {(() => {
                    const idx = activeSubmission !== null ? activeSubmission : submissions.length - 1;
                    const sub = submissions[idx];
                    if (!sub) return null;
                    const prevSub = idx > 0 ? submissions[idx - 1] : null;
                    return <SubmissionView sub={sub} prevValues={prevSub?.values ?? null} isLatest={idx === submissions.length - 1} ticket={ticket} />;
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div key="timeline" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-5">Ticket History</h3>
                {(() => {
                  const colorMap: Record<string, string> = {
                    created: 'bg-blue-500', assigned: 'bg-indigo-500',
                    submitted: 'bg-amber-500', resubmitted: 'bg-blue-400',
                    in_progress: 'bg-gray-400', approved: 'bg-green-500',
                    rejected: 'bg-red-500', needs_revision: 'bg-amber-400',
                    closed: 'bg-gray-500',
                  };

                  if (timeline.length === 0) {
                    // Full fallback: ticket predates all timeline tracking
                    return (
                      <div className="relative">
                        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                        <div className="space-y-5">
                          <TimelineItem color="bg-blue-500" label="Ticket created" time={ticket.createdAt} />
                          {ticket.assignedToId && <TimelineItem color="bg-indigo-500" label={`Assigned to ${ticket.assignedToName ?? 'engineer'}`} time={ticket.createdAt} />}
                          {ticket.submittedAt && <TimelineItem color="bg-amber-500" label={`Submitted by ${ticket.assignedToName ?? 'engineer'}`} time={ticket.submittedAt} />}
                          {ticket.reviewedAt && ticket.status === 'Approved' && <TimelineItem color="bg-green-500" label="Approved" time={ticket.reviewedAt} />}
                          {ticket.reviewedAt && ticket.status === 'Rejected' && <TimelineItem color="bg-red-500" label={`Rejected${ticket.rejectionReason ? `: ${ticket.rejectionReason}` : ''}`} time={ticket.reviewedAt} />}
                          {ticket.reviewedAt && ticket.status === 'Needs Revision' && <TimelineItem color="bg-amber-400" label={`Sent for revision${ticket.rejectionReason ? `: ${ticket.rejectionReason}` : ''}`} time={ticket.reviewedAt} />}
                          {ticket.status === 'Closed' && <TimelineItem color="bg-gray-400" label="Ticket closed" time={ticket.updatedAt} />}
                        </div>
                      </div>
                    );
                  }

                  // Check if __timeline is missing the "created" event (ticket created before new code)
                  const hasCreatedEvent = timeline.some(ev => ev.event === 'created');
                  const hasAssignedEvent = timeline.some(ev => ev.event === 'assigned');

                  // Build synthetic prefix events for any missing bootstrap events
                  const prefixItems: React.ReactNode[] = [];
                  if (!hasCreatedEvent) {
                    prefixItems.push(
                      <TimelineItem key="__created" color="bg-blue-500" label="Ticket created" time={ticket.createdAt} />
                    );
                  }
                  if (!hasAssignedEvent && ticket.assignedToId) {
                    prefixItems.push(
                      <TimelineItem key="__assigned" color="bg-indigo-500" label={`Assigned to ${ticket.assignedToName ?? 'engineer'}`} time={ticket.createdAt} />
                    );
                  }

                  return (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                      <div className="space-y-5">
                        {prefixItems}
                        {timeline.map((ev, i) => {
                          const labelMap: Record<string, string> = {
                            created: 'Ticket created',
                            assigned: `Assigned to ${ticket.assignedToName ?? 'engineer'}`,
                            submitted: `Submitted by ${ev.byName}`,
                            resubmitted: `Resubmitted by ${ev.byName}`,
                            in_progress: `Marked in progress by ${ev.byName}`,
                            approved: `Approved by ${ev.byName}`,
                            rejected: `Rejected by ${ev.byName}`,
                            needs_revision: `Sent for revision by ${ev.byName}`,
                            closed: `Closed by ${ev.byName}`,
                          };
                          return (
                            <TimelineItem
                              key={i}
                              color={colorMap[ev.event] ?? 'bg-gray-400'}
                              label={labelMap[ev.event] ?? `${ev.status} by ${ev.byName}`}
                              note={ev.note ?? undefined}
                              time={ev.at}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Ticket?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete <strong>{ticket.number}</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleDelete} disabled={saving}>Delete</Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reject Submission</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason. The engineer will see this. This is a hard reject — use "Send for Revision" if you want the engineer to correct and resubmit.</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="e.g. Data is inconsistent with previous records."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleReject} disabled={saving || !rejectionReason.trim()}>
                Reject
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Send for Revision modal */}
      {showRevisionModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <RotateCcw size={20} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 text-center">Send for Revision</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">The engineer will see this reason and can correct their submission.</p>
            <textarea
              value={revisionReason}
              onChange={e => setRevisionReason(e.target.value)}
              rows={4}
              placeholder="e.g. Readings seem incorrect — please re-verify the DG output values."
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowRevisionModal(false); setRevisionReason(''); }}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="flex-1 !border-amber-400 !text-amber-700 hover:!bg-amber-50" onClick={handleRevision} disabled={saving || !revisionReason.trim()}>
                Send for Revision
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function TimelineItem({ color, label, note, time }: { color: string; label: string; note?: string; time: string | null }) {
  return (
    <div className="flex items-start gap-4 pl-1">
      <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center flex-shrink-0 relative z-10`}>
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {note && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1 italic">"{note}"</p>}
        <p className="text-xs text-gray-400 mt-0.5">{time ? new Date(time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
      </div>
    </div>
  );
}

interface TriggeredAlert {
  ruleId: string;
  name: string;
  fieldName: string;
  condition: string;
  threshold: string;
  severity: string;
  action: string | null;
  submittedValue: string;
}

const ALERT_SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

function SubmissionView({ sub, prevValues, isLatest, ticket }: { sub: ApiTicketSubmission; prevValues: Record<string, unknown> | null; isLatest: boolean; ticket: ApiTicketFull }) {
  const formData: ApiTicketFormData | null = sub.formSnapshot ?? ticket.formData;
  const values = sub.values;

  function isChanged(fieldKey: string, altKey?: string): boolean {
    if (!prevValues) return false;
    const cur = values[fieldKey] ?? (altKey ? values[altKey] : undefined);
    const prev = prevValues[fieldKey] ?? (altKey ? prevValues[altKey] : undefined);
    return String(cur ?? '') !== String(prev ?? '');
  }

  // Count how many fields changed vs previous submission
  const changedCount = prevValues
    ? Object.keys(values).filter(k => String(values[k] ?? '') !== String(prevValues[k] ?? '')).length
    : 0;

  const triggeredAlerts: TriggeredAlert[] = Array.isArray(sub.triggeredAlerts)
    ? (sub.triggeredAlerts as TriggeredAlert[])
    : [];
  const alertedFields = new Set(triggeredAlerts.map(a => a.fieldName.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs text-gray-400">{sub.status === 'Resubmitted' ? 'Resubmitted by' : 'Submitted by'}</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{sub.byName}</p>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div>
          <p className="text-xs text-gray-400">At</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{new Date(sub.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        {isLatest && (
          <>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <p className="text-sm font-semibold text-blue-600 mt-0.5">Latest submission</p>
            </div>
          </>
        )}
        {prevValues && changedCount > 0 && (
          <>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-xs text-gray-400">Changes</p>
              <p className="text-sm font-semibold text-amber-600 mt-0.5">{changedCount} field{changedCount !== 1 ? 's' : ''} modified</p>
            </div>
          </>
        )}
        {prevValues && changedCount === 0 && (
          <>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-xs text-gray-400">Changes</p>
              <p className="text-sm font-semibold text-gray-400 mt-0.5">No changes</p>
            </div>
          </>
        )}
      </div>

      {/* Alert triggers */}
      {triggeredAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 bg-red-100/60 border-b border-red-200 flex items-center gap-2 flex-wrap">
            <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-red-700">Alert Triggers ({triggeredAlerts.length})</h3>
            <span className="ml-auto text-xs text-red-500">These fields triggered alert rules on submission</span>
          </div>
          <div className="divide-y divide-red-100">
            {triggeredAlerts.map((alert, i) => {
              const sevCls = ALERT_SEV_COLORS[alert.severity] ?? 'bg-gray-100 text-gray-700 border-gray-200';
              return (
                <div key={i} className="px-5 py-3.5 flex items-start gap-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 mt-0.5 capitalize ${sevCls}`}>
                    {alert.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{alert.name}</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      <span className="font-mono">{alert.fieldName} {alert.condition} {alert.threshold}</span>
                      <span className="text-gray-500 ml-2">→ submitted: <strong>{alert.submittedValue}</strong></span>
                    </p>
                    {alert.action && <p className="text-xs text-gray-500 mt-1 italic">→ {alert.action}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist results (PM Plan snapshot or raw cl_* keys) */}
      <ChecklistResults values={values} prevValues={prevValues} />

      {/* Form data */}
      {formData ? (
        formData.sections.map(section => {
          const visibleFields = section.fields.filter(f => !f.isHidden);
          const extraFields = section.extraFields ?? [];
          if (visibleFields.length === 0 && extraFields.length === 0) return null;
          return (
            <div key={section.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">{section.name}</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-1/3">Field</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleFields.map(f => {
                    const val = values[f.id] ?? values[f.fieldId ?? ''];
                    const isEmpty = val === undefined || val === null || val === '';
                    const changed = isChanged(f.id, f.fieldId ?? undefined);
                    const prevVal = prevValues ? (prevValues[f.id] ?? (f.fieldId ? prevValues[f.fieldId] : undefined)) : undefined;
                    const isAlerted = alertedFields.has((f.fieldName ?? '').trim().toLowerCase());
                    return (
                      <tr key={f.id} className={isAlerted ? 'bg-red-50/70 border-l-4 border-l-red-400' : changed ? 'bg-amber-50/60' : 'hover:bg-gray-50/50'}>
                        <td className="px-5 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            {isAlerted && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                            {!isAlerted && changed && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                            {f.fieldName ?? f.fieldId}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            {(f.fieldType === 'photo' || f.fieldType === 'video') ? (
                              Array.isArray(val) && val.length > 0
                                ? <MediaCell kind={f.fieldType as 'photo' | 'video'} fileIds={val as string[]} />
                                : <span className="text-sm text-gray-300 italic">Not filled</span>
                            ) : (
                              <span className={`text-sm font-medium ${isEmpty ? 'text-gray-300 italic' : changed ? 'text-amber-800' : 'text-gray-900'}`}>
                                {isEmpty ? 'Not filled' : String(val)}
                              </span>
                            )}
                            {changed && prevVal !== undefined && prevVal !== null && prevVal !== '' && (f.fieldType !== 'photo' && f.fieldType !== 'video') && (
                              <span className="text-xs text-gray-400 line-through">{String(prevVal)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400">{f.fieldUnit ?? '—'}</td>
                      </tr>
                    );
                  })}
                  {extraFields.map(ef => {
                    const val = values[ef.id];
                    const isEmpty = val === undefined || val === null || val === '';
                    const changed = isChanged(ef.id);
                    const prevVal = prevValues ? prevValues[ef.id] : undefined;
                    return (
                      <tr key={ef.id} className={changed ? 'bg-amber-50/60' : 'hover:bg-gray-50/50'}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {changed && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                            <div>
                              <p className="text-sm text-gray-600">{ef.name}</p>
                              <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">extra</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            {(ef.type === 'photo' || ef.type === 'video') ? (
                              Array.isArray(val) && val.length > 0
                                ? <MediaCell kind={ef.type as 'photo' | 'video'} fileIds={val as string[]} />
                                : <span className="text-sm text-gray-300 italic">Not filled</span>
                            ) : (
                              <span className={`text-sm font-medium ${isEmpty ? 'text-gray-300 italic' : changed ? 'text-amber-800' : 'text-gray-900'}`}>
                                {isEmpty ? 'Not filled' : String(val)}
                              </span>
                            )}
                            {changed && prevVal !== undefined && prevVal !== null && prevVal !== '' && (ef.type !== 'photo' && ef.type !== 'video') && (
                              <span className="text-xs text-gray-400 line-through">{String(prevVal)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400">{ef.unit ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(values).filter(([k]) => !k.startsWith('cl_') && !k.startsWith('__')).map(([k, v]) => {
              const changed = prevValues ? String(v ?? '') !== String(prevValues[k] ?? '') : false;
              const prevVal = prevValues ? prevValues[k] : undefined;
              return (
                <div key={k} className={`rounded-xl px-3 py-2.5 ${changed ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-1.5">
                    {changed && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                    <p className="text-xs text-gray-400">{k}</p>
                  </div>
                  <p className={`text-sm font-medium mt-0.5 ${changed ? 'text-amber-800' : 'text-gray-800'}`}>{String(v ?? '—')}</p>
                  {changed && prevVal !== undefined && prevVal !== null && prevVal !== '' && (
                    <p className="text-xs text-gray-400 line-through mt-0.5">{String(prevVal)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type ChecklistSnapshotItem = {
  id: string;
  name: string;
  checkingMethod?: string | null;
  standard?: string | null;
  checked: boolean;
  remark: string | null;
};

function ChecklistResults({ values, prevValues }: { values: Record<string, unknown>; prevValues: Record<string, unknown> | null }) {
  const snapshot = Array.isArray(values.__checklistSnapshot) ? (values.__checklistSnapshot as ChecklistSnapshotItem[]) : null;

  let items: ChecklistSnapshotItem[] = [];
  if (snapshot && snapshot.length > 0) {
    items = snapshot;
  } else {
    // Fallback: derive from raw cl_* keys (no names available — show truncated id)
    const seen = new Set<string>();
    for (const k of Object.keys(values)) {
      if (!k.startsWith('cl_') || k.endsWith('_remark')) continue;
      const id = k.slice(3);
      if (seen.has(id)) continue;
      seen.add(id);
      const remark = values[`cl_${id}_remark`];
      items.push({
        id,
        name: `Checklist item ${id.slice(0, 8)}…`,
        checkingMethod: null,
        standard: null,
        checked: values[k] === 'true' || values[k] === true,
        remark: typeof remark === 'string' && remark.trim() ? remark.trim() : null,
      });
    }
  }

  if (items.length === 0) return null;

  const checkedCount = items.filter(it => it.checked).length;
  const pct = Math.round((checkedCount / items.length) * 100);

  function snapItemFromPrev(id: string): ChecklistSnapshotItem | null {
    if (!prevValues) return null;
    const prevSnap = Array.isArray(prevValues.__checklistSnapshot) ? (prevValues.__checklistSnapshot as ChecklistSnapshotItem[]) : null;
    if (prevSnap) return prevSnap.find(p => p.id === id) ?? null;
    const checked = prevValues[`cl_${id}`];
    if (checked === undefined && prevValues[`cl_${id}_remark`] === undefined) return null;
    const remark = prevValues[`cl_${id}_remark`];
    return {
      id, name: '',
      checked: checked === 'true' || checked === true,
      remark: typeof remark === 'string' && remark.trim() ? remark.trim() : null,
    };
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <ClipboardList size={14} className="text-blue-500" /> Checklist Results
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">{checkedCount} / {items.length} done</span>
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(item => {
          const prev = snapItemFromPrev(item.id);
          const checkChanged = prev !== null && prev.checked !== item.checked;
          const remarkChanged = prev !== null && (prev.remark ?? '') !== (item.remark ?? '');
          return (
            <div key={item.id} className={`px-5 py-3 flex items-start gap-3 ${checkChanged || remarkChanged ? 'bg-amber-50/60' : ''}`}>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${item.checked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
                {item.checked ? <CheckCircle2 size={12} /> : <X size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${item.checked ? 'text-gray-800' : 'text-gray-500'}`}>{item.name}</p>
                {(item.checkingMethod || item.standard) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.checkingMethod && <>Method: <span className="font-medium text-gray-700">{item.checkingMethod}</span></>}
                    {item.standard && <span className="ml-2 pl-2 border-l border-gray-300">Standard: <span className="font-medium text-gray-700">{item.standard}</span></span>}
                  </p>
                )}
                {item.remark && (
                  <p className={`text-xs mt-1 px-2 py-1 rounded ${remarkChanged ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
                    "{item.remark}"
                  </p>
                )}
                {checkChanged && prev && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    Previously: {prev.checked ? 'checked' : 'unchecked'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  );
}

function EditableRow({
  label, editable, editing, onEdit, onCancel, onSave, saving, display, children,
}: {
  label: string;
  editable: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  display: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-500 w-32 flex-shrink-0 pt-0.5">{label}</p>
        <div className="flex-1">
          {editing ? (
            <div className="space-y-2">
              {children}
              <div className="flex gap-2">
                <button onClick={onSave} disabled={saving}
                  className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 font-medium">
                  <Save size={11} /> Save
                </button>
                <button onClick={onCancel}
                  className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-200 font-medium">
                  <X size={11} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            display
          )}
        </div>
        {editable && !editing && (
          <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0">
            <Edit2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
