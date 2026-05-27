import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock, AlertTriangle, CheckCircle2, AlertOctagon, Clock3,
} from 'lucide-react';
import Badge from '../../../../../ui/Badge';
import {
  api, type ApiPmPlan,
} from '../../../../../../lib/api';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_ICON: Record<ApiPmPlan['status'], React.ElementType> = {
  Scheduled: Clock3,
  Overdue: AlertOctagon,
  Completed: CheckCircle2,
};
const STATUS_VARIANT: Record<ApiPmPlan['status'], 'default' | 'error' | 'success'> = {
  Scheduled: 'default',
  Overdue: 'error',
  Completed: 'success',
};

export default function AssetForms({ assetId }: { assetId: string }) {
  const [plans, setPlans] = useState<ApiPmPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.assetDetails.listPmPlans(assetId)
      .then(setPlans)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [assetId]);

  const stats = {
    total: plans.length,
    overdue: plans.filter(p => p.status === 'Overdue').length,
    scheduled: plans.filter(p => p.status === 'Scheduled').length,
    completed: plans.filter(p => p.status === 'Completed').length,
  };

  if (isLoading) return <div className="py-12 text-center text-sm text-gray-400">Loading PM plans…</div>;
  if (error) return <div className="flex items-center gap-2 justify-center py-12 text-red-500 text-sm"><AlertTriangle size={16} />{error}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Plans',  value: stats.total,     color: 'text-gray-800'  },
          { label: 'Overdue',      value: stats.overdue,   color: 'text-red-600'   },
          { label: 'Scheduled',    value: stats.scheduled, color: 'text-blue-600'  },
          { label: 'Completed',    value: stats.completed, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CalendarClock size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No PM plans assigned to this asset.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const Icon = STATUS_ICON[plan.status];
            const isOverdue = plan.status === 'Overdue';
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-lg border shadow-sm overflow-hidden ${isOverdue ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <Icon size={16} className={isOverdue ? 'text-red-500' : 'text-blue-500'} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{plan.task}</p>
                        <p className="text-xs text-gray-400">{plan.frequency} · Est. {plan.estimatedHours ?? '—'} hrs</p>
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[plan.status]}>{plan.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Next Due</p>
                      <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>{fmtDate(plan.nextDue)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Last Done</p>
                      <p className="font-semibold text-gray-800">{fmtDate(plan.lastDone)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-gray-400 mb-0.5">Assigned To</p>
                      <p className="font-semibold text-gray-800 truncate">{(plan as any).assignedToName ?? '—'}</p>
                    </div>
                  </div>
                  {plan.components && plan.components.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">Components:</span>
                      {plan.components.map(c => (
                        <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
