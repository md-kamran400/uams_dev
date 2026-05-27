// import React, { useState } from "react";
import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Bell,
  Save,
  X,
  Plus,
  Edit,
  Trash2,
  Activity,
} from "lucide-react";
import Button from "../../../../../ui/Button";
import Badge from "../../../../../ui/Badge";
import Input from "../../../../../ui/Input";

// --- Type Definitions ---
interface Threshold {
  id: string;
  parameter: string;
  unit: string;
  warning: number;
  critical: number;
  enabled: boolean;
  compressor: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: "low" | "warning" | "critical";
  notification: string;
  enabled: boolean;
  recipients: string[];
}

interface ReportingSchedule {
  id: string;
  name: string;
  frequency: string;
  format: string;
  recipients: string[];
  enabled: boolean;
}

// --- Constants ---
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Dummy threshold configurations
const thresholdConfigs: Threshold[] = [
  {
    id: "th-001",
    parameter: "CO₂ Emission",
    unit: "kg/hr",
    warning: 12.0,
    critical: 15.0,
    enabled: true,
    compressor: "All Compressors",
  },
  {
    id: "th-002",
    parameter: "NOx Emission",
    unit: "ppm",
    warning: 0.8,
    critical: 1.0,
    enabled: true,
    compressor: "All Compressors",
  },
  {
    id: "th-003",
    parameter: "SO₂ Emission",
    unit: "ppm",
    warning: 0.06,
    critical: 0.08,
    enabled: true,
    compressor: "All Compressors",
  },
  {
    id: "th-004",
    parameter: "Temperature",
    unit: "°C",
    warning: 85,
    critical: 95,
    enabled: true,
    compressor: "All Compressors",
  },
  {
    id: "th-005",
    parameter: "Pressure",
    unit: "Bar",
    warning: 8.5,
    critical: 9.5,
    enabled: false,
    compressor: "CPR-003",
  },
];

// Dummy alert rules
const alertRules: AlertRule[] = [
  {
    id: "ar-001",
    name: "High CO₂ Alert",
    condition: "CO₂ > 15 kg/hr for 5 minutes",
    severity: "critical",
    notification: "Email + SMS",
    enabled: true,
    recipients: ["operator@company.com", "supervisor@company.com"],
  },
  {
    id: "ar-002",
    name: "Temperature Warning",
    condition: "Temperature > 85°C for 10 minutes",
    severity: "warning",
    notification: "Email only",
    enabled: true,
    recipients: ["maintenance@company.com"],
  },
  {
    id: "ar-003",
    name: "Sensor Offline",
    condition: "No data for 15 minutes",
    severity: "critical",
    notification: "Email + SMS",
    enabled: true,
    recipients: ["operator@company.com", "it@company.com"],
  },
];

// Dummy reporting schedules
const reportingSchedules: ReportingSchedule[] = [
  {
    id: "rs-001",
    name: "Hourly Emission Log",
    frequency: "hourly",
    format: "CSV",
    recipients: ["compliance@company.com"],
    enabled: true,
  },
  {
    id: "rs-002",
    name: "Daily Compliance Report",
    frequency: "daily",
    format: "PDF",
    recipients: ["manager@company.com", "compliance@company.com"],
    enabled: true,
  },
  {
    id: "rs-003",
    name: "Weekly Summary",
    frequency: "weekly",
    format: "Excel",
    recipients: ["executive@company.com"],
    enabled: false,
  },
];

const SEVERITY_BADGE: Record<
  string,
  { variant: "success" | "warning" | "error" | "default"; label: string }
> = {
  low: { variant: "default", label: "Low" },
  warning: { variant: "warning", label: "Warning" },
  critical: { variant: "error", label: "Critical" },
};

const EMPTY_THRESHOLD: Omit<Threshold, "id"> = {
  parameter: "",
  unit: "",
  warning: 0,
  critical: 0,
  compressor: "All Compressors",
  enabled: true,
};

const EMPTY_RULE: Omit<AlertRule, "id"> = {
  name: "",
  condition: "",
  severity: "warning",
  notification: "Email only",
  recipients: [],
  enabled: true,
};

export default function CompressorEmissionConfig() {
  const [thresholds, setThresholds] = useState<Threshold[]>(thresholdConfigs);
  const [rules, setRules] = useState<AlertRule[]>(alertRules);
  const [schedules, setSchedules] = useState<ReportingSchedule[]>(reportingSchedules);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<Threshold | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [thresholdForm, setThresholdForm] = useState<Omit<Threshold, "id">>(EMPTY_THRESHOLD);
  const [ruleForm, setRuleForm] = useState<Omit<AlertRule, "id">>(EMPTY_RULE);

  const handleSaveThreshold = () => {
    if (!thresholdForm.parameter || !thresholdForm.unit) return;

    const newThreshold: Threshold = {
      id: editingThreshold ? editingThreshold.id : `th-${Date.now()}`,
      ...thresholdForm,
      warning: Number(thresholdForm.warning) || 0,
      critical: Number(thresholdForm.critical) || 0,
    };

    if (editingThreshold) {
      setThresholds((prev) =>
        prev.map((t) => (t.id === editingThreshold.id ? newThreshold : t)),
      );
    } else {
      setThresholds((prev) => [...prev, newThreshold]);
    }

    setThresholdForm(EMPTY_THRESHOLD);
    setEditingThreshold(null);
    setShowThresholdModal(false);
  };

  const handleSaveRule = () => {
    if (!ruleForm.name || !ruleForm.condition) return;

    const newRule: AlertRule = {
      id: editingRule ? editingRule.id : `ar-${Date.now()}`,
      ...ruleForm,
    };

    if (editingRule) {
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? newRule : r)),
      );
    } else {
      setRules((prev) => [...prev, newRule]);
    }

    setRuleForm(EMPTY_RULE);
    setEditingRule(null);
    setShowRuleModal(false);
  };

  const deleteThreshold = (id: string) => {
    setThresholds((prev) => prev.filter((t) => t.id !== id));
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const editThreshold = (threshold: Threshold) => {
    setEditingThreshold(threshold);
    setThresholdForm(threshold);
    setShowThresholdModal(true);
  };

  const editRule = (rule: AlertRule) => {
    setEditingRule(rule);
    setRuleForm(rule);
    setShowRuleModal(true);
  };

  const toggleThreshold = (id: string) => {
    setThresholds((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const toggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          Emission Configuration
        </h3>
        <p className="text-sm text-gray-500">
          Configure emission sensor thresholds, alert rules, and reporting
          schedules for compressor monitoring.
        </p>
      </motion.div>

      {/* Thresholds Configuration */}
      <motion.div
        variants={itemVariants}
        className="bg-white/20 backdrop-blur-xl rounded-lg border border-white/20 shadow-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <Activity size={16} className="mr-2 text-blue-600" />
            Threshold Settings
          </h4>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowThresholdModal(true)}
          >
            <Plus size={15} className="mr-1" />
            Add Threshold
          </Button>
        </div>

        <div className="space-y-3">
          {thresholds.map((threshold) => (
            <div
              key={threshold.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={threshold.enabled}
                    onChange={() => toggleThreshold(threshold.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {threshold.parameter}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Warning: {threshold.warning} {threshold.unit} | Critical:{" "}
                  {threshold.critical} {threshold.unit}
                </div>
                <Badge variant="default" className="text-xs">
                  {threshold.compressor}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => editThreshold(threshold)}
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => deleteThreshold(threshold.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Alert Rules */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <AlertTriangle size={16} className="mr-2 text-amber-600" />
            Alert Rules
          </h4>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowRuleModal(true)}
          >
            <Plus size={15} className="mr-1" />
            Add Rule
          </Button>
        </div>

        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4 flex-1">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRule(rule.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-800 text-sm">
                      {rule.name}
                    </span>
                    <Badge variant={SEVERITY_BADGE[rule.severity].variant}>
                      {SEVERITY_BADGE[rule.severity].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{rule.condition}</p>
                  <p className="text-xs text-gray-500">
                    {rule.notification} • {rule.recipients.length} recipients
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => editRule(rule)}
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Reporting Schedules */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <Bell size={16} className="mr-2 text-green-600" />
            Reporting Schedules
          </h4>
        </div>

        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4 flex-1">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={() => toggleSchedule(schedule.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-800 text-sm">
                      {schedule.name}
                    </span>
                    <Badge variant="default" className="capitalize">
                      {schedule.frequency}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {schedule.format} format • {schedule.recipients.length}{" "}
                    recipients
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Threshold Modal */}
      <Dialog.Root
        open={showThresholdModal}
        onOpenChange={setShowThresholdModal}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                {editingThreshold ? "Edit Threshold" : "Add Threshold"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Input
                label="Parameter"
                placeholder="CO₂ Emission"
                value={thresholdForm.parameter}
                onChange={(e) =>
                  setThresholdForm((f) => ({ ...f, parameter: e.target.value }))
                }
              />
              <Input
                label="Unit"
                placeholder="kg/hr"
                value={thresholdForm.unit}
                onChange={(e) =>
                  setThresholdForm((f) => ({ ...f, unit: e.target.value }))
                }
              />
              <Input
                label="Warning Threshold"
                type="number"
                step="0.1"
                placeholder="12.0"
                value={thresholdForm.warning}
                onChange={(e) =>
                  setThresholdForm((f) => ({ ...f, warning: parseFloat(e.target.value) || 0 }))
                }
              />
              <Input
                label="Critical Threshold"
                type="number"
                step="0.1"
                placeholder="15.0"
                value={thresholdForm.critical}
                onChange={(e) =>
                  setThresholdForm((f) => ({ ...f, critical: parseFloat(e.target.value) || 0 }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compressor
                </label>
                <select
                  value={thresholdForm.compressor}
                  onChange={(e) =>
                    setThresholdForm((f) => ({
                      ...f,
                      compressor: e.target.value,
                    }))
                  }
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="All Compressors">All Compressors</option>
                  <option value="CPR-001">CPR-001</option>
                  <option value="CPR-002">CPR-002</option>
                  <option value="CPR-003">CPR-003</option>
                  <option value="CPR-004">CPR-004</option>
                  <option value="CPR-005">CPR-005</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSaveThreshold}>
                <Save size={15} className="mr-1" />
                Save Threshold
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Rule Modal */}
      <Dialog.Root open={showRuleModal} onOpenChange={setShowRuleModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                {editingRule ? "Edit Alert Rule" : "Add Alert Rule"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Input
                label="Rule Name"
                placeholder="High CO₂ Alert"
                value={ruleForm.name}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <Input
                label="Condition"
                placeholder="CO₂ > 15 kg/hr for 5 minutes"
                value={ruleForm.condition}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, condition: e.target.value }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={ruleForm.severity}
                  onChange={(e) =>
                    setRuleForm((f) => ({ ...f, severity: e.target.value as "low" | "warning" | "critical" }))
                  }
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Method
                </label>
                <select
                  value={ruleForm.notification}
                  onChange={(e) =>
                    setRuleForm((f) => ({ ...f, notification: e.target.value }))
                  }
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Email only">Email only</option>
                  <option value="Email + SMS">Email + SMS</option>
                  <option value="SMS only">SMS only</option>
                </select>
              </div>
              <Input
                label="Recipients (comma-separated)"
                placeholder="operator@company.com, supervisor@company.com"
                value={ruleForm.recipients.join(", ")}
                onChange={(e) =>
                  setRuleForm((f) => ({
                    ...f,
                    recipients: e.target.value.split(",").map((s) => s.trim()),
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSaveRule}>
                <Save size={15} className="mr-1" />
                Save Rule
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}