import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Tag, Hash, MapPin, Calendar, Shield, Clock, Wrench,
  Zap, Gauge, Cpu, Fuel, Activity, AlertTriangle, Pencil
} from 'lucide-react';
import Badge from '../../../../../ui/Badge';
import { api, type ApiAssetOverview } from '../../../../../../lib/api';

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  );
}

export default function AssetOverview({ assetId, onEdit }: { assetId: string; onEdit?: () => void }) {
  const [data, setData] = useState<ApiAssetOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.assetDetails.overview(assetId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [assetId]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading overview...</div>
  );

  if (error || !data) return (
    <div className="flex items-center gap-2 justify-center py-20 text-red-500 text-sm">
      <AlertTriangle size={16} /> {error ?? 'Failed to load asset data'}
    </div>
  );

  const statusVariant = data.status === 'Active' ? 'success' : data.status === 'Under Maintenance' ? 'warning' : 'error';
  const statusLabel = data.status === 'Active' ? 'Operational' : data.status;

  // Derive service progress from PM plans
  const nextPm = data.pmPlans?.[0];
  const warrantyExpiry = data.installDate ? new Date(data.installDate) : null;
  if (warrantyExpiry) warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + 3); // assume 3-yr warranty

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      {/* Status Banner */}
      <motion.div
        variants={cardVariants}
        className="flex items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex-wrap gap-4"
      >
        <div>
          <p className="text-xs text-gray-500 mb-1">Current Status</p>
          <Badge variant={statusVariant} size="md">{statusLabel}</Badge>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">KVA Rating</p>
          <p className="text-2xl font-bold text-gray-800 font-mono">{data.ratedKva ?? '—'} <span className="text-sm font-normal">KVA</span></p>
        </div>
        {data.openBreakdowns > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Open Breakdowns</p>
            <p className="text-2xl font-bold text-red-600 font-mono">{data.openBreakdowns}</p>
          </div>
        )}
        {nextPm && (
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Next PM Due</p>
            <p className={`text-xl font-bold font-mono ${new Date(nextPm.nextDue) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
              {fmt(nextPm.nextDue)}
            </p>
          </div>
        )}
      </motion.div>

      {/* PM Status Bar */}
      {nextPm && (
        <motion.div variants={cardVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Maintenance Schedule — {nextPm.task}</p>
            <Badge variant={nextPm.status === 'Overdue' ? 'error' : nextPm.status === 'Completed' ? 'success' : 'default'}>
              {nextPm.status}
            </Badge>
          </div>
          <p className="text-xs text-gray-400">
            Frequency: {nextPm.frequency} · Est. Hours: {nextPm.estimatedHours ?? '—'} · Last Done: {fmt(nextPm.lastDone)}
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Asset Information */}
        <motion.div variants={cardVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-800">Asset Information</h4>
            {onEdit && (
              <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit Asset Information">
                <Pencil size={13} />
              </button>
            )}
          </div>
          <div className="px-5 py-3">
            <InfoRow icon={Tag}    label="Asset ID"           value={<span className="font-mono text-blue-700 text-xs">{data.serial || data.id.slice(0,8)}</span>} />
            <InfoRow icon={Cpu}    label="Unit Name"          value={data.name} />
            <InfoRow icon={Hash}   label="Make / Model"       value={`${data.manufacturer ?? '—'} ${data.model ?? ''}`.trim()} />
            <InfoRow icon={Hash}   label="Serial Number"      value={<span className="font-mono text-xs">{data.serial ?? '—'}</span>} />
            <InfoRow icon={MapPin} label="Location"           value={`${data.siteName ?? ''} › ${data.areaName ?? ''}`.replace('›', data.areaName ? '›' : '')} />
            <InfoRow icon={Activity} label="Status"           value={<Badge variant={statusVariant}>{statusLabel}</Badge>} />
          </div>
        </motion.div>

        {/* Warranty & Service */}
        <motion.div variants={cardVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-800">Warranty & Service</h4>
            {onEdit && (
              <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit Warranty & Service">
                <Pencil size={13} />
              </button>
            )}
          </div>
          <div className="px-5 py-3">
            <InfoRow icon={Calendar} label="Installation Date" value={fmt(data.installDate)} />
            <InfoRow icon={Shield}   label="Warranty Expiry"   value={
              warrantyExpiry ? (
                <span className={warrantyExpiry < new Date() ? 'text-red-600' : 'text-green-700'}>
                  {warrantyExpiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {warrantyExpiry < new Date() ? ' (Expired)' : ' (Active)'}
                </span>
              ) : '—'
            } />
            <InfoRow icon={Wrench} label="Last PM Done"      value={fmt(data.lastServiceDate)} />
            <InfoRow icon={Clock}  label="Next PM Due"       value={nextPm ? fmt(nextPm.nextDue) : '—'} />
          </div>
        </motion.div>

        {/* Technical Specs */}
        <motion.div variants={cardVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-800">Technical Specifications</h4>
            {onEdit && (
              <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit Technical Specifications">
                <Pencil size={13} />
              </button>
            )}
          </div>
          <div className="px-5 py-3">
            <InfoRow icon={Gauge}    label="KVA Rating"      value={data.ratedKva ? `${data.ratedKva} KVA` : '—'} />
            <InfoRow icon={Zap}      label="Utility Type"    value={data.utilityTypeName ?? '—'} />
            <InfoRow icon={Fuel}     label="Manufacturer"    value={data.manufacturer ?? '—'} />
            <InfoRow icon={Cpu}      label="Model"           value={data.model ?? '—'} />
            <InfoRow icon={Activity} label="Plant"           value={data.plantName ?? '—'} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
