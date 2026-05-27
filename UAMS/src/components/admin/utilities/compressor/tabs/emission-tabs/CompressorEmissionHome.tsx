// import React from "react";
import {
  BarChart3,
  Activity,
  //   Thermometer,
  Wind,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  //   TrendingDown,
  //   Clock,
  //   Zap,
} from "lucide-react";
import {
  //   LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Dummy data for compressor emissions
const emissionTrendData = [
  { time: "00:00", co2: 12.4, nox: 0.8, so2: 0.06 },
  { time: "04:00", co2: 11.8, nox: 0.7, so2: 0.05 },
  { time: "08:00", co2: 13.2, nox: 0.9, so2: 0.07 },
  { time: "12:00", co2: 14.1, nox: 1.1, so2: 0.08 },
  { time: "16:00", co2: 12.9, nox: 0.8, so2: 0.06 },
  { time: "20:00", co2: 11.5, nox: 0.6, so2: 0.04 },
];

const compressorStatusData = [
  { name: "Within Limits", value: 4, color: "#22c55e" },
  { name: "Warning", value: 1, color: "#f59e0b" },
  { name: "Critical", value: 0, color: "#ef4444" },
];

const kpiCards = [
  {
    title: "Avg CO₂ Emission",
    value: "12.8 kg/hr",
    subtitle: "Last 24 hours",
    icon: Wind,
    trend: "+2.3%",
    trendUp: false,
    color: "from-purple-100 via-purple-50 to-purple-200",
  },
  {
    title: "NOx Levels",
    value: "0.82 ppm",
    subtitle: "Current average",
    icon: Activity,
    trend: "-5.1%",
    trendUp: true,
    color: "from-pink-100 via-pink-50 to-pink-200",
  },
  {
    title: "Compliance Rate",
    value: "98.5%",
    subtitle: "This month",
    icon: CheckCircle,
    trend: "+1.2%",
    trendUp: true,
    color: "from-green-100 via-green-50 to-green-200",
  },
  {
    title: "Active Alerts",
    value: "1",
    subtitle: "Require attention",
    icon: AlertTriangle,
    trend: "-2",
    trendUp: true,
    color: "from-amber-100 via-amber-50 to-amber-200",
  },
];

export default function CompressorEmissionHome() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <Wind size={24} className="text-gray-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Compressor Emission Dashboard
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Real-time monitoring of compressor emissions, compliance tracking,
              and environmental impact analysis.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-4 text-gray-900 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <Icon className="w-6 h-6 text-gray-500" />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {card.trend}
                </span>
              </div>
              <h3 className="text-2xl font-bold mt-3">{card.value}</h3>
              <p className="text-gray-700 text-xs mt-1">{card.title}</p>
              <p className="text-gray-500 text-xs">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emission Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              Emission Trends (24h)
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Hourly
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={emissionTrendData}>
              <defs>
                <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="co2"
                name="CO₂ (kg/hr)"
                stroke="#2563eb"
                fill="url(#co2Gradient)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="nox"
                name="NOx (ppm)"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Compressor Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gray-500" />
              Compressor Status
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Current
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={compressorStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
              >
                {compressorStatusData.map((_, index) => {
                  const palette = ["#2563eb", "#f59e0b", "#ef4444"];
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={palette[index % palette.length]}
                    />
                  );
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center text-xs text-gray-500">
            5 compressors monitored • 4 compliant • 1 warning
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Efficiency vs Emission Correlation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              Efficiency vs Emission
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Correlation
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={emissionTrendData.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis yAxisId="left" stroke="#9ca3af" />
              <YAxis yAxisId="right" orientation="right" stroke="#475569" />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="co2"
                name="CO₂ (kg/hr)"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="so2"
                name="SO₂ (ppm)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 4 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gray-500" />
              Recent Alerts
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Last 24h
            </span>
          </div>
          <div className="space-y-3">
            {[
              {
                time: "2 hours ago",
                compressor: "CPR-002",
                message: "NOx levels approaching threshold",
                severity: "warning",
              },
              {
                time: "6 hours ago",
                compressor: "CPR-004",
                message: "Sensor calibration due",
                severity: "info",
              },
              {
                time: "1 day ago",
                compressor: "CPR-001",
                message: "Monthly compliance report generated",
                severity: "success",
              },
            ].map((alert, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.compressor} • {alert.time}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        Emission data updated every 15 minutes • Next sensor calibration: 15
        days
      </div>
    </div>
  );
}
