import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Info,
  Zap,
  RefreshCw,
  Filter,
  Pencil,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  LineChart as LineIcon,
  BarChart as BarIcon,
  AreaChart as AreaIcon,
  Star,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Responsive,
  WidthProvider,
  type Layout,
  type LayoutItem,
} from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  api,
  type ApiUtilityType,
  type AnalyticsLayoutItem,
} from "../../lib/api";
import LocationFilter, {
  type LocationSelection,
} from "./shared/LocationFilter";

const ResponsiveGridLayout = WidthProvider(Responsive);
type ChartTypeOverride = "line" | "bar" | "area";

interface KpiSeries {
  id: string;
  name: string;
  unit: string;
  formula: string;
  recommendedChart: "area" | "bar" | "line" | "radial" | "pie" | "composed";
  target: number | null;
  alertBelow: number | null;
  alertAbove: number | null;
  series: { date: string; value: number }[];
}

interface AlertTrendEntry {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface AnalyticsResult {
  kpis: KpiSeries[];
  alertTrend: AlertTrendEntry[];
  assets: { id: string; name: string }[];
}

interface AssetItem {
  id: string;
  name: string;
}

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

const DATE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function trend(series: { value: number }[]): "up" | "down" | "flat" {
  if (series.length < 2) return "flat";
  const last = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  if (last > prev * 1.01) return "up";
  if (last < prev * 0.99) return "down";
  return "flat";
}

function TrendIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up") return <TrendingUp size={14} className="text-green-500" />;
  if (dir === "down")
    return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

function KpiChart({
  kpi,
  color,
  chartTypeOverride,
  height = 180,
}: {
  kpi: KpiSeries;
  color: string;
  chartTypeOverride?: ChartTypeOverride;
  height?: number;
}) {
  const data = kpi.series.map((p) => ({
    date: fmtDate(p.date),
    value: p.value,
  }));
  const baseChart: ChartTypeOverride =
    kpi.recommendedChart === "bar"
      ? "bar"
      : kpi.recommendedChart === "area"
        ? "area"
        : "line";
  const chartType: ChartTypeOverride = chartTypeOverride ?? baseChart;

  const common = {
    data,
    margin: { top: 4, right: 12, left: 0, bottom: 0 },
  };

  const axisProps = {
    xAxis: (
      <XAxis
        dataKey="date"
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        axisLine={false}
      />
    ),
    yAxis: (
      <YAxis
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        axisLine={false}
        width={38}
      />
    ),
    grid: <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />,
    tooltip: (
      <Tooltip
        contentStyle={{
          fontSize: 12,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
        }}
      />
    ),
  };

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart {...common}>
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          {axisProps.tooltip}
          <Bar
            dataKey="value"
            name={kpi.name}
            fill={color}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart {...common}>
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          {axisProps.tooltip}
          <defs>
            <linearGradient id={`grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            name={kpi.name}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${kpi.id})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart {...common}>
        {axisProps.grid}
        {axisProps.xAxis}
        {axisProps.yAxis}
        {axisProps.tooltip}
        <Line
          dataKey="value"
          name={kpi.name}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        {kpi.target !== null && (
          <Line
            dataKey={() => kpi.target}
            name="Target"
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface AnalyticsProps {
  lockedUtilityTypeId?: string;
}

export default function Analytics({
  lockedUtilityTypeId,
}: AnalyticsProps = {}) {
  const [utilities, setUtilities] = useState<ApiUtilityType[]>([]);
  const [selectedUtility, setSelectedUtility] = useState<string>(
    lockedUtilityTypeId ?? "",
  );
  const [availableAssets, setAvailableAssets] = useState<AssetItem[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [dayPreset, setDayPreset] = useState(30);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAssetMenu, setShowAssetMenu] = useState(false);

  // Layout config state
  const [layoutItems, setLayoutItems] = useState<AnalyticsLayoutItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const layoutDirtyRef = useRef(false);

  // Location filter (Site → Plant → Area). Narrows the asset set before the
  // existing utility/asset filtering kicks in. Lives entirely in URL-free state.
  const [location, setLocation] = useState<LocationSelection>({});

  useEffect(() => {
    if (lockedUtilityTypeId) {
      api.utilityTypes.list().then(setUtilities).catch(console.error);
      return;
    }
    api.utilityTypes
      .list()
      .then((list) => {
        setUtilities(list);
        if (list.length > 0 && !selectedUtility) setSelectedUtility(list[0].id);
      })
      .catch(console.error);
  }, [lockedUtilityTypeId]);

  useEffect(() => {
    if (lockedUtilityTypeId) setSelectedUtility(lockedUtilityTypeId);
  }, [lockedUtilityTypeId]);

  useEffect(() => {
    if (!selectedUtility) return;
    setSelectedAssets([]);
    setData(null);
    fetchData(selectedUtility, [], dayPreset, location);
    loadLayout(selectedUtility);
  }, [selectedUtility]);

  // Re-fetch when location changes: clear selected assets (they may be outside
  // the new location) and pull fresh data.
  useEffect(() => {
    if (!selectedUtility) return;
    setSelectedAssets([]);
    fetchData(selectedUtility, [], dayPreset, location);
  }, [location.siteId, location.plantId, location.areaId]);

  async function fetchData(
    utilityTypeId: string,
    assetIds: string[],
    days: number,
    loc: LocationSelection = location,
  ) {
    setLoading(true);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const qs = new URLSearchParams({ utilityTypeId, from, to });
      if (assetIds.length > 0) qs.set("assetIds", assetIds.join(","));
      if (loc.siteId) qs.set("siteId", loc.siteId);
      if (loc.plantId) qs.set("plantId", loc.plantId);
      if (loc.areaId) qs.set("areaId", loc.areaId);
      const token = localStorage.getItem("uams_token");
      const res = await fetch(`/api/analytics?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: AnalyticsResult = await res.json();
      setData(json);
      if (json.assets) setAvailableAssets(json.assets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLayout(utilityTypeId: string) {
    try {
      const res = await api.utilityTypes.getAnalyticsLayout(utilityTypeId);
      setLayoutItems(res.items ?? []);
      layoutDirtyRef.current = false;
    } catch (e) {
      console.error("loadLayout", e);
      setLayoutItems([]);
    }
  }

  function applyFilters() {
    if (!selectedUtility) return;
    fetchData(selectedUtility, selectedAssets, dayPreset, location);
    setShowAssetMenu(false);
  }

  // Merge persisted layout with current KPI list. Items for unknown KPIs are dropped;
  // new KPIs without a layout entry get appended to the bottom with default size.
  const resolvedItems: AnalyticsLayoutItem[] = useMemo(() => {
    const kpis = data?.kpis ?? [];
    if (kpis.length === 0) return [];
    const byId = new Map(layoutItems.map((it) => [it.kpiId, it]));
    const placed: AnalyticsLayoutItem[] = [];
    let nextY = layoutItems.reduce((m, it) => Math.max(m, it.y + it.h), 0);
    for (const kpi of kpis) {
      const existing = byId.get(kpi.id);
      if (existing) {
        placed.push(existing);
      } else {
        placed.push({
          kpiId: kpi.id,
          x: (placed.length % 2) * 6,
          y: nextY,
          w: 6,
          h: 4,
        });
        if (placed.length % 2 === 0) nextY += 4;
      }
    }
    return placed;
  }, [data?.kpis, layoutItems]);

  const visibleItems = useMemo(
    () => resolvedItems.filter((it) => !it.hidden),
    [resolvedItems],
  );

  const rglLayout: LayoutItem[] = useMemo(
    () =>
      visibleItems.map((it) => ({
        i: it.kpiId,
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        minW: 3,
        minH: 3,
      })),
    [visibleItems],
  );

  function handleLayoutChange(
    next: Layout,
    _layouts: Partial<Record<string, Layout>>,
  ) {
    if (!editMode) return;
    setLayoutItems((prev) => {
      const byId = new Map(prev.map((it) => [it.kpiId, it]));
      // Start from resolvedItems so newly-appended (unsaved) items are persisted on first save
      const base = new Map(resolvedItems.map((it) => [it.kpiId, it]));
      for (const l of next) {
        const existing = byId.get(l.i) ??
          base.get(l.i) ?? { kpiId: l.i, x: 0, y: 0, w: 6, h: 4 };
        byId.set(l.i, { ...existing, x: l.x, y: l.y, w: l.w, h: l.h });
      }
      layoutDirtyRef.current = true;
      return Array.from(byId.values());
    });
  }

  function toggleHidden(kpiId: string) {
    setLayoutItems((prev) => {
      const byId = new Map(prev.map((it) => [it.kpiId, it]));
      const base = new Map(resolvedItems.map((it) => [it.kpiId, it]));
      const existing = byId.get(kpiId) ??
        base.get(kpiId) ?? { kpiId, x: 0, y: 0, w: 6, h: 4 };
      byId.set(kpiId, { ...existing, hidden: !existing.hidden });
      layoutDirtyRef.current = true;
      return Array.from(byId.values());
    });
  }

  function setChartType(
    kpiId: string,
    chartType: ChartTypeOverride | undefined,
  ) {
    setLayoutItems((prev) => {
      const byId = new Map(prev.map((it) => [it.kpiId, it]));
      const base = new Map(resolvedItems.map((it) => [it.kpiId, it]));
      const existing = byId.get(kpiId) ??
        base.get(kpiId) ?? { kpiId, x: 0, y: 0, w: 6, h: 4 };
      byId.set(kpiId, { ...existing, chartType });
      layoutDirtyRef.current = true;
      return Array.from(byId.values());
    });
  }

  async function saveLayout() {
    if (!selectedUtility) return;
    setSavingLayout(true);
    try {
      // Persist the full resolvedItems so newly added KPIs land in the saved layout too
      const merged = new Map(resolvedItems.map((it) => [it.kpiId, it]));
      for (const it of layoutItems) merged.set(it.kpiId, it);
      await api.utilityTypes.saveAnalyticsLayout(
        selectedUtility,
        Array.from(merged.values()),
      );
      layoutDirtyRef.current = false;
      setEditMode(false);
    } catch (e) {
      console.error("saveLayout", e);
    } finally {
      setSavingLayout(false);
    }
  }

  async function resetLayout() {
    if (!selectedUtility) return;
    if (
      !confirm(
        "Reset chart layout to default? Hidden charts and chart-type overrides will also be cleared.",
      )
    )
      return;
    setSavingLayout(true);
    try {
      await api.utilityTypes.resetAnalyticsLayout(selectedUtility);
      setLayoutItems([]);
      layoutDirtyRef.current = false;
      setEditMode(false);
    } catch (e) {
      console.error("resetLayout", e);
    } finally {
      setSavingLayout(false);
    }
  }

  const alertTrendData = useMemo(
    () =>
      (data?.alertTrend ?? []).map((d) => ({ ...d, date: fmtDate(d.date) })),
    [data],
  );

  const hasAlerts = alertTrendData.some(
    (d) => d.critical + d.high + d.medium + d.low > 0,
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={lockedUtilityTypeId ? "space-y-6" : "p-6 space-y-6"}
    >
      {/* Banner — hidden when embedded under a utility tab (parent renders its own header) */}
      {!lockedUtilityTypeId && (
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart2 size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Analytics & KPIs</h1>
                <p className="text-sm text-white/70 mt-0.5">
                  KPI trends and alert history across utilities and assets.
                </p>
              </div>
            </div>
            <button
              onClick={() => applyFilters()}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
              Refresh
            </button>
          </div>
        </motion.div>
      )}

      {/* Filter bar */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4"
      >
        {!lockedUtilityTypeId && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Utility
            </label>
            <select
              value={selectedUtility}
              onChange={(e) => setSelectedUtility(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              {utilities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Assets
          </label>
          <button
            onClick={() => setShowAssetMenu((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 min-w-[160px]"
          >
            <Filter size={14} className="text-gray-400" />
            {selectedAssets.length === 0
              ? "All assets"
              : `${selectedAssets.length} selected`}
            <ChevronDown size={14} className="text-gray-400 ml-auto" />
          </button>
          {showAssetMenu && availableAssets.length > 0 && (
            <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 min-w-[200px] max-h-56 overflow-y-auto">
              <button
                onClick={() => setSelectedAssets([])}
                className={`w-full text-left px-3 py-1.5 text-sm rounded-lg ${selectedAssets.length === 0 ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
              >
                All assets
              </button>
              {availableAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() =>
                    setSelectedAssets((prev) =>
                      prev.includes(a.id)
                        ? prev.filter((x) => x !== a.id)
                        : [...prev, a.id],
                    )
                  }
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${selectedAssets.includes(a.id) ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                >
                  <span
                    className={`w-3 h-3 rounded border flex-shrink-0 ${selectedAssets.includes(a.id) ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                  />
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Site
          </label>
          <LocationFilter value={location} onChange={setLocation} compact />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Date Range
          </label>
          <div className="flex gap-1">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDayPreset(p.days)}
                className={`px-3 py-2 text-sm rounded-xl font-medium transition-colors ${dayPreset === p.days ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={applyFilters}
          disabled={!selectedUtility || loading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors"
        >
          <Zap size={14} /> Apply
        </button>
      </motion.div>

      {/* Empty / loading states */}
      {loading && (
        <div className="py-20 text-center text-sm text-gray-400">
          <RefreshCw
            size={24}
            className="animate-spin mx-auto mb-3 text-gray-300"
          />
          Loading analytics…
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI summary cards */}
          {data.kpis.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              {data.kpis.slice(0, 8).map((kpi, i) => {
                const latest = kpi.series[kpi.series.length - 1]?.value ?? null;
                const dir = trend(kpi.series);
                const color = CHART_COLORS[i % CHART_COLORS.length];
                const overTarget =
                  kpi.target !== null && latest !== null && latest > kpi.target;
                const underTarget =
                  kpi.target !== null && latest !== null && latest < kpi.target;

                return (
                  <div
                    key={kpi.id}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs text-gray-500 font-medium leading-tight">
                        {kpi.name}
                      </p>
                      <TrendIcon dir={dir} />
                    </div>
                    <p className="text-2xl font-bold" style={{ color }}>
                      {latest !== null ? latest.toLocaleString() : "—"}
                      {kpi.unit && (
                        <span className="text-sm font-normal text-gray-400 ml-1">
                          {kpi.unit}
                        </span>
                      )}
                    </p>
                    {kpi.target !== null && (
                      <p
                        className={`text-xs mt-1 ${overTarget ? "text-green-600" : underTarget ? "text-red-500" : "text-gray-400"}`}
                      >
                        Target: {kpi.target} {kpi.unit}
                      </p>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* KPI charts — configurable layout */}
          {data.kpis.length === 0 ? (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-xl border border-gray-200 py-20 text-center"
            >
              <BarChart2 size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                No KPIs configured for this utility
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Add KPIs in the utility Config tab to see charts here
              </p>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-3">
              {/* Edit-mode toolbar */}
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <BarChart2 size={14} className="text-gray-400" />
                  <span className="font-semibold text-gray-700">
                    KPI Charts
                  </span>
                  {editMode && (
                    <span className="text-amber-600 ml-2">
                      Edit mode — drag, resize or hide charts.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={resetLayout}
                        disabled={savingLayout}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          loadLayout(selectedUtility);
                        }}
                        disabled={savingLayout}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveLayout}
                        disabled={savingLayout}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                      >
                        <Save size={12} />{" "}
                        {savingLayout ? "Saving…" : "Save Layout"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                    >
                      <Pencil size={12} /> Edit Layout
                    </button>
                  )}
                </div>
              </div>

              {/* Hidden charts panel (edit mode only) */}
              {editMode && resolvedItems.some((it) => it.hidden) && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-amber-700">
                    Hidden:
                  </span>
                  {resolvedItems
                    .filter((it) => it.hidden)
                    .map((it) => {
                      const kpi = data.kpis.find((k) => k.id === it.kpiId);
                      if (!kpi) return null;
                      return (
                        <button
                          key={it.kpiId}
                          onClick={() => toggleHidden(it.kpiId)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-700 rounded-full border border-amber-200"
                        >
                          <Eye size={10} /> Show "{kpi.name}"
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Grid */}
              <ResponsiveGridLayout
                className={`layout ${editMode ? "rgl-edit" : ""}`}
                layouts={{
                  lg: rglLayout,
                  md: rglLayout,
                  sm: rglLayout,
                  xs: rglLayout,
                  xxs: rglLayout,
                }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={60}
                margin={[12, 12]}
                isDraggable={editMode}
                isResizable={editMode}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".rgl-drag-handle"
              >
                {visibleItems.map((item, i) => {
                  const kpi = data.kpis.find((k) => k.id === item.kpiId);
                  if (!kpi) return <div key={item.kpiId} />;
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  const recommendedBase: ChartTypeOverride =
                    kpi.recommendedChart === "bar"
                      ? "bar"
                      : kpi.recommendedChart === "area"
                        ? "area"
                        : "line";
                  return (
                    <div
                      key={item.kpiId}
                      className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
                    >
                      <div
                        className={`flex items-start justify-between mb-3 ${editMode ? "rgl-drag-handle cursor-move" : ""}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">
                            {kpi.name}
                          </p>
                          {kpi.unit && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {kpi.unit}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {kpi.alertAbove !== null && (
                            <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                              <AlertCircle size={10} /> &gt;{kpi.alertAbove}
                            </span>
                          )}
                          {kpi.alertBelow !== null && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                              <AlertTriangle size={10} /> &lt;{kpi.alertBelow}
                            </span>
                          )}
                          {editMode && (
                            <button
                              onClick={() => toggleHidden(item.kpiId)}
                              title="Hide chart"
                              className="ml-1 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                            >
                              <EyeOff size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {editMode && (
                        <div className="flex items-center gap-1 mb-2">
                          {(["line", "bar", "area"] as ChartTypeOverride[]).map(
                            (ct) => {
                              const isRecommended = ct === recommendedBase;
                              const isActive =
                                (item.chartType ?? recommendedBase) === ct;
                              const Icon =
                                ct === "line"
                                  ? LineIcon
                                  : ct === "bar"
                                    ? BarIcon
                                    : AreaIcon;
                              return (
                                <button
                                  key={ct}
                                  onClick={() =>
                                    setChartType(
                                      item.kpiId,
                                      ct === recommendedBase ? undefined : ct,
                                    )
                                  }
                                  title={
                                    isRecommended
                                      ? `${ct} (recommended for this KPI)`
                                      : ct
                                  }
                                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-colors ${isActive ? "bg-blue-50 text-blue-700 border-blue-200 font-medium" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                                >
                                  <Icon size={11} />
                                  <span className="capitalize">{ct}</span>
                                  {isRecommended && (
                                    <Star
                                      size={9}
                                      className={
                                        isActive
                                          ? "text-blue-500 fill-blue-500"
                                          : "text-amber-400 fill-amber-400"
                                      }
                                    />
                                  )}
                                </button>
                              );
                            },
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-h-0">
                        {kpi.series.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-gray-400">
                            No data for selected range
                          </div>
                        ) : (
                          <KpiChart
                            kpi={kpi}
                            color={color}
                            chartTypeOverride={
                              item.chartType ?? recommendedBase
                            }
                            height={item.h * 60 - 80}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </ResponsiveGridLayout>
            </motion.div>
          )}

          {/* Alert trend */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-red-500" />
              <h3 className="text-sm font-bold text-gray-800">Alert Trend</h3>
              <span className="text-xs text-gray-400">
                — daily alert count by severity
              </span>
            </div>
            {!hasAlerts ? (
              <div className="h-[180px] flex items-center justify-center">
                <div className="text-center">
                  <Info size={24} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">
                    No alerts triggered in this period
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={alertTrendData}
                  margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="critical"
                    name="Critical"
                    stackId="a"
                    fill="#ef4444"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar dataKey="high" name="High" stackId="a" fill="#f97316" />
                  <Bar
                    dataKey="medium"
                    name="Medium"
                    stackId="a"
                    fill="#f59e0b"
                  />
                  <Bar
                    dataKey="low"
                    name="Low"
                    stackId="a"
                    fill="#60a5fa"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </>
      )}

      {!loading && !data && !selectedUtility && (
        <div className="py-20 text-center text-sm text-gray-400">
          Select a utility to view analytics.
        </div>
      )}
    </motion.div>
  );
}
