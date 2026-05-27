import { useState } from "react";
import { motion } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Home,
  Package,
  ClipboardList,
  BoxesIcon,
  HardHat,
  Settings2,
  Wind,
  Power,
} from "lucide-react";
import CompressorHome from "./tabs/CompressorHome";
import CompressorAssets from "./tabs/CompressorAssets";
import CompressorRecords from "./tabs/CompressorRecords";
import CompressorInventory from "./tabs/CompressorInventory";
import CompressorEngineers from "./tabs/CompressorEngineers";
import CompressorEmission from "./tabs/CompressorEmission";
import CompressorConfig from "./tabs/CompressorConfig";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "assets", label: "Assets", icon: Package },
  { id: "emission", label: "Emission", icon: Power },
  { id: "records", label: "Records", icon: ClipboardList },
  { id: "inventory", label: "Inventory", icon: BoxesIcon },
  { id: "engineers", label: "Engineers", icon: HardHat },
  { id: "config", label: "Config", icon: Settings2 },
];

export default function Compressor() {
  const [activeTab, setActiveTab] = useState("home");

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
            <Wind size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Compressor</h1>
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

          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Tabs.Content value="home">
              {" "}
              <CompressorHome />{" "}
            </Tabs.Content>
            <Tabs.Content value="assets">
              {" "}
              <CompressorAssets />{" "}
            </Tabs.Content>
            <Tabs.Content value="emission">
              <CompressorEmission />
            </Tabs.Content>
            <Tabs.Content value="records">
              {" "}
              <CompressorRecords />{" "}
            </Tabs.Content>
            <Tabs.Content value="inventory">
              <CompressorInventory />
            </Tabs.Content>
            <Tabs.Content value="engineers">
              <CompressorEngineers />
            </Tabs.Content>
            <Tabs.Content value="config">
              {" "}
              <CompressorConfig />{" "}
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </motion.div>
    </motion.div>
  );
}
