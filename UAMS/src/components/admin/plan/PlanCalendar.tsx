import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Download } from 'lucide-react'
import { api, type ApiMaintenancePlan, type ApiMaintenancePlanFull, type FrequencyType } from '../../../lib/api'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const FREQ_COLORS: Record<FrequencyType, { dot: string; bg: string; text: string; border: string }> = {
  Monthly:      { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  Quarterly:    { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Half Yearly':{ dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  Yearly:       { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
}

const PRIORITY_COLORS: Record<string, string> = {
  Low:      'text-green-600 bg-green-50 border-green-200',
  Medium:   'text-amber-600 bg-amber-50 border-amber-200',
  High:     'text-red-600 bg-red-50 border-red-200',
}

function FreqDot({ freq }: { freq: FrequencyType }) {
  return <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${FREQ_COLORS[freq].dot}`} />
}

function getFreqMonths(freq: FrequencyType, startMonth: number): number[] {
  const s = startMonth - 1
  if (freq === 'Monthly') return [0,1,2,3,4,5,6,7,8,9,10,11]
  if (freq === 'Quarterly') {
    const r: number[] = []
    let m = s; while (m < 12) { r.push(m); m += 3 }
    return r
  }
  if (freq === 'Half Yearly') {
    const r: number[] = []
    let m = s; while (m < 12) { r.push(m); m += 6 }
    return r
  }
  return [s]
}

interface CalendarEvent {
  planId: string
  planName: string
  planCode: string
  entryId: string
  label: string
  frequency: FrequencyType
  day: number
  month: number
  year: number
}

interface PlanCalendarProps {
  plans: ApiMaintenancePlan[]
}

type ViewMode = 'Month' | 'Week' | 'Day'

export default function PlanCalendar({ plans }: PlanCalendarProps) {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<Date | null>(today)
  const [allEntries, setAllEntries] = useState<ApiMaintenancePlanFull[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('Month')

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  useEffect(() => {
    if (plans.length === 0) return
    setIsLoading(true)
    Promise.all(plans.filter(p => p.status !== 'Archived').map(p => api.maintenancePlans.get(p.id)))
      .then(setAllEntries)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [plans])

  // Build event map: "YYYY-M-D" -> CalendarEvent[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    for (const plan of allEntries) {
      if (filterPlan !== 'all' && plan.id !== filterPlan) continue

      for (const entry of plan.entries) {
        const entryYear = entry.year
        const label = entry.assetName ?? entry.equipmentDesc ?? entry.equipmentNo ?? 'Unknown'

        for (const freqItem of entry.frequencies) {
          if (filterType !== 'all' && freqItem.frequency !== filterType) continue
          const months = getFreqMonths(freqItem.frequency, freqItem.startMonth)
          for (const m of months) {
            const key = `${entryYear}-${m}-${freqItem.startDay}`
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push({
              planId: plan.id,
              planName: plan.name,
              planCode: plan.planCode,
              entryId: entry.id,
              label,
              frequency: freqItem.frequency,
              day: freqItem.startDay,
              month: m,
              year: entryYear,
            })
          }
        }
      }
    }
    return map
  }, [allEntries, filterPlan, filterType])

  function eventsForDate(date: Date): CalendarEvent[] {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    return eventsByDate.get(key) ?? []
  }

  // Navigation
  function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goToday() { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today) }

  // Build month grid
  const monthGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate()
    const cells: { date: Date; isCurrentMonth: boolean }[] = []

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(currentYear, currentMonth - 1, daysInPrev - i), isCurrentMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(currentYear, currentMonth, d), isCurrentMonth: true })
    }
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(currentYear, currentMonth + 1, d), isCurrentMonth: false })
    }
    return cells
  }, [currentYear, currentMonth])

  // Build week grid (7 days starting from the week containing selected/today)
  const weekGrid = useMemo(() => {
    const ref = selectedDay ?? today
    const day = ref.getDay()
    const start = new Date(ref)
    start.setDate(ref.getDate() - day)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [selectedDay])

  const selectedDayEvents = selectedDay ? eventsForDate(selectedDay) : []

  // Upcoming events for next 7 days
  const upcomingEvents = useMemo(() => {
    const result: { date: Date; events: CalendarEvent[] }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const ev = eventsForDate(d)
      if (ev.length > 0) result.push({ date: d, events: ev })
    }
    return result
  }, [eventsByDate])

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const isToday = (d: Date) => isSameDay(d, today)

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Top bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: nav */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 min-w-[200px]">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <ChevronRight size={16} />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors ml-1">
              Today
            </button>
          </div>

          {/* Right: filters + view */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half Yearly">Half Yearly</option>
              <option value="Yearly">Yearly</option>
            </select>

            {/* Plan filter */}
            <select
              value={filterPlan}
              onChange={e => setFilterPlan(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
            >
              <option value="all">All Plans</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.planCode} — {p.name}</option>)}
            </select>

            {/* View mode */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
              {(['Month', 'Week', 'Day'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap mt-3 pt-3 border-t border-gray-100">
          {(Object.entries(FREQ_COLORS) as [FrequencyType, typeof FREQ_COLORS[FrequencyType]][]).map(([freq, c]) => (
            <div key={freq} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
              {freq}
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading calendar data…</div>
      ) : (
        <div className="flex gap-4">
          {/* Calendar area */}
          <div className="flex-1 min-w-0">
            {viewMode === 'Month' && (
              <MonthView
                grid={monthGrid}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                eventsForDate={eventsForDate}
                isSameDay={isSameDay}
                isToday={isToday}
              />
            )}
            {viewMode === 'Week' && (
              <WeekView
                days={weekGrid}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                eventsForDate={eventsForDate}
                isSameDay={isSameDay}
                isToday={isToday}
              />
            )}
            {viewMode === 'Day' && (
              <DayView
                day={selectedDay ?? today}
                events={selectedDay ? eventsForDate(selectedDay) : []}
              />
            )}

            {/* Upcoming Events section */}
            {upcomingEvents.length > 0 && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Calendar size={15} className="text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Upcoming Events (Next 7 Days)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Date</th>
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Title</th>
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Equipment</th>
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Status</th>
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingEvents.flatMap(({ date, events }) =>
                        events.map((ev, i) => (
                          <tr key={`${date.toISOString()}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                              {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-3 font-medium text-gray-800">{ev.planName}</td>
                            <td className="px-5 py-3 text-gray-600">{ev.label}</td>
                            <td className="px-5 py-3">
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Scheduled</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${PRIORITY_COLORS['Medium']}`}>Medium</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar — selected day detail */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Calendar size={14} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-800">
                  {selectedDay
                    ? selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Select a day'}
                </h3>
                {selectedDay && isToday(selectedDay) && (
                  <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Today</span>
                )}
              </div>

              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {selectedDayEvents.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
                    No maintenance scheduled
                  </div>
                ) : (
                  selectedDayEvents.map((ev, i) => {
                    const c = FREQ_COLORS[ev.frequency]
                    return (
                      <div key={i} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-start gap-2 mb-1">
                          <FreqDot freq={ev.frequency} />
                          <p className="text-sm font-medium text-gray-800 leading-tight">{ev.label}</p>
                        </div>
                        <p className="text-xs text-gray-400 ml-4">{ev.planCode} — {ev.planName}</p>
                        <div className="ml-4 mt-1.5 flex items-center gap-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
                            {ev.frequency}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Scheduled</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Month View ─────────────────────────────────────────────────────────────
function MonthView({
  grid, selectedDay, onSelectDay, eventsForDate, isSameDay, isToday
}: {
  grid: { date: Date; isCurrentMonth: boolean }[]
  selectedDay: Date | null
  onSelectDay: (d: Date) => void
  eventsForDate: (d: Date) => CalendarEvent[]
  isSameDay: (a: Date, b: Date) => boolean
  isToday: (d: Date) => boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {grid.map((cell, idx) => {
          const events = eventsForDate(cell.date)
          const isSelected = selectedDay && isSameDay(cell.date, selectedDay)
          const isTodayCell = isToday(cell.date)
          const isOtherMonth = !cell.isCurrentMonth

          return (
            <motion.div
              key={idx}
              onClick={() => onSelectDay(cell.date)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.005 }}
              className={`
                relative min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors
                ${idx % 7 === 6 ? 'border-r-0' : ''}
                ${Math.floor(idx / 7) === 5 ? 'border-b-0' : ''}
                ${isSelected ? 'bg-blue-50' : isOtherMonth ? 'bg-gray-50/50' : 'hover:bg-gray-50'}
              `}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                  ${isTodayCell ? 'bg-blue-600 text-white' : isSelected ? 'bg-blue-100 text-blue-700' : isOtherMonth ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  {cell.date.getDate()}
                </span>
                {events.length > 0 && (
                  <span className="text-xs font-bold text-white bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {events.length > 9 ? '9+' : events.length}
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {events.slice(0, 3).map((ev, ei) => {
                  const c = FREQ_COLORS[ev.frequency]
                  return (
                    <div
                      key={ei}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate ${c.bg} ${c.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className="truncate">{ev.label}</span>
                    </div>
                  )
                })}
                {events.length > 3 && (
                  <p className="text-xs text-gray-400 px-1">+{events.length - 3} more</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week View ──────────────────────────────────────────────────────────────
function WeekView({
  days, selectedDay, onSelectDay, eventsForDate, isSameDay, isToday
}: {
  days: Date[]
  selectedDay: Date | null
  onSelectDay: (d: Date) => void
  eventsForDate: (d: Date) => CalendarEvent[]
  isSameDay: (a: Date, b: Date) => boolean
  isToday: (d: Date) => boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {days.map((day, i) => {
          const events = eventsForDate(day)
          const isSelected = selectedDay && isSameDay(day, selectedDay)
          const isTodayCell = isToday(day)
          return (
            <div
              key={i}
              onClick={() => onSelectDay(day)}
              className={`p-3 border-r border-gray-100 last:border-r-0 cursor-pointer min-h-[120px] transition-colors ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center gap-1 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase">{DAYS_SHORT[day.getDay()]}</span>
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  isTodayCell ? 'bg-blue-600 text-white' : isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                }`}>
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {events.slice(0, 4).map((ev, ei) => {
                  const c = FREQ_COLORS[ev.frequency]
                  return (
                    <div key={ei} className={`px-2 py-1 rounded text-xs ${c.bg} ${c.text} truncate`}>
                      {ev.label}
                    </div>
                  )
                })}
                {events.length > 4 && <p className="text-xs text-gray-400">+{events.length - 4} more</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Day View ───────────────────────────────────────────────────────────────
function DayView({ day, events }: { day: Date; events: CalendarEvent[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700">
          {DAYS_FULL[day.getDay()]}, {day.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} scheduled</p>
      </div>
      <div className="divide-y divide-gray-50">
        {events.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No events scheduled for this day</div>
        ) : (
          events.map((ev, i) => {
            const c = FREQ_COLORS[ev.frequency]
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                  <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{ev.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ev.planCode} — {ev.planName}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                  {ev.frequency}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
