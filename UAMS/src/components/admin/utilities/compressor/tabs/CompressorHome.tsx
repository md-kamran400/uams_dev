import {
  BarChart3,
  Gauge,
  Activity,
  Thermometer,
  Wrench,
  Clock,
  Droplets,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  FileText,
  Download,
  RefreshCw,
  Wind,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Extended dummy data based on Air Compressor Log Book
const compressorLogData = [
  {
    shift: "A",
    startTime: "06:00",
    stopTime: "14:00",
    totalRunningHours: 8,
    loadedHours: 6,
    unloadHours: 2,
    motorStart: 12,
    oilLevel: "Normal",
    oilPressure: 4.5,
    actualPressure: 7.8,
    intercoolerPressure: 2.1,
    outletTemp: 82,
    inletTemp: 40,
    tempDiff: 42,
    autoDrain1: "OK",
    autoDrain2: "OK",
    operator: "Rahul",
    remarks: "Normal Operation",
    powerConsumed: 45,
    airFlowOutput: 320,
  },
  {
    shift: "B",
    startTime: "14:00",
    stopTime: "22:00",
    totalRunningHours: 8,
    loadedHours: 5,
    unloadHours: 3,
    motorStart: 15,
    oilLevel: "Normal",
    oilPressure: 4.2,
    actualPressure: 7.5,
    intercoolerPressure: 2.0,
    outletTemp: 85,
    inletTemp: 42,
    tempDiff: 43,
    autoDrain1: "OK",
    autoDrain2: "OK",
    operator: "Aman",
    remarks: "Minor Pressure Drop",
    powerConsumed: 48,
    airFlowOutput: 310,
  },
  {
    shift: "C",
    startTime: "22:00",
    stopTime: "06:00",
    totalRunningHours: 8,
    loadedHours: 7,
    unloadHours: 1,
    motorStart: 10,
    oilLevel: "Normal",
    oilPressure: 4.8,
    actualPressure: 8.0,
    intercoolerPressure: 2.2,
    outletTemp: 79,
    inletTemp: 38,
    tempDiff: 41,
    autoDrain1: "OK",
    autoDrain2: "Not OK",
    operator: "Sahil",
    remarks: "Drain Issue Found",
    powerConsumed: 42,
    airFlowOutput: 335,
  },
];

// Extended daily trend data
const dailyTrendData = [
  { day: "Mon", runtime: 24, loaded: 18, efficiency: 7.2 },
  { day: "Tue", runtime: 24, loaded: 19, efficiency: 7.4 },
  { day: "Wed", runtime: 24, loaded: 17, efficiency: 7.1 },
  { day: "Thu", runtime: 23, loaded: 16, efficiency: 6.9 },
  { day: "Fri", runtime: 24, loaded: 20, efficiency: 7.6 },
  { day: "Sat", runtime: 22, loaded: 15, efficiency: 6.8 },
  { day: "Sun", runtime: 18, loaded: 12, efficiency: 6.5 },
];

// Cycle count data
const cycleTrendData = [
  { shift: "A", motorStarts: 12, runtime: 8, cyclesPerHour: 1.5 },
  { shift: "B", motorStarts: 15, runtime: 8, cyclesPerHour: 1.9 },
  { shift: "C", motorStarts: 10, runtime: 8, cyclesPerHour: 1.3 },
];

// Shift performance summary
const shiftPerformanceData = [
  {
    shift: "A",
    avgPressure: 7.8,
    avgTemp: 82,
    loadEfficiency: 75,
    oilPressure: 4.5,
  },
  {
    shift: "B",
    avgPressure: 7.5,
    avgTemp: 85,
    loadEfficiency: 62.5,
    oilPressure: 4.2,
  },
  {
    shift: "C",
    avgPressure: 8.0,
    avgTemp: 79,
    loadEfficiency: 87.5,
    oilPressure: 4.8,
  },
];

// Efficiency trend data
const efficiencyTrendData = [
  { shift: "A", cfmKw: 7.11, target: 7.5 },
  { shift: "B", cfmKw: 6.46, target: 7.5 },
  { shift: "C", cfmKw: 7.98, target: 7.5 },
];

// Pie chart data for drain status
const drainStatusData = [
  { name: "Auto Drain 1 OK", value: 3, color: "#22c55e" },
  { name: "Auto Drain 2 OK", value: 2, color: "#3b82f6" },
  { name: "Auto Drain Issues", value: 1, color: "#ef4444" },
];

// Maintenance alerts data
const maintenanceAlerts = [
  {
    id: 1,
    severity: "High",
    message: "Auto Drain 2 malfunction - Shift C",
    component: "Drain System",
    date: "Today",
  },
  {
    id: 2,
    severity: "Medium",
    message: "Oil pressure fluctuation detected",
    component: "Lubrication",
    date: "Today",
  },
  {
    id: 3,
    severity: "Low",
    message: "Temperature rise above threshold",
    component: "Cooling System",
    date: "Yesterday",
  },
];

// KPI Cards Data - Plain UI style
const kpiCards = [
  {
    title: "Total Runtime",
    value: "94 hrs",
    subtitle: "Last 7 days",
    icon: Clock,
    trend: "+8%",
    trendUp: true,
  },
  {
    title: "Load Efficiency",
    value: "74.2%",
    subtitle: "Avg across shifts",
    icon: Gauge,
    trend: "+2.3%",
    trendUp: true,
  },
  {
    title: "Avg Pressure",
    value: "7.77 Bar",
    subtitle: "Output pressure",
    icon: Activity,
    trend: "-0.3%",
    trendUp: false,
  },
  {
    title: "Avg Temp",
    value: "82°C",
    subtitle: "Outlet temperature",
    icon: Thermometer,
    trend: "+1.2%",
    trendUp: false,
  },
  {
    title: "Maintenance Alerts",
    value: "3",
    subtitle: "Pending actions",
    icon: Wrench,
    trend: "-1",
    trendUp: false,
  },
  {
    title: "Total CFM Output",
    value: "965 CFM",
    subtitle: "Air flow output",
    icon: Wind,
    trend: "+5%",
    trendUp: true,
  },
];

const CompressorHome = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            Air Compressor Analytics Dashboard
          </h3>
          <p className="text-gray-500 text-sm">
            Analytics based on manual hourly readings from Air Compressor Log
            Book
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition">
            <Download size={14} /> Export
          </button>
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Data Source Info Card */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <div>
            <span className="text-sm font-semibold text-blue-800">
              Data Source
            </span>
            <p className="text-xs text-blue-600">
              Manual hourly readings from Air Compressor Log Book — operational
              hours, loading time, pressures, temperatures, and performance
              parameters for each compressor unit.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - 6 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-4 text-gray-900 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <Icon className="w-6 h-6 text-gray-500" />
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    card.trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {card.trend}
                </span>
              </div>
              <h3 className="text-2xl font-bold mt-3">{card.value}</h3>
              <p className="text-gray-700 text-xs mt-1">{card.title}</p>
              <p className="text-gray-400 text-xs">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Row 1: Runtime vs Loaded Hours + Efficiency Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Runtime vs Loaded Hours Stacked Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Runtime vs Loaded Hours
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Daily Trend
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              <Bar
                dataKey="runtime"
                name="Total Runtime (hrs)"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="loaded"
                name="Loaded Hours (hrs)"
                fill="#60a5fa"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-gray-500 flex justify-between">
            <span>
              📊 Utilization Rate:{" "}
              <strong className="text-blue-600">74.2%</strong>
            </span>
            <span>
              ⚡ Unload Hours: <strong className="text-blue-400">25.8%</strong>
            </span>
          </div>
        </div>

        {/* Efficiency Trend (CFM/kW) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Compressor Efficiency (CFM/kW)
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Shift-wise
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={efficiencyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="shift" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[6, 9]} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              <Bar
                dataKey="cfmKw"
                name="Actual CFM/kW"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="target"
                name="Target CFM/kW"
                fill="#60a5fa"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-gray-500 text-center">
            {efficiencyTrendData[2].cfmKw > efficiencyTrendData[2].target
              ? "✅ Shift C exceeds efficiency target"
              : "⚠️ Efficiency below target for Shift B"}
          </div>
        </div>
      </div>

      {/* Row 2: Pressure Trend + Temperature Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pressure Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Air Delivery Pressure Trend
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Bar over time
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={compressorLogData}>
              <defs>
                <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="shift" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[7, 8.5]} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="actualPressure"
                name="Pressure (Bar)"
                stroke="#2563eb"
                fill="url(#pressureGradient)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="actualPressure"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: "#2563eb", r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-gray-500 flex justify-between">
            <span>
              🎯 Target Pressure: <strong>7.5-8.0 Bar</strong>
            </span>
            <span className="text-green-600">✓ Within range</span>
          </div>
        </div>

        {/* Temperature Profile (Inlet vs Outlet) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-blue-500" />
              Temperature Profile
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              °C comparison
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={compressorLogData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="shift" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[30, 100]} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="inletTemp"
                name="Inlet Temp (°C)"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: "#60a5fa", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="outletTemp"
                name="Outlet Temp (°C)"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-gray-500 flex justify-between">
            <span>
              🌡️ Temp Differential:{" "}
              <strong className="text-blue-600">42-43°C</strong>
            </span>
            <span>
              {compressorLogData[2].outletTemp < 80
                ? "✅ Cooling efficient"
                : "⚠️ Monitor temperature"}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Load/Unload Cycle + Oil Pressure Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load/Unload Cycle Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Load/Unload Cycle Analysis
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Motor starts vs runtime
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cycleTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="shift" stroke="#9ca3af" />
              <YAxis yAxisId="left" stroke="#9ca3af" />
              <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="motorStarts"
                name="Motor Start Count"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cyclesPerHour"
                name="Cycles per Hour"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: "#60a5fa", r: 4 }}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-gray-500">
            ⚠️ Shift B has highest cycle count (<strong>1.9 cycles/hour</strong>
            ) - potential control issue
          </div>
        </div>

        {/* Oil Pressure vs Temperature Scatter Plot */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Oil Pressure & Temperature Correlation
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Mechanical health
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="oilPressure"
                name="Oil Pressure"
                unit=" Bar"
                domain={[4, 5]}
                stroke="#9ca3af"
              />
              <YAxis
                dataKey="outletTemp"
                name="Outlet Temp"
                unit=" °C"
                domain={[75, 90]}
                stroke="#9ca3af"
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value, name) => [
                  value,
                  name === "oilPressure"
                    ? "Oil Pressure (Bar)"
                    : "Outlet Temp (°C)",
                ]}
              />
              <Scatter data={compressorLogData} fill="#2563eb" shape="circle">
                {compressorLogData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.outletTemp > 83 ? "#ef4444" : "#2563eb"}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-gray-500 flex justify-between">
            <span>
              🛢️ Oil Pressure Range: <strong>4.2 - 4.8 Bar</strong>
            </span>
            <span>
              {compressorLogData[1].oilPressure < 4.3
                ? "⚠️ Low oil pressure on Shift B"
                : "✅ Normal range"}
            </span>
          </div>
        </div>
      </div>

      {/* Row 4: Shift-wise Performance Table + Drain Status + Maintenance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shift-wise Performance Summary Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800">
              Shift Performance Summary
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Shift</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Pressure</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Temp</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Load Eff.</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Oil Press</th>
                </tr>
              </thead>
              <tbody>
                {shiftPerformanceData.map((shift, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          shift.shift === "A"
                            ? "bg-blue-100 text-blue-700"
                            : shift.shift === "B"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        Shift {shift.shift}
                      </span>
                    </td>
                    <td className="py-2 px-2">{shift.avgPressure} Bar</td>
                    <td className="py-2 px-2">{shift.avgTemp}°C</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <span>{shift.loadEfficiency}%</span>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${shift.loadEfficiency > 70 ? "bg-green-500" : "bg-yellow-500"}`}
                            style={{ width: `${shift.loadEfficiency}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2">{shift.oilPressure} Bar</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            👤 Operators: Rahul (A) | Aman (B) | Sahil (C)
          </div>
        </div>

        {/* Drain Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-800">
              Auto Drain Status
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={drainStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
              >
                {drainStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-center text-xs text-red-600">
            {drainStatusData[2].value > 0 &&
              "⚠️ Auto Drain 2 requires maintenance (Shift C)"}
          </div>
        </div>

        {/* Maintenance Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-800">
              Maintenance Alerts
            </h2>
          </div>
          <div className="space-y-3">
            {maintenanceAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  alert.severity === "High"
                    ? "bg-red-50 border-l-4 border-red-500"
                    : alert.severity === "Medium"
                    ? "bg-amber-50 border-l-4 border-amber-500"
                    : "bg-blue-50 border-l-4 border-blue-500"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 ${
                    alert.severity === "High"
                      ? "bg-red-500"
                      : alert.severity === "Medium"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {alert.message}
                  </p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {alert.component}
                    </span>
                    <span className="text-xs text-gray-400">{alert.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border-t border-gray-100 pt-3">
            View All Maintenance Records →
          </button>
        </div>
      </div>

      {/* Row 5: Reports Section */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">
            Available Reports & Outputs
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            "Daily Compressor Operation Report",
            "Efficiency & Energy Report",
            "Maintenance Log Summary",
            "Shift-wise Utilization Report",
            "Monthly Performance Summary",
            "Downtime Analysis",
            "MTBF Calculation",
            "Oil Analysis Report",
          ].map((report, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-2xl px-3 py-3 shadow-sm"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>{report}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        Data Source: Manual hourly readings from Air Compressor Log Book | Last
        updated: Today, 06:00 AM
      </div>
    </div>
  );
};

export default CompressorHome;