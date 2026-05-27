import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Trash2, FileText, Image, FileBadge, AlertTriangle, FolderOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../../../../ui/Button';
import Input from '../../../../../ui/Input';
import { api, type ApiAssetFile } from '../../../../../../lib/api';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 10;

const FILE_CATEGORIES = ['All', 'Manual', 'Certificate', 'Inspection Report', 'Drawing', 'Photo', 'Other'] as const;
type FileCategory = typeof FILE_CATEGORIES[number];

const CAT_BADGE: Record<string, string> = {
  Manual: 'bg-blue-100 text-blue-700',
  Certificate: 'bg-green-100 text-green-700',
  'Inspection Report': 'bg-amber-100 text-amber-700',
  Drawing: 'bg-purple-100 text-purple-700',
  Photo: 'bg-pink-100 text-pink-700',
  Other: 'bg-gray-100 text-gray-600',
};

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return <Image size={18} className="text-pink-500" />;
  if (ext === 'pdf') return <FileText size={18} className="text-red-500" />;
  return <FileBadge size={18} className="text-blue-500" />;
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AssetFiles({ assetId }: { assetId: string }) {
  const [files, setFiles] = useState<ApiAssetFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FileCategory>('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.assetDetails.listFiles(assetId)
      .then(setFiles)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [assetId]);

  const categoryFiltered = activeFilter === 'All' ? files : files.filter(f => f.category === activeFilter);
  const filtered = categoryFiltered.filter(f => {
    const q = search.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || (f.uploadedByName ?? '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Simulate file upload (in real app would upload to S3/Cloudflare then register metadata)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let category: ApiAssetFile['category'] = 'Other';
      if (ext === 'pdf') category = 'Manual';
      if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') category = 'Photo';

      const created = await api.assetDetails.addFile(assetId, {
        name: file.name,
        category,
        sizeBytes: file.size,
        url: URL.createObjectURL(file), // local blob URL — replace with real upload URL in production
      });
      setFiles(prev => [created, ...prev]);
    } catch (e: any) { alert(e.message ?? 'Upload failed'); }
    finally { setIsUploading(false); e.target.value = ''; }
  };

  const deleteFile = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.assetDetails.deleteFile(assetId, id);
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch { alert('Failed to delete file.'); }
  };

  const catCount = (cat: string) => cat === 'All' ? files.length : files.filter(f => f.category === cat).length;

  const exportData = (format: 'csv' | 'excel') => {
    const headers = ['File Name', 'Category', 'Size', 'Uploader', 'Uploaded On'];
    const rows = filtered.map(f => [
      f.name, f.category, `${((f.sizeBytes ?? 0) / 1024).toFixed(1)} KB`,
      f.uploadedByName ?? 'Unknown', new Date(f.uploadedAt).toLocaleDateString('en-IN')
    ]);
    if (format === 'csv') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'files.csv'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Files');
      XLSX.writeFile(workbook, 'files.xlsx');
    }
    setShowExportMenu(false);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading files...</div>;
  if (error) return <div className="flex items-center gap-2 justify-center py-20 text-red-500 text-sm"><AlertTriangle size={16} />{error}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-1">Documents & Files</h3>
          <p className="text-xs text-gray-500">{files.length} / 50 files uploaded</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <div className="relative">
            <button onClick={() => setShowExportMenu(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Download size={13} /> Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 min-w-[140px]">
                <button onClick={() => exportData('csv')} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">Export as CSV</button>
                <button onClick={() => exportData('excel')} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">Export as Excel</button>
              </div>
            )}
          </div>
          <input id="file-upload" type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.dwg,.docx,.xlsx" />
          <Button variant="primary" size="sm" disabled={isUploading} onClick={() => document.getElementById('file-upload')?.click()}>
            <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input placeholder="Search files by name, category, uploader…" value={search}
        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} icon={<Search size={14} />} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILE_CATEGORIES.map(cat => {
          const count = catCount(cat);
          const active = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat} {count > 0 && <span className={`text-[10px] ${active ? 'text-blue-200' : 'text-gray-400'}`}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* File List */}
      {paginated.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{search ? 'No files match your search.' : `No ${activeFilter !== 'All' ? activeFilter : ''} files uploaded yet.`}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
          {paginated.map(file => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <FileIcon name={file.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmtSize(file.sizeBytes)} · Uploaded by {file.uploadedByName ?? 'Unknown'} on {fmtDate(file.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_BADGE[file.category] ?? CAT_BADGE.Other}`}>
                  {file.category}
                </span>
                {file.url && (
                  <a href={file.url} download={file.name} target="_blank" rel="noreferrer">
                    <button className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors">
                      <Download size={14} />
                    </button>
                  </a>
                )}
                <button
                  onClick={() => deleteFile(file.id, file.name)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-500">Showing {(safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE, filtered.length)} of {filtered.length} files</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={safePage===1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i+1).filter(p => Math.abs(p-safePage)<=2).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-medium ${p===safePage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{p}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Storage Usage */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Storage Usage</p>
            <p className="text-xs text-gray-500 font-mono">{files.length} / 50 files</p>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min((files.length / 50) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
