// Cascading Site → Plant → Area filter.
//
// Each dropdown is optional. Picking a site narrows the plant list;
// picking a plant narrows the area list. Used by Analytics and the new
// utility Reports tab to scope queries by location.

import { useEffect, useState } from 'react'
import { ChevronRight, MapPin, X } from 'lucide-react'
import { api, type ApiSiteHierarchy } from '../../../lib/api'

export interface LocationSelection {
  siteId?: string
  plantId?: string
  areaId?: string
}

interface LocationFilterProps {
  value: LocationSelection
  onChange: (next: LocationSelection) => void
  /** Compact mode: render the controls as a single line of selects rather
   *  than a labelled multi-column block. Used in cramped filter bars. */
  compact?: boolean
}

export default function LocationFilter({ value, onChange, compact }: LocationFilterProps) {
  const [hierarchy, setHierarchy] = useState<ApiSiteHierarchy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.sites.hierarchy()
      .then(rows => { if (!cancelled) setHierarchy(rows) })
      .catch(err => console.error('Failed to load location hierarchy:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const site = value.siteId ? hierarchy.find(s => s.id === value.siteId) : undefined
  const plants = site?.plants ?? []
  const plant = value.plantId ? plants.find(p => p.id === value.plantId) : undefined
  const areas = plant?.areas ?? []

  function pickSite(id: string) {
    onChange({ siteId: id || undefined, plantId: undefined, areaId: undefined })
  }
  function pickPlant(id: string) {
    onChange({ siteId: value.siteId, plantId: id || undefined, areaId: undefined })
  }
  function pickArea(id: string) {
    onChange({ siteId: value.siteId, plantId: value.plantId, areaId: id || undefined })
  }

  const hasSelection = !!(value.siteId || value.plantId || value.areaId)

  return (
    <div className={compact ? 'inline-flex items-end gap-2' : 'space-y-2'}>
      <div className={compact ? 'flex items-center gap-2' : 'flex flex-wrap items-end gap-3'}>
        <div className={compact ? '' : 'min-w-[160px]'}>
          {!compact && <label className="block text-xs font-semibold text-gray-500 mb-1.5">Site</label>}
          <select
            value={value.siteId ?? ''}
            onChange={e => pickSite(e.target.value)}
            disabled={loading}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] disabled:bg-gray-50"
          >
            <option value="">All sites</option>
            {hierarchy.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className={compact ? '' : 'min-w-[160px]'}>
          {!compact && <label className="block text-xs font-semibold text-gray-500 mb-1.5">Plant</label>}
          <select
            value={value.plantId ?? ''}
            onChange={e => pickPlant(e.target.value)}
            disabled={!value.siteId || loading}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">{value.siteId ? 'All plants in site' : 'Pick a site first'}</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className={compact ? '' : 'min-w-[160px]'}>
          {!compact && <label className="block text-xs font-semibold text-gray-500 mb-1.5">Area</label>}
          <select
            value={value.areaId ?? ''}
            onChange={e => pickArea(e.target.value)}
            disabled={!value.plantId || loading}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">{value.plantId ? 'All areas in plant' : 'Pick a plant first'}</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {hasSelection && (
          <button
            onClick={() => onChange({})}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Clear location filter"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {hasSelection && !compact && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 px-1">
          <MapPin size={11} className="text-blue-500" />
          <span className="font-medium text-gray-700">{site?.name ?? '—'}</span>
          {plant && (<><ChevronRight size={11} /><span className="font-medium text-gray-700">{plant.name}</span></>)}
          {value.areaId && (<><ChevronRight size={11} /><span className="font-medium text-gray-700">{areas.find(a => a.id === value.areaId)?.name ?? '—'}</span></>)}
        </div>
      )}
    </div>
  )
}
