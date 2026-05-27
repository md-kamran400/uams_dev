import { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Loader2, HardHat, Search, Download } from 'lucide-react';
import Button from '../../../../ui/Button';
import Input from '../../../../ui/Input';
import { api, type ApiUser } from '../../../../../lib/api';
import * as XLSX from 'xlsx';

interface DGEngineersProps {
  utilityTypeId: string;
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  approver: 'bg-blue-100 text-blue-700',
  reviewer: 'bg-cyan-100 text-cyan-700',
  operator: 'bg-gray-100 text-gray-600',
  leadership: 'bg-amber-100 text-amber-700',
  engineer: 'bg-green-100 text-green-700',
};

export default function DGEngineers({ utilityTypeId }: DGEngineersProps) {
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [engineers, setEngineers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ApiUser | null>(null);

  useEffect(() => {
    // Only admins can list users. Assuming the current user has access.
    api.users.list().then(users => {
      setAllUsers(users);
      const assigned = users.filter(u => u.assignedUtilityIds?.includes(utilityTypeId));
      setEngineers(assigned);
      setIsLoading(false);
    }).catch(e => {
      console.error('Failed to load users', e);
      setIsLoading(false);
    });
  }, [utilityTypeId]);

  const assignedIds = new Set(engineers.map((e) => e.id));

  const toggleAssignment = async (user: ApiUser, action: 'assign' | 'unassign') => {
    setLoadingId(user.id);
    try {
      await api.users.assignUtility(user.id, utilityTypeId, action);
      if (action === 'assign') {
        setEngineers(prev => [...prev, user]);
      } else {
        setEngineers(prev => prev.filter(e => e.id !== user.id));
      }
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to toggle assignment');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredEngineers = engineers.filter(e => 
    !search || 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  const exportData = (format: 'csv' | 'excel') => {
    const headers = ['Name', 'Role', 'Shift', 'Email'];
    const rows = filteredEngineers.map(e => [
      e.name, e.role, e.shift ? `Shift ${e.shift}` : '—', e.email
    ]);
    if (format === 'csv') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'engineers.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Engineers');
      XLSX.writeFile(workbook, 'engineers.xlsx');
    }
    setShowExportMenu(false);
  };

  if (isLoading) return <div className="py-10 text-center text-gray-500 text-sm">Loading Engineers...</div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Assigned Engineers</h3>
          <p className="text-sm text-gray-500">
            Manage engineers linked to this utility. These users will receive tasks and alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input placeholder="Search engineers..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
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
          <Button variant="primary" onClick={() => { setErrorMsg(null); setDialogOpen(true); }} className="h-10">
            <UserPlus size={16} className="mr-2" /> Assign Engineers
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 font-semibold text-gray-600">Name</th>
              <th className="px-5 py-3 font-semibold text-gray-600">Role</th>
              <th className="px-5 py-3 font-semibold text-gray-600">Shift</th>
              <th className="px-5 py-3 font-semibold text-gray-600">Email</th>
              <th className="px-5 py-3 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEngineers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500 bg-gray-50/50">
                  <HardHat size={32} className="mx-auto text-gray-300 mb-3" />
                  <p>No engineers found.</p>
                </td>
              </tr>
            )}
            {filteredEngineers.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 font-semibold text-gray-800">{e.name}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${roleColors[e.role] || 'bg-gray-100 text-gray-600'}`}>
                    {e.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-500">{e.shift ? `Shift ${e.shift}` : '—'}</td>
                <td className="px-5 py-4 text-gray-500">{e.email}</td>
                <td className="px-5 py-4 text-center">
                  <button
                    disabled={loadingId === e.id}
                    onClick={() => setRemoveTarget(e)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingId === e.id ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remove confirmation modal */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Engineer?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Remove <strong>{removeTarget.name}</strong> from this utility? They will no longer receive tasks or alerts for this utility.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setRemoveTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                onClick={async () => {
                  const target = removeTarget;
                  setRemoveTarget(null);
                  await toggleAssignment(target, 'unassign');
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Assign Engineers</h3>
              <p className="text-xs text-gray-500 mt-1">Select users to link to this utility type.</p>
            </div>
            
            {errorMsg && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                {errorMsg}
              </div>
            )}
            
            <div className="overflow-y-auto flex-1 p-0 divide-y divide-gray-100">
              {allUsers.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">No users found.</div>
              )}
              {allUsers.map(u => {
                const isAssigned = assignedIds.has(u.id);
                const loading = loadingId === u.id;
                return (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                        {u.shift && <span className="text-[10px] text-gray-400 font-medium">Shift {u.shift}</span>}
                      </div>
                    </div>
                    <Button
                      variant={isAssigned ? 'outline' : 'primary'}
                      size="sm"
                      disabled={loading}
                      onClick={() => isAssigned ? setRemoveTarget(u) : toggleAssignment(u, 'assign')}
                      className={isAssigned ? 'text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border-gray-200 bg-white' : ''}
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isAssigned ? (
                        <><UserMinus size={14} className="mr-1.5" /> Remove</>
                      ) : (
                        <><UserPlus size={14} className="mr-1.5" /> Assign</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
