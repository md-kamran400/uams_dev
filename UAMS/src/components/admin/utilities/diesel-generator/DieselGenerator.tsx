import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { Home, Package, ClipboardList, BoxesIcon, HardHat, Power, Settings2, Zap, Gauge, BatteryCharging, Wind, AirVent, Factory, Box, Wrench, BarChart2, FileBarChart, type LucideIcon } from 'lucide-react';
import DGHome from './tabs/DGHome';
import DGAssets from './tabs/DGAssets';
import DGRecords from './tabs/DGRecords';
import DGInventory from './tabs/DGInventory';
import DGEngineers from './tabs/DGEngineers';
import DGConfig from './tabs/DGConfig';
import DGAnalytics from './tabs/DGAnalytics';
import UtilityReports from '../../shared/UtilityReports';
import { api, type ApiUtilityType } from '../../../../lib/api';

const ICON_MAP: Record<string, LucideIcon> = {
  power: Power, factory: Factory, gauge: Gauge, zap: Zap,
  battery: BatteryCharging, wind: Wind, 'air-vent': AirVent, wrench: Wrench,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

const TABS = [
  { id: 'home',      label: 'Home',      icon: Home },
  { id: 'assets',    label: 'Assets',    icon: Package },
  { id: 'records',   label: 'Records',   icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: BoxesIcon },
  { id: 'engineers', label: 'Engineers', icon: HardHat },
  { id: 'config',    label: 'Config',    icon: Settings2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'reports',   label: 'Reports',   icon: FileBarChart },
];

interface DieselGeneratorProps {
  utilityTypeId: string;
}

export default function DieselGenerator({ utilityTypeId }: DieselGeneratorProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [utilityType, setUtilityType] = useState<ApiUtilityType | null>(null);

  useEffect(() => {
    setActiveTab('home');
    api.utilityTypes.list()
      .then(types => {
        const ut = types.find(t => t.id === utilityTypeId);
        setUtilityType(ut ?? null);
      })
      .catch(console.error);
  }, [utilityTypeId]);

  const UtIcon = utilityType?.icon ? (ICON_MAP[utilityType.icon] ?? Box) : Power;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6"
    >
      {/* Module header */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <UtIcon size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{utilityType?.name ?? 'Loading…'}</h1>
            {utilityType?.category && (
              <p className="text-sm text-white/70 mt-0.5">{utilityType.category}</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="flex gap-1.5 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                    transition-all whitespace-nowrap flex-shrink-0 cursor-pointer
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Tabs.Content value="home">      <DGHome utilityTypeId={utilityTypeId} />      </Tabs.Content>
            <Tabs.Content value="assets">   <DGAssets utilityTypeId={utilityTypeId} />   </Tabs.Content>
            <Tabs.Content value="records">  <DGRecords utilityTypeId={utilityTypeId} />  </Tabs.Content>
            <Tabs.Content value="inventory"><DGInventory utilityTypeId={utilityTypeId} /></Tabs.Content>
            <Tabs.Content value="engineers"><DGEngineers utilityTypeId={utilityTypeId} /></Tabs.Content>
            <Tabs.Content value="config">   <DGConfig utilityTypeId={utilityTypeId} />   </Tabs.Content>
            <Tabs.Content value="analytics"><DGAnalytics utilityTypeId={utilityTypeId} /></Tabs.Content>
            <Tabs.Content value="reports">  <UtilityReports utilityTypeId={utilityTypeId} utilityName={utilityType?.name} /></Tabs.Content>
          </div>
        </Tabs.Root>
      </motion.div>
    </motion.div>
  );
}
