import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Mock data for calendar events
interface CalendarEvent {
  id: string;
  title: string;
  planName: string;
  equipmentNo: string;
  equipmentDescription: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  status: "scheduled" | "completed" | "overdue" | "cancelled";
  priority: "high" | "medium" | "low";
  type: "preventive" | "predictive" | "corrective";
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Generator Maintenance",
    planName: "Annual Maintenance Plan 2024",
    equipmentNo: "GEN-001",
    equipmentDescription: "Diesel Generator 500kVA",
    date: new Date(2024, 2, 15),
    startTime: "09:00",
    endTime: "12:00",
    status: "scheduled",
    priority: "high",
    type: "preventive",
  },
  {
    id: "2",
    title: "HVAC Filter Replacement",
    planName: "HVAC Maintenance Schedule",
    equipmentNo: "HVAC-003",
    equipmentDescription: "Chiller Unit",
    date: new Date(2024, 2, 20),
    startTime: "14:00",
    endTime: "16:00",
    status: "scheduled",
    priority: "medium",
    type: "preventive",
  },
  {
    id: "3",
    title: "Transformer Inspection",
    planName: "Electrical Asset Plan",
    equipmentNo: "TRF-001",
    equipmentDescription: "Step-down Transformer",
    date: new Date(2024, 2, 10),
    startTime: "11:00",
    endTime: "13:00",
    status: "completed",
    priority: "high",
    type: "predictive",
  },
  {
    id: "4",
    title: "Fire Alarm Testing",
    planName: "Safety Compliance Plan",
    equipmentNo: "FAS-002",
    equipmentDescription: "Fire Alarm Panel",
    date: new Date(2024, 2, 5),
    startTime: "10:00",
    endTime: "11:30",
    status: "overdue",
    priority: "high",
    type: "preventive",
  },
  {
    id: "5",
    title: "Pump Bearing Lubrication",
    planName: "Pump Maintenance Plan",
    equipmentNo: "PMP-007",
    equipmentDescription: "Centrifugal Pump",
    date: new Date(2024, 2, 25),
    startTime: "15:00",
    endTime: "17:00",
    status: "scheduled",
    priority: "low",
    type: "preventive",
  },
  {
    id: "6",
    title: "Cooling Tower Cleaning",
    planName: "HVAC Maintenance Schedule",
    equipmentNo: "CT-001",
    equipmentDescription: "Cooling Tower",
    date: new Date(2024, 2, 18),
    startTime: "08:00",
    endTime: "12:00",
    status: "scheduled",
    priority: "medium",
    type: "corrective",
  },
];

// Generate dummy events for a specific date with times
const generateDummyDataForDate = (date: Date): CalendarEvent[] => {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  const dummyEvents: CalendarEvent[] = [];
  const eventCount = isToday ? 2 : Math.floor(Math.random() * 3) + 1;

  const titles = [
    "Routine Inspection",
    "Lubrication Service",
    "Filter Replacement",
    "Calibration Check",
    "Safety Test",
    "Performance Audit",
  ];
  const planNames = [
    "Daily Maintenance Plan",
    "Weekly Checklist",
    "Monthly Service Plan",
    "Quarterly Review",
  ];
  const equipmentNos = ["EQ-1001", "EQ-1002", "EQ-1003", "EQ-1004", "EQ-1005"];
  const equipmentDesc = [
    "Industrial Machine",
    "Cooling System",
    "Electrical Panel",
    "Hydraulic Pump",
    "Conveyor Belt",
  ];
  const statuses: CalendarEvent["status"][] = [
    "scheduled",
    "scheduled",
    "scheduled",
  ];
  const priorities: CalendarEvent["priority"][] = ["high", "medium", "low"];
  const types: CalendarEvent["type"][] = [
    "preventive",
    "predictive",
    "corrective",
  ];
  const timeSlots = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
  ];

  for (let i = 0; i < eventCount; i++) {
    const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
    dummyEvents.push({
      id: `dummy-${date.getTime()}-${i}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      planName: planNames[Math.floor(Math.random() * planNames.length)],
      equipmentNo:
        equipmentNos[Math.floor(Math.random() * equipmentNos.length)],
      equipmentDescription:
        equipmentDesc[Math.floor(Math.random() * equipmentDesc.length)],
      date: date,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      type: types[Math.floor(Math.random() * types.length)],
    });
  }

  return dummyEvents;
};

const statusConfig: Record<
  CalendarEvent["status"],
  {
    variant: "success" | "warning" | "error" | "default";
    label: string;
    icon: React.ReactNode;
  }
> = {
  scheduled: {
    variant: "default",
    label: "Scheduled",
    icon: <Clock size={12} />,
  },
  completed: {
    variant: "success",
    label: "Completed",
    icon: <CheckCircle size={12} />,
  },
  overdue: {
    variant: "error",
    label: "Overdue",
    icon: <AlertCircle size={12} />,
  },
  cancelled: {
    variant: "warning",
    label: "Cancelled",
    icon: <XCircle size={12} />,
  },
};

const priorityConfig = {
  high: { color: "text-red-600", bg: "bg-red-50", label: "High" },
  medium: { color: "text-amber-600", bg: "bg-amber-50", label: "Medium" },
  low: { color: "text-green-600", bg: "bg-green-50", label: "Low" },
};

const typeConfig = {
  preventive: { label: "Preventive", color: "text-blue-600", bg: "bg-blue-50" },
  predictive: {
    label: "Predictive",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  corrective: {
    label: "Corrective",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Working hours (9 AM to 5 PM)
const WORKING_HOURS_START = 9;
const WORKING_HOURS_END = 17;
const HOURS = Array.from(
  { length: WORKING_HOURS_END - WORKING_HOURS_START + 1 },
  (_, i) => WORKING_HOURS_START + i,
);

// Helper function to get days in month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get first day of month (0 = Sunday)
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Helper to check if a date has events (only from mockEvents, not dummy)
const getEventsForDate = (date: Date, events: CalendarEvent[]) => {
  return events.filter(
    (event) =>
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear(),
  );
};

// Helper to get dummy data for a date (including checking if it's today)
const getDummyEventsForDate = (
  date: Date | null,
  dummyDataCache: Map<string, CalendarEvent[]>,
): CalendarEvent[] => {
  if (!date) return [];

  const dateKey = date.toDateString();

  // Return cached dummy data if it exists
  if (dummyDataCache.has(dateKey)) {
    return dummyDataCache.get(dateKey) || [];
  }

  // Generate new dummy data for this date
  const dummyEvents = generateDummyDataForDate(date);
  dummyDataCache.set(dateKey, dummyEvents);
  return dummyEvents;
};

// Get week dates
const getWeekDates = (date: Date): Date[] => {
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day;
  const weekStart = new Date(current.setDate(diff));
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(new Date(weekStart));
    weekStart.setDate(weekStart.getDate() + 1);
  }
  return weekDates;
};

export default function PlanCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dummyDataCache, setDummyDataCache] = useState<
    Map<string, CalendarEvent[]>
  >(new Map());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Initialize selectedDate with current date when component mounts
  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
    // Generate dummy data for today
    const todayKey = today.toDateString();
    if (!dummyDataCache.has(todayKey)) {
      const dummyEvents = generateDummyDataForDate(today);
      setDummyDataCache(new Map(dummyDataCache.set(todayKey, dummyEvents)));
    }
  }, []);

  const handlePrev = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (view === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
      // When navigating in day view, update selected date to the new current date
      setSelectedDate(newDate);
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (view === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
      // When navigating in day view, update selected date to the new current date
      setSelectedDate(newDate);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    const todayKey = today.toDateString();
    if (!dummyDataCache.has(todayKey)) {
      const dummyEvents = generateDummyDataForDate(today);
      setDummyDataCache(new Map(dummyDataCache.set(todayKey, dummyEvents)));
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = date.toDateString();
    if (!dummyDataCache.has(dateKey)) {
      const dummyEvents = generateDummyDataForDate(date);
      setDummyDataCache(new Map(dummyDataCache.set(dateKey, dummyEvents)));
    }
  };

  const filteredEvents = mockEvents.filter((event) => {
    if (filterStatus !== "all" && event.status !== filterStatus) return false;
    if (filterType !== "all" && event.type !== filterType) return false;
    return true;
  });

  const getEventsForDateRange = (date: Date) => {
    const realEvents = getEventsForDate(date, filteredEvents);
    const dummyEvents = getDummyEventsForDate(date, dummyDataCache);
    return [...realEvents, ...dummyEvents];
  };

  // Render Month View
  const renderMonthView = () => {
    const cells = [];
    const totalDays = daysInMonth + firstDay;

    for (let i = 0; i < totalDays; i++) {
      const dayNumber = i - firstDay + 1;
      const isValid = dayNumber > 0 && dayNumber <= daysInMonth;
      const date = isValid ? new Date(year, month, dayNumber) : null;
      const allEventsForDate = date ? getEventsForDateRange(date) : [];

      cells.push(
        <div
          key={i}
          onClick={() => date && handleDateClick(date)}
          className={`
          min-h-[120px] bg-white border-r border-b border-gray-100 p-2 transition-all
          ${isValid ? "cursor-pointer hover:bg-blue-50/30" : "bg-gray-50"}
          ${selectedDate && date && selectedDate.toDateString() === date.toDateString() ? "ring-2 ring-blue-400 ring-inset" : ""}
        `}
        >
          {isValid && (
            <>
              <div className="flex justify-between items-start">
                <span
                  className={`
                  text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full
                  ${date && date.toDateString() === new Date().toDateString() ? "bg-blue-600 text-white" : "text-gray-700"}
                `}
                >
                  {dayNumber}
                </span>
                {allEventsForDate.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded-full">
                    {allEventsForDate.length}
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {allEventsForDate.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded bg-blue-50 text-blue-700 truncate"
                    title={event.title}
                  >
                    {event.title}
                    {event.id.startsWith("dummy-") && (
                      <span className="ml-1 text-[10px] text-gray-400">
                        (Demo)
                      </span>
                    )}
                  </div>
                ))}
                {allEventsForDate.length > 2 && (
                  <div className="text-xs text-gray-400">
                    +{allEventsForDate.length - 2} more
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
      );
    }

    return cells;
  };

  // Render Week View
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const hours = HOURS;

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
            <div className="p-3 text-center text-sm font-semibold text-gray-600 border-r border-gray-200">
              Time
            </div>
            {weekDates.map((date, idx) => (
              <div
                key={idx}
                className="p-3 text-center border-r border-gray-200 last:border-r-0"
              >
                <div className="text-sm font-semibold text-gray-700">
                  {weekDays[date.getDay()]}
                </div>
                <div
                  className={`text-lg font-bold mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full
                    ${date.toDateString() === new Date().toDateString() ? "bg-blue-600 text-white" : "text-gray-700"}`}
                >
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {hours.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-8 border-b border-gray-100"
            >
              <div className="p-2 text-xs text-gray-500 border-r border-gray-100 bg-gray-50">
                {hour}:00 - {hour + 1}:00
              </div>
              {weekDates.map((date, idx) => {
                const events = getEventsForDateRange(date);
                const hourEvents = events.filter((event) => {
                  if (!event.startTime) return false;
                  const eventHour = parseInt(event.startTime.split(":")[0]);
                  return eventHour === hour;
                });

                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(date)}
                    className="p-1 border-r border-gray-100 min-h-[80px] cursor-pointer hover:bg-blue-50/30"
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1.5 rounded bg-blue-50 text-blue-700 mb-1 truncate"
                        title={`${event.title} (${event.startTime} - ${event.endTime})`}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-[10px] text-gray-500">
                          {event.startTime}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Day View (9 AM to 5 PM only)
  const renderDayView = () => {
    const hours = HOURS;
    const events = selectedDate ? getEventsForDateRange(selectedDate) : [];

    const groupEventsByHour = () => {
      const grouped: { [key: number]: CalendarEvent[] } = {};
      hours.forEach((hour) => {
        grouped[hour] = events.filter((event) => {
          if (!event.startTime) return false;
          const eventHour = parseInt(event.startTime.split(":")[0]);
          return eventHour === hour;
        });
      });
      return grouped;
    };

    const groupedEvents = groupEventsByHour();

    if (!selectedDate) {
      return (
        <div className="text-center py-12 text-gray-400">
          Click on a date to view schedule
        </div>
      );
    }

    return (
      <div className="space-y-0 border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white">
          <h3 className="text-lg font-semibold">
            {selectedDate.toLocaleDateString("default", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          {selectedDate.toDateString() === new Date().toDateString() && (
            <span className="inline-block mt-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>

        {/* Working Hours Schedule */}
        <div className="divide-y divide-gray-100">
          <div className="bg-green-50 px-4 py-2 border-b border-green-200">
            <span className="text-xs font-medium text-green-700">
              Working Hours: {WORKING_HOURS_START}:00 - {WORKING_HOURS_END}:00
            </span>
          </div>

          {hours.map((hour) => {
            const hourEvents = groupedEvents[hour] || [];
            const isWithinWorkingHours =
              hour >= WORKING_HOURS_START && hour < WORKING_HOURS_END;

            if (!isWithinWorkingHours) return null;

            return (
              <div key={hour} className="flex hover:bg-gray-50">
                <div className="w-24 p-3 text-sm font-medium text-gray-600 border-r border-gray-100 bg-gray-50">
                  {hour}:00 - {hour + 1}:00
                </div>
                <div className="flex-1 p-2">
                  {hourEvents.length > 0 ? (
                    <div className="space-y-2">
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-800 text-sm">
                                  {event.title}
                                </h4>
                                {event.id.startsWith("dummy-") && (
                                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                    Demo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-2">
                                {event.planName}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge
                                  variant={statusConfig[event.status].variant}
                                  className="text-xs"
                                >
                                  <span className="flex items-center gap-1">
                                    {statusConfig[event.status].icon}
                                    {statusConfig[event.status].label}
                                  </span>
                                </Badge>
                                <Badge
                                  variant="default"
                                  className={`text-xs ${priorityConfig[event.priority].bg} ${priorityConfig[event.priority].color} border-none`}
                                >
                                  {priorityConfig[event.priority].label}
                                </Badge>
                                <Badge
                                  variant="default"
                                  className={`text-xs ${typeConfig[event.type].bg} ${typeConfig[event.type].color} border-none`}
                                >
                                  {typeConfig[event.type].label}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Time:</span>{" "}
                                {event.startTime} - {event.endTime}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                <span className="font-medium">Equipment:</span>{" "}
                                {event.equipmentNo} -{" "}
                                {event.equipmentDescription}
                              </div>
                            </div>
                            <button className="p-1 rounded-lg hover:bg-blue-100">
                              <Eye size={14} className="text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No scheduled maintenance
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* After hours note */}
          <div className="bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
            Schedule shown for working hours ({WORKING_HOURS_START}:00 -{" "}
            {WORKING_HOURS_END}:00)
          </div>
        </div>
      </div>
    );
  };

  // Get events for right panel
  const selectedDateEvents = selectedDate
    ? getEventsForDate(selectedDate, filteredEvents)
    : [];
  const selectedDummyEvents = getDummyEventsForDate(
    selectedDate,
    dummyDataCache,
  );
  const allSelectedDateEvents = [...selectedDateEvents, ...selectedDummyEvents];

  const getDateRangeText = () => {
    if (view === "month") {
      return currentDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
    } else if (view === "week") {
      const weekDates = getWeekDates(currentDate);
      const start = weekDates[0];
      const end = weekDates[6];
      return `${start.toLocaleDateString("default", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("default", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-lg font-semibold text-gray-800 min-w-[200px] text-center">
              {getDateRangeText()}
            </span>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={handleToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  // When switching to day view, ensure selected date is set
                  if (v === "day" && !selectedDate) {
                    const today = new Date();
                    setSelectedDate(today);
                    setCurrentDate(today);
                  }
                }}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-all
                  ${view === v ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}
                `}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Download size={18} className="text-gray-600" />
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">Filters:</span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="preventive">Preventive</option>
          <option value="predictive">Predictive</option>
          <option value="corrective">Corrective</option>
        </select>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          {view === "month" && (
            <>
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-sm font-semibold text-gray-600"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {renderMonthView()}
              </div>
            </>
          )}
          {view === "week" && renderWeekView()}
          {view === "day" && <div className="">{renderDayView()}</div>}
        </motion.div>

        {/* Events Panel */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CalendarIcon size={18} />
              {selectedDate
                ? selectedDate.toLocaleDateString("default", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Select a date"}
              {selectedDate &&
                selectedDate.toDateString() === new Date().toDateString() && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
            </h3>
          </div>

          <div className="p-4 max-h-[500px] overflow-y-auto">
            {selectedDate ? (
              allSelectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {allSelectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-800 text-sm">
                              {event.title}
                            </h4>
                            {event.id.startsWith("dummy-") && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                Demo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {event.planName}
                          </p>
                          {event.startTime && (
                            <p className="text-xs text-gray-500 mt-1">
                              Time: {event.startTime} - {event.endTime}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge
                              variant={statusConfig[event.status].variant}
                              className="text-xs"
                            >
                              <span className="flex items-center gap-1">
                                {statusConfig[event.status].icon}
                                {statusConfig[event.status].label}
                              </span>
                            </Badge>
                            <Badge
                              variant="default"
                              className={`text-xs ${priorityConfig[event.priority].bg} ${priorityConfig[event.priority].color} border-none`}
                            >
                              {priorityConfig[event.priority].label}
                            </Badge>
                            <Badge
                              variant="default"
                              className={`text-xs ${typeConfig[event.type].bg} ${typeConfig[event.type].color} border-none`}
                            >
                              {typeConfig[event.type].label}
                            </Badge>
                          </div>
                        </div>
                        <button className="p-1 rounded-lg hover:bg-gray-100">
                          <Eye size={14} className="text-gray-400" />
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Equipment:</span>{" "}
                        {event.equipmentNo} - {event.equipmentDescription}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No scheduled events for this date
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Click on a date to view scheduled maintenance events
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Upcoming Events Summary */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
      >
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Clock size={16} />
          Upcoming Events (Next 7 Days)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Title
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Equipment
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents
                .filter((event) => event.status === "scheduled")
                .slice(0, 5)
                .map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {event.date.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800">
                      {event.title}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {event.equipmentNo}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        variant={statusConfig[event.status].variant}
                        className="text-xs"
                      >
                        {statusConfig[event.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig[event.priority].bg} ${priorityConfig[event.priority].color}`}
                      >
                        {priorityConfig[event.priority].label}
                      </span>
                    </td>
                  </tr>
                ))}
              {filteredEvents.filter((e) => e.status === "scheduled").length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400 text-sm"
                  >
                    No upcoming events
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
