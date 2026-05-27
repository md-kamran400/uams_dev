import { motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
} from "lucide-react";
import Badge from "../../../../ui/Badge";
import type { CompressorAsset } from "../../../../../data/compressorAssets";

const STATUS_BADGE: Record<
  CompressorAsset["status"],
  { variant: "success" | "warning" | "error"; label: string }
> = {
  operational: { variant: "success", label: "Operational" },
  maintenance: { variant: "warning", label: "Maintenance" },
  offline: { variant: "error", label: "Offline" },
};

const pageVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function CompressorAssetDetail({
  asset,
  onBack,
}: {
  asset: CompressorAsset;
  onBack: () => void;
}) {
  const status = STATUS_BADGE[asset.status];

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-0"
    >
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft size={15} />
            Back to Compressor Assets
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-800 font-semibold">
            {asset.assetTag}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">
                {asset.unitName}
              </h2>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              {asset.make} {asset.model} · {asset.kvaRating} · {asset.location}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Asset Tag</p>
            <p className="text-lg font-bold font-mono text-blue-700">
              {asset.assetTag}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Technical Details
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Voltage: {asset.ratedVoltage} · Frequency:{" "}
                {asset.ratedFrequency} · Current: {asset.ratedCurrent}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Service Status
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Last Service: {asset.lastServiceDate} · Next Due:{" "}
                {asset.nextServiceDue} h
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Assignment
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Engineer: {asset.assignedEngineer}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Warranty
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Expires on {asset.warrantyExpiry}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
