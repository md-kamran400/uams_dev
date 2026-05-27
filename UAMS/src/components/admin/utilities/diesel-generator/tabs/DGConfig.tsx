import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { FileText, List, BarChart2, Bell, FileBarChart } from 'lucide-react';
import DGFields from './DGFields';
import DGForms from './DGForms';
import DGAlerts from './DGAlerts';
import DGKpis from './DGKpis';
import ReportTemplatesEditor from '../../../shared/ReportTemplatesEditor';

const CONFIG_TABS = [
  { id: 'forms',   label: 'Forms',   icon: FileText },
  { id: 'fields',  label: 'Fields',  icon: List },
  { id: 'kpis',    label: 'KPIs',    icon: BarChart2 },
  { id: 'alerts',  label: 'Alerts',  icon: Bell },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
];

interface DGConfigProps {
  utilityTypeId: string;
}

export default function DGConfig({ utilityTypeId }: DGConfigProps) {
  const [activeTab, setActiveTab] = useState('forms');

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Configuration</h3>
        <p className="text-sm text-gray-500">
          Manage forms, custom fields, KPI definitions, and alert rules for this utility.
        </p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {CONFIG_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2 rounded-md font-medium text-sm
                  transition-all whitespace-nowrap cursor-pointer
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <Icon size={14} />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="mt-5">
          <Tabs.Content value="forms"><DGForms utilityTypeId={utilityTypeId} /></Tabs.Content>
          <Tabs.Content value="fields"><DGFields utilityTypeId={utilityTypeId} /></Tabs.Content>
          <Tabs.Content value="kpis"><DGKpis utilityTypeId={utilityTypeId} /></Tabs.Content>
          <Tabs.Content value="alerts"><DGAlerts utilityTypeId={utilityTypeId} /></Tabs.Content>
          <Tabs.Content value="reports"><ReportTemplatesEditor utilityTypeId={utilityTypeId} /></Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
