import React, { useState, useRef, useEffect } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Circle,
  Group,
  Text,
  Path,
  Line,
} from "react-konva";
import Konva from "konva";
import {
  Upload,
  Check,
  Trash2,
  Wind,
  Zap,
  X,
  Plus,
  ChevronDown,
  Grid3X3,
  Layers,
  MapPin,
  Info,
  AlertCircle,
  CheckCircle2,
  Wrench,
} from "lucide-react";

import {
  COMPRESSOR_ASSETS,
  CompressorAsset,
} from "../../../data/compressorAssets";
import { DG_ASSETS, DGAsset } from "../../../data/dgAssets";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlacedAsset {
  id: string;
  assetId: string;
  type: "compressor" | "dg";
  x: number;
  y: number;
  color: string;
  label: string;
  shortName: string;
  status: string;
}

interface QueuedAsset {
  uid: string;
  assetId: string;
  type: "compressor" | "dg";
  color: string;
  label: string;
  shortName: string;
  status: string;
  assetTag: string;
}

type AssetDetails = (CompressorAsset | DGAsset) & {
  assetCategory: "compressor" | "dg";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE = 60;
const STAGE_W = 1000;
const STAGE_H = 680;
const ICON_BOX = 52;

const WIND_PATH =
  "M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2m12.6 11.4A2 2 0 1 0 16 16H2";
const ZAP_PATH = "M13 2L3 14h9l-1 8 10-12h-9l1-8z";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

const getColor = (type: "compressor" | "dg", status: string) => {
  if (status === "maintenance") return "#f59e0b";
  if (status === "offline") return "#ef4444";
  return type === "compressor" ? "#3b82f6" : "#10b981";
};

const getShortName = (unitName: string, assetTag: string): string => {
  if (assetTag && assetTag.length >= 2) {
    return assetTag.replace(/[^A-Z0-9]/gi, "").substring(0, 4).toUpperCase();
  }
  return unitName.substring(0, 4).toUpperCase();
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "operational")
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
  if (status === "maintenance")
    return <Wrench className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
  return <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
};

// ─── Component ────────────────────────────────────────────────────────────────

const MapComp = () => {
  const [activeFloor, setActiveFloor] = useState("floor1");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [queuedAssets, setQueuedAssets] = useState<QueuedAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalAsset, setModalAsset] = useState<AssetDetails | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [assetScale, setAssetScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  const draggingQueueId = useRef<string | null>(null);
  const isDraggingAsset = useRef<boolean>(false);
  const stageRef = useRef<Konva.Stage>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Zoom helpers ─────────────────────────────────────────────────

  const ZOOM_STEP = 0.15;
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 3;
  const ASSET_SCALE_STEP = 0.25;
  const ASSET_SCALE_MIN = 0.5;
  const ASSET_SCALE_MAX = 3;

  const zoomIn = () =>
    setStageScale((s) => Math.min(+(s + ZOOM_STEP).toFixed(2), ZOOM_MAX));
  const zoomOut = () =>
    setStageScale((s) => Math.max(+(s - ZOOM_STEP).toFixed(2), ZOOM_MIN));
  const resetView = () => {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
    setAssetScale(1);
  };
  const assetSizeUp = () =>
    setAssetScale((s) => Math.min(+(s + ASSET_SCALE_STEP).toFixed(2), ASSET_SCALE_MAX));
  const assetSizeDown = () =>
    setAssetScale((s) => Math.max(+(s - ASSET_SCALE_STEP).toFixed(2), ASSET_SCALE_MIN));

  // ── Data ────────────────────────────────────────────────────────

  const floors = [
    { id: "floor1", name: "Floor 1 — Production" },
    { id: "floor2", name: "Floor 2 — Assembly" },
    { id: "floor3", name: "Floor 3 — Packing" },
  ];

  const allAssets: AssetDetails[] = [
    ...COMPRESSOR_ASSETS.map((a) => ({
      ...a,
      assetCategory: "compressor" as const,
    })),
    ...DG_ASSETS.map((a) => ({ ...a, assetCategory: "dg" as const })),
  ];

  const floorAssets = allAssets.filter((a) => {
    if (activeFloor === "floor1")
      return (
        a.location.includes("Block A") ||
        a.location.includes("Production") ||
        a.location.includes("Maintenance")
      );
    if (activeFloor === "floor2")
      return (
        a.location.includes("Block B") ||
        a.location.includes("Assembly") ||
        a.location.includes("Compressor Hall")
      );
    return (
      a.location.includes("Block C") ||
      a.location.includes("Packing") ||
      a.location.includes("Cooling")
    );
  });

  const usedAssetIds = new Set([
    ...placedAssets.map((p) => p.assetId),
    ...queuedAssets.map((q) => q.assetId),
  ]);

  const availableToAdd = floorAssets.filter(
    (a) =>
      !usedAssetIds.has(a.id) &&
      (dropdownSearch === "" ||
        a.unitName.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
        a.assetTag.toLowerCase().includes(dropdownSearch.toLowerCase()))
  );

  // ── Dropdown close on outside click ────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        setDropdownSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Add to queue ────────────────────────────────────────────────

  const addToQueue = (asset: AssetDetails) => {
    const q: QueuedAsset = {
      uid: `q-${asset.id}-${Date.now()}`,
      assetId: asset.id,
      type: asset.assetCategory,
      color: getColor(asset.assetCategory, asset.status),
      label: asset.unitName,
      shortName: getShortName(asset.unitName, asset.assetTag),
      status: asset.status,
      assetTag: asset.assetTag,
    };
    setQueuedAssets((prev) => [...prev, q]);
    setDropdownOpen(false);
    setDropdownSearch("");
  };

  const removeFromQueue = (uid: string) =>
    setQueuedAssets((prev) => prev.filter((q) => q.uid !== uid));

  // ── Remove placed — returns to queue ───────────────────────────

  const removePlaced = (id: string) => {
    const placed = placedAssets.find((p) => p.id === id);
    if (placed) {
      const src = allAssets.find((a) => a.id === placed.assetId);
      if (src) {
        setQueuedAssets((prev) => [
          ...prev,
          {
            uid: `q-${placed.assetId}-${Date.now()}`,
            assetId: placed.assetId,
            type: placed.type,
            color: placed.color,
            label: placed.label,
            shortName: placed.shortName,
            status: placed.status,
            assetTag: src.assetTag,
          },
        ]);
      }
    }
    setPlacedAssets((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ── Open modal ──────────────────────────────────────────────────

  const openModal = (assetId: string) => {
    const details = allAssets.find((a) => a.id === assetId);
    if (details) setModalAsset(details);
  };

  // ── Image upload ────────────────────────────────────────────────

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        setBgImage(img);
        setUploadedImageUrl(ev.target?.result as string);
        setStagePos({ x: 0, y: 0 });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ── Drag from sidebar → drop on stage ──────────────────────────

  const handleQueueDragStart = (uid: string) => {
    draggingQueueId.current = uid;
    setIsDragOverCanvas(true);
  };

  const handleStageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    const uid = draggingQueueId.current;
    draggingQueueId.current = null;
    if (!uid) return;

    const queued = queuedAssets.find((q) => q.uid === uid);
    if (!queued) return;

    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.container().getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const canvasX = rawX - stagePos.x;
    const canvasY = rawY - stagePos.y;
    const snappedX = snapToGrid(canvasX - ICON_BOX / 2);
    const snappedY = snapToGrid(canvasY - ICON_BOX / 2);

    const placed: PlacedAsset = {
      id: `p-${queued.assetId}-${Date.now()}`,
      assetId: queued.assetId,
      type: queued.type,
      x: snappedX,
      y: snappedY,
      color: queued.color,
      label: queued.label,
      shortName: queued.shortName,
      status: queued.status,
    };

    setPlacedAssets((prev) => [...prev, placed]);
    setQueuedAssets((prev) => prev.filter((q) => q.uid !== uid));
    setSelectedId(placed.id);
  };

  // ── Snap drag on Konva ──────────────────────────────────────────

  const handleAssetDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    isDraggingAsset.current = true;
    // Prevent drag from bubbling to the Stage so the canvas doesn't pan
    e.cancelBubble = true;
  };

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    isDraggingAsset.current = false;
    const x = snapToGrid(e.target.x());
    const y = snapToGrid(e.target.y());
    e.target.position({ x, y });
    setPlacedAssets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x, y } : p))
    );
  };

  // ── Grid lines ──────────────────────────────────────────────────

  const gridLines = () => {
    if (!showGrid) return null;
    const cols = Math.ceil(STAGE_W / GRID_SIZE) + 2;
    const rows = Math.ceil(STAGE_H / GRID_SIZE) + 2;
    const lines: React.ReactNode[] = [];
    for (let i = 0; i <= cols; i++)
      lines.push(
        <Line
          key={`v${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, STAGE_H]}
          stroke="#e2e8f0"
          strokeWidth={0.6}
          listening={false}
        />
      );
    for (let j = 0; j <= rows; j++)
      lines.push(
        <Line
          key={`h${j}`}
          points={[0, j * GRID_SIZE, STAGE_W, j * GRID_SIZE]}
          stroke="#e2e8f0"
          strokeWidth={0.6}
          listening={false}
        />
      );
    return lines;
  };

  const selectedPlaced = placedAssets.find((p) => p.id === selectedId);
  const selectedSrc = selectedPlaced
    ? allAssets.find((a) => a.id === selectedPlaced.assetId)
    : null;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden select-none">
      {/* ════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════ */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm flex-shrink-0 z-10">
        {/* Brand header */}
        <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-blue-700 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-white/90" />
            <h1 className="text-white font-bold text-sm tracking-tight">
              Factory Asset Map
            </h1>
          </div>
          <p className="text-blue-200 text-[11px] mt-0.5">
            Drag assets onto the floor plan
          </p>
        </div>

        {/* Floor selector */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Floor
          </p>
          <select
            value={activeFloor}
            onChange={(e) => {
              setActiveFloor(e.target.value);
              setQueuedAssets([]);
              setPlacedAssets([]);
              setSelectedId(null);
            }}
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Upload floor plan */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Floor Plan Image
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="img-upload"
          />
          <label
            htmlFor="img-upload"
            className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all text-sm text-slate-400 hover:text-blue-500"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            {uploadedImageUrl ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Plan loaded
              </span>
            ) : (
              "Upload image"
            )}
          </label>
        </div>

        {/* Add Asset dropdown */}
        <div
          className="px-4 py-3 border-b border-slate-100 flex-shrink-0"
          ref={dropdownRef}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Add Asset
          </p>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl transition-colors font-medium"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Select asset…
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2.5 border-b border-slate-100">
                  <input
                    autoFocus
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    placeholder="Search by name or tag…"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {availableToAdd.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-5">
                      {usedAssetIds.size > 0
                        ? "All floor assets added"
                        : "No assets for this floor"}
                    </p>
                  ) : (
                    availableToAdd.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => addToQueue(asset)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            asset.assetCategory === "compressor"
                              ? "bg-blue-100"
                              : "bg-emerald-100"
                          }`}
                        >
                          {asset.assetCategory === "compressor" ? (
                            <Wind className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {asset.unitName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {asset.assetTag}
                          </p>
                        </div>
                        <StatusBadge status={asset.status} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Queued assets — drag these onto map */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Pending Placement
            </p>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {queuedAssets.length}
            </span>
          </div>

          {queuedAssets.length === 0 ? (
            <div className="mt-6 text-center px-2">
              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <MapPin className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add an asset above, then drag it onto the map
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {queuedAssets.map((q) => (
                <div
                  key={q.uid}
                  draggable
                  onDragStart={() => handleQueueDragStart(q.uid)}
                  onDragEnd={() => {
                    // Clear state if dropped outside canvas (no drop event fired)
                    if (draggingQueueId.current !== null) {
                      draggingQueueId.current = null;
                      setIsDragOverCanvas(false);
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: q.color }}
                  >
                    {q.type === "compressor" ? (
                      <Wind className="w-4 h-4 text-white" />
                    ) : (
                      <Zap className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700">
                      {q.shortName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {q.label}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(q.uid)}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Placed assets list */}
        {placedAssets.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 max-h-44 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                On Map
              </p>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                {placedAssets.length}
              </span>
            </div>
            <div className="space-y-1">
              {placedAssets.map((p) => (
                <div
                  key={p.id}
                  onClick={() =>
                    setSelectedId((prev) => (prev === p.id ? null : p.id))
                  }
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedId === p.id
                      ? "bg-blue-50 border border-blue-300"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.type === "compressor" ? (
                      <Wind className="w-3 h-3 text-white" />
                    ) : (
                      <Zap className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="text-xs text-slate-600 flex-1 truncate font-semibold">
                    {p.shortName}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      p.status === "operational"
                        ? "bg-emerald-400"
                        : p.status === "maintenance"
                          ? "bg-amber-400"
                          : "bg-red-400"
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePlaced(p.id);
                    }}
                    className="p-0.5 hover:text-red-400 text-slate-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ════════════════════════════════════
          MAIN CANVAS AREA
      ════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-11 bg-white border-b border-slate-200 flex items-center px-4 gap-2.5 flex-shrink-0">
          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              showGrid
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : "bg-slate-100 text-slate-500 border-transparent hover:border-slate-200"
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Snap Grid
          </button>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Zoom</span>
            <button
              onClick={zoomOut}
              disabled={stageScale <= 0.3}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >−</button>
            <span className="text-[11px] font-mono text-slate-500 w-10 text-center">
              {Math.round(stageScale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={stageScale >= 3}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >+</button>
          </div>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          {/* Asset size controls */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Assets</span>
            <button
              onClick={assetSizeDown}
              disabled={assetScale <= 0.5}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Shrink assets"
            >−</button>
            <span className="text-[11px] font-mono text-slate-500 w-10 text-center">
              {Math.round(assetScale * 100)}%
            </span>
            <button
              onClick={assetSizeUp}
              disabled={assetScale >= 3}
              className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Grow assets"
            >+</button>
          </div>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          {/* Reset view */}
          <button
            onClick={resetView}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors border border-transparent hover:border-slate-200"
            title="Reset zoom, pan and asset size"
          >
            Reset
          </button>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-blue-400" />
              {placedAssets.filter((p) => p.type === "compressor").length}{" "}
              compressors
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              {placedAssets.filter((p) => p.type === "dg").length} DG sets
            </span>
          </div>
        </div>

        {/* Stage drop area */}
        <div
          className={`flex-1 overflow-hidden relative transition-all ${isDragOverCanvas ? "ring-2 ring-inset ring-blue-400" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverCanvas(true);
          }}
          onDragLeave={() => {
            // Only clear if we're truly leaving the canvas (not entering a child)
            setIsDragOverCanvas(false);
          }}
          onDrop={handleStageDrop}
          onTouchMove={(e) => {
            // Block native pinch-to-zoom; zoom is buttons only
            if (e.touches.length > 1) e.preventDefault();
          }}
        >
          <Stage
            ref={stageRef}
            width={STAGE_W}
            height={STAGE_H}
            x={stagePos.x}
            y={stagePos.y}
            scaleX={stageScale}
            scaleY={stageScale}
            draggable={!isDragOverCanvas && draggingQueueId.current === null && !isDraggingAsset.current}
            onDragEnd={(e) =>
              setStagePos({ x: e.target.x(), y: e.target.y() })
            }
            style={{ display: "block", background: "#f1f5f9", cursor: "default" }}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) setSelectedId(null);
            }}
          >
            <Layer>
              {/* Canvas background */}
              <Rect
                x={0} y={0}
                width={STAGE_W} height={STAGE_H}
                fill={bgImage ? "#fff" : "#f8fafc"}
                listening={false}
              />

              {/* Background image */}
              {bgImage && (
                <KonvaImage
                  image={bgImage}
                  width={STAGE_W}
                  height={STAGE_H}
                  opacity={0.82}
                  listening={false}
                />
              )}

              {/* Grid */}
              {gridLines()}

              {/* Placed assets */}
              {placedAssets.map((asset) => {
                const isSel = selectedId === asset.id;
                const isComp = asset.type === "compressor";
                const cx = ICON_BOX / 2;
                const cy = ICON_BOX / 2;

                return (
                  <Group
                    key={asset.id}
                    id={asset.id}
                    x={asset.x}
                    y={asset.y}
                    scaleX={assetScale}
                    scaleY={assetScale}
                    draggable
                    onDragStart={handleAssetDragStart}
                    onDragEnd={(e) => handleDragEnd(asset.id, e)}
                    onClick={() =>
                      setSelectedId((prev) =>
                        prev === asset.id ? null : asset.id
                      )
                    }
                    onDblClick={() => openModal(asset.assetId)}
                    onTap={() =>
                      setSelectedId((prev) =>
                        prev === asset.id ? null : asset.id
                      )
                    }
                  >
                    {/* Selection pulse ring */}
                    {isSel && (
                      <Rect
                        x={-7} y={-7}
                        width={ICON_BOX + 14}
                        height={ICON_BOX + 14}
                        cornerRadius={isComp ? 18 : ICON_BOX}
                        fill="rgba(59,130,246,0.12)"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dash={[5, 3]}
                        listening={false}
                      />
                    )}

                    {/* Main shape */}
                    {isComp ? (
                      <Rect
                        x={0} y={0}
                        width={ICON_BOX} height={ICON_BOX}
                        cornerRadius={12}
                        fill={asset.color}
                        shadowColor={
                          isSel ? "#3b82f6" : "rgba(0,0,0,0.2)"
                        }
                        shadowBlur={isSel ? 18 : 6}
                        shadowOffsetY={isSel ? 0 : 2}
                        stroke={
                          isSel ? "#1d4ed8" : "rgba(255,255,255,0.25)"
                        }
                        strokeWidth={isSel ? 2 : 1}
                      />
                    ) : (
                      <Circle
                        x={cx} y={cy}
                        radius={ICON_BOX / 2}
                        fill={asset.color}
                        shadowColor={
                          isSel ? "#10b981" : "rgba(0,0,0,0.2)"
                        }
                        shadowBlur={isSel ? 18 : 6}
                        shadowOffsetY={isSel ? 0 : 2}
                        stroke={
                          isSel ? "#065f46" : "rgba(255,255,255,0.25)"
                        }
                        strokeWidth={isSel ? 2 : 1}
                      />
                    )}

                    {/* Inner gloss */}
                    {isComp ? (
                      <Rect
                        x={5} y={5}
                        width={ICON_BOX - 10} height={ICON_BOX / 2 - 5}
                        cornerRadius={8}
                        fill="rgba(255,255,255,0.18)"
                        listening={false}
                      />
                    ) : (
                      <Circle
                        x={cx - 4} y={cy - 6}
                        radius={10}
                        fill="rgba(255,255,255,0.18)"
                        listening={false}
                      />
                    )}

                    {/* Icon */}
                    {isComp ? (
                      <Path
                        data={WIND_PATH}
                        stroke="white"
                        strokeWidth={1.7}
                        fill="transparent"
                        lineCap="round"
                        lineJoin="round"
                        x={cx - 14}
                        y={cy - 12}
                        scaleX={1.15}
                        scaleY={1.15}
                        listening={false}
                      />
                    ) : (
                      <Path
                        data={ZAP_PATH}
                        fill="white"
                        stroke="white"
                        strokeWidth={0.3}
                        lineCap="round"
                        lineJoin="round"
                        x={cx - 10}
                        y={cy - 12}
                        scaleX={0.95}
                        scaleY={0.95}
                        listening={false}
                      />
                    )}

                    {/* Short name */}
                    <Text
                      text={asset.shortName}
                      fontSize={8}
                      fontStyle="bold"
                      fill={isSel ? "#1d4ed8" : "#334155"}
                      y={ICON_BOX + 5}
                      width={ICON_BOX + 12}
                      offsetX={6}
                      align="center"
                      listening={false}
                    />

                    {/* Status dot */}
                    <Circle
                      x={ICON_BOX - 7} y={7}
                      radius={5}
                      fill={
                        asset.status === "operational"
                          ? "#22c55e"
                          : asset.status === "maintenance"
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                      stroke="white"
                      strokeWidth={1.5}
                      listening={false}
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>

          {/* Drop hint */}
          {queuedAssets.length > 0 && placedAssets.length === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`rounded-3xl px-10 py-8 text-center border-2 border-dashed transition-all ${
                  isDragOverCanvas
                    ? "border-blue-500 bg-blue-500/15"
                    : "border-blue-400/40 bg-blue-500/8"
                }`}
              >
                <MapPin className="w-12 h-12 text-blue-400/60 mx-auto mb-3" />
                <p className="text-blue-500/80 text-sm font-semibold">
                  Drag assets here to place them
                </p>
                <p className="text-blue-400/50 text-xs mt-1">
                  They'll snap to the grid automatically
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!bgImage &&
            placedAssets.length === 0 &&
            queuedAssets.length === 0 && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-200/80 rounded-3xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-slate-400 text-sm font-semibold">
                    Upload a floor plan
                  </p>
                  <p className="text-slate-300 text-xs mt-1">
                    or add assets to start placing them
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* Selected asset info bar */}
        {selectedPlaced && selectedSrc && (
          <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: selectedPlaced.color }}
            >
              {selectedPlaced.type === "compressor" ? (
                <Wind className="w-4 h-4 text-white" />
              ) : (
                <Zap className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {selectedSrc.unitName}
                </p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                    selectedPlaced.status === "operational"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedPlaced.status === "maintenance"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedPlaced.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedSrc.assetTag} · {selectedSrc.location} · Grid (
                {Math.round(selectedPlaced.x / GRID_SIZE)},{" "}
                {Math.round(selectedPlaced.y / GRID_SIZE)})
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => openModal(selectedPlaced.assetId)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors"
              >
                <Info className="w-3.5 h-3.5" /> Details
              </button>
              <button
                onClick={() => removePlaced(selectedPlaced.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ════════════════════════════════════
          DETAIL MODAL
      ════════════════════════════════════ */}
      {modalAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  modalAsset.assetCategory === "compressor"
                    ? "bg-blue-100"
                    : "bg-emerald-100"
                }`}
              >
                {modalAsset.assetCategory === "compressor" ? (
                  <Wind className="w-5 h-5 text-blue-600" />
                ) : (
                  <Zap className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-slate-800 truncate">
                  {modalAsset.unitName}
                </h2>
                <p className="text-xs text-slate-400">
                  {modalAsset.assetTag} · {modalAsset.location}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                  modalAsset.status === "operational"
                    ? "bg-emerald-100 text-emerald-700"
                    : modalAsset.status === "maintenance"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {modalAsset.status}
              </span>
              <button
                onClick={() => setModalAsset(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors ml-1"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {(
                  [
                    ["Asset Tag", modalAsset.assetTag],
                    ["Make / Model", `${modalAsset.make} ${modalAsset.model}`],
                    ["Serial Number", modalAsset.serialNumber],
                    ["Rating", modalAsset.kvaRating],
                    [
                      "Running Hours",
                      `${modalAsset.runningHours.toLocaleString()} hrs`,
                    ],
                    [
                      "Last Service",
                      new Date(modalAsset.lastServiceDate).toLocaleDateString(),
                    ],
                    [
                      "Next Service Due",
                      `${modalAsset.nextServiceDue.toLocaleString()} hrs`,
                    ],
                    [
                      "Installation Date",
                      new Date(
                        modalAsset.installationDate
                      ).toLocaleDateString(),
                    ],
                    [
                      "Warranty Expiry",
                      new Date(modalAsset.warrantyExpiry).toLocaleDateString(),
                    ],
                    [
                      "Voltage / Frequency",
                      `${modalAsset.ratedVoltage} / ${modalAsset.ratedFrequency}`,
                    ],
                    ["Rated Current", modalAsset.ratedCurrent],
                    ["Fuel Type", modalAsset.fuelType],
                    ["Assigned Engineer", modalAsset.assignedEngineer],
                    ["Location", modalAsset.location],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {label}
                    </p>
                    <p className="text-sm text-slate-700 font-medium">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Performance Metrics
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Efficiency", value: "94%", sub: "+2%" },
                    { label: "Load Factor", value: "78%", sub: "stable" },
                    { label: "Air Flow", value: "1250 CFM", sub: "" },
                    { label: "Pressure", value: "7.5 bar", sub: "" },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 mb-1">
                        {m.label}
                      </p>
                      <p className="text-base font-bold text-slate-800">
                        {m.value}
                      </p>
                      {m.sub && (
                        <p className="text-[10px] text-emerald-500">{m.sub}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComp;