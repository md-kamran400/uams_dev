import { useState } from "react";
import { motion } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Calendar as CalendarIcon,
  Settings,
  ClipboardList,
  Workflow
} from "lucide-react";
import Plan from "./Plan";
import PlanCalendar from "./PlanCalendar";
import PlanConfig from "./PlanConfig";

import WorkFlow from "./WorkFlow";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

const TABS = [
  { id: "plan", label: "Plan", icon: ClipboardList },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "config", label: "Config", icon: Settings },
  {id: "workflow_bulilder", label: "Work Flow", icon: Workflow}
];

export default function PlanIndex() {
  const [activeTab, setActiveTab] = useState("plan");

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
            <ClipboardList size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Plan</h1>
            <p className="text-white/70 text-sm mt-0.5">
              Manage maintenance plans, schedules, and configurations
            </p>
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
                    ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          <div className="mt-6">
            <Tabs.Content value="plan">
              <Plan />
            </Tabs.Content>
            <Tabs.Content value="calendar">
              <PlanCalendar />
            </Tabs.Content>
            <Tabs.Content value="config">
              <PlanConfig />
            </Tabs.Content>
            <Tabs.Content value="workflow_bulilder">
              <WorkFlow/>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </motion.div>
    </motion.div>
  );
}
