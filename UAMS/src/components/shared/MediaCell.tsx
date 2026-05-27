import { useState, useEffect } from 'react';
import { Film, FileImage } from 'lucide-react';
import { api } from '../../lib/api';
import MediaLightbox from './MediaLightbox';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaCellProps {
  kind: 'photo' | 'video';
  fileIds: string[];
  /** Optional original filenames keyed by fileId, surfaced in the lightbox header */
  names?: Record<string, string>;
}

export default function MediaCell({ kind, fileIds, names }: MediaCellProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [fileMeta, setFileMeta] = useState<Record<string, { sizeBytes: number; originalName: string }>>({});

  useEffect(() => {
    if (!fileIds || fileIds.length === 0) return;
    // Fetch metadata for each file to get size
    Promise.all(
      fileIds.map(id =>
        api.files.meta(id).then(m => ({ id, sizeBytes: m.sizeBytes, originalName: m.originalName })).catch(() => null)
      )
    ).then(results => {
      const map: Record<string, { sizeBytes: number; originalName: string }> = {};
      for (const r of results) {
        if (r) map[r.id] = { sizeBytes: r.sizeBytes, originalName: r.originalName };
      }
      setFileMeta(map);
    });
  }, [fileIds]);

  if (!fileIds || fileIds.length === 0) {
    return <span className="text-sm text-gray-300 italic">No {kind} uploaded</span>;
  }

  const items = fileIds.map(id => ({ fileId: id, kind, originalName: names?.[id] ?? fileMeta[id]?.originalName }));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {fileIds.map((id, i) => {
          const meta = fileMeta[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:ring-2 hover:ring-blue-400 transition-all"
              title={names?.[id] ?? meta?.originalName ?? `${kind} ${i + 1}`}
            >
              {kind === 'photo' ? (
                <img
                  src={api.files.url(id)}
                  alt={names?.[id] ?? `Photo ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                  <Film size={20} />
                  <span className="text-[9px] mt-0.5 font-medium">Video</span>
                </div>
              )}
              {meta && (
                <span className="absolute bottom-0.5 left-0.5 text-[8px] font-medium bg-black/60 text-white px-1 py-px rounded-full">
                  {formatSize(meta.sizeBytes)}
                </span>
              )}
              {kind === 'photo' && (
                <FileImage size={18} className="text-gray-300 absolute inset-0 m-auto pointer-events-none -z-10" />
              )}
            </button>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <MediaLightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNext={() => setLightboxIndex(i => (i === null ? 0 : (i + 1) % items.length))}
          onPrev={() => setLightboxIndex(i => (i === null ? 0 : (i - 1 + items.length) % items.length))}
        />
      )}
    </>
  );
}
