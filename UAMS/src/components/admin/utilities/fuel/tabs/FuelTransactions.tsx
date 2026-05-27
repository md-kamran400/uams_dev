import { useState, useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  Columns3,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  X,
  Filter,
} from "lucide-react";
import Button from "../../../../ui/Button";
import Badge from "../../../../ui/Badge";
import Input from "../../../../ui/Input";
import {
  FUEL_TRANSACTIONS,
  FUEL_TANKS,
  FUEL_CONSUMERS,
  TRANSACTION_COLUMN_META,
  type FuelTransaction,
  type TransactionType,
  type FuelType,
  type Shift,
} from "../../../../../data/fuelData";

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
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

function renderCell(
  col: (typeof TRANSACTION_COLUMN_META)[number],
  tx: FuelTransaction,
) {
  switch (col.id) {
    case "type":
      return tx.type === "Receipt" ? (
        <Badge variant="success">Receipt</Badge>
      ) : (
        <Badge variant="warning">Dispensing</Badge>
      );
    case "fuelType":
      return (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
          {tx.fuelType}
        </span>
      );
    case "shift":
      return (
        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
          Shift {tx.shift}
        </span>
      );
    case "quantityL":
      return (
        <span
          className={`font-semibold ${tx.type === "Receipt" ? "text-green-600" : "text-orange-600"}`}
        >
          {tx.type === "Receipt" ? "+" : "-"}
          {tx.quantityL.toLocaleString("en-IN")} L
        </span>
      );
    case "unitCostPerL":
      return tx.unitCostPerL ? (
        <span className="text-sm">₹{tx.unitCostPerL.toFixed(2)}</span>
      ) : (
        <span className="text-gray-300">—</span>
      );
    case "supplier":
      return (
        <span className="text-sm">
          {tx.supplier ?? <span className="text-gray-300">—</span>}
        </span>
      );
    case "consumerName":
      return (
        <span className="text-sm">
          {tx.consumerName ?? <span className="text-gray-300">—</span>}
        </span>
      );
    case "authorisedBy":
      return (
        <span className="text-sm">
          {tx.authorisedBy ?? <span className="text-gray-300">—</span>}
        </span>
      );
    default:
      return (
        <span className="text-sm">{String((tx as any)[col.id] ?? "—")}</span>
      );
  }
}

const EMPTY_FORM: Partial<FuelTransaction> = {
  type: "Dispensing",
  shift: "A",
  fuelType: "HSD",
};

export default function FuelTransactions() {
  const [transactions, setTransactions] =
    useState<FuelTransaction[]>(FUEL_TRANSACTIONS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | TransactionType>("All");
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      TRANSACTION_COLUMN_META.map((c) => [c.id, c.defaultVisible]),
    ),
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<Partial<FuelTransaction>>(EMPTY_FORM);

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;
  const toggleCol = (id: string) => {
    if (visibleCols[id] && visibleCount <= 2) return;
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const visibleColDefs = TRANSACTION_COLUMN_META.filter(
    (c) => visibleCols[c.id],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((tx) => {
        const matchType = typeFilter === "All" || tx.type === typeFilter;
        const matchSearch =
          !q ||
          tx.date.includes(q) ||
          (tx.supplier ?? "").toLowerCase().includes(q) ||
          (tx.consumerName ?? "").toLowerCase().includes(q) ||
          tx.tankName.toLowerCase().includes(q) ||
          tx.fuelType.toLowerCase().includes(q) ||
          (tx.costCentre ?? "").toLowerCase().includes(q);
        return matchType && matchSearch;
      });
  }, [transactions, search, typeFilter]);

  const totals = useMemo(
    () => ({
      receipts: filtered
        .filter((t) => t.type === "Receipt")
        .reduce((s, t) => s + t.quantityL, 0),
      dispensing: filtered
        .filter((t) => t.type === "Dispensing")
        .reduce((s, t) => s + t.quantityL, 0),
    }),
    [filtered],
  );

  const field =
    (key: keyof FuelTransaction) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    if (!form.date || !form.fuelType || !form.tankId || !form.quantityL) return;
    const tank = FUEL_TANKS.find((t) => t.id === form.tankId);
    const consumer = FUEL_CONSUMERS.find((c) => c.id === form.consumerId);
    const newTx: FuelTransaction = {
      id: `tx-${Date.now()}`,
      date: form.date ?? "",
      shift: (form.shift as Shift) ?? "A",
      type: (form.type as TransactionType) ?? "Dispensing",
      fuelType: (form.fuelType as FuelType) ?? "HSD",
      tankId: form.tankId ?? "",
      tankName: tank?.name ?? "",
      quantityL: Number(form.quantityL),
      supplier: form.supplier,
      invoiceNo: form.invoiceNo,
      unitCostPerL: form.unitCostPerL ? Number(form.unitCostPerL) : undefined,
      consumerId: form.consumerId,
      consumerName: consumer?.name ?? form.consumerName,
      operator: form.operator,
      odometerOrHours: form.odometerOrHours,
      costCentre: form.costCentre,
      authorisedBy: form.authorisedBy,
      remarks: form.remarks,
    };
    setTransactions((prev) => [newTx, ...prev]);
    setForm(EMPTY_FORM);
    setShowAddModal(false);
  };

  const isReceipt = form.type === "Receipt";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Transactions</h3>
        <p className="text-sm text-gray-500">
          All fuel movements — receipts (IN) and dispensing (OUT) across all
          tanks.
        </p>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>

        {/* Type filter toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["All", "Receipt", "Dispensing"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                typeFilter === t
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "All"
                ? "All"
                : t === "Receipt"
                  ? "↓ Receipt"
                  : "↑ Dispensing"}
            </button>
          ))}
        </div>

        {/* Column visibility */}
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
              className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[200px]"
            >
              <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Show / Hide Columns
              </p>
              {TRANSACTION_COLUMN_META.map((col) => {
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
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${checked ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}
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
          Add Transaction
        </Button>
      </motion.div>

      {/* Summary row */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Entries",
            value: filtered.length,
            color: "text-gray-800",
            icon: Filter,
          },
          {
            label: "Total Received",
            value: `+${totals.receipts.toLocaleString("en-IN")} L`,
            color: "text-green-600",
            icon: ArrowDownToLine,
          },
          {
            label: "Total Dispensed",
            value: `-${totals.dispensing.toLocaleString("en-IN")} L`,
            color: "text-orange-600",
            icon: ArrowUpFromLine,
          },
        ].map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center gap-3"
          >
            <Icon size={16} className={`${color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Table */}
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
                  colSpan={visibleColDefs.length}
                  className="py-12 text-center text-sm text-gray-400"
                >
                  No transactions match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <motion.tr
                  key={tx.id}
                  variants={rowVariants}
                  className="border-b border-gray-100 hover:bg-orange-50/40 transition-colors"
                >
                  {visibleColDefs.map((col) => (
                    <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                      {renderCell(col, tx)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </motion.tbody>
        </table>
      </motion.div>

      {/* Add Transaction Modal */}
      <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                Add Transaction
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Type toggle */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Transaction Type
                </p>
                <div className="flex gap-3">
                  {(["Receipt", "Dispensing"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        form.type === t
                          ? t === "Receipt"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {t === "Receipt" ? (
                        <ArrowDownToLine size={16} />
                      ) : (
                        <ArrowUpFromLine size={16} />
                      )}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Common fields */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Basic Info
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date"
                    type="date"
                    value={form.date ?? ""}
                    onChange={field("date")}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Shift
                    </label>
                    <select
                      value={form.shift ?? "A"}
                      onChange={field("shift")}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
                    >
                      <option value="A">Shift A</option>
                      <option value="B">Shift B</option>
                      <option value="C">Shift C</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Fuel Type
                    </label>
                    <select
                      value={form.fuelType ?? "HSD"}
                      onChange={field("fuelType")}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
                    >
                      <option value="HSD">HSD</option>
                      <option value="Petrol">Petrol</option>
                      <option value="LPG">LPG</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Tank
                    </label>
                    <select
                      value={form.tankId ?? ""}
                      onChange={field("tankId")}
                      className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
                    >
                      <option value="">Select tank…</option>
                      {FUEL_TANKS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Quantity (L)"
                    type="number"
                    placeholder="0"
                    value={String(form.quantityL ?? "")}
                    onChange={field("quantityL")}
                  />
                </div>
              </div>

              {/* Receipt-specific */}
              {isReceipt && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Receipt Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Supplier"
                      placeholder="HPCL / BPCL / IOC"
                      value={form.supplier ?? ""}
                      onChange={field("supplier")}
                    />
                    <Input
                      label="Invoice No."
                      placeholder="INV-2026-XXXX"
                      value={form.invoiceNo ?? ""}
                      onChange={field("invoiceNo")}
                    />
                    <Input
                      label="Unit Cost (₹/L)"
                      type="number"
                      placeholder="92.50"
                      value={String(form.unitCostPerL ?? "")}
                      onChange={field("unitCostPerL")}
                    />
                  </div>
                </div>
              )}

              {/* Dispensing-specific */}
              {!isReceipt && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Dispensing Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        Consumer
                      </label>
                      <select
                        value={form.consumerId ?? ""}
                        onChange={field("consumerId")}
                        className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
                      >
                        <option value="">Select consumer…</option>
                        {FUEL_CONSUMERS.filter(
                          (c) => c.status === "Active",
                        ).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Operator / Driver"
                      placeholder="Name"
                      value={form.operator ?? ""}
                      onChange={field("operator")}
                    />
                    <Input
                      label="Odometer / Running Hrs"
                      placeholder="e.g. 84320 km or 4820 h"
                      value={form.odometerOrHours ?? ""}
                      onChange={field("odometerOrHours")}
                    />
                    <Input
                      label="Cost Centre / Dept"
                      placeholder="e.g. Warehouse"
                      value={form.costCentre ?? ""}
                      onChange={field("costCentre")}
                    />
                    <Input
                      label="Authorised By"
                      placeholder="Supervisor name"
                      value={form.authorisedBy ?? ""}
                      onChange={field("authorisedBy")}
                    />
                  </div>
                </div>
              )}

              <Input
                label="Remarks (optional)"
                placeholder="Any notes…"
                value={form.remarks ?? ""}
                onChange={field("remarks")}
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save Transaction
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
