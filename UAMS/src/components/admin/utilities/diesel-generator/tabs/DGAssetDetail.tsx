import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ArrowLeft, LayoutDashboard, Layers, Package, FolderOpen,
  FileText, ClipboardList, BarChart2, ClipboardCheck, Bell, Settings2,
} from 'lucide-react';
import Badge from '../../../../ui/Badge';
import AssetOverview from './asset-tabs/AssetOverview';
import AssetComponents from './asset-tabs/AssetComponents';
import AssetInventory from './asset-tabs/AssetInventory';
import AssetFiles from './asset-tabs/AssetFiles';
import AssetForms from './asset-tabs/AssetForms';
import AssetRecords from './asset-tabs/AssetRecords';
import AssetReports from './asset-tabs/AssetReports';
import AssetConfig from './asset-tabs/AssetConfig';
import AssetChecklists from './asset-tabs/AssetChecklists';
import AssetAlerts from './asset-tabs/AssetAlerts';

const ASSET_TABS = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'components',  label: 'Components',  icon: Layers          },
  { id: 'inventory',   label: 'Inventory',   icon: Package         },
  { id: 'files',       label: 'Files',       icon: FolderOpen      },
  { id: 'forms',       label: 'Forms',       icon: FileText        },
  { id: 'records',     label: 'Records',     icon: ClipboardList   },
  { id: 'reports',     label: 'Reports',     icon: BarChart2       },
  { id: 'checklists',  label: 'Checklists',  icon: ClipboardCheck  },
  { id: 'alerts',      label: 'Alerts',      icon: Bell            },
  { id: 'config',      label: 'Config',      icon: Settings2       },
];

const pageVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// AugmentedAsset type — used internally by DGAssets list view
export interface AugmentedAsset {
  id: string;
  name: string;
  status: 'Active' | 'Under Maintenance' | 'Inactive';
  serial: string | null;
  manufacturer: string | null;
  model: string | null;
  ratedKva: string | null;
  assetTag: string;
  unitName: string;
  make: string;
  installDate: string | null;
  utilityTypeId: string;
  siteId: string;
  plantId: string;
  areaId: string;
  createdAt: string;
  updatedAt: string;
  utilityTypeName?: string | null;
  siteName?: string | null;
  plantName?: string | null;
  areaName?: string | null;
  [key: string]: unknown;
}

const STATUS_BADGE: Record<AugmentedAsset['status'], { variant: 'success' | 'warning' | 'error'; label: string }> = {
  'Active':              { variant: 'success', label: 'Operational'      },
  'Under Maintenance':   { variant: 'warning', label: 'Under Maintenance' },
  'Inactive':            { variant: 'error',   label: 'Offline'          },
};

export default function DGAssetDetail({
  asset,
  onBack,
  onEdit,
}: {
  asset: AugmentedAsset;
  onBack: () => void;
  onEdit?: () => void;
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const status = STATUS_BADGE[asset.status];

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-0">
      {/* Asset Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        {/* Back button + breadcrumb */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft size={15} />
            Back to Assets
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-800 font-semibold">{asset.assetTag}</span>
        </div>

        {/* Asset title row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{asset.unitName}</h2>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {asset.make} {asset.model}&nbsp;·&nbsp;
              {asset.ratedKva ? `${asset.ratedKva} KVA` : '—'}&nbsp;·&nbsp;
              {(asset.siteName as string) ?? ''}{asset.areaName ? ` › ${asset.areaName as string}` : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Asset Tag</p>
            <p className="text-lg font-bold font-mono text-blue-700">{asset.assetTag}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-b border-gray-200 px-6">
          <Tabs.List className="flex gap-1 -mb-px overflow-x-auto">
            {ASSET_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-all cursor-pointer
                    ${isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon size={15} />
                  {tab.label}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
        </div>

        {/* Tab content — pass assetId to all tabs */}
        <div className="p-6">
          <Tabs.Content value="overview">
            <AssetOverview assetId={asset.id} onEdit={onEdit} />
          </Tabs.Content>
          <Tabs.Content value="components">
            <AssetComponents assetId={asset.id} />
          </Tabs.Content>
          <Tabs.Content value="inventory">
            <AssetInventory assetId={asset.id} utilityTypeId={asset.utilityTypeId} />
          </Tabs.Content>
          <Tabs.Content value="files">
            <AssetFiles assetId={asset.id} />
          </Tabs.Content>
          <Tabs.Content value="forms">
            <AssetForms assetId={asset.id} />
          </Tabs.Content>
          <Tabs.Content value="records">
            <AssetRecords assetId={asset.id} />
          </Tabs.Content>
          <Tabs.Content value="reports">
            <AssetReports assetId={asset.id} />
          </Tabs.Content>
          <Tabs.Content value="checklists">
            <AssetChecklists assetId={asset.id} />
          </Tabs.Content>
          <Tabs.Content value="alerts">
            <AssetAlerts assetId={asset.id} utilityTypeId={asset.utilityTypeId} />
          </Tabs.Content>
          <Tabs.Content value="config">
            <AssetConfig assetId={asset.id} utilityTypeId={asset.utilityTypeId} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </motion.div>
  );
}
