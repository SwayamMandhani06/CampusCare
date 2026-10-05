import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import StatusRail from '../../components/StatusRail';
import ComplaintComments from '../../components/ComplaintComments';
import ComplaintImageGallery from '../../components/ComplaintImageGallery';
import ComplaintFeedback from '../../components/ComplaintFeedback';
import ActivityTimeline from '../../components/ActivityTimeline';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorState from '../../components/ErrorState';
import { CATEGORIES, getCategoryIcon } from '../../utils/categoryIcons';
import { formatFullDateTime } from '../../utils/formatDate';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Wrench,
  Edit3,
  Check,
  X,
  Lock,
  History,
} from 'lucide-react';

const PRIORITIES = [
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

const ComplaintDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Mode State (Student only, while PENDING)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    location: '',
    priority: '',
    description: '',
  });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchComplaint = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/complaints/${id}`);
      if (res.data && res.data.complaint) {
        setComplaint(res.data.complaint);
        setEditForm({
          title: res.data.complaint.title,
          category: res.data.complaint.category,
          location: res.data.complaint.location,
          priority: res.data.complaint.priority,
          description: res.data.complaint.description,
        });
      }
    } catch (err) {
      console.error('[ComplaintDetailPage] Error:', err);
      setError(
        err.response?.status === 403
          ? 'You are not authorized to view this complaint.'
          : err.response?.data?.message || 'Failed to load complaint details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.location.trim() || !editForm.description.trim()) {
      setEditError('Please fill out all required fields');
      return;
    }

    setSaving(true);
    setEditError('');

    try {
      const res = await api.put(`/complaints/${id}`, editForm);
      if (res.data && res.data.complaint) {
        setComplaint(res.data.complaint);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('[Edit Complaint] Error:', err);
      setEditError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <LoadingSpinner label="Loading ticket and resolution telemetry..." size={28} />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <ErrorState
          title="Complaint Unavailable"
          message={error || 'The requested complaint ticket does not exist or has been removed.'}
          onRetry={fetchComplaint}
        />
        <div className="mt-4 text-center">
          <Link to="/dashboard">
            <Button variant="secondary" size="sm">
              <ArrowLeft size={14} className="mr-1.5" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPending = complaint.status === 'PENDING';
  const isResolved = complaint.status === 'RESOLVED';
  const isOwner = user && complaint.createdBy && (
    (typeof complaint.createdBy === 'object' && complaint.createdBy._id === user._id) ||
    complaint.createdBy === user._id
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full text-left">
      {/* Breadcrumb / Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-3">
        <Link
          to="/complaints"
          className="inline-flex items-center text-xs font-mono text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} className="mr-1.5" />
          Back to Complaints
        </Link>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-muted">Ticket ID:</span>
          <span className="px-2 py-0.5 rounded bg-line/40 text-xs font-mono font-medium text-ink">
            #{complaint._id.slice(-8)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Main Details, Attachments, Comments, Feedback */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 sm:p-8">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-line gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded bg-brand/10 text-brand text-xs">
                    {getCategoryIcon(complaint.category)}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-muted font-medium">
                    {complaint.category}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-ink">
                  {complaint.title}
                </h1>
              </div>

              <div className="flex items-center space-x-2">
                <PriorityBadge priority={complaint.priority} />
                <StatusBadge status={complaint.status} />
              </div>
            </div>

            {/* Edit Mode vs Display Mode */}
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="mt-6 space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-sm font-mono uppercase tracking-wider text-ink font-medium">
                    Edit Complaint Details
                  </h3>
                  <span className="text-[11px] font-mono text-status-pending">
                    Allowed while PENDING
                  </span>
                </div>

                {editError && (
                  <div className="p-3 rounded bg-priority-critical/10 text-priority-critical text-xs">
                    {editError}
                  </div>
                )}

                <Input
                  label="Title"
                  id="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5 text-left">
                    <label className="text-xs font-medium text-ink">Category</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 bg-paper text-sm text-ink border border-line rounded"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5 text-left">
                    <label className="text-xs font-medium text-ink">Priority</label>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-paper text-sm text-ink border border-line rounded font-mono text-xs"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Location"
                  id="location"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  required
                />

                <Textarea
                  label="Description"
                  id="description"
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                />

                <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={saving} disabled={saving}>
                    <Check size={14} className="mr-1" />
                    Save Updates
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-muted">
                  <div className="flex items-center space-x-2">
                    <MapPin size={14} className="text-muted shrink-0" />
                    <span>Location: <strong className="text-ink font-sans">{complaint.location}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar size={14} className="text-muted shrink-0" />
                    <span>Reported: <strong className="text-ink">{formatFullDateTime(complaint.createdAt)}</strong></span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-1.5">
                    Issue Description
                  </h3>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-line bg-paper/60 p-4 rounded-lg border border-line">
                    {complaint.description}
                  </p>
                </div>

                {/* Attached Images */}
                {complaint.images && complaint.images.length > 0 && (
                  <div className="pt-4 border-t border-line">
                    <ComplaintImageGallery complaintId={complaint._id} images={complaint.images} />
                  </div>
                )}

                {/* Assigned Staff or Unassigned Notice */}
                <div className="pt-4 border-t border-line">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
                    Assigned Technician
                  </h3>
                  {complaint.assignedTo ? (
                    <div className="flex items-center space-x-3 p-3.5 rounded-lg bg-paper/60 border border-line">
                      <div className="w-8 h-8 rounded bg-status-assigned/10 text-status-assigned flex items-center justify-center shrink-0">
                        <Wrench size={16} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-ink block">
                          {complaint.assignedTo.name}
                        </span>
                        <span className="text-xs text-muted font-mono">
                          {complaint.assignedTo.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-paper/40 border border-line text-xs text-muted flex items-center space-x-2">
                      <User size={14} className="text-muted shrink-0" />
                      <span>Pending technician dispatch by campus administration.</span>
                    </div>
                  )}
                </div>

                {/* Resolution Notes (if resolved) */}
                {complaint.resolutionNotes && (
                  <div className="pt-4 border-t border-line">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-status-resolved font-medium mb-2">
                      Technician Resolution Notes
                    </h3>
                    <div className="p-4 rounded-lg bg-status-resolved/10 border border-status-resolved/30 text-xs text-ink leading-relaxed whitespace-pre-line">
                      {complaint.resolutionNotes}
                    </div>
                  </div>
                )}

                {/* Edit Action Bar for Pending Complaints */}
                <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {isPending ? (
                    <>
                      <span className="text-xs text-muted">
                        Need to adjust details? You can edit this issue while it is pending.
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="shrink-0"
                      >
                        <Edit3 size={14} className="mr-1" />
                        <span>Edit Issue</span>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2 text-xs text-muted bg-line/20 p-2.5 rounded w-full">
                      <Lock size={14} className="shrink-0 text-muted" />
                      <span>
                        This complaint is being processed by campus facilities and can no longer be edited.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Resolution Rating / Feedback Section (Active when resolved) */}
          {isResolved && (
            <Card className="p-6">
              <ComplaintFeedback
                complaintId={complaint._id}
                existingFeedback={complaint.feedback}
                isOwner={isOwner}
                onFeedbackSubmitted={(newFb) => {
                  setComplaint((prev) => ({ ...prev, feedback: newFb }));
                }}
              />
            </Card>
          )}

          {/* Discussion Thread */}
          <Card className="p-6">
            <ComplaintComments complaintId={complaint._id} />
          </Card>
        </div>

        {/* Right Column: StatusRail & Comprehensive Activity History */}
        <div className="space-y-6">
          {/* Status Progression Rail */}
          <Card className="p-6">
            <div className="mb-5 pb-3 border-b border-line">
              <span className="text-[11px] font-mono uppercase text-muted tracking-wider block">
                Live Resolution Rail
              </span>
              <h2 className="text-base font-medium text-ink mt-0.5">
                Lifecycle Progression
              </h2>
            </div>

            <StatusRail
              orientation="vertical"
              currentStatus={complaint.status}
              statusHistory={complaint.statusHistory}
            />
          </Card>

          {/* Detailed Activity History Timeline */}
          <Card className="p-6">
            <div className="mb-4 pb-3 border-b border-line flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-muted tracking-wider block">
                  Audit Trail
                </span>
                <h3 className="text-sm font-medium text-ink mt-0.5">
                  Activity History
                </h3>
              </div>
              <History size={16} className="text-brand" />
            </div>

            <ActivityTimeline timeline={complaint.activityTimeline} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
