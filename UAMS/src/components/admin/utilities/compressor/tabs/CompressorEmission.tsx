import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { FileText, List, BarChart2, Settings } from "lucide-react";
import CompressorEmissionHome from "./emission-tabs/CompressorEmissionHome";
import Emission from "./emission-tabs/Emission";
import CompressorEmissionReports from "./emission-tabs/CompressorEmissionReports";
import CompressorEmissionConfig from "./emission-tabs/CompressorEmissionConfig";

const CONFIG_TABS = [
  { id: "home", label: "Home", icon: FileText },
  { id: "emission", label: "Emission", icon: List },
  { id: "emissionReports", label: "Emission Reports", icon: BarChart2 },
  { id: "emissionConfig", label: "Emission Config", icon: Settings },
];

export default function CompressorEmission() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
          Compressor Emission
        </h3>
        <p className="text-xs sm:text-sm text-gray-500">
          Manage forms, emissions readings, reports, and configuration for
          compressor emission monitoring.
        </p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 bg-gray-100 rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
          {CONFIG_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={`
                  flex items-center gap-1 px-2 sm:px-3.5 py-2 rounded-md font-medium text-xs sm:text-sm
                  transition-all whitespace-nowrap cursor-pointer shrink-0
                  ${
                    activeTab === tab.id
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }
                `}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="mt-4 sm:mt-5">
          <Tabs.Content value="home">
            <CompressorEmissionHome />
          </Tabs.Content>
          <Tabs.Content value="emission">
            <Emission />
          </Tabs.Content>
          <Tabs.Content value="emissionReports">
            <CompressorEmissionReports />
          </Tabs.Content>
          <Tabs.Content value="emissionConfig">
            <CompressorEmissionConfig />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
