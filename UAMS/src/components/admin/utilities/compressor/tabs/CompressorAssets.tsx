import { useState, type ChangeEvent } from "react";
import { motion, type Variants } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Columns3, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import Button from "../../../../ui/Button";
import Badge from "../../../../ui/Badge";
import Input from "../../../../ui/Input";
import {
  COMPRESSOR_ASSETS,
  COMPRESSOR_COLUMN_META,
  type CompressorAsset,
} from "../../../../../data/compressorAssets";
import CompressorAssetDetail from "./CompressorAssetDetail";

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

const STATUS_BADGE: Record<
  CompressorAsset["status"],
  { variant: "success" | "warning" | "error"; label: string }
> = {
  operational: { variant: "success", label: "Operational" },
  maintenance: { variant: "warning", label: "Maintenance" },
  offline: { variant: "error", label: "Offline" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderCell(
  col: (typeof COMPRESSOR_COLUMN_META)[number],
  asset: CompressorAsset,
) {
  switch (col.id) {
    case "assetTag":
      return (
        <span className="font-semibold text-blue-700 font-mono text-sm">
          {asset.assetTag}
        </span>
      );
    case "status": {
      const s = STATUS_BADGE[asset.status];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    }
    case "make":
      return (
        <span>
          {asset.make}{" "}
          <span className="text-gray-400 text-xs">{asset.model}</span>
        </span>
      );
    case "runningHours":
      return (
        <span className="font-mono text-sm">
          {asset.runningHours.toLocaleString()} h
        </span>
      );
    case "nextServiceDue":
      return (
        <span className="font-mono text-sm">
          {asset.nextServiceDue.toLocaleString()} h
        </span>
      );
    case "lastServiceDate":
    case "installationDate":
    case "warrantyExpiry":
      return <span className="text-sm">{formatDate(asset[col.id])}</span>;
    default:
      return <span className="text-sm">{String(asset[col.id])}</span>;
  }
}

const EMPTY_FORM: Partial<CompressorAsset> = {
  status: "operational",
  fuelType: "Electric",
  ratedVoltage: "415V",
  ratedFrequency: "50Hz",
};

export default function CompressorAssets() {
  const [assets, setAssets] = useState<CompressorAsset[]>(COMPRESSOR_ASSETS);
  const [search, setSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      COMPRESSOR_COLUMN_META.map((c) => [c.id, c.defaultVisible]),
    ),
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<Partial<CompressorAsset>>(EMPTY_FORM);
  const [selectedAsset, setSelectedAsset] = useState<CompressorAsset | null>(
    null,
  );

  if (selectedAsset) {
    return (
      <CompressorAssetDetail
        asset={selectedAsset}
        onBack={() => setSelectedAsset(null)}
      />
    );
  }

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;
  const visibleColDefs = COMPRESSOR_COLUMN_META.filter(
    (c) => visibleCols[c.id],
  );
  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    return (
      !q ||
      a.assetTag.toLowerCase().includes(q) ||
      a.unitName.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.assignedEngineer.toLowerCase().includes(q) ||
      a.make.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: assets.length,
    operational: assets.filter((a) => a.status === "operational").length,
    maintenance: assets.filter((a) => a.status === "maintenance").length,
  };

  const handleSave = () => {
    if (!form.assetTag || !form.unitName || !form.make) return;
    const newAsset: CompressorAsset = {
      id: `cpr-${Date.now()}`,
      assetTag: form.assetTag ?? "",
      unitName: form.unitName ?? "",
      make: form.make ?? "",
      model: form.model ?? "",
      serialNumber: form.serialNumber ?? "",
      kvaRating: form.kvaRating ?? "",
      status: form.status ?? "operational",
      runningHours: Number(form.runningHours) || 0,
      lastServiceDate:
        form.lastServiceDate ?? new Date().toISOString().slice(0, 10),
      nextServiceDue: Number(form.nextServiceDue) || 0,
      installationDate:
        form.installationDate ?? new Date().toISOString().slice(0, 10),
      warrantyExpiry:
        form.warrantyExpiry ?? new Date().toISOString().slice(0, 10),
      ratedVoltage: form.ratedVoltage ?? "415V",
      ratedFrequency: form.ratedFrequency ?? "50Hz",
      ratedCurrent: form.ratedCurrent ?? "",
      fuelType: form.fuelType ?? "Electric",
      location: form.location ?? "",
      assignedEngineer: form.assignedEngineer ?? "",
    };
    setAssets((prev) => [...prev, newAsset]);
    setForm(EMPTY_FORM);
    setShowAddModal(false);
  };

  const deleteAsset = (id: string) =>
    setAssets((prev) => prev.filter((a) => a.id !== id));
  const field =
    (key: keyof CompressorAsset) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleCol = (id: string) => {
    if (visibleCols[id] && visibleCount <= 2) return;
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
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
          Compressor Asset Register
        </h3>
        <p className="text-sm text-gray-500">
          Registered compressor units, technical specifications, installation
          dates, and maintenance status.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search assets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Columns3 size={15} />
              Columns
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[190px]"
            >
              <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Show / Hide Columns
              </p>
              {COMPRESSOR_COLUMN_META.map((col) => {
                const checked = visibleCols[col.id];
                const disabled = checked && visibleCount <= 2;
                return (
                  <DropdownMenu.CheckboxItem
                    key={col.id}
                    checked={checked}
                    onCheckedChange={() => toggleCol(col.id)}
                    disabled={disabled}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer outline-none select-none ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${checked ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                    >
                      {checked && (
                        <Check
                          size={11}
                          className="text-white"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                    <span className="text-gray-700">{col.label}</span>
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} className="mr-1" />
          Add Asset
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Assets", value: stats.total, color: "text-gray-800" },
          {
            label: "Operational",
            value: stats.operational,
            color: "text-green-600",
          },
          {
            label: "Under Maintenance",
            value: stats.maintenance,
            color: "text-amber-600",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
          >
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto"
      >
        <table className="min-w-[700px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {visibleColDefs.map((col) => (
                <th
                  key={col.id}
                  className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
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
                  colSpan={visibleColDefs.length + 1}
                  className="py-12 text-center text-sm text-gray-400"
                >
                  No assets match your search.
                </td>
              </tr>
            ) : (
              filtered.map((asset) => (
                <motion.tr
                  key={asset.id}
                  variants={rowVariants}
                  onClick={() => setSelectedAsset(asset)}
                  className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {visibleColDefs.map((col) => (
                    <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                      {renderCell(col, asset)}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAsset(asset.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
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
                Add New Compressor Asset
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
                  Basic Information
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Asset Tag"
                    placeholder="CPR-006"
                    value={form.assetTag ?? ""}
                    onChange={field("assetTag")}
                  />
                  <Input
                    label="Unit Name"
                    placeholder="Compressor Unit - Backup"
                    value={form.unitName ?? ""}
                    onChange={field("unitName")}
                  />
                  <Input
                    label="Make"
                    placeholder="Atlas Copco"
                    value={form.make ?? ""}
                    onChange={field("make")}
                  />
                  <Input
                    label="Model"
                    placeholder="GA 75 VSD+"
                    value={form.model ?? ""}
                    onChange={field("model")}
                  />
                  <Input
                    label="Serial Number"
                    placeholder="AC2023011"
                    value={form.serialNumber ?? ""}
                    onChange={field("serialNumber")}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={field("status")}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Specifications
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="kW Rating"
                    placeholder="75 kW"
                    value={form.kvaRating ?? ""}
                    onChange={field("kvaRating")}
                  />
                  <Input
                    label="Rated Voltage"
                    placeholder="415V"
                    value={form.ratedVoltage ?? ""}
                    onChange={field("ratedVoltage")}
                  />
                  <Input
                    label="Rated Frequency"
                    placeholder="50Hz"
                    value={form.ratedFrequency ?? ""}
                    onChange={field("ratedFrequency")}
                  />
                  <Input
                    label="Rated Current"
                    placeholder="125A"
                    value={form.ratedCurrent ?? ""}
                    onChange={field("ratedCurrent")}
                  />
                  <Input
                    label="Power Source"
                    placeholder="Electric"
                    value={form.fuelType ?? ""}
                    onChange={field("fuelType")}
                  />
                  <Input
                    label="Running Hours"
                    type="number"
                    placeholder="0"
                    value={String(form.runningHours ?? "")}
                    onChange={field("runningHours")}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Dates & Assignment
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Location"
                    placeholder="Compressor Hall, Block B"
                    value={form.location ?? ""}
                    onChange={field("location")}
                  />
                  <Input
                    label="Assigned Engineer"
                    placeholder="Nikhil Verma"
                    value={form.assignedEngineer ?? ""}
                    onChange={field("assignedEngineer")}
                  />
                  <Input
                    label="Installation Date"
                    type="date"
                    value={form.installationDate ?? ""}
                    onChange={field("installationDate")}
                  />
                  <Input
                    label="Warranty Expiry"
                    type="date"
                    value={form.warrantyExpiry ?? ""}
                    onChange={field("warrantyExpiry")}
                  />
                  <Input
                    label="Last Service Date"
                    type="date"
                    value={form.lastServiceDate ?? ""}
                    onChange={field("lastServiceDate")}
                  />
                  <Input
                    label="Next Service Due (h)"
                    type="number"
                    placeholder="9000"
                    value={String(form.nextServiceDue ?? "")}
                    onChange={field("nextServiceDue")}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save Asset
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
