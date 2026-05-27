import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { Home, ArrowLeftRight, Users, Database, BarChart2, Settings2, Fuel } from 'lucide-react';
import FuelOverview from './tabs/FuelOverview';
import FuelTransactions from './tabs/FuelTransactions';
import FuelConsumers from './tabs/FuelConsumers';
import FuelTanks from './tabs/FuelTanks';
import FuelReports from './tabs/FuelReports';
import FuelConfig from './tabs/FuelConfig';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

const TABS = [
  { id: 'overview',      label: 'Overview',      icon: Home },
  { id: 'transactions',  label: 'Transactions',  icon: ArrowLeftRight },
  { id: 'consumers',     label: 'Consumers',     icon: Users },
  { id: 'tanks',         label: 'Tanks',         icon: Database },
  { id: 'reports',       label: 'Reports',       icon: BarChart2 },
  { id: 'config',        label: 'Config',        icon: Settings2 },
];

export default function FuelPage() {
  const [activeTab, setActiveTab] = useState('overview');

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
        className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-8 text-white shadow-xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Fuel size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Fuel</h1>
            <p className="text-orange-100 text-sm mt-0.5">Monitor fuel receipts, dispensing, and stock across all tanks</p>
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
                      ? 'bg-orange-500 text-white shadow-md'
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
            <Tabs.Content value="overview">     <FuelOverview />     </Tabs.Content>
            <Tabs.Content value="transactions"> <FuelTransactions /> </Tabs.Content>
            <Tabs.Content value="consumers">    <FuelConsumers />    </Tabs.Content>
            <Tabs.Content value="tanks">        <FuelTanks />        </Tabs.Content>
            <Tabs.Content value="reports">      <FuelReports />      </Tabs.Content>
            <Tabs.Content value="config">       <FuelConfig />       </Tabs.Content>
          </div>
        </Tabs.Root>
      </motion.div>
    </motion.div>
  );
}
