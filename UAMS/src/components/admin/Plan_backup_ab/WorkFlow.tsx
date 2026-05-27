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
import WorkflowBuilder from "./WorkflowBuilder"; // <-- import the builder

// Types
export type WorkflowType = {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "draft";
  createdAt: string;
  updatedAt: string;
};

// Dummy data
const WORKFLOWS_DATA: WorkflowType[] = [
  {
    id: "wf-001",
    name: "Annual Maintenance Workflow",
    description: "Handles annual maintenance tasks and approvals",
    status: "active",
    createdAt: "2024-01-15",
    updatedAt: "2025-02-20",
  },
  {
    id: "wf-002",
    name: "Budget Approval Process",
    description: "Multi-step budget review and approval workflow",
    status: "active",
    createdAt: "2024-02-10",
    updatedAt: "2025-01-05",
  },
  {
    id: "wf-003",
    name: "Asset Lifecycle Management",
    description: "Track assets from procurement to disposal",
    status: "draft",
    createdAt: "2024-03-22",
    updatedAt: "2024-12-10",
  },
  {
    id: "wf-004",
    name: "Compliance Review",
    description: "Quarterly compliance and regulatory checks",
    status: "inactive",
    createdAt: "2024-04-05",
    updatedAt: "2024-11-30",
  },
  {
    id: "wf-005",
    name: "Procurement Workflow",
    description: "Vendor selection and purchase order approvals",
    status: "active",
    createdAt: "2024-05-18",
    updatedAt: "2025-02-28",
  },
  {
    id: "wf-006",
    name: "Risk Assessment Process",
    description: "Annual risk evaluation and mitigation planning",
    status: "draft",
    createdAt: "2024-06-30",
    updatedAt: "2025-01-15",
  },
];

// Column meta data
const COLUMN_META_WORKFLOW = [
  { id: "name", label: "Name", defaultVisible: true },
  { id: "description", label: "Description", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "createdAt", label: "Created Date", defaultVisible: false },
  { id: "updatedAt", label: "Updated Date", defaultVisible: false },
];

const STATUS_BADGE: Record<
  WorkflowType["status"],
  { variant: "success" | "error" | "warning"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "error", label: "Inactive" },
  draft: { variant: "warning", label: "Draft" },
};

// Animation variants
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

// Helper function to render cell content
function renderCell(col: (typeof COLUMN_META_WORKFLOW)[number], workflow: WorkflowType) {
  switch (col.id) {
    case "name":
      return <span className="font-medium text-gray-800">{workflow.name}</span>;
    case "description":
      return <span className="text-sm text-gray-600 truncate max-w-md">{workflow.description}</span>;
    case "status": {
      const s = STATUS_BADGE[workflow.status];
      return <Badge variant={s.variant}>{s.label}</Badge>;
    }
    case "createdAt":
      return <span className="text-sm font-mono">{workflow.createdAt}</span>;
    case "updatedAt":
      return <span className="text-sm font-mono">{workflow.updatedAt}</span>;
    default:
      return <span className="text-sm">{String(workflow[col.id as keyof WorkflowType])}</span>;
  }
}

const EMPTY_FORM: Partial<WorkflowType> = {
  name: "",
  description: "",
  status: "draft",
};

export default function WorkFlow() {
  const [workflows, setWorkflows] = useState<WorkflowType[]>(WORKFLOWS_DATA);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState<Partial<WorkflowType>>(EMPTY_FORM);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowType | null>(null);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);

  // ← Now we open the builder instead of a simple detail view
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(null);

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUMN_META_WORKFLOW.map((c) => [c.id, c.defaultVisible]))
  );

  // ── If a workflow is selected → render full-page WorkflowBuilder ──────────
  if (selectedWorkflow) {
    return (
      <WorkflowBuilder
        workflowName={selectedWorkflow.name}
        workflowId={selectedWorkflow.id}
        onBack={() => setSelectedWorkflow(null)}
      />
    );
  }

  const visibleCount = Object.values(visibleCols).filter(Boolean).length;
  const toggleCol = (id: string) => {
    if (visibleCols[id] && visibleCount <= 2) return;
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const visibleColDefs = COLUMN_META_WORKFLOW.filter((c) => visibleCols[c.id]);

  const filtered = workflows.filter((w) => {
    const q = search.toLowerCase();
    return (
      !q ||
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.status === "active").length,
    draft: workflows.filter((w) => w.status === "draft").length,
  };

  const handleSave = () => {
    if (!form.name || !form.description) {
      toast.error("Please fill in all required fields!", { position: "top-right", autoClose: 3000 });
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    const newWorkflow: WorkflowType = {
      id: `wf-${Date.now()}`,
      name: form.name ?? "",
      description: form.description ?? "",
      status: form.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    };
    setWorkflows((prev) => [...prev, newWorkflow]);
    setForm(EMPTY_FORM);
    setShowAddModal(false);
    toast.success(`Workflow "${newWorkflow.name}" created successfully!`, { position: "top-right", autoClose: 3000 });
  };

  const handleEdit = (workflow: WorkflowType) => {
    setEditingWorkflow(workflow);
    setForm({ name: workflow.name, description: workflow.description, status: workflow.status });
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingWorkflow) return;
    if (!form.name || !form.description) {
      toast.error("Please fill in all required fields!", { position: "top-right", autoClose: 3000 });
      return;
    }
    const updatedWorkflow: WorkflowType = {
      ...editingWorkflow,
      name: form.name ?? editingWorkflow.name,
      description: form.description ?? editingWorkflow.description,
      status: form.status ?? editingWorkflow.status,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setWorkflows((prev) => prev.map((w) => (w.id === editingWorkflow.id ? updatedWorkflow : w)));
    setShowEditModal(false);
    setEditingWorkflow(null);
    setForm(EMPTY_FORM);
    toast.success(`Workflow "${updatedWorkflow.name}" updated successfully!`, { position: "top-right", autoClose: 3000 });
  };

  const handleDeleteClick = (id: string) => {
    const workflow = workflows.find((w) => w.id === id);
    if (workflow) { setDeletingWorkflowId(id); setForm({ name: workflow.name }); setShowDeleteModal(true); }
  };

  const confirmDelete = () => {
    if (deletingWorkflowId) {
      const workflowToDelete = workflows.find((w) => w.id === deletingWorkflowId);
      setWorkflows((prev) => prev.filter((w) => w.id !== deletingWorkflowId));
      toast.success(`Workflow "${workflowToDelete?.name}" deleted successfully!`, { position: "top-right", autoClose: 3000 });
      setShowDeleteModal(false);
      setDeletingWorkflowId(null);
      setForm(EMPTY_FORM);
    }
  };

  const field =
    (key: keyof WorkflowType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  return (
    <>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-6 space-y-6">
        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Workflows", value: stats.total, color: "text-gray-800" },
            { label: "Active", value: stats.active, color: "text-green-600" },
            { label: "Draft", value: stats.draft, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </motion.div>

        {/* Toolbar */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Input
              placeholder="Search workflows..."
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
                  <Columns3 size={15} /> Columns
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[190px]">
                  <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Show / Hide Columns</p>
                  {COLUMN_META_WORKFLOW.map((col) => {
                    const checked = visibleCols[col.id];
                    const disabled = checked && visibleCount <= 2;
                    return (
                      <DropdownMenu.CheckboxItem
                        key={col.id}
                        checked={checked}
                        onCheckedChange={() => toggleCol(col.id)}
                        disabled={disabled}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer outline-none select-none ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${checked ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                          {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-gray-700">{col.label}</span>
                      </DropdownMenu.CheckboxItem>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg h-10 px-4">
              <Plus size={15} className="mr-1" /> Create Workflow
            </Button>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-[700px] w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {visibleColDefs.map((col) => (
                  <th key={col.id} className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">{col.label}</th>
                ))}
                <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">Actions</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColDefs.length + 1} className="py-12 text-center text-sm text-gray-400">
                    No workflows match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((workflow) => (
                  <motion.tr
                    key={workflow.id}
                    variants={rowVariants}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    {visibleColDefs.map((col) => (
                      <td key={col.id} className="py-3 px-4 whitespace-nowrap">{renderCell(col, workflow)}</td>
                    ))}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(workflow); }}
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(workflow.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
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

        {/* Add Workflow Modal */}
        <Dialog.Root open={showAddModal} onOpenChange={setShowAddModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <Dialog.Title className="text-base font-bold text-gray-800">Create New Workflow</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
                </Dialog.Close>
              </div>
              <div className="px-6 py-5 space-y-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Workflow Name" placeholder="Enter workflow name" value={form.name ?? ""} onChange={field("name")} />
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <select value={form.status} onChange={field("status")} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors">
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                      <textarea placeholder="Enter workflow description" value={form.description ?? ""} onChange={field("description")} rows={3}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <Dialog.Close asChild><Button variant="secondary" size="sm">Cancel</Button></Dialog.Close>
                <Button variant="primary" size="sm" onClick={handleSave}>Save Workflow</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Edit Workflow Modal */}
        <Dialog.Root open={showEditModal} onOpenChange={setShowEditModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <Dialog.Title className="text-base font-bold text-gray-800">Edit Workflow</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
                </Dialog.Close>
              </div>
              <div className="px-6 py-5 space-y-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Edit Workflow Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Workflow Name" placeholder="Enter workflow name" value={form.name ?? ""} onChange={field("name")} />
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <select value={form.status} onChange={field("status")} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors">
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                      <textarea placeholder="Enter workflow description" value={form.description ?? ""} onChange={field("description")} rows={3}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <Dialog.Close asChild><Button variant="secondary" size="sm">Cancel</Button></Dialog.Close>
                <Button variant="primary" size="sm" onClick={handleUpdate}>Save Changes</Button>
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
                <Dialog.Title className="text-base font-bold text-gray-800">Confirm Delete</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
                </Dialog.Close>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                </div>
                <p className="text-center text-gray-700 mb-2">Are you sure you want to delete this workflow?</p>
                <p className="text-center text-sm text-gray-500">
                  This action cannot be undone. The workflow "<span className="font-semibold">{form.name}</span>" will be permanently removed.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <Dialog.Close asChild><Button variant="secondary" size="sm">Cancel</Button></Dialog.Close>
                <Button variant="primary" size="sm" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete Workflow</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </motion.div>
    </>
  );
}
