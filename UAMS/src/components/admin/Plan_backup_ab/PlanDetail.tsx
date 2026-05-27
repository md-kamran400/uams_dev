import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import * as Dialog from "@radix-ui/react-dialog";
import {
  PlanType,
  ScheduleEntry,
  updatePlanScheduleData,
} from "../../../data/planData";
import {
  COMPRESSOR_ASSETS,
  CompressorAsset,
} from "../../../data/compressorAssets";
import { DG_ASSETS, DGAsset } from "../../../data/dgAssets";

interface PlanDetailProps {
  plan: PlanType;
  onBack: () => void;
  onUpdate?: (updatedPlan: PlanType) => void;
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ScheduleEntry>[]) => void;
  initialData?: ScheduleEntry;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  equipmentName: string;
}

type AssetItem = CompressorAsset | DGAsset;

interface FrequencyConfig {
  value: string;
  label: string;
  icon: string;
  symbol: string;
  months: number[];
}

// Frequency configuration
const frequencyOptions: FrequencyConfig[] = [
  {
    value: "M",
    label: "Monthly",
    icon: "○",
    symbol: "○",
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  {
    value: "Q",
    label: "Quarterly",
    icon: "△",
    symbol: "△",
    months: [2, 5, 8, 11],
  },
  {
    value: "HY",
    label: "Half Yearly",
    icon: "▭",
    symbol: "▭",
    months: [5, 11],
  },
  { value: "Y", label: "Yearly", icon: "☆", symbol: "☆", months: [0] },
];

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const yearOptions = Array.from({ length: 11 }, (_, i) => (2020 + i).toString());
const dayOptions = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

const getFrequencyIcon = (frequency: string) => {
  const option = frequencyOptions.find((opt) => opt.value === frequency);
  return option?.symbol || "○";
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Nested Multi-select dropdown component with groups
interface NestedMultiSelectProps {
  label: string;
  groups: {
    name: string;
    options: { value: string; label: string }[];
  }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const NestedMultiSelect: React.FC<NestedMultiSelectProps> = ({
  label,
  groups,
  selectedValues,
  onChange,
  placeholder = "Select options",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<{
    [key: string]: boolean;
  }>({
    "DG Assets": true,
    "Compressor Assets": true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const toggleGroupAll = (groupOptions: { value: string; label: string }[]) => {
    const groupValues = groupOptions.map((opt) => opt.value);
    const allSelected = groupValues.every((v) => selectedValues.includes(v));

    if (allSelected) {
      onChange(selectedValues.filter((v) => !groupValues.includes(v)));
    } else {
      const newValues = [...selectedValues];
      groupValues.forEach((v) => {
        if (!newValues.includes(v)) {
          newValues.push(v);
        }
      });
      onChange(newValues);
    }
  };

  const getGroupSelectedCount = (
    groupOptions: { value: string; label: string }[],
  ) => {
    return groupOptions.filter((opt) => selectedValues.includes(opt.value))
      .length;
  };

  const totalOptions = groups.reduce(
    (sum, group) => sum + group.options.length,
    0,
  );
  const totalSelected = selectedValues.length;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors flex items-center justify-between bg-white"
        >
          <span className="truncate">
            {selectedValues.length === 0
              ? placeholder
              : `${selectedValues.length} asset${selectedValues.length !== 1 ? "s" : ""} selected`}
          </span>
          <ChevronDown
            size={16}
            className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <label className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={totalSelected === totalOptions && totalOptions > 0}
                  onChange={() => {
                    if (totalSelected === totalOptions) {
                      onChange([]);
                    } else {
                      const allValues = groups.flatMap((g) =>
                        g.options.map((opt) => opt.value),
                      );
                      onChange(allValues);
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  Select All ({totalSelected}/{totalOptions})
                </span>
              </label>
            </div>

            {groups.map((group) => {
              const groupSelectedCount = getGroupSelectedCount(group.options);
              const isGroupExpanded = expandedGroups[group.name];

              return (
                <div
                  key={group.name}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isGroupExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={
                            groupSelectedCount === group.options.length &&
                            group.options.length > 0
                          }
                          onChange={() => toggleGroupAll(group.options)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          {group.name} ({groupSelectedCount}/
                          {group.options.length})
                        </span>
                      </label>
                    </div>
                  </div>

                  {isGroupExpanded && (
                    <div className="ml-6 pb-2">
                      {group.options.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedValues.includes(option.value)}
                            onChange={() => toggleOption(option.value)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface SelectedFrequency {
  frequency: string;
  scheduleDate: string;
  scheduleMonth?: number;
}

interface MultiFrequencySelectorProps {
  selectedFrequencies: SelectedFrequency[];
  onChange: (configs: SelectedFrequency[]) => void;
}

const MultiFrequencySelector: React.FC<MultiFrequencySelectorProps> = ({
  selectedFrequencies,
  onChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownId = React.useId(); // Generate unique ID for each instance

  const toggleFrequency = (freqValue: string) => {
    const isSelected = selectedFrequencies.some(
      (sf) => sf.frequency === freqValue,
    );

    if (isSelected) {
      onChange(selectedFrequencies.filter((sf) => sf.frequency !== freqValue));
    } else {
      const freqOption = frequencyOptions.find((f) => f.value === freqValue);
      if (freqOption) {
        const newConfig: SelectedFrequency = {
          frequency: freqValue,
          scheduleDate: "10",
          scheduleMonth: freqValue === "Y" ? 0 : undefined,
        };
        onChange([...selectedFrequencies, newConfig]);
      }
    }
  };

  const updateScheduleDate = (freqValue: string, date: string) => {
    onChange(
      selectedFrequencies.map((sf) =>
        sf.frequency === freqValue ? { ...sf, scheduleDate: date } : sf,
      ),
    );
  };

  const updateScheduleMonth = (freqValue: string, month: number) => {
    onChange(
      selectedFrequencies.map((sf) =>
        sf.frequency === freqValue ? { ...sf, scheduleMonth: month } : sf,
      ),
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const dropdown = document.getElementById(
        `frequency-dropdown-${dropdownId}`,
      );
      const button = document.getElementById(`frequency-button-${dropdownId}`);

      if (
        dropdown &&
        button &&
        !button.contains(target) &&
        !dropdown.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Frequencies & Schedule Dates
        </label>
        <div className="relative">
          <button
            id={`frequency-button-${dropdownId}`}
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors flex items-center justify-between bg-white"
          >
            <span className="truncate">
              {selectedFrequencies.length === 0
                ? "Select frequencies..."
                : `${selectedFrequencies.length} frequency(ies) selected`}
            </span>
            <ChevronDown
              size={16}
              className={`transform transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isDropdownOpen && (
            <div
              id={`frequency-dropdown-${dropdownId}`}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {frequencyOptions.map((option) => {
                const isSelected = selectedFrequencies.some(
                  (sf) => sf.frequency === option.value,
                );
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleFrequency(option.value)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {option.label} ({option.symbol})
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedFrequencies.length > 0 && (
        <div className="space-y-3">
          {selectedFrequencies.map((config) => {
            const freqOption = frequencyOptions.find(
              (f) => f.value === config.frequency,
            );
            if (!freqOption) return null;

            return (
              <div key={config.frequency} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {freqOption.label} ({freqOption.symbol})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {config.frequency === "Y" ? (
                    <>
                      <select
                        value={config.scheduleMonth || 0}
                        onChange={(e) =>
                          updateScheduleMonth(
                            config.frequency,
                            parseInt(e.target.value),
                          )
                        }
                        className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                      >
                        {months.map((month, monthIdx) => (
                          <option key={monthIdx} value={monthIdx}>
                            {month}
                          </option>
                        ))}
                      </select>
                      <select
                        value={config.scheduleDate}
                        onChange={(e) =>
                          updateScheduleDate(config.frequency, e.target.value)
                        }
                        className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                      >
                        {dayOptions.map((day) => (
                          <option key={day} value={day}>
                            {day}
                            {getDaySuffix(parseInt(day))}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        {config.frequency === "M"
                          ? "Day of month:"
                          : config.frequency === "Q"
                            ? "Day of quarter months:"
                            : "Day of half-year months:"}
                      </span>
                      <select
                        value={config.scheduleDate}
                        onChange={(e) =>
                          updateScheduleDate(config.frequency, e.target.value)
                        }
                        className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                      >
                        {dayOptions.map((day) => (
                          <option key={day} value={day}>
                            {day}
                            {getDaySuffix(parseInt(day))}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const getDaySuffix = (day: number): string => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const formatCellDisplay = (icon: string, date: string): string => {
  return `${icon} ${date}${getDaySuffix(parseInt(date))}`;
};

const FinalizeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  equipmentCount: number;
}> = ({ isOpen, onClose, onConfirm, equipmentCount }) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle size={24} className="text-blue-600" />
              </div>
            </div>

            <Dialog.Title className="text-xl font-bold text-center text-gray-800 mb-3">
              Finalize Schedule
            </Dialog.Title>

            <p className="text-center text-gray-600 mb-2">
              Are you sure you want to finalize this schedule?
            </p>

            <p className="text-center text-sm text-gray-500 mb-6">
              This schedule will be sent to {equipmentCount} asset(s) and
              respective team members via email.
            </p>

            <div className="flex gap-3">
              <Dialog.Close asChild>
                <Button variant="secondary" className="flex-1">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button variant="primary" className="flex-1" onClick={onConfirm}>
                OK
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  equipmentName,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
            </div>

            <Dialog.Title className="text-xl font-bold text-center text-gray-800 mb-3">
              Confirm Delete
            </Dialog.Title>

            <p className="text-center text-gray-600 mb-2">
              Are you sure you want to delete this schedule entry?
            </p>

            <p className="text-center text-sm text-gray-500 mb-6">
              Equipment: <span className="font-semibold">{equipmentName}</span>
              <br />
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <Dialog.Close asChild>
                <Button variant="secondary" className="flex-1">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={onConfirm}
              >
                Delete
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const EditScheduleModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"assets" | "equipment">("assets");

  // Asset list - supports multiple asset entries with individual configurations
  const [assetList, setAssetList] = useState<
    {
      id: string;
      assetTags: string[];
      frequencyConfigs: SelectedFrequency[];
      year: string;
      remarks: string;
    }[]
  >([]);

  // Equipment list
  const [equipmentList, setEquipmentList] = useState<
    {
      id: string;
      equipmentNo: string;
      equipmentDescription: string;
      frequencyConfigs: SelectedFrequency[];
      year: string;
      remarks: string;
    }[]
  >([]);

  const assetGroups = [
    {
      name: "DG Assets",
      options: DG_ASSETS.map((asset) => ({
        value: asset.assetTag,
        label: `${asset.assetTag} - ${asset.unitName} (${asset.make} ${asset.model})`,
      })),
    },
    {
      name: "Compressor Assets",
      options: COMPRESSOR_ASSETS.map((asset) => ({
        value: asset.assetTag,
        label: `${asset.assetTag} - ${asset.unitName} (${asset.make} ${asset.model})`,
      })),
    },
  ];

  useEffect(() => {
    if (initialData) {
      setAssetList([
        {
          id: Date.now().toString(),
          assetTags: [initialData.equipmentNo || ""],
          frequencyConfigs: [
            {
              frequency: initialData.frequency || "M",
              scheduleDate: initialData.scheduleDate || "10",
              scheduleMonth: initialData.frequency === "Y" ? 0 : undefined,
            },
          ],
          year: initialData.year || new Date().getFullYear().toString(),
          remarks: initialData.remarks || "",
        },
      ]);
      setEquipmentList([]);
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setCurrentStep(1);
    setActiveTab("assets");
    setAssetList([]);
    setEquipmentList([]);
  };

  const getAssetByTag = (assetTag: string): AssetItem | undefined => {
    const dgAsset = DG_ASSETS.find((a) => a.assetTag === assetTag);
    if (dgAsset) return dgAsset;
    return COMPRESSOR_ASSETS.find((a) => a.assetTag === assetTag);
  };

  const generateMonthlyDataForEntry = (
    frequencyConfigsList: SelectedFrequency[],
  ) => {
    const dummyData: { [key: string]: { plan: string; actual: string } } = {};

    months.forEach((month) => {
      dummyData[month] = { plan: "", actual: "" };
    });

    frequencyConfigsList.forEach((config) => {
      const freqOption = frequencyOptions.find(
        (f) => f.value === config.frequency,
      );
      if (!freqOption) return;

      const icon = freqOption.symbol;
      const scheduleDate = config.scheduleDate;
      const displayValue = formatCellDisplay(icon, scheduleDate);

      let monthsToSchedule: number[] = [];

      if (config.frequency === "Y") {
        const selectedMonth = config.scheduleMonth ?? 0;
        monthsToSchedule = [selectedMonth];
      } else {
        monthsToSchedule = [...freqOption.months];
      }

      monthsToSchedule.forEach((monthIdx) => {
        const monthName = months[monthIdx];
        if (dummyData[monthName].plan) {
          dummyData[monthName].plan =
            `${dummyData[monthName].plan} | ${displayValue}`;
        } else {
          dummyData[monthName].plan = displayValue;
        }
        dummyData[monthName].actual = "--";
      });
    });

    return dummyData;
  };

  // Asset handlers
  const handleAddAssetItem = () => {
    const newId = Date.now().toString();
    setAssetList([
      ...assetList,
      {
        id: newId,
        assetTags: [],
        frequencyConfigs: [],
        year: new Date().getFullYear().toString(),
        remarks: "",
      },
    ]);
  };

  const handleRemoveAssetItem = (id: string) => {
    setAssetList(assetList.filter((item) => item.id !== id));
  };

  const handleAssetTagsChange = (id: string, tags: string[]) => {
    setAssetList(
      assetList.map((item) =>
        item.id === id ? { ...item, assetTags: tags } : item,
      ),
    );
  };

  const handleAssetFrequencyChange = (
    id: string,
    configs: SelectedFrequency[],
  ) => {
    setAssetList(
      assetList.map((item) =>
        item.id === id ? { ...item, frequencyConfigs: configs } : item,
      ),
    );
  };

  const handleAssetItemChange = (
    id: string,
    field: "year" | "remarks",
    value: string,
  ) => {
    setAssetList(
      assetList.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  // Equipment handlers
  const handleAddEquipmentItem = () => {
    const newId = Date.now().toString();
    setEquipmentList([
      ...equipmentList,
      {
        id: newId,
        equipmentNo: "",
        equipmentDescription: "",
        frequencyConfigs: [],
        year: new Date().getFullYear().toString(),
        remarks: "",
      },
    ]);
  };

  const handleRemoveEquipmentItem = (id: string) => {
    setEquipmentList(equipmentList.filter((item) => item.id !== id));
  };

  const handleEquipmentItemChange = (
    id: string,
    field: "equipmentNo" | "equipmentDescription" | "year" | "remarks",
    value: string,
  ) => {
    setEquipmentList(
      equipmentList.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleEquipmentFrequencyChange = (
    id: string,
    configs: SelectedFrequency[],
  ) => {
    setEquipmentList(
      equipmentList.map((item) =>
        item.id === id ? { ...item, frequencyConfigs: configs } : item,
      ),
    );
  };

  const handleSave = () => {
    const newEntries: Partial<ScheduleEntry>[] = [];

    // Process asset list
    assetList.forEach((assetItem) => {
      if (
        assetItem.assetTags.length > 0 &&
        assetItem.frequencyConfigs.length > 0
      ) {
        assetItem.assetTags.forEach((assetTag) => {
          const asset = getAssetByTag(assetTag);
          if (asset) {
            const monthlyData = generateMonthlyDataForEntry(
              assetItem.frequencyConfigs,
            );
            const primaryFreq = assetItem.frequencyConfigs[0]?.frequency || "M";

            newEntries.push({
              equipmentNo: asset.assetTag,
              equipmentDescription: `${asset.unitName} - ${asset.make} ${asset.model}`,
              frequency: primaryFreq as "M" | "Q" | "HY" | "Y",
              year: assetItem.year,
              scheduleDate: assetItem.frequencyConfigs[0]?.scheduleDate || "10",
              monthlyData: monthlyData,
              remarks: assetItem.remarks,
            });
          }
        });
      }
    });

    // Process equipment list
    equipmentList.forEach((equipment) => {
      if (
        equipment.equipmentNo &&
        equipment.equipmentDescription &&
        equipment.frequencyConfigs.length > 0
      ) {
        const monthlyData = generateMonthlyDataForEntry(
          equipment.frequencyConfigs,
        );
        const primaryFreq = equipment.frequencyConfigs[0]?.frequency || "M";

        newEntries.push({
          equipmentNo: equipment.equipmentNo,
          equipmentDescription: equipment.equipmentDescription,
          frequency: primaryFreq as "M" | "Q" | "HY" | "Y",
          year: equipment.year,
          scheduleDate: equipment.frequencyConfigs[0]?.scheduleDate || "10",
          monthlyData: monthlyData,
          remarks: equipment.remarks,
        });
      }
    });

    if (newEntries.length > 0) {
      onSave(newEntries);
      resetForm();
      onClose();
    }
  };

  const getPreviewData = () => {
    const previewItems: {
      type: string;
      equipmentNo: string;
      equipmentDescription: string;
      year: string;
      schedulePreview: { month: string; displayValue: string }[];
      remarks: string;
    }[] = [];

    // Preview for assets
    assetList.forEach((assetItem) => {
      if (
        assetItem.assetTags.length > 0 &&
        assetItem.frequencyConfigs.length > 0
      ) {
        assetItem.assetTags.forEach((assetTag) => {
          const asset = getAssetByTag(assetTag);
          if (asset) {
            const previewSchedule: { month: string; displayValue: string }[] =
              [];
            assetItem.frequencyConfigs.forEach((config) => {
              const freqOption = frequencyOptions.find(
                (f) => f.value === config.frequency,
              );
              if (freqOption) {
                const icon = freqOption.symbol;
                const scheduleDate = config.scheduleDate;
                const displayValue = `${icon} ${scheduleDate}${getDaySuffix(parseInt(scheduleDate))}`;

                let monthsToSchedule: number[] = [];
                if (config.frequency === "Y") {
                  const selectedMonth = config.scheduleMonth ?? 0;
                  monthsToSchedule = [selectedMonth];
                } else {
                  monthsToSchedule = [...freqOption.months];
                }

                monthsToSchedule.forEach((monthIdx) => {
                  previewSchedule.push({
                    month: months[monthIdx],
                    displayValue,
                  });
                });
              }
            });

            previewItems.push({
              type: "Asset",
              equipmentNo: asset.assetTag,
              equipmentDescription: `${asset.unitName} - ${asset.make} ${asset.model}`,
              year: assetItem.year,
              schedulePreview: previewSchedule,
              remarks: assetItem.remarks,
            });
          }
        });
      }
    });

    // Preview for equipment
    equipmentList.forEach((equipment) => {
      if (
        equipment.equipmentNo &&
        equipment.equipmentDescription &&
        equipment.frequencyConfigs.length > 0
      ) {
        const previewSchedule: { month: string; displayValue: string }[] = [];
        equipment.frequencyConfigs.forEach((config) => {
          const freqOption = frequencyOptions.find(
            (f) => f.value === config.frequency,
          );
          if (freqOption) {
            const icon = freqOption.symbol;
            const scheduleDate = config.scheduleDate;
            const displayValue = `${icon} ${scheduleDate}${getDaySuffix(parseInt(scheduleDate))}`;

            let monthsToSchedule: number[] = [];
            if (config.frequency === "Y") {
              const selectedMonth = config.scheduleMonth ?? 0;
              monthsToSchedule = [selectedMonth];
            } else {
              monthsToSchedule = [...freqOption.months];
            }

            monthsToSchedule.forEach((monthIdx) => {
              previewSchedule.push({
                month: months[monthIdx],
                displayValue,
              });
            });
          }
        });

        previewItems.push({
          type: "Equipment",
          equipmentNo: equipment.equipmentNo,
          equipmentDescription: equipment.equipmentDescription,
          year: equipment.year,
          schedulePreview: previewSchedule,
          remarks: equipment.remarks,
        });
      }
    });

    return previewItems;
  };

  const isValidForPreview = () => {
    if (activeTab === "assets") {
      return assetList.some(
        (item) => item.assetTags.length > 0 && item.frequencyConfigs.length > 0,
      );
    }
    return equipmentList.some(
      (item) =>
        item.equipmentNo &&
        item.equipmentDescription &&
        item.frequencyConfigs.length > 0,
    );
  };

  const handleContinue = () => {
    if (isValidForPreview()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const previewData = getPreviewData();

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={() => {
        resetForm();
        onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
            <div className="flex items-center justify-between px-6 py-4">
              <Dialog.Title className="text-base font-bold text-gray-800">
                {initialData ? "Edit Schedule Entry" : "Add New Schedule Entry"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex border-b border-gray-100">
              <button
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  currentStep === 1
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => currentStep === 1 && setCurrentStep(1)}
              >
                Step 1: Configure
              </button>
              <button
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  currentStep === 2
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => previewData.length > 0 && setCurrentStep(2)}
              >
                Step 2: Preview & Confirm
              </button>
            </div>
          </div>

          {currentStep === 1 ? (
            <div className="px-6 py-5 space-y-6">
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("assets")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "assets"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Select Assets
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("equipment")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "equipment"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Add Equipment
                </button>
              </div>

              {/* Assets Tab - Multiple asset entries */}
              {activeTab === "assets" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Asset Entries
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddAssetItem}
                      className="flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Asset Entry
                    </Button>
                  </div>

                  {assetList.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No asset entries added yet</p>
                      <p className="text-xs mt-1">
                        Click "Add Asset Entry" to start
                      </p>
                    </div>
                  ) : (
                    assetList.map((assetItem, idx) => (
                      <div
                        key={assetItem.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">
                            Asset Entry #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAssetItem(assetItem.id)}
                            className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <NestedMultiSelect
                          label="Select Assets (Multiple)"
                          groups={assetGroups}
                          selectedValues={assetItem.assetTags}
                          onChange={(tags) =>
                            handleAssetTagsChange(assetItem.id, tags)
                          }
                          placeholder="Choose assets..."
                        />

                        {assetItem.assetTags.length > 0 && (
                          <>
                            <div className="mt-4">
                              <MultiFrequencySelector
                                selectedFrequencies={assetItem.frequencyConfigs}
                                onChange={(configs) =>
                                  handleAssetFrequencyChange(
                                    assetItem.id,
                                    configs,
                                  )
                                }
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700">
                                  Year
                                </label>
                                <select
                                  value={assetItem.year}
                                  onChange={(e) =>
                                    handleAssetItemChange(
                                      assetItem.id,
                                      "year",
                                      e.target.value,
                                    )
                                  }
                                  className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                                >
                                  {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                      {year}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <Input
                              label="Remarks"
                              placeholder="Additional notes..."
                              value={assetItem.remarks}
                              onChange={(e) =>
                                handleAssetItemChange(
                                  assetItem.id,
                                  "remarks",
                                  e.target.value,
                                )
                              }
                              className="mt-4"
                            />
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Equipment Tab */}
              {activeTab === "equipment" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Equipment List
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddEquipmentItem}
                      className="flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Equipment
                    </Button>
                  </div>

                  {equipmentList.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No equipment added yet</p>
                      <p className="text-xs mt-1">
                        Click "Add Equipment" to start
                      </p>
                    </div>
                  ) : (
                    equipmentList.map((equipment, idx) => (
                      <div
                        key={equipment.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">
                            Equipment #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveEquipmentItem(equipment.id)
                            }
                            className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <Input
                            label="Equipment No./Functional loc."
                            placeholder="EQ-001"
                            value={equipment.equipmentNo}
                            onChange={(e) =>
                              handleEquipmentItemChange(
                                equipment.id,
                                "equipmentNo",
                                e.target.value,
                              )
                            }
                          />
                          <Input
                            label="Equipment Description"
                            placeholder="Diesel Generator Set"
                            value={equipment.equipmentDescription}
                            onChange={(e) =>
                              handleEquipmentItemChange(
                                equipment.id,
                                "equipmentDescription",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <MultiFrequencySelector
                          selectedFrequencies={equipment.frequencyConfigs}
                          onChange={(configs) =>
                            handleEquipmentFrequencyChange(
                              equipment.id,
                              configs,
                            )
                          }
                        />

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">
                              Year
                            </label>
                            <select
                              value={equipment.year}
                              onChange={(e) =>
                                handleEquipmentItemChange(
                                  equipment.id,
                                  "year",
                                  e.target.value,
                                )
                              }
                              className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                            >
                              {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <Input
                          label="Remarks"
                          placeholder="Additional notes..."
                          value={equipment.remarks}
                          onChange={(e) =>
                            handleEquipmentItemChange(
                              equipment.id,
                              "remarks",
                              e.target.value,
                            )
                          }
                          className="mt-4"
                        />
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Dialog.Close asChild>
                  <Button variant="secondary" size="sm">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleContinue}
                  disabled={!isValidForPreview()}
                  className={
                    !isValidForPreview() ? "opacity-50 cursor-not-allowed" : ""
                  }
                >
                  Continue to Preview →
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  Schedule Preview
                </h3>

                {previewData.length === 0 ? (
                  <div className="text-center py-8 text-amber-600 bg-amber-50 rounded-lg">
                    <AlertCircle size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No valid entries to preview</p>
                    <p className="text-xs mt-1">
                      Please go back and add assets or equipment with
                      frequencies
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                    {previewData.map((item, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-4 bg-white"
                      >
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <Badge>{item.type}</Badge>
                            <span className="font-mono text-sm font-medium text-gray-800">
                              {item.equipmentNo}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            Year: {item.year}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {item.equipmentDescription}
                        </p>

                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Schedule:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {item.schedulePreview.map((schedule, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
                              >
                                <span className="font-mono">
                                  {schedule.displayValue.split(" ")[0]}
                                </span>
                                <span>
                                  {schedule.displayValue.split(" ")[1]}
                                </span>
                                <span className="text-gray-400">
                                  - {schedule.month}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {item.remarks && (
                          <p className="text-xs text-gray-500 italic">
                            {item.remarks}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {previewData.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Summary:</strong> You are about to add{" "}
                    {previewData.length} schedule entr
                    {previewData.length !== 1 ? "ies" : "y"}.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <Button variant="secondary" size="sm" onClick={handleBack}>
                  ← Back
                </Button>
                <div className="flex gap-3">
                  <Dialog.Close asChild>
                    <Button variant="secondary" size="sm">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={previewData.length === 0}
                    className={
                      previewData.length === 0
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  >
                    Confirm & Add ({previewData.length})
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const PlanDetail: React.FC<PlanDetailProps> = ({ plan, onBack, onUpdate }) => {
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>(
    plan.scheduleData || [],
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | undefined>(
    undefined,
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<ScheduleEntry | null>(
    null,
  );

  const handleFinalize = () => {
    console.log(`Schedule finalized for ${scheduleData.length} equipment(s)`);
    console.log("Email sent to respective team members");
    toast.success(
      `Schedule finalized for ${scheduleData.length} equipment(s)! Email sent to team members.`,
      {
        position: "top-right",
        autoClose: 3000,
      },
    );
    setIsFinalizeModalOpen(false);
  };

  useEffect(() => {
    if (hasChanges) {
      const updatedPlan = { ...plan, scheduleData };
      updatePlanScheduleData(plan.id, scheduleData);
      if (onUpdate) {
        onUpdate(updatedPlan);
      }
      setHasChanges(false);
    }
  }, [scheduleData, hasChanges, plan, onUpdate]);

  const statusConfig = {
    active: {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      label: "Active",
      variant: "success" as const,
    },
    inactive: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      label: "Inactive",
      variant: "error" as const,
    },
    draft: {
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      label: "Draft",
      variant: "warning" as const,
    },
  };

  const StatusIcon = statusConfig[plan.active].icon;

  const handleAddEditEntry = (dataArray: Partial<ScheduleEntry>[]) => {
    if (editingEntry) {
      const data = dataArray[0];
      setScheduleData((prev) =>
        prev.map((entry) =>
          entry.id === editingEntry.id
            ? ({
                ...entry,
                ...data,
                monthlyData: data.monthlyData || entry.monthlyData,
              } as ScheduleEntry)
            : entry,
        ),
      );
      toast.success(
        `Schedule entry for "${editingEntry.equipmentNo}" updated successfully!`,
        {
          position: "top-right",
          autoClose: 3000,
        },
      );
      setEditingEntry(undefined);
    } else {
      const newEntries: ScheduleEntry[] = dataArray.map((data, index) => ({
        id: `${Date.now()}-${index}`,
        equipmentNo: data.equipmentNo || "",
        equipmentDescription: data.equipmentDescription || "",
        frequency: data.frequency || "M",
        year: data.year || new Date().getFullYear().toString(),
        scheduleDate: data.scheduleDate || "10",
        monthlyData: data.monthlyData || {},
        remarks: data.remarks || "",
      }));
      setScheduleData((prev) => [...prev, ...newEntries]);
      toast.success(
        `Added ${newEntries.length} new schedule entr${newEntries.length !== 1 ? "ies" : "y"} successfully!`,
        {
          position: "top-right",
          autoClose: 3000,
        },
      );
    }
    setHasChanges(true);
  };

  const handleDeleteEntry = () => {
    if (deletingEntry) {
      setScheduleData((prev) =>
        prev.filter((entry) => entry.id !== deletingEntry.id),
      );
      toast.success(
        `Schedule entry for "${deletingEntry.equipmentNo}" deleted successfully!`,
        {
          position: "top-right",
          autoClose: 3000,
        },
      );
      setHasChanges(true);
      setIsDeleteModalOpen(false);
      setDeletingEntry(null);
    }
  };

  const handleDeleteClick = (entry: ScheduleEntry) => {
    setDeletingEntry(entry);
    setIsDeleteModalOpen(true);
  };

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const updateRemarks = (rowId: string, value: string) => {
    setScheduleData((prev) =>
      prev.map((entry) =>
        entry.id === rowId ? { ...entry, remarks: value } : entry,
      ),
    );
    setHasChanges(true);
  };

  const renderCellContent = (value: string) => {
    if (value && value.includes(" | ")) {
      const parts = value.split(" | ");
      return (
        <div className="flex flex-col items-center gap-0.5">
          {parts.map((part, idx) => {
            const match = part.match(/([○△▭☆])\s+(\d+)(?:st|nd|rd|th)?/);
            if (match) {
              const [, icon, date] = match;
              return (
                <span
                  key={idx}
                  className="flex items-center justify-center gap-1 text-xs"
                >
                  <span className="text-blue-500 font-mono">{icon}</span>
                  <span className="text-gray-700">
                    {date}
                    {getDaySuffix(parseInt(date))}
                  </span>
                </span>
              );
            }
            return (
              <span key={idx} className="text-xs text-gray-500">
                {part}
              </span>
            );
          })}
        </div>
      );
    }

    if (value === "--" || !value) {
      return (
        <span className="text-black">
          ▭ △ <br /> 10th
        </span>
      );
    }

    const match = value.match(/([○△▭☆])\s+(\d+)(?:st|nd|rd|th)?/);
    if (match) {
      const [, icon, date] = match;
      return (
        <span className="flex items-center justify-center gap-1">
          <span className="text-blue-500 font-mono">{icon}</span>
          <span className="text-gray-700">
            {date}
            {getDaySuffix(parseInt(date))}
          </span>
        </span>
      );
    }

    return <span className="text-gray-700">{value}</span>;
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-6 space-y-6"
      >
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Plans
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingEntry(undefined);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus size={15} className="mr-1" />
                Add Assets
              </Button>

              {scheduleData.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFinalizeModalOpen(true)}
                  className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                >
                  <CheckCircle size={15} className="mr-1" />
                  Finalized
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-xl"
        >
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{plan.planName}</h1>
                <Badge variant={statusConfig[plan.active].variant}>
                  {statusConfig[plan.active].label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-white/80">
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span className="text-sm">Year: {plan.year}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package size={16} />
                  <span className="text-sm">Plan ID: {plan.planId}</span>
                </div>
              </div>
            </div>
            <div className={`${statusConfig[plan.active].bg} p-3 rounded-xl`}>
              <StatusIcon
                className={`w-8 h-8 ${statusConfig[plan.active].color}`}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Frequency Legend
          </h3>
          <div className="flex flex-wrap gap-6">
            {frequencyOptions.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <span className="text-lg font-mono">{opt.symbol}</span>
                <span className="text-sm text-gray-600">{opt.label}</span>
                <span className="text-xs text-gray-400">
                  ({opt.months.map((m) => months[m]).join(", ")})
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto"
        >
          <table className="min-w-[1400px] w-full border-collapse">
            <thead className="bg-gray-50">
              <tr className="border-b-2 border-gray-200">
                <th
                  rowSpan={2}
                  className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap border-r border-gray-200 w-16"
                >
                  S.No.
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap border-r border-gray-200 min-w-[180px]"
                >
                  Equipment No./Functional loc.
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap border-r border-gray-200 min-w-[200px]"
                >
                  Equipment Description
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-4 text-center font-semibold text-gray-700 text-sm whitespace-nowrap border-r border-gray-200 w-20"
                >
                  Freq.
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-4 text-center font-semibold text-gray-700 text-sm whitespace-nowrap border-r border-gray-200 w-24"
                >
                  Year
                </th>
                {months.map((month) => (
                  <th
                    key={month}
                    colSpan={2}
                    className="py-2 px-3 text-center font-semibold text-gray-700 text-sm border-b border-gray-200"
                  >
                    {month}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap border-l border-gray-200 min-w-[150px]"
                >
                  Remarks
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-4 text-center font-semibold text-gray-700 text-sm whitespace-nowrap w-20"
                >
                  Actions
                </th>
              </tr>
              <tr className="border-b border-gray-200">
                {months.map((month) => (
                  <React.Fragment key={`${month}-sub`}>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 w-24">
                      Plan
                    </th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 w-24">
                      Actual
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleData.length === 0 ? (
                <tr>
                  <td
                    colSpan={16 + months.length * 2}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No equipment added. Click "Add Assets" to create schedule
                    entries.
                  </td>
                </tr>
              ) : (
                scheduleData.map((entry, idx) => (
                  <motion.tr
                    key={entry.id}
                    variants={itemVariants}
                    className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600 border-r border-gray-100 text-center">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800 border-r border-gray-100">
                      {entry.equipmentNo}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 border-r border-gray-100">
                      {entry.equipmentDescription}
                    </td>
                    <td className="py-3 px-4 text-center text-lg border-r border-gray-100">
                      <span className="font-mono">
                        {getFrequencyIcon(entry.frequency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600 border-r border-gray-100">
                      {entry.year || plan.year}
                    </td>
                    {months.map((month) => (
                      <React.Fragment key={`${entry.id}-${month}`}>
                        <td className="py-2 px-2 text-center">
                          <div className="w-full min-w-[80px]">
                            {renderCellContent(
                              entry.monthlyData[month]?.plan || "",
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="w-full min-w-[80px]">{"--"}</div>
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="py-3 px-4 text-sm text-gray-600 border-l border-gray-100">
                      <input
                        type="text"
                        value={entry.remarks}
                        onChange={(e) =>
                          updateRemarks(entry.id, e.target.value)
                        }
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:border-blue-400 focus:outline-none"
                        placeholder="Remarks"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(entry)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>

        <EditScheduleModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEntry(undefined);
          }}
          onSave={handleAddEditEntry}
          initialData={editingEntry}
        />

        <FinalizeModal
          isOpen={isFinalizeModalOpen}
          onClose={() => setIsFinalizeModalOpen(false)}
          onConfirm={handleFinalize}
          equipmentCount={scheduleData.length}
        />

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingEntry(null);
          }}
          onConfirm={handleDeleteEntry}
          equipmentName={deletingEntry?.equipmentNo || ""}
        />
      </motion.div>
    </>
  );
};

export default PlanDetail;
