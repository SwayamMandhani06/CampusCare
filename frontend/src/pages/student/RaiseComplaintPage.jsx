import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import { CATEGORIES } from '../../utils/categoryIcons';
import { ArrowLeft, PlusCircle, AlertCircle, Upload, X, CopyCheck, ExternalLink } from 'lucide-react';

const PRIORITIES = [
  { value: 'LOW', label: 'Low — Minor issue, minimal impact', dotColor: 'var(--priority-low)' },
  { value: 'MEDIUM', label: 'Medium — Moderate inconvenience', dotColor: 'var(--priority-medium)' },
  { value: 'HIGH', label: 'High — Significant disruption to facilities', dotColor: 'var(--priority-high)' },
  { value: 'CRITICAL', label: 'Critical — Immediate hazard / urgent outage', dotColor: 'var(--priority-critical)' },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RaiseComplaintPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Electrical',
    location: '',
    priority: 'MEDIUM',
    description: '',
  });

  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Batch 3: Duplicate detection candidate state
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (apiError) setApiError('');
  };

  const handleImageChange = (e) => {
    setImageError('');
    const files = Array.from(e.target.files);

    if (images.length + files.length > MAX_IMAGES) {
      setImageError(`You can attach a maximum of ${MAX_IMAGES} images per complaint.`);
      return;
    }

    const validNewImages = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setImageError(`File "${file.name}" is not supported. Only JPEG, PNG, and WebP are allowed.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setImageError(`File "${file.name}" is too large (${formatSize(file.size)}). Max allowed is 5 MB.`);
        return;
      }

      validNewImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      });
    }

    setImages((prev) => [...prev, ...validNewImages]);
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Please enter a clear summary title';
    } else if (formData.title.length > 100) {
      errs.title = 'Title cannot exceed 100 characters';
    }
    if (!formData.location.trim()) {
      errs.location = 'Specify the building, room, or area (e.g. Block C, Room 204)';
    }
    if (!formData.description.trim()) {
      errs.description = 'Provide specific details regarding the breakdown or fault';
    }
    return errs;
  };

  const executeSubmission = async (duplicateOverride = null) => {
    setLoading(true);
    setApiError('');

    try {
      const payload = new FormData();
      payload.append('title', formData.title.trim());
      payload.append('category', formData.category);
      payload.append('location', formData.location.trim());
      payload.append('priority', formData.priority);
      payload.append('description', formData.description.trim());

      const dupId = duplicateOverride || selectedDuplicateOf;
      if (dupId) {
        payload.append('duplicateOf', dupId);
      }

      for (const img of images) {
        payload.append('images', img.file);
      }

      const res = await api.post('/complaints', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.complaint) {
        navigate(`/complaints/${res.data.complaint._id}`);
      }
    } catch (err) {
      console.error('[RaiseComplaint] Error:', err);
      setApiError(
        err.response?.data?.message ||
          'Failed to submit complaint. Please check fields and try again.'
      );
    } finally {
      setLoading(false);
      setShowDuplicateModal(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    // Pre-submission duplicate check
    try {
      const dupRes = await api.post('/complaints/check-duplicate', {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: formData.location.trim(),
      });

      if (dupRes.data && dupRes.data.duplicateDetected && dupRes.data.candidates.length > 0) {
        setDuplicateCandidates(dupRes.data.candidates);
        setShowDuplicateModal(true);
        setLoading(false);
        return; // Intercept for student decision
      }
    } catch (checkErr) {
      console.warn('[Duplicate Check] Non-blocking check failed:', checkErr.message);
    }

    // If no duplicate candidates found, proceed directly with submission
    await executeSubmission();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-xs font-mono text-muted hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft size={14} className="mr-1" />
        Back to Dashboard
      </Link>

      <Card className="p-6 sm:p-8 shadow-sm">
        <div className="mb-6 pb-4 border-b border-line">
          <div className="w-8 h-8 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-2">
            <PlusCircle size={18} />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            Raise a Complaint
          </h1>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Report infrastructure, equipment, or facility maintenance requests across campus.
          </p>
        </div>

        {apiError && (
          <div className="mb-6 p-3 rounded bg-priority-critical/10 border border-priority-critical/30 flex items-start space-x-2 text-xs text-priority-critical">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <Input
            label="Issue Summary Title"
            id="title"
            placeholder="e.g. Broken water tap leaking in Block B 2nd floor restroom"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="flex flex-col space-y-1.5 text-left">
              <label htmlFor="category" className="text-xs font-medium tracking-wide text-ink">
                Maintenance Category <span className="text-priority-critical">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-surface text-sm text-ink border border-line rounded-lg transition-all duration-150 cursor-pointer focus:border-brand focus-visible:outline-brand hover:border-line-strong"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name} className="bg-surface text-ink">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <Input
              label="Exact Location"
              id="location"
              placeholder="e.g. Block C, Room 204 or Library 1st Floor"
              value={formData.location}
              onChange={handleChange}
              error={errors.location}
              required
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col space-y-1.5 text-left">
            <label htmlFor="priority" className="text-xs font-medium tracking-wide text-ink">
              Urgency / Priority Level <span className="text-priority-critical">*</span>
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-surface text-sm text-ink border border-line rounded-lg transition-all duration-150 cursor-pointer focus:border-brand focus-visible:outline-brand hover:border-line-strong font-mono text-xs"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value} className="bg-surface text-ink">
                  [{p.value}] — {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Description */}
          <Textarea
            label="Detailed Description"
            id="description"
            rows={4}
            placeholder="Describe what is broken, how long it has been occurring, and any hazard or disruption it causes..."
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            required
          />

          {/* Image Attachments */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium tracking-wide text-ink">
                Attach Images (Optional, max 5, up to 5 MB each)
              </label>
              <span className="text-[10px] font-mono text-muted">
                {images.length}/5 attached
              </span>
            </div>

            {imageError && (
              <div className="p-2.5 rounded bg-priority-critical/10 text-priority-critical text-xs flex items-center space-x-1.5">
                <AlertCircle size={13} className="shrink-0" />
                <span>{imageError}</span>
              </div>
            )}

            {/* Upload Drop Zone / Picker */}
            {images.length < MAX_IMAGES && (
              <label className="flex flex-col items-center justify-center p-5 border border-dashed border-line rounded-xl bg-subtle/40 hover:bg-subtle transition-colors cursor-pointer group">
                <Upload size={20} className="text-muted group-hover:text-brand transition-colors mb-1.5" />
                <span className="text-xs font-medium text-ink">
                  Click to select photos from device
                </span>
                <span className="text-[10px] font-mono text-muted mt-0.5">
                  Supported: JPG, PNG, WebP (Max 5 MB each)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}

            {/* Selected Images Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl border border-line bg-surface overflow-hidden group shadow-2xs"
                  >
                    <div className="aspect-video w-full bg-subtle overflow-hidden flex items-center justify-center">
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-1.5 flex items-center justify-between text-[10px] font-mono">
                      <span className="truncate max-w-[85px] text-ink" title={img.name}>
                        {img.name}
                      </span>
                      <span className="text-muted">{formatSize(img.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-ink/70 hover:bg-priority-critical text-white transition-colors"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Submit Complaint
            </Button>
          </div>
        </form>
      </Card>

      {/* Duplicate Candidates Review Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-xl shadow-2xl max-w-xl w-full p-6 text-left max-h-[90vh] flex flex-col">
            <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-line">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <CopyCheck size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">Similar Complaints Detected</h3>
                <p className="text-xs text-muted">
                  We found active issues matching your location or keywords. You can review them to avoid duplicate submissions.
                </p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-3 flex-grow my-2 pr-1">
              {duplicateCandidates.map((c) => (
                <div
                  key={c.id || c._id}
                  className="p-3.5 bg-subtle/50 border border-line rounded-lg hover:border-brand/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 font-medium">
                      {Math.round(c.similarityScore * 100)}% Match
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-line/40 text-muted uppercase">
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-ink line-clamp-1">{c.title}</h4>
                  <p className="text-xs text-muted mt-1 font-mono text-[11px]">{c.location} • {c.category}</p>
                  <p className="text-xs text-muted/90 mt-1 italic">{c.matchReason}</p>
                  <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between">
                    <a
                      href={`/complaints/${c.id || c._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline inline-flex items-center space-x-1"
                    >
                      <span>View existing ticket</span>
                      <ExternalLink size={12} />
                    </a>
                    <button
                      type="button"
                      onClick={() => executeSubmission(c.id || c._id)}
                      className="text-xs font-mono px-2 py-1 bg-brand/10 hover:bg-brand/20 text-brand rounded transition-colors"
                    >
                      Link as Duplicate & Submit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
              <Button
                variant="secondary"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full sm:w-auto"
              >
                Go Back & Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => executeSubmission()}
                className="w-full sm:w-auto"
              >
                This is a Different Issue — Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RaiseComplaintPage;
