import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Mail,
  ChevronDown,
  ChevronRight,
  Check,
  Settings2,
  AlertTriangle,
  Thermometer,
  Activity,
  Clock,
  Battery,
  X,
  Play,
  Save,
  Cpu,
  Wind,
} from "lucide-react";

// Types

type UtilityType = "dg" | "compressor";

interface DGAsset {
  id: string;
  tag: string;
  name: string;
  location: string;
  status: "operational" | "maintenance" | "offline";
  runningHours: number;
  lastService: string;
  kvaRating: string;
  fuelType: string;
}

interface CompressorAsset {
  id: string;
  tag: string;
  name: string;
  location: string;
  status: "operational" | "maintenance" | "offline";
  runningHours: number;
  lastService: string;
  kvaRating: string;
  make: string;
}

interface TriggerCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  unit: string;
}

interface EmailAction {
  id: string;
  toName: string;
  toEmail: string;
  subject: string;
  priority: "high" | "medium" | "low";
  includeAssetDetails: boolean;
  includeTimestamp: boolean;
}

interface WorkflowStep {
  id: string;
  type: "trigger" | "action";
  utilityType?: UtilityType;
  assetId?: string;
  conditions?: TriggerCondition[];
  emailActions?: EmailAction[];
  label?: string;
}

// Static Data

const DG_ASSETS: DGAsset[] = [
  {
    id: "dg-001",
    tag: "DG-001",
    name: "DG Unit - Main",
    location: "Power House, Block A",
    status: "operational",
    runningHours: 12450,
    lastService: "2025-03-15",
    kvaRating: "500 kVA",
    fuelType: "HSD",
  },
  {
    id: "dg-002",
    tag: "DG-002",
    name: "DG Unit - Backup",
    location: "Power House, Block A",
    status: "maintenance",
    runningHours: 8320,
    lastService: "2025-04-20",
    kvaRating: "320 kVA",
    fuelType: "HSD",
  },
  {
    id: "dg-003",
    tag: "DG-003",
    name: "DG Unit - Emergency",
    location: "Admin Block, B-Wing",
    status: "operational",
    runningHours: 5610,
    lastService: "2025-05-01",
    kvaRating: "160 kVA",
    fuelType: "HSD",
  },
  {
    id: "dg-004",
    tag: "DG-004",
    name: "DG Unit - Tower",
    location: "Cooling Tower, Block D",
    status: "offline",
    runningHours: 3240,
    lastService: "2024-12-10",
    kvaRating: "250 kVA",
    fuelType: "HSD",
  },
];

const COMPRESSOR_ASSETS: CompressorAsset[] = [
  {
    id: "cpr-001",
    tag: "CPR-001",
    name: "Compressor Unit - Main",
    location: "Compressor Hall, Block B",
    status: "operational",
    runningHours: 8420,
    lastService: "2025-03-02",
    kvaRating: "75 kW",
    make: "Atlas Copco",
  },
  {
    id: "cpr-002",
    tag: "CPR-002",
    name: "Compressor Unit - Backup",
    location: "Compressor Bay, Block A",
    status: "maintenance",
    runningHours: 6230,
    lastService: "2025-04-12",
    kvaRating: "45 kW",
    make: "Ingersoll Rand",
  },
  {
    id: "cpr-003",
    tag: "CPR-003",
    name: "Compressor Unit - Process",
    location: "Production Line 3",
    status: "operational",
    runningHours: 7340,
    lastService: "2025-05-18",
    kvaRating: "55 kW",
    make: "Kaeser",
  },
  {
    id: "cpr-004",
    tag: "CPR-004",
    name: "Compressor Unit - Chill",
    location: "Cooling Section, Block D",
    status: "offline",
    runningHours: 5120,
    lastService: "2024-12-01",
    kvaRating: "75 kW",
    make: "Sullair",
  },
  {
    id: "cpr-005",
    tag: "CPR-005",
    name: "Compressor Unit - Spare",
    location: "Maintenance Yard",
    status: "operational",
    runningHours: 2110,
    lastService: "2025-02-20",
    kvaRating: "37 kW",
    make: "Hitachi",
  },
];

const DG_TRIGGER_FIELDS = [
  { id: "runningHours", label: "Running Hours", unit: "hrs", icon: Clock },
  {
    id: "oilTemperature",
    label: "Oil Temperature",
    unit: "°C",
    icon: Thermometer,
  },
  {
    id: "coolantTemperature",
    label: "Coolant Temperature",
    unit: "°C",
    icon: Thermometer,
  },
  { id: "oilPressure", label: "Oil Pressure", unit: "PSI", icon: Activity },
  { id: "loadFactor", label: "Load Factor", unit: "%", icon: Battery },
  { id: "fuelLevel", label: "Fuel Level", unit: "%", icon: Battery },
  { id: "totalKWH", label: "Total kWh", unit: "kWh", icon: Zap },
  { id: "status", label: "Status Change", unit: "", icon: AlertTriangle },
];

const COMPRESSOR_TRIGGER_FIELDS = [
  { id: "runningHours", label: "Running Hours", unit: "hrs", icon: Clock },
  {
    id: "oilTemperature",
    label: "Oil Temperature",
    unit: "°C",
    icon: Thermometer,
  },
  {
    id: "dischargePressure",
    label: "Discharge Pressure",
    unit: "bar",
    icon: Activity,
  },
  { id: "inletPressure", label: "Inlet Pressure", unit: "bar", icon: Activity },
  { id: "loadFactor", label: "Load Factor", unit: "%", icon: Battery },
  { id: "status", label: "Status Change", unit: "", icon: AlertTriangle },
  {
    id: "nextServiceDue",
    label: "Next Service Due",
    unit: "hrs",
    icon: Settings2,
  },
];

const OPERATORS = [
  { id: "gt", label: "Greater than ( > )" },
  { id: "gte", label: "Greater than or equal ( ≥ )" },
  { id: "lt", label: "Less than ( < )" },
  { id: "lte", label: "Less than or equal ( ≤ )" },
  { id: "eq", label: "Equal to ( = )" },
  { id: "changes_to", label: "Changes to" },
];

const STATUS_VALUES = ["operational", "maintenance", "offline"];

const ENGINEERS = [
  { name: "Nikhil Verma", email: "nikhil.verma@facility.com" },
  { name: "Priya Singh", email: "priya.singh@facility.com" },
  { name: "Anita Dutt", email: "anita.dutt@facility.com" },
  { name: "Rohit Patel", email: "rohit.patel@facility.com" },
  { name: "Sanjay Rao", email: "sanjay.rao@facility.com" },
  { name: "Facility Manager", email: "manager@facility.com" },
  { name: "Maintenance Head", email: "maint.head@facility.com" },
];

//  Sub Components

const StatusDot = ({ status }: { status: string }) => {
  const color =
    status === "operational"
      ? "#22c55e"
      : status === "maintenance"
        ? "#f59e0b"
        : "#ef4444";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
        }}
      />
    </span>
  );
};

const StepConnector = () => (
  <div className="flex flex-col items-center py-1">
    <div
      style={{
        width: 2,
        height: 28,
        background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
        borderRadius: 2,
      }}
    />
    <ChevronDown size={14} style={{ color: "#8b5cf6", marginTop: -3 }} />
  </div>
);

// Main Builder Component

interface WorkflowBuilderProps {
  workflowName: string;
  workflowId: string;
  onBack: () => void;
}

export default function WorkflowBuilder({
  workflowName,
  onBack,
}: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  // const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [builderPhase, setBuilderPhase] = useState<
    "type" | "utility" | "asset" | "condition" | "action" | "done"
  >("type");
  const [pendingStep, setPendingStep] = useState<Partial<WorkflowStep> | null>(
    null,
  );
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Expand/collapse per step
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const openAddPanel = () => {
    setPendingStep({
      id: `step-${Date.now()}`,
      conditions: [],
      emailActions: [],
    });
    setBuilderPhase("type");
    setShowAddPanel(true);
    setIsSaved(false);
  };

  const closePanel = () => {
    setShowAddPanel(false);
    setPendingStep(null);
    setBuilderPhase("type");
  };

  const selectType = (type: "trigger" | "action") => {
    setPendingStep((p) => ({ ...p, type }));
    setBuilderPhase("utility");
  };

  const selectUtility = (ut: UtilityType) => {
    setPendingStep((p) => ({ ...p, utilityType: ut }));
    setBuilderPhase("asset");
  };

  const selectAsset = (assetId: string) => {
    setPendingStep((p) => ({ ...p, assetId }));
    if (pendingStep?.type === "trigger") setBuilderPhase("condition");
    else setBuilderPhase("action");
  };

  const addCondition = () => {
    const newCond: TriggerCondition = {
      id: `cond-${Date.now()}`,
      field: "",
      operator: "gt",
      value: "",
      unit: "",
    };
    setPendingStep((p) => ({
      ...p,
      conditions: [...(p?.conditions ?? []), newCond],
    }));
  };

  const updateCondition = (
    condId: string,
    key: keyof TriggerCondition,
    val: string,
  ) => {
    setPendingStep((p) => ({
      ...p,
      conditions: (p?.conditions ?? []).map((c) => {
        if (c.id !== condId) return c;
        const updated = { ...c, [key]: val };
        if (key === "field") {
          const fields =
            pendingStep?.utilityType === "dg"
              ? DG_TRIGGER_FIELDS
              : COMPRESSOR_TRIGGER_FIELDS;
          const meta = fields.find((f) => f.id === val);
          updated.unit = meta?.unit ?? "";
        }
        return updated;
      }),
    }));
  };

  const removeCondition = (condId: string) => {
    setPendingStep((p) => ({
      ...p,
      conditions: (p?.conditions ?? []).filter((c) => c.id !== condId),
    }));
  };

  const addEmailAction = () => {
    const newAction: EmailAction = {
      id: `act-${Date.now()}`,
      toName: "",
      toEmail: "",
      subject: "",
      priority: "high",
      includeAssetDetails: true,
      includeTimestamp: true,
    };
    setPendingStep((p) => ({
      ...p,
      emailActions: [...(p?.emailActions ?? []), newAction],
    }));
  };

  const updateEmailAction = (
    actId: string,
    key: keyof EmailAction,
    val: string | boolean,
  ) => {
    setPendingStep((p) => ({
      ...p,
      emailActions: (p?.emailActions ?? []).map((a) =>
        a.id === actId ? { ...a, [key]: val } : a,
      ),
    }));
  };

  const removeEmailAction = (actId: string) => {
    setPendingStep((p) => ({
      ...p,
      emailActions: (p?.emailActions ?? []).filter((a) => a.id !== actId),
    }));
  };

  const commitStep = () => {
    if (!pendingStep?.id) return;
    const asset =
      pendingStep.utilityType === "dg"
        ? DG_ASSETS.find((a) => a.id === pendingStep.assetId)
        : COMPRESSOR_ASSETS.find((a) => a.id === pendingStep.assetId);
    const label = asset ? `${asset.tag} — ${asset.name}` : "Unknown Asset";
    const full: WorkflowStep = {
      id: pendingStep.id!,
      type: pendingStep.type!,
      utilityType: pendingStep.utilityType,
      assetId: pendingStep.assetId,
      conditions: pendingStep.conditions ?? [],
      emailActions: pendingStep.emailActions ?? [],
      label,
    };
    setSteps((prev) => [...prev, full]);
    setExpandedStep(full.id);
    closePanel();
  };

  const removeStep = (id: string) =>
    setSteps((prev) => prev.filter((s) => s.id !== id));

  const handleSave = () => {
    setIsSaved(true);
  };

  //  Render helpers

  const getAssetForStep = (step: WorkflowStep) => {
    if (step.utilityType === "dg")
      return DG_ASSETS.find((a) => a.id === step.assetId);
    return COMPRESSOR_ASSETS.find((a) => a.id === step.assetId);
  };

  const renderFieldLabel = (step: WorkflowStep, fieldId: string) => {
    const fields =
      step.utilityType === "dg" ? DG_TRIGGER_FIELDS : COMPRESSOR_TRIGGER_FIELDS;
    return fields.find((f) => f.id === fieldId)?.label ?? fieldId;
  };

  const operatorLabel = (op: string) =>
    OPERATORS.find((o) => o.id === op)
      ?.label?.split("(")[0]
      .trim() ?? op;

  //  Panel Content Renderer
  const renderPanelContent = () => {
    if (builderPhase === "type")
      return (
        <div className="space-y-3">
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Step 1 — What are you adding?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                type: "trigger" as const,
                icon: Zap,
                title: "Trigger",
                desc: "When something happens on an asset",
                color: "#f59e0b",
                bg: "#fef9c3",
              },
              {
                type: "action" as const,
                icon: Mail,
                title: "Action",
                desc: "Send email or notify someone",
                color: "#6366f1",
                bg: "#eef2ff",
              },
            ].map(({ type, icon: Icon, title, desc, color, bg }) => (
              <button
                key={type}
                onClick={() => selectType(type)}
                style={{
                  background: bg,
                  border: `2px solid ${color}20`,
                  borderRadius: 12,
                  padding: "16px 12px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = color;
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    `${color}20`;
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#1e293b",
                    marginBottom: 2,
                  }}
                >
                  {title}
                </p>
                <p
                  style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.4 }}
                >
                  {desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      );

    if (builderPhase === "utility")
      return (
        <div className="space-y-3">
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Step 2 — Select Utility Type
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                type: "dg" as UtilityType,
                icon: Cpu,
                title: "Diesel Generator",
                count: DG_ASSETS.length,
                color: "#0ea5e9",
                bg: "#f0f9ff",
              },
              {
                type: "compressor" as UtilityType,
                icon: Wind,
                title: "Air Compressor",
                count: COMPRESSOR_ASSETS.length,
                color: "#8b5cf6",
                bg: "#f5f3ff",
              },
            ].map(({ type, icon: Icon, title, count, color, bg }) => (
              <button
                key={type}
                onClick={() => selectUtility(type)}
                style={{
                  background: bg,
                  border: `2px solid ${color}20`,
                  borderRadius: 12,
                  padding: "16px 12px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = color;
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    `${color}20`;
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#1e293b",
                    marginBottom: 2,
                  }}
                >
                  {title}
                </p>
                <p style={{ fontSize: 11.5, color: "#64748b" }}>
                  {count} assets available
                </p>
              </button>
            ))}
          </div>
        </div>
      );

    if (builderPhase === "asset") {
      const assets =
        pendingStep?.utilityType === "dg" ? DG_ASSETS : COMPRESSOR_ASSETS;
      return (
        <div className="space-y-3">
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Step 3 — Select Asset
          </p>
          <div className="space-y-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => selectAsset(asset.id)}
                style={{
                  width: "100%",
                  background: "#f8fafc",
                  border: "2px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "#6366f1";
                  (e.currentTarget as HTMLElement).style.background = "#eef2ff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "#e2e8f0";
                  (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#1e293b",
                      }}
                    >
                      {asset.tag}
                    </span>
                    <StatusDot status={asset.status} />
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          asset.status === "operational"
                            ? "#16a34a"
                            : asset.status === "maintenance"
                              ? "#d97706"
                              : "#dc2626",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {asset.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b" }}>{asset.name}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>
                    {asset.location}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{ fontSize: 11, color: "#6366f1", fontWeight: 600 }}
                  >
                    {asset.kvaRating}
                  </p>
                  <p style={{ fontSize: 10.5, color: "#94a3b8" }}>
                    {asset.runningHours.toLocaleString()} hrs
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (builderPhase === "condition") {
      const fields =
        pendingStep?.utilityType === "dg"
          ? DG_TRIGGER_FIELDS
          : COMPRESSOR_TRIGGER_FIELDS;
      return (
        <div className="space-y-4">
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Step 4 — Set Trigger Conditions
          </p>
          {(pendingStep?.conditions ?? []).length === 0 && (
            <div
              style={{
                background: "#fef9c3",
                border: "1.5px dashed #fbbf24",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 12.5,
                color: "#92400e",
              }}
            >
              No conditions yet. Add at least one condition to trigger the
              workflow.
            </div>
          )}
          {(pendingStep?.conditions ?? []).map((cond, i) => (
            <div
              key={cond.id}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                padding: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#6366f1" }}
                >
                  Condition {i + 1}
                </span>
                <button
                  onClick={() => removeCondition(cond.id)}
                  style={{
                    color: "#ef4444",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <label
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Field / Parameter
                  </label>
                  <select
                    value={cond.field}
                    onChange={(e) =>
                      updateCondition(cond.id, "field", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 7,
                      border: "1.5px solid #cbd5e1",
                      fontSize: 12.5,
                      color: "#1e293b",
                      background: "white",
                      outline: "none",
                    }}
                  >
                    <option value="">— Select parameter —</option>
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#475569",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Operator
                    </label>
                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        updateCondition(cond.id, "operator", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: "1.5px solid #cbd5e1",
                        fontSize: 12.5,
                        color: "#1e293b",
                        background: "white",
                        outline: "none",
                      }}
                    >
                      {OPERATORS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#475569",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Value {cond.unit && `(${cond.unit})`}
                    </label>
                    {cond.field === "status" ? (
                      <select
                        value={cond.value}
                        onChange={(e) =>
                          updateCondition(cond.id, "value", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 7,
                          border: "1.5px solid #cbd5e1",
                          fontSize: 12.5,
                          color: "#1e293b",
                          background: "white",
                          outline: "none",
                        }}
                      >
                        <option value="">Select status</option>
                        {STATUS_VALUES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={cond.value}
                        onChange={(e) =>
                          updateCondition(cond.id, "value", e.target.value)
                        }
                        placeholder="e.g. 90"
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 7,
                          border: "1.5px solid #cbd5e1",
                          fontSize: 12.5,
                          color: "#1e293b",
                          background: "white",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addCondition}
            style={{
              width: "100%",
              padding: "9px",
              borderRadius: 8,
              border: "1.5px dashed #6366f1",
              background: "#eef2ff",
              color: "#6366f1",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={14} /> Add Condition
          </button>
          <button
            onClick={() => setBuilderPhase("action")}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              background: "#6366f1",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            Next: Set Actions <ChevronRight size={15} />
          </button>
        </div>
      );
    }

    if (builderPhase === "action") {
      return (
        <div className="space-y-4">
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {pendingStep?.type === "trigger" ? "Step 5" : "Step 4"} — Email
            Notification
          </p>
          {(pendingStep?.emailActions ?? []).length === 0 && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px dashed #86efac",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 12.5,
                color: "#166534",
              }}
            >
              No notifications yet. Add at least one recipient.
            </div>
          )}
          {(pendingStep?.emailActions ?? []).map((act, i) => (
            <div
              key={act.id}
              style={{
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                borderRadius: 10,
                padding: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#0ea5e9" }}
                >
                  Notification {i + 1}
                </span>
                <button
                  onClick={() => removeEmailAction(act.id)}
                  style={{
                    color: "#ef4444",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <label
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Notify Person
                  </label>
                  <select
                    value={act.toEmail}
                    onChange={(e) => {
                      const eng = ENGINEERS.find(
                        (eng) => eng.email === e.target.value,
                      );
                      if (eng) {
                        updateEmailAction(act.id, "toEmail", eng.email);
                        updateEmailAction(act.id, "toName", eng.name);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 7,
                      border: "1.5px solid #cbd5e1",
                      fontSize: 12.5,
                      color: "#1e293b",
                      background: "white",
                      outline: "none",
                    }}
                  >
                    <option value="">— Select recipient —</option>
                    {ENGINEERS.map((e) => (
                      <option key={e.email} value={e.email}>
                        {e.name} — {e.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={act.subject}
                    onChange={(e) =>
                      updateEmailAction(act.id, "subject", e.target.value)
                    }
                    placeholder="e.g. [ALERT] Oil Temp exceeded threshold"
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 7,
                      border: "1.5px solid #cbd5e1",
                      fontSize: 12.5,
                      color: "#1e293b",
                      background: "white",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#475569",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Priority
                    </label>
                    <select
                      value={act.priority}
                      onChange={(e) =>
                        updateEmailAction(act.id, "priority", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: "1.5px solid #cbd5e1",
                        fontSize: 12.5,
                        color: "#1e293b",
                        background: "white",
                        outline: "none",
                      }}
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11.5,
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={act.includeAssetDetails}
                        onChange={(e) =>
                          updateEmailAction(
                            act.id,
                            "includeAssetDetails",
                            e.target.checked,
                          )
                        }
                      />
                      Asset Details
                    </label>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11.5,
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={act.includeTimestamp}
                        onChange={(e) =>
                          updateEmailAction(
                            act.id,
                            "includeTimestamp",
                            e.target.checked,
                          )
                        }
                      />
                      Timestamp
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addEmailAction}
            style={{
              width: "100%",
              padding: "9px",
              borderRadius: 8,
              border: "1.5px dashed #0ea5e9",
              background: "#f0f9ff",
              color: "#0ea5e9",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={14} /> Add Recipient
          </button>
          <button
            onClick={commitStep}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              background: "#22c55e",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Check size={15} /> Add Step to Workflow
          </button>
        </div>
      );
    }

    return null;
  };

  //  Step Card

  const renderStepCard = (step: WorkflowStep, index: number) => {
    const asset = getAssetForStep(step);
    const isExpanded = expandedStep === step.id;
    const isTrigger = step.type === "trigger";

    return (
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
      >
        <div
          style={{
            background: "white",
            border: `2px solid ${isTrigger ? "#fbbf24" : "#6366f1"}22`,
            borderLeft: `4px solid ${isTrigger ? "#f59e0b" : "#6366f1"}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              background: isTrigger ? "#fffbeb" : "#eef2ff",
            }}
            onClick={() => setExpandedStep(isExpanded ? null : step.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: isTrigger ? "#f59e0b22" : "#6366f122",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isTrigger ? (
                  <Zap size={15} style={{ color: "#f59e0b" }} />
                ) : (
                  <Mail size={15} style={{ color: "#6366f1" }} />
                )}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: isTrigger ? "#d97706" : "#6366f1",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    Step {index + 1} · {isTrigger ? "Trigger" : "Action"}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      background:
                        step.utilityType === "dg" ? "#f0f9ff" : "#f5f3ff",
                      color: step.utilityType === "dg" ? "#0ea5e9" : "#8b5cf6",
                      border: `1px solid ${step.utilityType === "dg" ? "#bae6fd" : "#ddd6fe"}`,
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontWeight: 600,
                    }}
                  >
                    {step.utilityType === "dg"
                      ? "Diesel Generator"
                      : "Compressor"}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#1e293b",
                    marginTop: 1,
                  }}
                >
                  {step.label}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {asset && <StatusDot status={asset.status} />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeStep(step.id);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "#fee2e2",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={13} style={{ color: "#ef4444" }} />
              </button>
              <ChevronDown
                size={15}
                style={{
                  color: "#94a3b8",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "0.2s",
                }}
              />
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  {asset && (
                    <div
                      style={{
                        background: "#f8fafc",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 10.5,
                            color: "#94a3b8",
                            fontWeight: 600,
                          }}
                        >
                          LOCATION
                        </p>
                        <p style={{ fontSize: 12, color: "#475569" }}>
                          {asset.location}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 10.5,
                            color: "#94a3b8",
                            fontWeight: 600,
                          }}
                        >
                          RATING
                        </p>
                        <p style={{ fontSize: 12, color: "#475569" }}>
                          {asset.kvaRating}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 10.5,
                            color: "#94a3b8",
                            fontWeight: 600,
                          }}
                        >
                          RUNNING HRS
                        </p>
                        <p style={{ fontSize: 12, color: "#475569" }}>
                          {asset.runningHours.toLocaleString()} h
                        </p>
                      </div>
                    </div>
                  )}

                  {step.conditions && step.conditions.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#f59e0b",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          marginBottom: 6,
                        }}
                      >
                        ⚡ Trigger Conditions
                      </p>
                      {step.conditions.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12.5,
                            color: "#374151",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#f59e0b",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          <strong>{renderFieldLabel(step, c.field)}</strong>
                          <span style={{ color: "#6366f1" }}>
                            {operatorLabel(c.operator)}
                          </span>
                          <strong>
                            {c.value} {c.unit}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.emailActions && step.emailActions.length > 0 && (
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6366f1",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          marginBottom: 6,
                        }}
                      >
                        ✉️ Email Notifications
                      </p>
                      {step.emailActions.map((a) => (
                        <div
                          key={a.id}
                          style={{
                            background: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            borderRadius: 8,
                            padding: "8px 10px",
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 700,
                                  color: "#0c4a6e",
                                }}
                              >
                                {a.toName || "—"}
                              </p>
                              <p style={{ fontSize: 11.5, color: "#0ea5e9" }}>
                                {a.toEmail || "—"}
                              </p>
                              {a.subject && (
                                <p
                                  style={{
                                    fontSize: 11.5,
                                    color: "#475569",
                                    marginTop: 2,
                                  }}
                                >
                                  Subject: {a.subject}
                                </p>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 5,
                                background:
                                  a.priority === "high"
                                    ? "#fee2e2"
                                    : a.priority === "medium"
                                      ? "#fef9c3"
                                      : "#dcfce7",
                                color:
                                  a.priority === "high"
                                    ? "#dc2626"
                                    : a.priority === "medium"
                                      ? "#d97706"
                                      : "#16a34a",
                              }}
                            >
                              {a.priority.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  // Breadcrumb in Panel

  const phases = ["type", "utility", "asset", "condition", "action"];
  const currentPhaseIdx = phases.indexOf(builderPhase);

  //  Main Render

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f8fafc",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          background: "white",
          borderBottom: "1.5px solid #e2e8f0",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "#f1f5f9",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={16} style={{ color: "#475569" }} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                Workflows
              </span>
              <ChevronRight size={12} style={{ color: "#cbd5e1" }} />
              <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600 }}>
                Builder
              </span>
            </div>
            <h1
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              {workflowName}
            </h1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>
            {steps.length} step{steps.length !== 1 ? "s" : ""}
          </span>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              background: isSaved ? "#dcfce7" : "#f8fafc",
              border: `1.5px solid ${isSaved ? "#86efac" : "#e2e8f0"}`,
              color: isSaved ? "#16a34a" : "#475569",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={handleSave}
          >
            {isSaved ? <Check size={14} /> : <Save size={14} />}
            {isSaved ? "Saved!" : "Save"}
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              background: steps.length > 0 ? "#6366f1" : "#e2e8f0",
              border: "none",
              color: steps.length > 0 ? "white" : "#94a3b8",
              fontWeight: 700,
              fontSize: 13,
              cursor: steps.length > 0 ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
            disabled={steps.length === 0}
          >
            <Play size={14} /> Activate
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
          {steps.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 340,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Zap size={28} style={{ color: "#6366f1" }} />
              </div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#1e293b",
                  margin: "0 0 8px",
                }}
              >
                Build Your Workflow
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  maxWidth: 360,
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                }}
              >
                Add triggers and actions to automate alerts for your DG and
                Compressor assets.
              </p>
              <button
                onClick={openAddPanel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 22px",
                  borderRadius: 10,
                  background: "#6366f1",
                  border: "none",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px #6366f140",
                }}
              >
                <Plus size={16} /> Add First Step
              </button>
            </motion.div>
          ) : (
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              {/* Start node */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    padding: "6px 18px",
                    borderRadius: 20,
                    background: "#1e293b",
                    color: "white",
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  START
                </div>
              </div>

              <AnimatePresence>
                {steps.map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <StepConnector />
                    {renderStepCard(step, idx)}
                  </React.Fragment>
                ))}
              </AnimatePresence>

              <StepConnector />

              {/* Add Step button */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={openAddPanel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 20px",
                    borderRadius: 10,
                    background: "white",
                    border: "2px dashed #6366f1",
                    color: "#6366f1",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#eef2ff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "white";
                  }}
                >
                  <Plus size={15} /> Add Step
                </button>
              </div>

              <StepConnector />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: "6px 18px",
                    borderRadius: 20,
                    background: "#475569",
                    color: "white",
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  END
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Panel */}
        <AnimatePresence>
          {showAddPanel && (
            <motion.div
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: 360,
                background: "white",
                borderLeft: "1.5px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                boxShadow: "-4px 0 20px rgba(0,0,0,0.06)",
              }}
            >
              {/* Panel Header */}
              <div
                style={{
                  padding: "16px 18px",
                  borderBottom: "1.5px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                      margin: 0,
                    }}
                  >
                    Step Builder
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      margin: "2px 0 0",
                    }}
                  >
                    Configure your workflow step
                  </p>
                </div>
                <button
                  onClick={closePanel}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "#f1f5f9",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={14} style={{ color: "#64748b" }} />
                </button>
              </div>

              {/* Progress */}
              <div
                style={{
                  padding: "10px 18px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  gap: 4,
                }}
              >
                {phases
                  .slice(0, pendingStep?.type === "action" ? 4 : 5)
                  .map((p, i) => (
                    <div
                      key={p}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background:
                          i <= currentPhaseIdx ? "#6366f1" : "#e2e8f0",
                        transition: "background 0.3s",
                      }}
                    />
                  ))}
              </div>

              {/* Panel Body */}
              <div style={{ flex: 1, padding: "18px", overflowY: "auto" }}>
                {renderPanelContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
