import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { ClipboardList, AlertTriangle, Eye, CheckCircle, XCircle, Clock, Search, Download, Ticket } from 'lucide-react';
import Badge from '../../../../ui/Badge';
import Input from '../../../../ui/Input';
import { api, type ApiSubmission } from '../../../../../lib/api';
import * as XLSX from 'xlsx';
import Tickets from '../../../tickets/Tickets';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_VARIANT: Record<ApiSubmission['status'], 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  'Approved':     'success',
  'Submitted':    'info',
  'Under Review': 'warning',
  'Rejected':     'error',
};

const STATUS_ICON: Record<ApiSubmission['status'], React.ElementType> = {
  'Approved':     CheckCircle,
  'Submitted':    Clock,
  'Under Review': Eye,
  'Rejected':     XCircle,
};

export default function DGRecords({ utilityTypeId }: { utilityTypeId: string }) {
  const [submissions, setSubmissions] = useState<ApiSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('logbook');

  useEffect(() => {
    setIsLoading(true);
    api.submissions.list({ utilityTypeId })
      .then(data => setSubmissions([...data].reverse()))
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [utilityTypeId]);

  const filteredSubmissions = submissions.filter(s => 
    !search || 
    (s.operatorName || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.assetName || '').toLowerCase().includes(search.toLowerCase()) ||
    s.status.toLowerCase().includes(search.toLowerCase()) ||
    fmtDate(s.date).toLowerCase().includes(search.toLowerCase())
  );

  const exportData = (format: 'csv' | 'excel') => {
    const headers = ['Date', 'Shift', 'Operator', 'Asset', 'Status', 'Fields Recorded', 'Rejection Reason'];
    const rows = filteredSubmissions.map(s => [
      fmtDate(s.date), s.shift, s.operatorName || 'Unknown', s.assetName || 'Unknown', s.status, Object.keys(s.values ?? {}).length, s.rejectionReason || ''
    ]);
    if (format === 'csv') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'records.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Records');
      XLSX.writeFile(workbook, 'records.xlsx');
    }
    setShowExportMenu(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Records</h3>
        <p className="text-sm text-gray-500">
          Maintenance logs, service history, inspection reports, breakdown incidents, and compliance documentation for audit trails.
        </p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-2 border-b border-gray-200 mb-6">
          <Tabs.Trigger
            value="logbook"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logbook' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} /> Logbook Entries
            </div>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tickets"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tickets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Ticket size={16} /> Tickets
            </div>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="logbook" className="space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading records...</div>
          ) : error ? (
            <div className="flex items-center gap-2 justify-center py-20 text-red-500 text-sm"><AlertTriangle size={16} />{error}</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">All Logbook Records</h3>
                  <p className="text-xs text-gray-500">{submissions.length} total form submissions across all assets</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-64">
                    <Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
                  </div>
                  <div className="relative">
                    <button onClick={() => setShowExportMenu(v => !v)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors h-10">
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
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No logbook entries found.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
                  {filteredSubmissions.map(sub => {
                    const StatusIcon = STATUS_ICON[sub.status];
                    const isExpanded = expandedId === sub.id;
                    const entries = Object.entries(sub.values ?? {});
                    return (
                      <div key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                          className="w-full flex items-center gap-4 px-5 py-4 text-left"
                        >
                          <StatusIcon size={16} className={
                            sub.status === 'Approved' ? 'text-green-500' :
                            sub.status === 'Rejected' ? 'text-red-500' :
                            sub.status === 'Under Review' ? 'text-amber-500' : 'text-blue-500'
                          } />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">
                              {sub.assetName || 'Unknown Asset'} — Shift {sub.shift} ({fmtDate(sub.date)})
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              By {sub.operatorName ?? 'Unknown'} · {entries.length} fields recorded
                            </p>
                          </div>
                          <Badge variant={STATUS_VARIANT[sub.status]}>{sub.status}</Badge>
                          {sub.rejectionReason && (
                            <span className="text-xs text-red-500 max-w-[150px] truncate">{sub.rejectionReason}</span>
                          )}
                        </button>

                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="overflow-hidden border-t border-gray-100"
                          >
                            <div className="px-5 py-4 bg-gray-50">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recorded Values</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {entries.map(([key, value]) => (
                                  <div key={key} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                                    <p className="text-xs text-gray-400 mb-0.5 truncate">{key}</p>
                                    <p className="text-sm font-semibold text-gray-800">{String(value)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Tabs.Content>

        <Tabs.Content value="tickets">
          <Tickets utilityTypeId={utilityTypeId} />
        </Tabs.Content>
      </Tabs.Root>
    </motion.div>
  );
}
