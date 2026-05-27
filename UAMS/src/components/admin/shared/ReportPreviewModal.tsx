// On-screen report preview. Mirrors what the generated PDF will contain but
// renders as HTML tables so the admin can verify shape, columns, and a sample
// of rows before committing to a PDF download. The backend caps each table to
// 100 rows; a banner tells the admin the total count when truncation kicks in.

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  X, AlertCircle, FileText, Download, RefreshCw,
} from 'lucide-react'
import Button from '../../ui/Button'
import { api, type ApiReportPreview } from '../../../lib/api'

type PreviewMode =
  | { kind: 'asset';   assetId: string }
  | { kind: 'utility'; utilityTypeId: string; assetIds?: string[] }

interface Props {
  open: boolean
  mode: PreviewMode | null
  templateId: string | null
  templateName?: string
  fromDate: string
  toDate: string
  onClose: () => void
  /** Called when admin clicks "Download PDF" inside the preview — parent runs
   *  the real generate flow (which it already wires up for the card). */
  onDownloadPdf: () => void
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReportPreviewModal({
  open, mode, templateId, templateName, fromDate, toDate, onClose, onDownloadPdf,
}: Props) {
  const [preview, setPreview] = useState<ApiReportPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchPreview() {
    if (!templateId || !mode) return
    setLoading(true); setError(null); setPreview(null)
    try {
      let result: ApiReportPreview
      if (mode.kind === 'asset') {
        result = await api.reportTemplates.previewAsset(mode.assetId, {
          templateId, fromDate, toDate,
        })
      } else {
        result = await api.reportTemplates.previewUtility(mode.utilityTypeId, {
          templateId, fromDate, toDate,
          assetIds: mode.assetIds && mode.assetIds.length > 0 ? mode.assetIds : undefined,
        })
      }
      setPreview(result)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchPreview()
    else { setPreview(null); setError(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateId, fromDate, toDate, mode?.kind])

  const hasAnyData = preview && preview.tables.some(t => t.totalRows > 0)
  const isTruncated = preview && preview.tables.some(t => t.totalRows > t.rows.length)

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <Dialog.Title className="text-base font-bold text-gray-800">
                Preview — {preview?.title ?? templateName ?? 'Report'}
              </Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">
                {fmtDate(fromDate)} → {fmtDate(toDate)}
                {preview && preview.asset.name && <> · {preview.asset.name}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchPreview} disabled={loading} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50" title="Refresh">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
            {loading && (
              <div className="py-16 text-center text-sm text-gray-400">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-gray-300" /> Loading preview…
              </div>
            )}

            {error && !loading && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {preview && !loading && (
              <div className="space-y-5">
                {isTruncated && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertCircle size={13} /> Some sections were truncated to the first 100 rows for the preview. The downloaded PDF includes the full data.
                  </div>
                )}

                {!hasAnyData && (
                  <div className="py-12 text-center bg-white border-2 border-dashed border-gray-200 rounded-xl">
                    <FileText className="mx-auto mb-2 text-gray-300" size={28} />
                    <p className="text-sm text-gray-500">
                      No data available for the selected period.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Either there are no records in this date range, or the report's columns reference fields with no matching values.
                    </p>
                  </div>
                )}

                {preview.tables.map((table, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200">
                      <p className="text-sm font-bold text-gray-800">{table.title}</p>
                      <p className="text-[11px] text-gray-500">
                        {table.totalRows > table.rows.length
                          ? `Showing ${table.rows.length} of ${table.totalRows} rows`
                          : `${table.totalRows} row${table.totalRows === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    {table.rows.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400 italic">No records</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              {table.columns.map(c => (
                                <th
                                  key={c.key}
                                  className={`px-3 py-2 font-bold text-gray-700 whitespace-nowrap ${
                                    c.align === 'right' ? 'text-right' :
                                    c.align === 'center' ? 'text-center' : 'text-left'
                                  }`}
                                >
                                  {c.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/40">
                                {table.columns.map(c => {
                                  const v = row[c.key]
                                  return (
                                    <td
                                      key={c.key}
                                      className={`px-3 py-1.5 text-gray-700 whitespace-nowrap ${
                                        c.align === 'right' ? 'text-right tabular-nums' :
                                        c.align === 'center' ? 'text-center' : 'text-left'
                                      }`}
                                    >
                                      {v === null || v === undefined ? <span className="text-gray-300">—</span> : String(v)}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            <Button variant="primary" size="sm" onClick={onDownloadPdf} disabled={!hasAnyData}>
              <Download size={14} /> Download PDF
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
