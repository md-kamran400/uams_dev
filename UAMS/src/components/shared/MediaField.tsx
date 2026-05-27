import { useState, useRef } from 'react';
import { Camera, Video, Upload, X, Loader2, FileImage, Film } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { api, type ApiFileRef } from '../../lib/api';

interface MediaFieldProps {
  kind: 'photo' | 'video';
  fieldName: string;
  required?: boolean;
  value: string[];                              // array of file IDs
  onChange: (fileIds: string[]) => void;
  error?: string;
}

const PHOTO_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.7,
};

const VIDEO_MAX_BYTES = 50 * 1024 * 1024;       // 50 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaField({ kind, fieldName, required, value, onChange, error }: MediaFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Map<string, ApiFileRef>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const isPhoto = kind === 'photo';
  const accept = isPhoto ? 'image/*' : 'video/*';
  const captureAttr = isPhoto ? 'environment' : 'environment';

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    setCompressionInfo(null);

    try {
      const toUpload: File[] = [];
      const compressionResults: string[] = [];

      for (const file of Array.from(files)) {
        if (isPhoto && file.type.startsWith('image/')) {
          const originalSize = file.size;
          setUploadStatus(`Compressing ${file.name}…`);
          try {
            const compressed = await imageCompression(file, PHOTO_COMPRESSION_OPTIONS);
            const namedFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            toUpload.push(namedFile);
            const ratio = Math.round((1 - namedFile.size / originalSize) * 100);
            compressionResults.push(`${formatSize(originalSize)} → ${formatSize(namedFile.size)} (−${ratio}%)`);
          } catch (e) {
            console.warn('Image compression failed, uploading original:', e);
            toUpload.push(file);
            compressionResults.push(`${formatSize(originalSize)} (uncompressed)`);
          }
        } else if (!isPhoto && file.type.startsWith('video/')) {
          if (file.size > VIDEO_MAX_BYTES) {
            throw new Error(`${file.name} exceeds 50 MB. Please record at a lower quality.`);
          }
          setUploadStatus(`Uploading video (${formatSize(file.size)})…`);
          toUpload.push(file);
          compressionResults.push(`${formatSize(file.size)}`);
        } else {
          throw new Error(`${file.name} is not a valid ${isPhoto ? 'image' : 'video'} file.`);
        }
      }

      setUploadStatus('Uploading…');
      const uploaded = await api.files.upload(toUpload);
      const next = new Map(previews);
      for (const f of uploaded) next.set(f.id, f);
      setPreviews(next);
      onChange([...value, ...uploaded.map(f => f.id)]);

      // Show compression summary briefly
      if (compressionResults.length > 0) {
        setCompressionInfo(compressionResults.join(' · '));
        setTimeout(() => setCompressionInfo(null), 6000);
      }
    } catch (e: any) {
      setUploadError(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }

  function removeFile(fileId: string) {
    onChange(value.filter(id => id !== fileId));
    const next = new Map(previews);
    next.delete(fileId);
    setPreviews(next);
  }

  const Icon = isPhoto ? Camera : Video;
  const label = isPhoto ? 'Take Photo' : 'Record Video';
  const pickLabel = isPhoto ? 'Choose from Gallery' : 'Choose from Library';

  return (
    <div className="mb-6">
      <label className="block text-sm md:text-base font-semibold text-gray-800 mb-2">
        {fieldName} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Capture / pick buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
            ${error ? 'border-red-300' : 'border-gray-200 hover:border-blue-300 bg-white text-gray-700'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Icon size={18} className="text-blue-600" />
          {label}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-sm font-medium text-gray-700 hover:border-gray-400 transition-all
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload size={18} className="text-gray-500" />
          {pickLabel}
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture={captureAttr as 'environment'}
        multiple={isPhoto}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={isPhoto}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload status */}
      {uploading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
          <Loader2 size={12} className="animate-spin" />
          {uploadStatus ?? 'Processing…'}
        </div>
      )}
      {compressionInfo && !uploading && (
        <div className="mt-2 text-xs text-green-600 bg-green-50 rounded-lg px-2.5 py-1.5">
          ✓ {compressionInfo}
        </div>
      )}
      {uploadError && (
        <p className="mt-2 text-xs text-red-500">{uploadError}</p>
      )}

      {/* Previews */}
      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map(fileId => {
            const meta = previews.get(fileId);
            return (
              <div key={fileId} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 aspect-square">
                {isPhoto ? (
                  <img
                    src={api.files.url(fileId)}
                    alt={meta?.originalName ?? 'Photo'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2">
                    <Film size={28} />
                    <p className="text-[10px] mt-1 truncate w-full text-center">{meta?.originalName ?? 'Video'}</p>
                  </div>
                )}
                {/* File size chip */}
                {meta && (
                  <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                    {formatSize(meta.sizeBytes)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(fileId)}
                  className="absolute top-1 right-1 w-6 h-6 bg-white/95 hover:bg-red-50 hover:text-red-600 rounded-full flex items-center justify-center shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <X size={12} />
                </button>
                {isPhoto && !meta && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <FileImage size={20} className="text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
