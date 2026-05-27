import React, { useState } from "react";
import { motion, type Variants } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Plus, Pencil, Trash2, Check, Columns3, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import Input from "../../ui/Input";
import { PlanType, PLANS_DATA, COLUMN_META_PLAN } from "../../../data/planData";
import PlanDetail from "./PlanDetail";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
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
  PlanType["active"],
  { variant: "success" | "error" | "warning"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "error", label: "Inactive" },
  draft: { variant: "warning", label: "Draft" },
};

function renderCell(col: (typeof COLUMN_META_PLAN)[number], plan: PlanType) {
  switch (col.id) {
    case "planId":
      return (
        <span className="font-semibold text-blue-700 font-mono text-sm">
          {plan.planId}
        </span>
      );
    case "planName":
      return <span className="font-medium text-gray-800">{plan.planName}</span>;
    case "year":
      return <span className="text-sm font-mono">{plan.year}</span>;
    case "assets":
      return <div className="flex flex-wrap gap-1">{plan.assets}</div>;
    case "active": {
      const s = STATUS_BADGE[plan.active];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    }
    default:
      return (
        <span className="text-sm">
          {String(plan[col.id as keyof PlanType])}
        </span>
      );
  }
}

const EMPTY_FORM: Partial<PlanType> = {
  planId: "",
  planName: "",
  year: new Date().getFullYear().toString(),
  active: "draft",
};

export default function Plan() {
  const [plans, setPlans] = useState<PlanType[]>(PLANS_DATA);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState<Partial<PlanType>>(EMPTY_FORM);
  const [editingPlan, setEditingPlan] = useState<PlanType | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUMN_META_PLAN.map((c) => [c.id, c.defaultVisible])),
  );

  if (selectedPlan) {
    return (
      <PlanDetail plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
    );
  }

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;
  const toggleCol = (id: string) => {
    if (visibleCols[id] && visibleCount <= 2) return;
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const visibleColDefs = COLUMN_META_PLAN.filter((c) => visibleCols[c.id]);

  const filtered = plans.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.planId.toLowerCase().includes(q) ||
      p.planName.toLowerCase().includes(q) ||
      p.year.includes(q)
    );
  });

  const stats = {
    total: plans.length,
    active: plans.filter((p) => p.active === "active").length,
    draft: plans.filter((p) => p.active === "draft").length,
  };

  const handleSave = () => {
    if (!form.planId || !form.planName || !form.year) {
      toast.error("Please fill in all required fields!", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    const newPlan: PlanType = {
      id: `plan-${Date.now()}`,
      planId: form.planId ?? "",
      planName: form.planName ?? "",
      year: form.year ?? new Date().getFullYear().toString(),
      assets: Number(form.assets) || 0,
      active: form.active ?? "draft",
    };
    setPlans((prev) => [...prev, newPlan]);
    setForm(EMPTY_FORM);
    setShowAddModal(false);
    toast.success(`Plan "${newPlan.planName}" created successfully!`, {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleEdit = (plan: PlanType) => {
    setEditingPlan(plan);
    setForm({
      planId: plan.planId,
      planName: plan.planName,
      year: plan.year,
      assets: plan.assets,
      active: plan.active,
    });
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingPlan) return;
    if (!form.planId || !form.planName || !form.year) {
      toast.error("Please fill in all required fields!", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const updatedPlan: PlanType = {
      ...editingPlan,
      planId: form.planId ?? editingPlan.planId,
      planName: form.planName ?? editingPlan.planName,
      year: form.year ?? editingPlan.year,
      assets: Number(form.assets) || editingPlan.assets,
      active: form.active ?? editingPlan.active,
    };

    setPlans((prev) =>
      prev.map((p) => (p.id === editingPlan.id ? updatedPlan : p)),
    );
    setShowEditModal(false);
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    toast.success(`Plan "${updatedPlan.planName}" updated successfully!`, {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleDeleteClick = (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (plan) {
      setDeletingPlanId(id);
      setForm({ planName: plan.planName });
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = () => {
    if (deletingPlanId) {
      const planToDelete = plans.find((p) => p.id === deletingPlanId);
      setPlans((prev) => prev.filter((p) => p.id !== deletingPlanId));
      toast.success(`Plan "${planToDelete?.planName}" deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
      });
      setShowDeleteModal(false);
      setDeletingPlanId(null);
      setForm(EMPTY_FORM);
    }
  };

  const field =
    (key: keyof PlanType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (key === "assets") {
        setForm((f) => ({
          ...f,
          [key]: Number(e.target.value),
        }));
      } else {
        setForm((f) => ({ ...f, [key]: e.target.value }));
      }
    };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-6 space-y-6"
      >
        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Plans",
              value: stats.total,
              color: "text-gray-800",
            },
            { label: "Active", value: stats.active, color: "text-green-600" },
            { label: "Draft", value: stats.draft, color: "text-amber-600" },
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

        {/* Toolbar */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center gap-3 justify-between"
        >
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Input
              placeholder="Search plans…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={15} />}
              className="h-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors h-10">
                  <Columns3 size={15} />
                  Columns
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[190px]"
                >
                  <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Show / Hide Columns
                  </p>
                  {COLUMN_META_PLAN.map((col) => {
                    const checked = visibleCols[col.id];
                    const disabled = checked && visibleCount <= 2;
                    return (
                      <DropdownMenu.CheckboxItem
                        key={col.id}
                        checked={checked}
                        onCheckedChange={() => toggleCol(col.id)}
                        disabled={disabled}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer outline-none select-none
                    ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border
                    ${checked ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
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
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg h-10 px-4"
            >
              <Plus size={15} className="mr-1" />
              Create Plan
            </Button>
          </div>
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
                    No plans match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((plan) => (
                  <motion.tr
                    key={plan.id}
                    variants={rowVariants}
                    onClick={() => setSelectedPlan(plan)}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    {visibleColDefs.map((col) => (
                      <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                        {renderCell(col, plan)}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(plan);
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(plan.id);
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

        {/* Add Plan Modal */}
        <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <Dialog.Title className="text-base font-bold text-gray-800">
                  Create New Plan
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
                      label="Plan ID"
                      placeholder="PLAN-001"
                      value={form.planId ?? ""}
                      onChange={field("planId")}
                    />
                    <Input
                      label="Plan Name"
                      placeholder="Annual Maintenance Plan"
                      value={form.planName ?? ""}
                      onChange={field("planName")}
                    />
                    <Input
                      label="Year"
                      placeholder="2026"
                      value={form.year ?? ""}
                      onChange={field("year")}
                    />

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        value={form.active}
                        onChange={field("active")}
                        className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
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
                  Save Plan
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Edit Plan Modal */}
        <Dialog.Root open={showEditModal} onOpenChange={setShowEditModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <Dialog.Title className="text-base font-bold text-gray-800">
                  Edit Plan
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
                    Edit Plan Information
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Plan ID"
                      placeholder="PLAN-001"
                      value={form.planId ?? ""}
                      onChange={field("planId")}
                    />
                    <Input
                      label="Plan Name"
                      placeholder="Annual Maintenance Plan"
                      value={form.planName ?? ""}
                      onChange={field("planName")}
                    />
                    <Input
                      label="Year"
                      placeholder="2026"
                      value={form.year ?? ""}
                      onChange={field("year")}
                    />

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        value={form.active}
                        onChange={field("active")}
                        className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <Dialog.Close asChild>
                  <Button variant="secondary" size="sm">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button variant="primary" size="sm" onClick={handleUpdate}>
                  Save Changes
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Delete Confirmation Modal */}
        <Dialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <Dialog.Title className="text-base font-bold text-gray-800">
                  Confirm Delete
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <X size={16} />
                  </button>
                </Dialog.Close>
              </div>

              <div className="px-6 py-5">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                </div>
                <p className="text-center text-gray-700 mb-2">
                  Are you sure you want to delete this plan?
                </p>
                <p className="text-center text-sm text-gray-500">
                  This action cannot be undone. The plan "
                  <span className="font-semibold">{form.planName}</span>" will
                  be permanently removed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <Dialog.Close asChild>
                  <Button variant="secondary" size="sm">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Plan
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </motion.div>
    </>
  );
}
