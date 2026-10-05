import React, { useState } from 'react';
import { Image as ImageIcon, X, Download, ZoomIn, Eye } from 'lucide-react';
import api from '../services/api';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const ComplaintImageGallery = ({ complaintId, images = [] }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!images || images.length === 0) {
    return null;
  }

  const getImageUrl = (img) => {
    const id = img.imageId || img._id;
    // Connect to secure image route via backend
    const baseURL = api.defaults.baseURL || '/api';
    return `${baseURL}/complaints/${complaintId}/images/${id}`;
  };

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center space-x-2">
        <ImageIcon size={15} className="text-brand" />
        <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
          Attached Images ({images.length})
        </h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img) => {
          const imgUrl = getImageUrl(img);
          return (
            <div
              key={img.imageId || img._id}
              onClick={() => setSelectedImage(img)}
              className="group relative rounded-lg border border-line bg-paper/60 overflow-hidden cursor-pointer hover:border-brand/40 hover:shadow-sm transition-all"
            >
              <div className="aspect-video w-full bg-line/20 flex items-center justify-center overflow-hidden">
                <img
                  src={imgUrl}
                  alt={img.originalName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                      <div class="flex flex-col items-center justify-center p-3 text-muted">
                        <span class="text-[10px] font-mono">Attachment</span>
                      </div>
                    `;
                  }}
                />
              </div>

              <div className="p-2 flex items-center justify-between text-[11px] font-mono border-t border-line/60">
                <span className="truncate max-w-[100px] text-ink font-medium" title={img.originalName}>
                  {img.originalName}
                </span>
                <span className="text-muted text-[10px]">
                  {formatFileSize(img.size)}
                </span>
              </div>

              <div className="absolute inset-0 bg-ink/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Eye size={18} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-paper rounded-lg border border-line shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-paper">
              <div className="flex items-center space-x-2 truncate">
                <ImageIcon size={15} className="text-brand" />
                <span className="text-xs font-mono font-medium text-ink truncate">
                  {selectedImage.originalName}
                </span>
                <span className="text-[11px] font-mono text-muted">
                  ({formatFileSize(selectedImage.size)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded text-muted hover:text-ink hover:bg-line/40 transition-colors"
                title="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-2 flex items-center justify-center bg-black/90 max-h-[75vh] overflow-auto">
              <img
                src={getImageUrl(selectedImage)}
                alt={selectedImage.originalName}
                className="max-h-[70vh] max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintImageGallery;
