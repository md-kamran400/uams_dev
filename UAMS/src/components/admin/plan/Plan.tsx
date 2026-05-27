import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { ClipboardList, Calendar, Settings } from 'lucide-react'
import PlanList from './PlanList'
import PlanDetail from './PlanDetail'
import PlanCalendar from './PlanCalendar'
import { api, type ApiMaintenancePlan } from '../../../lib/api'

const TABS = [
  { id: 'plan', label: 'Plan', icon: ClipboardList },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'config', label: 'Config', icon: Settings },
]

export default function Plan() {
  const [activeTab, setActiveTab] = useState('plan')
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [plans, setPlans] = useState<ApiMaintenancePlan[]>([])

  useEffect(() => {
    api.maintenancePlans.list().then(setPlans).catch(console.error)
  }, [])

  function handleSelectPlan(id: string) {
    setSelectedPlanId(id)
  }

  function handleBackToList() {
    setSelectedPlanId(null)
    api.maintenancePlans.list().then(setPlans).catch(console.error)
  }

  // When a specific plan is selected, show PlanDetail full-screen (no tab bar)
  if (selectedPlanId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
        <PlanDetail planId={selectedPlanId} onBack={handleBackToList} />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-5"
    >
      {/* Banner — only shows on the list/calendar/config views */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Plan</h1>
            <p className="text-sm text-white/70 mt-0.5">Manage maintenance plans, schedules, and configurations</p>
          </div>
        </div>
      </div>

      <Tabs.Root value={activeTab} onValueChange={v => { setActiveTab(v) }}>
        <Tabs.List className="flex gap-1.5 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200 overflow-x-auto mb-5">
          {TABS.map(tab => {
            const Icon = tab.icon
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
                <Icon size={15} />
                <span>{tab.label}</span>
              </Tabs.Trigger>
            )
          })}
        </Tabs.List>

        <Tabs.Content value="plan">
          <PlanList onSelectPlan={handleSelectPlan} />
        </Tabs.Content>

        <Tabs.Content value="calendar">
          <PlanCalendar plans={plans} />
        </Tabs.Content>

        <Tabs.Content value="config">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Settings size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Plan configuration settings coming soon</p>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </motion.div>
  )
}
