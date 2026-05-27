// Modal that lists every report template in OTHER utilities so the admin can
// clone one into the current utility. After copy, columns whose `fieldName`
// doesn't match a field in the target utility land "unmapped" — the dialog
// surfaces that count so the admin knows to fix them in the editor.

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Icons from 'lucide-react'
import {
  X, FileText, AlertCircle, CheckCircle2, type LucideIcon,
} from 'lucide-react'
import Button from '../../ui/Button'
import {
  api, type ApiCopyCandidate, type ApiUtilityType,
} from '../../../lib/api'

function toPascalCase(s: string): string {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}
function getIcon(name: string): LucideIcon {
  const mapped = (Icons as unknown as Record<string, LucideIcon>)[toPascalCase(name)]
  return mapped ?? FileText
}

interface Props {
  open: boolean
  utilityTypeId: string
  onClose: () => void
  onCreated: () => void
}

export default function CopyFromUtilityDialog({ open, utilityTypeId, onClose, onCreated }: Props) {
  const [candidates, setCandidates] = useState<ApiCopyCandidate[]>([])
  const [utilities, setUtilities] = useState<ApiUtilityType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [result, setResult] = useState<{ name: string; unmapped: number } | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true); setError(null); setResult(null)
    Promise.all([
      api.reportTemplates.listCopyCandidates(utilityTypeId),
      api.utilityTypes.list(),
    ])
      .then(([cands, utils]) => {
        setCandidates(cands)
        setUtilities(utils)
      })
      .catch(e => setError(e?.message ?? 'Failed to load templates'))
      .finally(() => setLoading(false))
  }, [open, utilityTypeId])

  async function copy(c: ApiCopyCandidate) {
    setCopyingId(c.id); setError(null)
    try {
      const res = await api.reportTemplates.copyFrom(utilityTypeId, { sourceTemplateId: c.id })
      setResult({ name: c.name, unmapped: res.unmappedColumns })
      onCreated()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to copy template')
    } finally {
      setCopyingId(null)
    }
  }

  const utilityName = (id: string) => utilities.find(u => u.id === id)?.name ?? '—'

  // Group candidates by source utility
  const grouped = candidates.reduce<Record<string, ApiCopyCandidate[]>>((acc, c) => {
    const k = c.sourceUtilityTypeId
    if (!acc[k]) acc[k] = []
    acc[k].push(c)
    return acc
  }, {})

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-base font-bold text-gray-800">Copy a template from another utility</Dialog.Title>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Pick a report from any other utility. We'll duplicate it into this utility and try to match field
              references by name. If some fields don't match, you'll see a warning so you can fix them in the editor.
            </p>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            {result && (
              <div className="flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Copied "{result.name}".</p>
                  {result.unmapped > 0 ? (
                    <p className="text-xs mt-0.5">{result.unmapped} column{result.unmapped !== 1 ? 's' : ''} couldn't be matched to a field in this utility — open the new template and reassign them.</p>
                  ) : (
                    <p className="text-xs mt-0.5">All field references matched cleanly.</p>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
            ) : candidates.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <FileText className="mx-auto mb-2 text-gray-300" size={28} />
                <p className="text-sm text-gray-500">No templates available in other utilities yet.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([utId, list]) => (
                <div key={utId}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 mt-3">From {utilityName(utId)}</p>
                  <div className="space-y-2">
                    {list.map(c => {
                      const Icon = getIcon(c.icon)
                      const isCopying = copyingId === c.id
                      return (
                        <div key={c.id} className="bg-white border border-gray-200 hover:border-blue-300 transition-colors rounded-xl p-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <Icon size={16} className="text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                            <p className="text-xs text-gray-500 truncate">{c.description ?? <span className="italic">No description</span>}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => copy(c)} disabled={isCopying}>
                            {isCopying ? 'Copying…' : 'Copy here'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-end px-5 py-4 border-t border-gray-100">
            <Button variant="secondary" size="sm" onClick={onClose}>Done</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
