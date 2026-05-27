import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Columns3, Plus, Pencil, Trash2, Check, X, AlertTriangle, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../../../ui/Button';
import Badge from '../../../../ui/Badge';
import Input from '../../../../ui/Input';
import { api, type ApiSiteHierarchy } from '../../../../../lib/api';
import DGAssetDetail, { type AugmentedAsset } from './DGAssetDetail';
import * as XLSX from 'xlsx';

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

const COLUMN_META = [
  { id: 'assetTag',     label: 'Asset Tag',       defaultVisible: true  },
  { id: 'unitName',     label: 'Unit Name',        defaultVisible: true  },
  { id: 'make',         label: 'Make / Model',     defaultVisible: true  },
  { id: 'ratedKva',     label: 'KVA Rating',       defaultVisible: true  },
  { id: 'status',       label: 'Status',           defaultVisible: true  },
  { id: 'installDate',  label: 'Install Date',     defaultVisible: false },
  { id: 'siteName',     label: 'Location',         defaultVisible: true  },
] as const;

const PAGE_SIZE = 10;

function renderCell(col: typeof COLUMN_META[number], asset: AugmentedAsset) {
  switch (col.id) {
    case 'assetTag':
      return <span className="font-semibold text-blue-700 font-mono text-sm cursor-pointer hover:underline">{asset.assetTag}</span>;
    case 'unitName':
      return <span className="font-medium text-sm">{asset.unitName}</span>;
    case 'status': {
      const color = asset.status === 'Active' ? 'success' : asset.status === 'Inactive' ? 'error' : 'warning';
      const label = asset.status === 'Active' ? 'Operational' : asset.status;
      return <Badge variant={color}>{label}</Badge>;
    }
    case 'make':
      return <span>{asset.make} <span className="text-gray-400 text-xs">{asset.model}</span></span>;
    case 'ratedKva':
      return <span className="text-sm">{asset.ratedKva ? `${asset.ratedKva} KVA` : '—'}</span>;
    case 'installDate':
      return <span className="text-sm">{asset.installDate ? new Date(asset.installDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>;
    case 'siteName':
      return <span className="text-sm text-gray-600">{(asset.siteName as string) ?? '—'}{asset.plantName ? ` › ${asset.plantName as string}` : ''}{asset.areaName ? ` › ${asset.areaName as string}` : ''}</span>;
    default:
      return <span className="text-sm">—</span>;
  }
}

type FormState = Partial<AugmentedAsset> & {
  siteId?: string;
  plantId?: string;
  areaId?: string;
};

const EMPTY_FORM: FormState = { status: 'Active' };

interface DGAssetsProps {
  utilityTypeId?: string;
}

export default function DGAssets({ utilityTypeId }: DGAssetsProps = {}) {
  const [assets, setAssets] = useState<AugmentedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedUtId, setResolvedUtId] = useState<string | undefined>(utilityTypeId);
  const [hierarchy, setHierarchy] = useState<ApiSiteHierarchy[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
    () => Object.fromEntries(COLUMN_META.map(c => [c.id, c.defaultVisible]))
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedAsset, setSelectedAsset] = useState<AugmentedAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<AugmentedAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AugmentedAsset | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    setSelectedAsset(null); // reset detail view on utility change
    async function load() {
      try {
        const [hier] = await Promise.all([api.sites.hierarchy()]);
        setHierarchy(hier);

        if (!utilityTypeId) {
          // Fallback for standalone/dev usage without a prop
          const [types, allAssets] = await Promise.all([
            api.utilityTypes.list(),
            api.assets.list(),
          ]);
          const dg = types.find(t => t.name === 'Diesel Generator' || t.name === 'DG Set') || types[0];
          if (dg) {
            const utId = dg.id;
            setResolvedUtId(utId);
            const dgAssets = allAssets
              .filter(a => a.utilityTypeId === utId)
              .map(a => ({
                ...a,
                assetTag: a.serial || `AST-${a.id.slice(0, 3).toUpperCase()}`,
                unitName: a.name,
                make: a.manufacturer || 'Unknown',
              } as AugmentedAsset));
            setAssets(dgAssets);
          }
        } else {
          setResolvedUtId(utilityTypeId);
          const allAssets = await api.assets.list();
          const filtered = allAssets
            .filter(a => a.utilityTypeId === utilityTypeId)
            .map(a => ({
              ...a,
              assetTag: a.serial || `AST-${a.id.slice(0, 3).toUpperCase()}`,
              unitName: a.name,
              make: a.manufacturer || 'Unknown',
            } as AugmentedAsset));
          setAssets(filtered);
        }
      } catch (e) {
        console.error('Failed to load assets:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [utilityTypeId]);



  const visibleCount = Object.values(visibleCols).filter(Boolean).length;
  const toggleCol = (id: string) => {
    if (visibleCols[id] && visibleCount <= 2) return;
    setVisibleCols(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const visibleColDefs = COLUMN_META.filter(c => visibleCols[c.id]);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    return !q || a.assetTag.toLowerCase().includes(q) || a.unitName.toLowerCase().includes(q) ||
      a.make.toLowerCase().includes(q) || String(a.siteName ?? '').toLowerCase().includes(q) ||
      String(a.plantName ?? '').toLowerCase().includes(q) || String(a.areaName ?? '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = {
    total: assets.length,
    operational: assets.filter(a => a.status === 'Active').length,
    maintenance: assets.filter(a => a.status === 'Under Maintenance').length,
    offline: assets.filter(a => a.status === 'Inactive').length,
  };

  // ── cascading location helpers ──────────────────────────────────────────────
  const selectedSite = hierarchy.find(s => s.id === form.siteId);
  const availablePlants = selectedSite?.plants ?? [];
  const selectedPlant = availablePlants.find(p => p.id === form.plantId);
  const availableAreas = selectedPlant?.areas ?? [];

  const openAdd = () => {
    const firstSite = hierarchy[0];
    const firstPlant = firstSite?.plants[0];
    const firstArea = firstPlant?.areas[0];
    setForm({
      ...EMPTY_FORM,
      siteId: firstSite?.id ?? '',
      plantId: firstPlant?.id ?? '',
      areaId: firstArea?.id ?? '',
    });
    setEditTarget(null);
    setShowAddModal(true);
  };

  const openEdit = (asset: AugmentedAsset) => {
    setForm({
      assetTag: asset.assetTag,
      unitName: asset.unitName,
      make: asset.make,
      model: asset.model ?? '',
      ratedKva: asset.ratedKva ?? '',
      status: asset.status,
      installDate: asset.installDate ?? '',
      siteId: asset.siteId,
      plantId: asset.plantId,
      areaId: asset.areaId,
    });
    setEditTarget(asset);
    setShowAddModal(true);
  };

  const handleSiteChange = (siteId: string) => {
    const site = hierarchy.find(s => s.id === siteId);
    const firstPlant = site?.plants[0];
    const firstArea = firstPlant?.areas[0];
    setForm(f => ({ ...f, siteId, plantId: firstPlant?.id ?? '', areaId: firstArea?.id ?? '' }));
  };

  const handlePlantChange = (plantId: string) => {
    const site = hierarchy.find(s => s.id === form.siteId);
    const plant = site?.plants.find(p => p.id === plantId);
    const firstArea = plant?.areas[0];
    setForm(f => ({ ...f, plantId, areaId: firstArea?.id ?? '' }));
  };

  const handleSave = async () => {
    if (!form.unitName || !resolvedUtId) { alert('Unit name is required.'); return; }
    if (!form.siteId || !form.plantId || !form.areaId) { alert('Please select a location (Site, Plant, Area).'); return; }
    setIsSaving(true);
    try {
      if (editTarget) {
        const updated = await api.assets.update(editTarget.id, {
          name: form.unitName,
          utilityTypeId: resolvedUtId,
          siteId: form.siteId,
          plantId: form.plantId,
          areaId: form.areaId,
          status: (form.status as any) || 'Active',
          manufacturer: form.make || undefined,
          model: form.model as string || undefined,
          serial: form.assetTag || undefined,
          installDate: form.installDate as string || undefined,
          ratedKva: form.ratedKva as string || undefined,
        });
        const site = hierarchy.find(s => s.id === form.siteId);
        const plant = site?.plants.find(p => p.id === form.plantId);
        const area = plant?.areas.find(a => a.id === form.areaId);
        const enriched = {
          ...updated,
          siteName: site?.name ?? null,
          plantName: plant?.name ?? null,
          areaName: area?.name ?? null,
          assetTag: updated.serial || `DG-${updated.id.slice(0, 3).toUpperCase()}`,
          unitName: updated.name,
          make: updated.manufacturer || '',
        } as AugmentedAsset;
        setAssets(prev => prev.map(a => a.id === editTarget.id ? enriched : a));
      } else {
        const created = await api.assets.create({
          name: form.unitName,
          utilityTypeId: resolvedUtId,
          siteId: form.siteId,
          plantId: form.plantId,
          areaId: form.areaId,
          status: (form.status as any) || 'Active',
          manufacturer: form.make || undefined,
          model: form.model as string || undefined,
          serial: form.assetTag || undefined,
          installDate: form.installDate as string || undefined,
          ratedKva: form.ratedKva as string || undefined,
        });
        const site = hierarchy.find(s => s.id === form.siteId);
        const plant = site?.plants.find(p => p.id === form.plantId);
        const area = plant?.areas.find(a => a.id === form.areaId);
        setAssets(prev => [...prev, {
          ...created,
          siteName: site?.name ?? null,
          plantName: plant?.name ?? null,
          areaName: area?.name ?? null,
          assetTag: created.serial || `DG-${created.id.slice(0, 3).toUpperCase()}`,
          unitName: created.name,
          make: created.manufacturer || '',
        } as AugmentedAsset]);
      }

      setForm(EMPTY_FORM);
      setShowAddModal(false);
      setEditTarget(null);
    } catch (e: any) {
      alert(e.message ?? 'Failed to save asset.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.assets.delete(deleteTarget.id);
      setAssets(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert('Failed to delete.'); }
  };

  const field = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  // ── export ─────────────────────────────────────────────────────────────────
  const exportData = (format: 'csv' | 'excel') => {
    const headers = ['Asset ID', 'Name', 'Status', 'Make', 'Model', 'Serial', 'Plant', 'Area'];
    const rows = filtered.map(a => [
      a.assetTag, a.unitName, a.status, a.make ?? '', a.model ?? '',
      a.serial ?? '', a.plantName ?? '', a.areaName ?? '',
    ]);
    if (format === 'csv') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'assets.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
      XLSX.writeFile(workbook, 'assets.xlsx');
    }
    setShowExportMenu(false);
  };

  return (
    <>
      {!selectedAsset ? (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
          {/* Header */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Asset Register</h3>
        <p className="text-sm text-gray-500">
          Registered generator units, technical specifications, installation dates, and warranty status.
        </p>
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search assets…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            icon={<Search size={15} />}
          />
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Columns3 size={15} /> Columns
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={6} className="z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[190px]">
              <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Show / Hide Columns</p>
              {COLUMN_META.map(col => {
                const checked = visibleCols[col.id];
                const disabled = checked && visibleCount <= 2;
                return (
                  <DropdownMenu.CheckboxItem
                    key={col.id}
                    checked={checked}
                    onCheckedChange={() => toggleCol(col.id)}
                    disabled={disabled}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer outline-none select-none
                      ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-gray-700">{col.label}</span>
                  </DropdownMenu.CheckboxItem>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[160px]">
              <button onClick={() => exportData('csv')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Export as CSV</button>
              <button onClick={() => exportData('excel')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Export as Excel</button>
            </div>
          )}
        </div>

        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={15} className="mr-1" /> Add Asset
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Assets',      value: stats.total,       color: 'text-gray-800'  },
          { label: 'Operational',       value: stats.operational, color: 'text-green-600' },
          { label: 'Under Maintenance', value: stats.maintenance, color: 'text-amber-600' },
          { label: 'Offline',           value: stats.offline,     color: 'text-red-600'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-[700px] w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {visibleColDefs.map(col => (
                <th key={col.id} className="py-3 px-4 text-left font-semibold text-gray-700 text-sm whitespace-nowrap">{col.label}</th>
              ))}
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-sm">Actions</th>
            </tr>
          </thead>
          <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
            {isLoading ? (
              <tr><td colSpan={visibleColDefs.length + 1} className="py-12 text-center text-sm text-gray-500">Loading assets...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={visibleColDefs.length + 1} className="py-12 text-center text-sm text-gray-400">No assets found. Click "Add Asset" to create one.</td></tr>
            ) : (
              paginated.map(asset => (
                <motion.tr
                  key={asset.id}
                  variants={rowVariants}
                  onClick={() => setSelectedAsset(asset)}
                  className="border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {visibleColDefs.map(col => (
                    <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                      {renderCell(col, asset)}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(asset); }}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(asset); }}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} assets
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - safePage) <= 2)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium ${p === safePage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
        </motion.div>
      </motion.div>
      ) : (
        <DGAssetDetail asset={selectedAsset} onBack={() => setSelectedAsset(null)} onEdit={() => openEdit(selectedAsset)} />
      )}

      {/* Add / Edit Asset Modal */}
      <Dialog.Root open={showAddModal} onOpenChange={open => { setShowAddModal(open); if (!open) setEditTarget(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                {editTarget ? 'Edit Asset' : 'Add New Asset'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-6">
              {/* Basic Info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Asset Tag / Serial" placeholder="DG-006" value={form.assetTag ?? ''} onChange={field('assetTag')} />
                  <Input label="Unit Name *" placeholder="DG Set - Backup" value={form.unitName ?? ''} onChange={field('unitName')} />
                  <Input label="Manufacturer" placeholder="Kirloskar" value={form.make ?? ''} onChange={field('make')} />
                  <Input label="Model" placeholder="KG2-2500-WS" value={form.model as string ?? ''} onChange={field('model')} />
                  <Input label="KVA Rating" placeholder="500" value={form.ratedKva as string ?? ''} onChange={field('ratedKva')} />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select value={form.status} onChange={field('status')} className="border-2 border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors">
                      <option value="Active">Operational</option>
                      <option value="Under Maintenance">Maintenance</option>
                      <option value="Inactive">Offline</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location — cascading dropdowns from backend */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Location *</p>
                {hierarchy.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    No sites configured. Please create a Site → Plant → Area in system settings first.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Site</label>
                      <select
                        value={form.siteId ?? ''}
                        onChange={e => handleSiteChange(e.target.value)}
                        className="border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="">Select site…</option>
                        {hierarchy.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Plant</label>
                      <select
                        value={form.plantId ?? ''}
                        onChange={e => handlePlantChange(e.target.value)}
                        disabled={!form.siteId || availablePlants.length === 0}
                        className="border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                      >
                        <option value="">Select plant…</option>
                        {availablePlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Area</label>
                      <select
                        value={form.areaId ?? ''}
                        onChange={e => setForm(f => ({ ...f, areaId: e.target.value }))}
                        disabled={!form.plantId || availableAreas.length === 0}
                        className="border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                      >
                        <option value="">Select area…</option>
                        {availableAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dates</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Installation Date" type="date" value={form.installDate as string ?? ''} onChange={field('installDate')} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm" disabled={isSaving}>Cancel</Button>
              </Dialog.Close>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : (editTarget ? 'Update Asset' : 'Save Asset')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} />
              </div>
              <Dialog.Title className="text-lg font-bold text-gray-800 mb-2">Delete Asset?</Dialog.Title>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteTarget?.unitName}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex bg-gray-50 px-6 py-4 gap-3 justify-end border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="primary" size="sm" className="bg-red-600 hover:bg-red-700 focus:ring-red-500" onClick={executeDelete}>Delete Asset</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
