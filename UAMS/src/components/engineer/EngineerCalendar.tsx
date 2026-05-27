import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, ClipboardList, Wrench, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { api, type ApiTicket, type TicketStatus } from '../../lib/api';
import { User } from '../../types';
import EngineerTicketFill from './EngineerTicketFill';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type TicketType = 'Task' | 'Data Entry' | 'PM Plan' | 'Breakdown';

const TYPE_COLORS: Record<TicketType, { dot: string; bg: string; text: string; border: string; icon: typeof ClipboardList }> = {
  'Task':       { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: ClipboardList },
  'Data Entry': { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: ClipboardList },
  'PM Plan':    { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Wrench },
  'Breakdown':  { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: AlertTriangle },
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: 'bg-gray-100 text-gray-700',
  Assigned: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Submitted: 'bg-indigo-100 text-indigo-700',
  Resubmitted: 'bg-indigo-100 text-indigo-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  'Needs Revision': 'bg-amber-100 text-amber-700',
  Closed: 'bg-gray-100 text-gray-500',
};

const ACTIVE_STATUSES: TicketStatus[] = ['Open', 'Assigned', 'In Progress', 'Needs Revision', 'Resubmitted'];
const SUBMITTED_STATUSES: TicketStatus[] = ['Submitted', 'Approved', 'Rejected', 'Closed'];

type ViewMode = 'Month' | 'Week' | 'Day';

interface Props {
  user: User;
}

export default function EngineerCalendar({ user }: Props) {
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);
  const [viewMode, setViewMode] = useState<ViewMode>('Month');
  const [filterType, setFilterType] = useState<'all' | TicketType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'submitted'>('all');
  const [selectedTicket, setSelectedTicket] = useState<ApiTicket | null>(null);

  const load = () => {
    setIsLoading(true);
    api.tickets.list()
      .then(rows => setTickets(rows.filter(t => !!t.dueDate)))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterStatus === 'active' && !ACTIVE_STATUSES.includes(t.status)) return false;
      if (filterStatus === 'submitted' && !SUBMITTED_STATUSES.includes(t.status)) return false;
      return true;
    });
  }, [tickets, filterType, filterStatus]);

  // Map "YYYY-M-D" -> tickets[]
  const ticketsByDate = useMemo(() => {
    const map = new Map<string, ApiTicket[]>();
    for (const t of filteredTickets) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [filteredTickets]);

  function ticketsForDate(date: Date): ApiTicket[] {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return ticketsByDate.get(key) ?? [];
  }

  // Build month grid (42 cells)
  const monthGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(currentYear, currentMonth - 1, daysInPrev - i), isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(currentYear, currentMonth, d), isCurrentMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(currentYear, currentMonth + 1, d), isCurrentMonth: false });
    }
    return cells;
  }, [currentYear, currentMonth]);

  const weekGrid = useMemo(() => {
    const ref = selectedDay ?? today;
    const start = new Date(ref);
    start.setDate(ref.getDate() - ref.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDay, today]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const isToday = (d: Date) => isSameDay(d, today);

  const selectedDayTickets = selectedDay ? ticketsForDate(selectedDay) : [];

  const upcomingTickets = useMemo(() => {
    const result: { date: Date; tickets: ApiTicket[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const tx = ticketsForDate(d);
      if (tx.length > 0) result.push({ date: d, tickets: tx });
    }
    return result;
  }, [ticketsByDate, today]);

  const stats = useMemo(() => {
    const overdue = filteredTickets.filter(t => {
      if (!t.dueDate || !ACTIVE_STATUSES.includes(t.status)) return false;
      return new Date(t.dueDate) < today;
    }).length;
    const thisMonth = filteredTickets.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
    return { overdue, thisMonth, total: filteredTickets.length };
  }, [filteredTickets, today, currentYear, currentMonth]);

  function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  function goToday() { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today); }

  if (selectedTicket) {
    return (
      <EngineerTicketFill
        user={user}
        ticket={selectedTicket}
        onBack={() => { setSelectedTicket(null); load(); }}
        onSubmitted={updated => {
          setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
          setSelectedTicket(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header strip */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
          <Calendar size={18} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">My Schedule</h2>
          <p className="text-xs text-gray-500">All tickets and PM plans assigned to you, by due date.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-700" />
          </div>
          <div>
            <p className="text-xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-xs font-medium text-red-700/80">Overdue (active)</p>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Calendar size={16} className="text-blue-700" />
          </div>
          <div>
            <p className="text-xl font-bold text-blue-700">{stats.thisMonth}</p>
            <p className="text-xs font-medium text-blue-700/80">In {MONTHS[currentMonth]}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-gray-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-700">{stats.total}</p>
            <p className="text-xs font-medium text-gray-500">Scheduled total</p>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <ChevronRight size={16} />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors ml-1">
              Today
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'submitted')}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="submitted">Submitted/Closed</option>
            </select>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'all' | TicketType)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="Task">Task</option>
              <option value="Data Entry">Data Entry</option>
              <option value="PM Plan">PM Plan</option>
              <option value="Breakdown">Breakdown</option>
            </select>

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
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap mt-3 pt-3 border-t border-gray-100">
          {(['Task', 'PM Plan', 'Breakdown'] as TicketType[]).map(typ => {
            const c = TYPE_COLORS[typ];
            return (
              <div key={typ} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                {typ}
              </div>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading schedule…</div>
      ) : (
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="flex-1 min-w-0">
            {viewMode === 'Month' && (
              <MonthView
                grid={monthGrid}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                ticketsForDate={ticketsForDate}
                isSameDay={isSameDay}
                isToday={isToday}
                today={today}
              />
            )}
            {viewMode === 'Week' && (
              <WeekView
                days={weekGrid}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                ticketsForDate={ticketsForDate}
                isSameDay={isSameDay}
                isToday={isToday}
              />
            )}
            {viewMode === 'Day' && (
              <DayView
                day={selectedDay ?? today}
                tickets={selectedDay ? ticketsForDate(selectedDay) : []}
                onOpen={setSelectedTicket}
              />
            )}

            {/* Upcoming */}
            {upcomingTickets.length > 0 && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Calendar size={15} className="text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">Coming Up (Next 7 Days)</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {upcomingTickets.flatMap(({ date, tickets: dayTickets }) =>
                    dayTickets.map(t => {
                      const c = TYPE_COLORS[t.type];
                      const Icon = c.icon;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="text-xs text-gray-400 w-20 flex-shrink-0">
                            {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                            <Icon size={14} className={c.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                            <p className="text-xs text-gray-400">{t.assetName ?? '—'} · <span className="font-mono">{t.number}</span></p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>
                            {t.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Calendar size={14} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-800">
                  {selectedDay
                    ? selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Select a day'}
                </h3>
                {selectedDay && isToday(selectedDay) && (
                  <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Today</span>
                )}
              </div>
              <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {selectedDayTickets.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
                    Nothing scheduled
                  </div>
                ) : (
                  selectedDayTickets.map(t => {
                    const c = TYPE_COLORS[t.type];
                    const Icon = c.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                            <Icon size={14} className={c.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 leading-tight">{t.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{t.assetName ?? '—'}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
                                {t.type}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>
                                {t.status}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400">{t.number}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthView({
  grid, selectedDay, onSelectDay, ticketsForDate, isSameDay, isToday, today,
}: {
  grid: { date: Date; isCurrentMonth: boolean }[];
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
  ticketsForDate: (d: Date) => ApiTicket[];
  isSameDay: (a: Date, b: Date) => boolean;
  isToday: (d: Date) => boolean;
  today: Date;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((cell, idx) => {
          const dayTickets = ticketsForDate(cell.date);
          const isSelected = selectedDay && isSameDay(cell.date, selectedDay);
          const isTodayCell = isToday(cell.date);
          const isOtherMonth = !cell.isCurrentMonth;
          const hasOverdueActive = dayTickets.some(t => cell.date < today && ACTIVE_STATUSES.includes(t.status));
          return (
            <motion.div
              key={idx}
              onClick={() => onSelectDay(cell.date)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.005 }}
              className={`relative min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors
                ${idx % 7 === 6 ? 'border-r-0' : ''}
                ${Math.floor(idx / 7) === 5 ? 'border-b-0' : ''}
                ${isSelected ? 'bg-blue-50' : isOtherMonth ? 'bg-gray-50/50' : hasOverdueActive ? 'bg-red-50/30 hover:bg-red-50' : 'hover:bg-gray-50'}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                  ${isTodayCell ? 'bg-blue-600 text-white' : isSelected ? 'bg-blue-100 text-blue-700' : isOtherMonth ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  {cell.date.getDate()}
                </span>
                {dayTickets.length > 0 && (
                  <span className={`text-xs font-bold text-white rounded-full w-4 h-4 flex items-center justify-center leading-none ${
                    hasOverdueActive ? 'bg-red-500' : 'bg-blue-600'
                  }`}>
                    {dayTickets.length > 9 ? '9+' : dayTickets.length}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayTickets.slice(0, 3).map(t => {
                  const c = TYPE_COLORS[t.type];
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] truncate ${c.bg} ${c.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className="truncate">{t.title}</span>
                    </div>
                  );
                })}
                {dayTickets.length > 3 && (
                  <p className="text-[10px] text-gray-400 px-1">+{dayTickets.length - 3} more</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  days, selectedDay, onSelectDay, ticketsForDate, isSameDay, isToday,
}: {
  days: Date[];
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
  ticketsForDate: (d: Date) => ApiTicket[];
  isSameDay: (a: Date, b: Date) => boolean;
  isToday: (d: Date) => boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {days.map((day, i) => {
          const dayTickets = ticketsForDate(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isTodayCell = isToday(day);
          return (
            <div
              key={i}
              onClick={() => onSelectDay(day)}
              className={`p-3 border-r border-gray-100 last:border-r-0 cursor-pointer min-h-[140px] transition-colors ${
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
                {dayTickets.slice(0, 4).map(t => {
                  const c = TYPE_COLORS[t.type];
                  return (
                    <div key={t.id} className={`px-2 py-1 rounded text-[11px] ${c.bg} ${c.text} truncate`}>
                      {t.title}
                    </div>
                  );
                })}
                {dayTickets.length > 4 && <p className="text-[10px] text-gray-400">+{dayTickets.length - 4} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ day, tickets, onOpen }: { day: Date; tickets: ApiTicket[]; onOpen: (t: ApiTicket) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700">
          {DAYS_FULL[day.getDay()]}, {day.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} due</p>
      </div>
      <div className="divide-y divide-gray-50">
        {tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No tickets due on this day</div>
        ) : (
          tickets.map(t => {
            const c = TYPE_COLORS[t.type];
            const Icon = c.icon;
            return (
              <button
                key={t.id}
                onClick={() => onOpen(t)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                  <Icon size={16} className={c.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.assetName ?? '—'} · <span className="font-mono">{t.number}</span></p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                    {t.type}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                    {t.status}
                  </span>
                  <Clock size={12} className="text-gray-300" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
