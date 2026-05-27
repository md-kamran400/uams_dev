// Asset-scope Reports tab.
//
// Loads templates from `/api/utility-types/:utilityTypeId/reports` and renders
// one card per template. Generation goes through the template engine — the
// hardcoded 6-report list is gone.
//
// Engineers see only templates whose `defaultScope` is `asset` or `both`.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { FileText, Download, AlertCircle, Eye, type LucideIcon } from 'lucide-react'
import { api, type ApiReportTemplate, type ApiAssetOverview } from '../../../../../../lib/api'
import ReportPreviewModal from '../../../../shared/ReportPreviewModal'

type Format = 'PDF' | 'Excel' | 'CSV'

function toPascalCase(s: string): string {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}
function getIcon(name: string): LucideIcon {
  const mapped = (Icons as unknown as Record<string, LucideIcon>)[toPascalCase(name)]
  return mapped ?? FileText
}

function ReportCard({ template, assetId }: { template: ApiReportTemplate; assetId: string }) {
  const Icon = getIcon(template.icon)
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(weekAgo)
  const [toDate, setToDate] = useState(today)
  const [format, setFormat] = useState<Format>('PDF')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  async function handleGenerate(formatOverride?: Format) {
    if (!fromDate || !toDate) { alert('Pick both From and To dates.'); return }
    if (fromDate > toDate) { alert('"From" date must be on or before "To" date.'); return }
    setIsGenerating(true)
    try {
      await api.reportTemplates.generateAsset(assetId, {
        templateId: template.id, fromDate, toDate, format: formatOverride ?? format,
      })
    } catch (e: any) {
      alert(`Failed to generate report: ${e?.message ?? 'unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
          <Icon size={20} className="text-blue-500" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-800">{template.name}</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{template.description}</p>
        </div>
      </div>

      <div className="mt-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Format</label>
          <div className="inline-flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200">
            {(['PDF', 'Excel', 'CSV'] as Format[]).map(fmt => (
              <button key={fmt} onClick={() => setFormat(fmt)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${format === fmt ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-stretch gap-2">
          <button onClick={() => setPreviewOpen(true)} disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-blue-200 hover:bg-blue-50 active:bg-blue-100 text-blue-700 font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
            <Eye size={15} /> Preview
          </button>
          <button onClick={() => handleGenerate()} disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 bg-[#8da2ec] hover:bg-blue-500 active:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-70">
            {isGenerating ? 'Generating…' : <><Download size={15} /> {format}</>}
          </button>
        </div>
      </div>

      <ReportPreviewModal
        open={previewOpen}
        templateId={template.id}
        templateName={template.name}
        mode={{ kind: 'asset', assetId }}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => setPreviewOpen(false)}
        onDownloadPdf={() => { setPreviewOpen(false); handleGenerate('PDF') }}
      />
    </div>
  )
}

export default function AssetReports({ assetId }: { assetId: string }) {
  const [templates, setTemplates] = useState<ApiReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        // Need the asset's utilityTypeId to fetch its templates
        const overview = await api.assetDetails.overview(assetId) as ApiAssetOverview
        const tpls = await api.reportTemplates.list(overview.utilityTypeId)
        // Asset scope only sees templates that allow asset-scope runs
        setTemplates(tpls.filter(t => t.defaultScope === 'asset' || t.defaultScope === 'both'))
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [assetId])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-1">Report Generation</h3>
        <p className="text-xs text-gray-500">
          Select a date range and format, then generate downloadable reports for this asset.
          Templates are configured per-utility in <span className="font-medium text-gray-700">Config → Reports</span>.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="mx-auto mb-2 text-gray-300" size={32} />
          <p className="text-sm text-gray-500">
            No report templates configured for this utility. An admin can set them up in
            <span className="font-semibold"> Config → Reports</span>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {templates.map(t => <ReportCard key={t.id} template={t} assetId={assetId} />)}
        </div>
      )}
    </motion.div>
  )
}
