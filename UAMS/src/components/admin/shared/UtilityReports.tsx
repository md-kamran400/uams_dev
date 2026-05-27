// Utility-level Reports tab (renders next to Analytics inside a utility's
// detail page). Lets the admin pick:
//   - Scope (single asset / subset / all of this utility)
//   - Optional location filter (Site → Plant → Area)
//   - Date range
//   - Format (PDF / Excel / CSV)
//   - One of the templates configured for this utility
//
// All templates are loaded from `/api/utility-types/:id/reports`; their
// content comes from `engine.ts` on the backend.

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  Download, FileText, Filter, ChevronDown, AlertCircle, Eye, type LucideIcon,
} from 'lucide-react'
import {
  api, type ApiReportTemplate, type ApiAsset,
} from '../../../lib/api'
import LocationFilter, { type LocationSelection } from './LocationFilter'
import ReportPreviewModal from './ReportPreviewModal'

type Format = 'PDF' | 'Excel' | 'CSV'
type Scope = 'all' | 'subset' | 'single'

function getIcon(name: string): LucideIcon {
  const mapped = (Icons as unknown as Record<string, LucideIcon>)[toPascalCase(name)]
  return mapped ?? FileText
}
function toPascalCase(s: string): string {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}

interface Props {
  utilityTypeId: string
  utilityName?: string
}

export default function UtilityReports({ utilityTypeId, utilityName }: Props) {
  const [templates, setTemplates] = useState<ApiReportTemplate[]>([])
  const [assets, setAssets] = useState<ApiAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [scope, setScope] = useState<Scope>('all')
  const [singleAssetId, setSingleAssetId] = useState<string>('')
  const [subsetAssetIds, setSubsetAssetIds] = useState<string[]>([])
  const [showAssetMenu, setShowAssetMenu] = useState(false)
  const [location, setLocation] = useState<LocationSelection>({})

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(weekAgo)
  const [toDate, setToDate] = useState(today)
  const [format, setFormat] = useState<Format>('PDF')
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  // Active preview state: which template is showing in the modal.
  const [previewTemplate, setPreviewTemplate] = useState<ApiReportTemplate | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        const [tpls, allAssets] = await Promise.all([
          api.reportTemplates.list(utilityTypeId),
          api.assets.list(),
        ])
        setTemplates(tpls)
        setAssets(allAssets.filter(a => a.utilityTypeId === utilityTypeId))
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [utilityTypeId])

  // Assets after location filter (used both for the multi-select menu and as
  // the effective asset list when scope='all')
  const locationFilteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (location.areaId && a.areaId !== location.areaId) return false
      if (location.plantId && a.plantId !== location.plantId) return false
      if (location.siteId && a.siteId !== location.siteId) return false
      return true
    })
  }, [assets, location])

  // Resolve the actual asset ids that should be passed to the API
  const resolvedAssetIds = useMemo<string[] | undefined>(() => {
    if (scope === 'single') return singleAssetId ? [singleAssetId] : []
    if (scope === 'subset') {
      // intersect chosen subset with location-filtered set
      const allowed = new Set(locationFilteredAssets.map(a => a.id))
      return subsetAssetIds.filter(id => allowed.has(id))
    }
    // scope === 'all'
    if (location.siteId || location.plantId || location.areaId) {
      return locationFilteredAssets.map(a => a.id)
    }
    return undefined  // means "all assets of this utility" — backend default
  }, [scope, singleAssetId, subsetAssetIds, locationFilteredAssets, location])

  async function generate(template: ApiReportTemplate, formatOverride?: Format) {
    if (!fromDate || !toDate) { alert('Pick a date range first.'); return }
    if (fromDate > toDate) { alert('"From" date must be on or before "To" date.'); return }
    const fmt: Format = formatOverride ?? format

    setGeneratingId(template.id)
    try {
      if (scope === 'single') {
        if (!singleAssetId) { alert('Pick an asset.'); return }
        await api.reportTemplates.generateAsset(singleAssetId, {
          templateId: template.id, fromDate, toDate, format: fmt,
        })
      } else {
        await api.reportTemplates.generateUtility(utilityTypeId, {
          templateId: template.id, fromDate, toDate, format: fmt,
          assetIds: resolvedAssetIds && resolvedAssetIds.length > 0 ? resolvedAssetIds : undefined,
        })
      }
    } catch (e: any) {
      alert('Failed to generate report: ' + (e?.message ?? 'unknown'))
    } finally {
      setGeneratingId(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-1">Report Generation</h3>
        <p className="text-xs text-gray-500">
          Run any configured report at asset or utility scope. Templates are defined in
          <span className="font-medium text-gray-700"> Config → Reports</span>.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {/* Scope selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Scope</label>
          <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            {([
              { value: 'all',    label: `All ${utilityName ?? ''} assets`.trim() },
              { value: 'subset', label: 'Subset of assets' },
              { value: 'single', label: 'Single asset' },
            ] as { value: Scope; label: string }[]).map(s => (
              <button
                key={s.value}
                onClick={() => setScope(s.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${scope === s.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Single asset picker */}
        {scope === 'single' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asset</label>
            <select
              value={singleAssetId}
              onChange={e => setSingleAssetId(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[260px]"
            >
              <option value="">Pick an asset…</option>
              {locationFilteredAssets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Subset asset picker */}
        {scope === 'subset' && (
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Assets ({subsetAssetIds.length} selected)</label>
            <button
              onClick={() => setShowAssetMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 min-w-[260px]"
            >
              <Filter size={14} className="text-gray-400" />
              {subsetAssetIds.length === 0 ? 'Pick assets…' : `${subsetAssetIds.length} selected`}
              <ChevronDown size={14} className="text-gray-400 ml-auto" />
            </button>
            {showAssetMenu && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[280px] max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <button onClick={() => setSubsetAssetIds(locationFilteredAssets.map(a => a.id))} className="text-xs text-blue-600 hover:underline">Select all</button>
                  <button onClick={() => setSubsetAssetIds([])} className="text-xs text-gray-500 hover:underline">Clear</button>
                </div>
                {locationFilteredAssets.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400">No assets match the current location filter.</div>
                )}
                {locationFilteredAssets.map(a => (
                  <button key={a.id}
                    onClick={() => setSubsetAssetIds(prev =>
                      prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id]
                    )}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${subsetAssetIds.includes(a.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span className={`w-3 h-3 rounded border flex-shrink-0 ${subsetAssetIds.includes(a.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`} />
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Location filter */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Location filter (optional)</p>
          <LocationFilter value={location} onChange={setLocation} />
        </div>

        {/* Date range + format */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Format</label>
            <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              {(['PDF', 'Excel', 'CSV'] as Format[]).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${format === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Templates grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="mx-auto mb-2 text-gray-300" size={32} />
          <p className="text-sm text-gray-500">
            No report templates configured yet. Set them up in <span className="font-semibold">Config → Reports</span>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {templates.map(t => {
            const Icon = getIcon(t.icon)
            const isGenerating = generatingId === t.id
            return (
              <div key={t.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <Icon size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{t.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {t.sections.length} section{t.sections.length !== 1 ? 's' : ''} · default scope: {t.defaultScope}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-stretch gap-2">
                  <button
                    onClick={() => setPreviewTemplate(t)}
                    disabled={(scope === 'single' && !singleAssetId) || (scope === 'subset' && subsetAssetIds.length === 0)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-blue-200 hover:bg-blue-50 active:bg-blue-100 text-blue-700 font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye size={15} /> Preview
                  </button>
                  <button
                    onClick={() => generate(t)}
                    disabled={isGenerating || (scope === 'single' && !singleAssetId) || (scope === 'subset' && subsetAssetIds.length === 0)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? 'Generating…' : <><Download size={15} /> {format}</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ReportPreviewModal
        open={!!previewTemplate}
        templateId={previewTemplate?.id ?? null}
        templateName={previewTemplate?.name}
        mode={previewTemplate ? (
          scope === 'single' && singleAssetId
            ? { kind: 'asset', assetId: singleAssetId }
            : { kind: 'utility', utilityTypeId, assetIds: resolvedAssetIds }
        ) : null}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => setPreviewTemplate(null)}
        onDownloadPdf={() => {
          if (previewTemplate) {
            const t = previewTemplate
            setPreviewTemplate(null)
            // The "Download PDF" button in the preview always downloads a PDF
            // regardless of the format pill state.
            generate(t, 'PDF')
          }
        }}
      />
    </motion.div>
  )
}
