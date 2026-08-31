import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import StatusRail from '../../components/StatusRail';
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
  AlertCircle,
  Lock,
  MessageSquare,
} from 'lucide-react';

const PRIORITIES = [
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'CRITICAL', label: 'CRITICAL' },
];

const ComplaintDetailPage = () => {
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Mode State
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
      setEditError(
        err.response?.data?.message ||
          'Failed to update complaint. Edits are only permitted while status is PENDING.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-muted">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm">Retrieving ticket details...</span>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4 text-center">
        <Card className="p-10 border-priority-critical/30">
          <div className="w-10 h-10 rounded-full bg-priority-critical/10 text-priority-critical mx-auto flex items-center justify-center mb-3">
            <AlertCircle size={20} />
          </div>
          <h2 className="text-xl font-medium text-ink mb-2">Complaint Unavailable</h2>
          <p className="text-xs text-muted mb-6">{error || 'Complaint record was not found.'}</p>
          <Link to="/complaints">
            <Button variant="secondary" size="sm">
              <ArrowLeft size={14} className="mr-1" />
              Return to My Complaints
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isPending = complaint.status === 'PENDING';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
      {/* Back Link */}
      <Link
        to="/complaints"
        className="inline-flex items-center text-xs font-mono text-muted hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft size={14} className="mr-1" />
        Back to Complaints Registry
      </Link>

      {/* Main Grid: Details Left (2 cols), StatusRail Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Complaint Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 sm:p-8">
            {/* Header Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-line">
              <div className="flex items-center space-x-2.5">
                <span className="text-xs font-mono text-muted">
                  Ticket #{complaint._id.slice(-6).toUpperCase()}
                </span>
                <span className="text-line">•</span>
                <div className="flex items-center text-xs font-mono text-muted">
                  <Calendar size={12} className="mr-1" />
                  <span>{formatFullDateTime(complaint.createdAt)}</span>
                </div>
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

                <div className="pt-3 border-t border-line flex justify-end space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={saving}
                    disabled={saving}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Title & Category */}
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-muted mb-1.5">
                    {getCategoryIcon(complaint.category, 15)}
                    <span>{complaint.category}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-ink">
                    {complaint.title}
                  </h1>
                </div>

                {/* Location */}
                <div className="flex items-center text-xs text-muted font-mono bg-paper/60 p-2.5 rounded border border-line">
                  <MapPin size={14} className="mr-2 text-brand shrink-0" />
                  <span>{complaint.location}</span>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-2">
                    Issue Description
                  </h3>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-line bg-paper/30 p-4 rounded border border-line">
                    {complaint.description}
                  </p>
                </div>

                {/* Assigned Staff or Unassigned Notice */}
                <div className="pt-4 border-t border-line">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
                    Assigned Technician
                  </h3>
                  {complaint.assignedTo ? (
                    <div className="flex items-center space-x-3 p-3 rounded bg-paper/60 border border-line">
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
                    <div className="p-3 rounded bg-paper/40 border border-line/60 text-xs text-muted flex items-center space-x-2">
                      <User size={14} className="text-muted" />
                      <span>Pending staff dispatch by campus administration.</span>
                    </div>
                  )}
                </div>

                {/* Resolution Notes (if resolved) */}
                {complaint.resolutionNotes && (
                  <div className="pt-4 border-t border-line">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-status-resolved font-medium mb-2">
                      Technician Resolution Notes
                    </h3>
                    <div className="p-4 rounded bg-status-resolved/10 border border-status-resolved/30 text-xs text-ink leading-relaxed whitespace-pre-line">
                      {complaint.resolutionNotes}
                    </div>
                  </div>
                )}

                {/* Edit Action Bar */}
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
                        <Edit3 size={14} />
                        <span>Edit Issue</span>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2 text-xs text-muted bg-line/20 p-2.5 rounded w-full">
                      <Lock size={14} className="shrink-0 text-muted" />
                      <span>
                        This complaint is currently being processed by campus facilities and can no longer be edited.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Signature StatusRail Timeline */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-5 pb-3 border-b border-line">
              <span className="text-[11px] font-mono uppercase text-muted tracking-wider block">
                Live Resolution Timeline
              </span>
              <h2 className="text-base font-medium text-ink mt-0.5">
                Ticket Rail
              </h2>
            </div>

            {/* Signature StatusRail Component */}
            <StatusRail
              orientation="vertical"
              currentStatus={complaint.status}
              statusHistory={complaint.statusHistory}
            />

            <div className="mt-6 pt-4 border-t border-line text-left">
              <span className="text-[11px] font-mono text-muted block mb-1">
                Audit Timeline Guarantee
              </span>
              <p className="text-[11px] text-muted leading-relaxed">
                All status modifications and technician notes are permanently preserved in the CampusCare database.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
