import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Plus, Edit, Trash2, X, Save } from "lucide-react";
import Button from "../../../../../ui/Button";
import Badge from "../../../../../ui/Badge";
import Input from "../../../../../ui/Input";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

// Dummy emission records data
const emissionRecords = [
  {
    id: "em-001",
    compressorId: "CPR-001",
    compressorName: "Compressor Unit - Main",
    timestamp: "2024-04-27T10:30:00",
    co2Emission: 12.4,
    noxEmission: 0.8,
    so2Emission: 0.06,
    particulateMatter: 0.02,
    temperature: 82,
    pressure: 7.8,
    flowRate: 320,
    operator: "Rahul Sharma",
    notes: "Normal operation, slight temperature rise",
    compliance: "compliant",
  },
  {
    id: "em-002",
    compressorId: "CPR-002",
    compressorName: "Compressor Unit - Backup",
    timestamp: "2024-04-27T10:15:00",
    co2Emission: 11.8,
    noxEmission: 0.7,
    so2Emission: 0.05,
    particulateMatter: 0.015,
    temperature: 78,
    pressure: 7.5,
    flowRate: 310,
    operator: "Priya Singh",
    notes: "Backup unit activated, stable readings",
    compliance: "compliant",
  },
  {
    id: "em-003",
    compressorId: "CPR-003",
    compressorName: "Compressor Unit - Process",
    timestamp: "2024-04-27T10:00:00",
    co2Emission: 13.2,
    noxEmission: 0.9,
    so2Emission: 0.07,
    particulateMatter: 0.025,
    temperature: 85,
    pressure: 8.0,
    flowRate: 335,
    operator: "Anita Dutt",
    notes: "High load operation, emissions within limits",
    compliance: "warning",
  },
  {
    id: "em-004",
    compressorId: "CPR-004",
    compressorName: "Compressor Unit - Chill",
    timestamp: "2024-04-27T09:45:00",
    co2Emission: 10.5,
    noxEmission: 0.6,
    so2Emission: 0.04,
    particulateMatter: 0.012,
    temperature: 75,
    pressure: 7.2,
    flowRate: 290,
    operator: "Rohit Patel",
    notes: "Low load operation, excellent efficiency",
    compliance: "compliant",
  },
  {
    id: "em-005",
    compressorId: "CPR-005",
    compressorName: "Compressor Unit - Spare",
    timestamp: "2024-04-27T09:30:00",
    co2Emission: 0,
    noxEmission: 0,
    so2Emission: 0,
    particulateMatter: 0,
    temperature: 25,
    pressure: 0,
    flowRate: 0,
    operator: "Sanjay Rao",
    notes: "Unit offline, maintenance scheduled",
    compliance: "offline",
  },
];

const STATUS_BADGE: Record<string, { variant: "default"; label: string }> = {
  compliant: { variant: "default", label: "Compliant" },
  warning: { variant: "default", label: "Warning" },
  critical: { variant: "default", label: "Critical" },
  offline: { variant: "default", label: "Offline" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY_FORM = {
  compressorId: "",
  compressorName: "",
  co2Emission: "",
  noxEmission: "",
  so2Emission: "",
  particulateMatter: "",
  temperature: "",
  pressure: "",
  flowRate: "",
  operator: "",
  notes: "",
};

export default function Emission() {
  const [records, setRecords] = useState(emissionRecords);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = records.filter((record) => {
    const q = search.toLowerCase();
    return (
      !q ||
      record.compressorName.toLowerCase().includes(q) ||
      record.operator.toLowerCase().includes(q) ||
      record.notes.toLowerCase().includes(q)
    );
  });

  const handleSave = () => {
    if (!form.compressorId || !form.operator) return;

    const newRecord = {
      id: `em-${Date.now()}`,
      timestamp: new Date().toISOString(),
      compliance: "compliant" as const,
      ...form,
      co2Emission: Number(form.co2Emission) || 0,
      noxEmission: Number(form.noxEmission) || 0,
      so2Emission: Number(form.so2Emission) || 0,
      particulateMatter: Number(form.particulateMatter) || 0,
      temperature: Number(form.temperature) || 0,
      pressure: Number(form.pressure) || 0,
      flowRate: Number(form.flowRate) || 0,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setForm(EMPTY_FORM);
    setShowAddModal(false);
  };

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const field =
    (key: keyof typeof EMPTY_FORM) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const stats = {
    total: records.length,
    compliant: records.filter((r) => r.compliance === "compliant").length,
    warning: records.filter((r) => r.compliance === "warning").length,
    critical: records.filter((r) => r.compliance === "critical").length,
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          Emission Records
        </h3>
        <p className="text-sm text-gray-500">
          Log compressor emission measurements, track hourly trends, and review
          recent sensor values.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search records…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} className="mr-1" />
          Add Reading
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Total Records",
            value: stats.total,
          },
          {
            label: "Compliant",
            value: stats.compliant,
          },
          { label: "Warnings", value: stats.warning },
          { label: "Critical", value: stats.critical },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
          >
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto"
      >
        <table className="min-w-[1000px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                Compressor
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                Timestamp
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                CO₂ (kg/hr)
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                NOx (ppm)
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                SO₂ (ppm)
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                Temp (°C)
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                Status
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">
                Actions
              </th>
            </tr>
          </thead>
          <motion.tbody
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-sm text-gray-400"
                >
                  No emission records match your search.
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <motion.tr
                  key={record.id}
                  variants={rowVariants}
                  className="border-b border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {record.compressorId}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.compressorName}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {formatDateTime(record.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {record.co2Emission > 0
                      ? record.co2Emission.toFixed(1)
                      : "-"}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {record.noxEmission > 0
                      ? record.noxEmission.toFixed(1)
                      : "-"}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {record.so2Emission > 0
                      ? record.so2Emission.toFixed(2)
                      : "-"}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">
                    {record.temperature > 0 ? record.temperature : "-"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={STATUS_BADGE[record.compliance].variant}>
                      {STATUS_BADGE[record.compliance].label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteRecord(record.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </motion.tbody>
        </table>
      </motion.div>

      <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                Add Emission Reading
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Compressor Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Compressor ID"
                    placeholder="CPR-001"
                    value={form.compressorId}
                    onChange={field("compressorId")}
                  />
                  <Input
                    label="Compressor Name"
                    placeholder="Compressor Unit - Main"
                    value={form.compressorName}
                    onChange={field("compressorName")}
                  />
                  <Input
                    label="Operator"
                    placeholder="Rahul Sharma"
                    value={form.operator}
                    onChange={field("operator")}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Emission Readings
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="CO₂ Emission (kg/hr)"
                    type="number"
                    step="0.1"
                    placeholder="12.4"
                    value={form.co2Emission}
                    onChange={field("co2Emission")}
                  />
                  <Input
                    label="NOx Emission (ppm)"
                    type="number"
                    step="0.1"
                    placeholder="0.8"
                    value={form.noxEmission}
                    onChange={field("noxEmission")}
                  />
                  <Input
                    label="SO₂ Emission (ppm)"
                    type="number"
                    step="0.01"
                    placeholder="0.06"
                    value={form.so2Emission}
                    onChange={field("so2Emission")}
                  />
                  <Input
                    label="Particulate Matter (mg/m³)"
                    type="number"
                    step="0.001"
                    placeholder="0.02"
                    value={form.particulateMatter}
                    onChange={field("particulateMatter")}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Operating Parameters
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Temperature (°C)"
                    type="number"
                    placeholder="82"
                    value={form.temperature}
                    onChange={field("temperature")}
                  />
                  <Input
                    label="Pressure (Bar)"
                    type="number"
                    step="0.1"
                    placeholder="7.8"
                    value={form.pressure}
                    onChange={field("pressure")}
                  />
                  <Input
                    label="Flow Rate (CFM)"
                    type="number"
                    placeholder="320"
                    value={form.flowRate}
                    onChange={field("flowRate")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={field("notes")}
                  placeholder="Additional observations or notes..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave}>
                <Save size={15} className="mr-1" />
                Save Reading
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
