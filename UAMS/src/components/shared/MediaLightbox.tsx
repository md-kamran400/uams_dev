import { useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';

interface MediaItem {
  fileId: string;
  kind: 'photo' | 'video';
  originalName?: string;
}

interface MediaLightboxProps {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function MediaLightbox({ items, index, onClose, onNext, onPrev }: MediaLightboxProps) {
  const item = items[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 text-white/80 z-10">
        <div className="text-sm">
          {items.length > 1 && <span className="mr-3 text-white/60">{index + 1} / {items.length}</span>}
          <span className="font-medium">{item.originalName ?? `Evidence ${index + 1}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={api.files.downloadUrl(item.fileId)}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download size={18} />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Prev/Next */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white"
            title="Previous (←)"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white"
            title="Next (→)"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Content */}
      <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {item.kind === 'photo' ? (
          <img
            src={api.files.url(item.fileId)}
            alt={item.originalName ?? 'Photo evidence'}
            className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
          />
        ) : (
          <video
            src={api.files.url(item.fileId)}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-md shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
