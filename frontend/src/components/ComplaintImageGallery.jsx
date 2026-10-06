import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, X, ZoomIn, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const ComplaintImageGallery = ({ complaintId, images = [] }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [blobUrls, setBlobUrls] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const blobUrlsRef = useRef({});

  // Keep ref updated for cleanup
  useEffect(() => {
    blobUrlsRef.current = blobUrls;
  }, [blobUrls]);

  // Authenticated image retrieval via Axios blob stream
  useEffect(() => {
    if (!complaintId || !images || images.length === 0) {
      return;
    }

    let isMounted = true;

    images.forEach((img) => {
      const imgId = img.imageId || img._id;
      if (!imgId || blobUrlsRef.current[imgId]) return;

      setLoadingMap((prev) => ({ ...prev, [imgId]: true }));

      api
        .get(`/complaints/${complaintId}/images/${imgId}`, {
          responseType: 'blob',
        })
        .then((res) => {
          if (!isMounted) return;
          const url = URL.createObjectURL(res.data);
          setBlobUrls((prev) => ({ ...prev, [imgId]: url }));
          setLoadingMap((prev) => ({ ...prev, [imgId]: false }));
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error(`[ImageGallery] Failed to fetch image ${imgId}:`, err.message);
          setErrorMap((prev) => ({ ...prev, [imgId]: true }));
          setLoadingMap((prev) => ({ ...prev, [imgId]: false }));
        });
    });

    return () => {
      isMounted = false;
    };
  }, [complaintId, images]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Keyboard navigation for lightbox modal
  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      } else if (e.key === 'ArrowLeft' && selectedImageIndex > 0) {
        setSelectedImageIndex((idx) => idx - 1);
      } else if (e.key === 'ArrowRight' && selectedImageIndex < images.length - 1) {
        setSelectedImageIndex((idx) => idx + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, images.length]);

  if (!images || images.length === 0) {
    return null;
  }

  const selectedImage = selectedImageIndex !== null ? images[selectedImageIndex] : null;
  const selectedImageId = selectedImage ? selectedImage.imageId || selectedImage._id : null;
  const selectedBlobUrl = selectedImageId ? blobUrls[selectedImageId] : null;

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon size={14} className="text-brand shrink-0" />
          <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
            Attached Images ({images.length})
          </h4>
        </div>
        <span className="text-[11px] font-mono text-muted">Click to preview</span>
      </div>

      {/* Responsive Image Grid */}
      <div
        className={
          images.length === 1
            ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm'
            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
        }
      >
        {images.map((img, idx) => {
          const imgId = img.imageId || img._id;
          const url = blobUrls[imgId];
          const isLoading = loadingMap[imgId];
          const isError = errorMap[imgId];

          return (
            <div
              key={imgId}
              onClick={() => {
                if (url) setSelectedImageIndex(idx);
              }}
              className={`group relative rounded-xl border border-line bg-surface overflow-hidden transition-all duration-150 ${
                url ? 'cursor-pointer hover:border-brand/50 hover:shadow-sm' : 'cursor-default'
              }`}
            >
              <div className="aspect-video w-full bg-subtle/50 flex items-center justify-center overflow-hidden relative">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-1.5 p-3 text-muted">
                    <Loader2 size={16} className="animate-spin text-brand" />
                    <span className="text-[10px] font-mono">Loading...</span>
                  </div>
                ) : isError ? (
                  <div className="flex flex-col items-center justify-center space-y-1 p-3 text-muted">
                    <AlertCircle size={16} className="text-muted/60" />
                    <span className="text-[10px] font-mono text-center">Unavailable</span>
                  </div>
                ) : url ? (
                  <>
                    <img
                      src={url}
                      alt={img.originalName || 'Complaint attachment'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-ink/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                      <ZoomIn size={18} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-muted">
                    <ImageIcon size={16} className="text-muted/40" />
                  </div>
                )}
              </div>

              <div className="p-2 flex items-center justify-between text-[11px] font-mono border-t border-line/60 bg-surface">
                <span
                  className="truncate max-w-[110px] text-ink font-medium"
                  title={img.originalName}
                >
                  {img.originalName || 'image.png'}
                </span>
                <span className="text-muted text-[10px] shrink-0 ml-1">
                  {formatFileSize(img.size)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessible Lightbox Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview lightbox"
          className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-surface rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-surface">
              <div className="flex items-center space-x-2.5 min-w-0 pr-3">
                <div className="w-6 h-6 rounded bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <ImageIcon size={13} />
                </div>
                <div className="truncate">
                  <h5 className="text-xs font-mono font-medium text-ink truncate">
                    {selectedImage.originalName || 'Attached image'}
                  </h5>
                  <span className="text-[10px] font-mono text-muted">
                    {formatFileSize(selectedImage.size)}
                    {images.length > 1 && ` • ${selectedImageIndex + 1} of ${images.length}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-line/40 transition-colors"
                  title="Close preview (Esc)"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Lightbox Image Preview Body */}
            <div className="relative p-2 sm:p-4 flex items-center justify-center bg-black/95 min-h-[260px] max-h-[75vh] overflow-hidden">
              {selectedBlobUrl ? (
                <img
                  src={selectedBlobUrl}
                  alt={selectedImage.originalName || 'Complaint preview'}
                  className="max-h-[70vh] max-w-full object-contain rounded select-none"
                />
              ) : (
                <div className="text-white/60 text-xs font-mono flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin text-brand" />
                  <span>Loading full resolution...</span>
                </div>
              )}

              {/* Prev / Next Controls if multiple images */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled={selectedImageIndex === 0}
                    onClick={() => setSelectedImageIndex((i) => Math.max(0, i - 1))}
                    aria-label="Previous image"
                    className="absolute left-3 p-2 rounded-full bg-surface/20 hover:bg-surface/40 text-white disabled:opacity-20 disabled:pointer-events-none transition-all backdrop-blur-xs"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    disabled={selectedImageIndex === images.length - 1}
                    onClick={() => setSelectedImageIndex((i) => Math.min(images.length - 1, i + 1))}
                    aria-label="Next image"
                    className="absolute right-3 p-2 rounded-full bg-surface/20 hover:bg-surface/40 text-white disabled:opacity-20 disabled:pointer-events-none transition-all backdrop-blur-xs"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Footer */}
            <div className="px-4 py-2 border-t border-line/60 bg-subtle/30 flex items-center justify-between text-[11px] font-mono text-muted">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-line/40 text-ink">Esc</kbd> to close</span>
              {images.length > 1 && (
                <span>
                  Use arrow keys <kbd className="px-1 py-0.5 rounded bg-line/40 text-ink">←</kbd>{' '}
                  <kbd className="px-1 py-0.5 rounded bg-line/40 text-ink">→</kbd> to navigate
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintImageGallery;
