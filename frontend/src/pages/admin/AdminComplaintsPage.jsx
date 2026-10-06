import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import SlaBadge from '../../components/SlaBadge';
import StatusRail from '../../components/StatusRail';
import ComplaintComments from '../../components/ComplaintComments';
import ComplaintImageGallery from '../../components/ComplaintImageGallery';
import ComplaintFeedback from '../../components/ComplaintFeedback';
import ActivityTimeline from '../../components/ActivityTimeline';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { CATEGORIES, getCategoryIcon } from '../../utils/categoryIcons';
import { formatRelativeDate, formatFullDateTime, formatSlaTimeRemaining } from '../../utils/formatDate';
import { getSocket } from '../../services/socket';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  X,
  MapPin,
  Wrench,
  AlertCircle,
  Shield,
  RotateCcw,
  Download,
  History,
  Clock,
  Flame,
  Zap,
  Sparkles,
  CopyCheck,
  Bot,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const SLA_STATUS_OPTIONS = [
  { value: '', label: 'All SLA Statuses' },
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'BREACHED', label: 'Breached' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const ESCALATED_OPTIONS = [
  { value: '', label: 'All Tickets' },
  { value: 'true', label: 'Escalated Only' },
];

const PRIORITY_SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'AUTOMATIC', label: 'Automatic' },
  { value: 'MANUAL', label: 'Manual' },
];

const AdminComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Advanced Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [slaStatus, setSlaStatus] = useState('');
  const [escalated, setEscalated] = useState('');
  const [prioritySource, setPrioritySource] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Complaint for Drawer / Detail Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [overridePriority, setOverridePriority] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Batch 3: Staff Recommendations & AI Reclassification
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Real-Time Socket.IO Operational Listener
  useEffect(() => {
    const client = getSocket();
    const handleUpdate = (payload) => {
      if (payload && payload.complaint) {
        setComplaints((prev) =>
          prev.map((c) => (c._id === payload.complaint._id ? payload.complaint : c))
        );
        setSelectedComplaint((prev) =>
          prev && prev._id === payload.complaint._id ? payload.complaint : prev
        );
      }
    };

    client.on('operational_complaint_updated', handleUpdate);
    return () => {
      client.off('operational_complaint_updated', handleUpdate);
    };
  }, []);

  // Fetch staff recommendations when drawer opens
  useEffect(() => {
    if (selectedComplaint && selectedComplaint._id) {
      fetchRecommendations(selectedComplaint._id);
    } else {
      setRecommendations([]);
    }
  }, [selectedComplaint?._id]);

  const fetchRecommendations = async (complaintId) => {
    setLoadingRecommendations(true);
    try {
      const res = await api.get(`/admin/complaints/${complaintId}/staff-recommendations`);
      if (res.data && res.data.recommendations) {
        setRecommendations(res.data.recommendations);
      }
    } catch (err) {
      console.warn('[Staff Recommendations] Failed to load:', err.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAssignStaffDirect = async (staffId) => {
    setSelectedStaffId(staffId);
    setActionLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.put(`/admin/complaints/${selectedComplaint._id}/assign`, {
        staffId,
      });
      if (res.data && res.data.complaint) {
        setSelectedComplaint(res.data.complaint);
        setSelectedStatus(res.data.complaint.status);
        setActionSuccess(`Assigned successfully to ${res.data.complaint.assignedTo?.name}`);
        fetchComplaints(pagination.page);
      }
    } catch (err) {
      console.error('[AssignStaffDirect] Error:', err);
      setActionError(err.response?.data?.message || 'Failed to assign staff member.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReclassifyComplaint = async () => {
    if (!selectedComplaint) return;
    setActionLoading(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post(`/admin/complaints/${selectedComplaint._id}/reclassify`);
      if (res.data && res.data.complaint) {
        setSelectedComplaint(res.data.complaint);
        setActionSuccess(res.data.message || 'Issue reclassified via AI.');
        fetchComplaints(pagination.page);
      }
    } catch (err) {
      console.error('[Reclassify] Error:', err);
      setActionError(err.response?.data?.message || 'Failed to reclassify issue.');
    } finally {
      setActionLoading(false);
    }
  };

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Staff users for assignment & filter dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/admin/users?role=staff');
        if (res.data && res.data.users) {
          setStaffUsers(res.data.users);
        }
      } catch (err) {
        console.error('[AdminComplaints] Error fetching staff:', err);
      }
    };
    fetchStaff();
  }, []);

  // Fetch Complaints with pagination & filters
  const fetchComplaints = async (page = pagination.page) => {
    setLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (category) params.category = category;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (slaStatus) params.slaStatus = slaStatus;
      if (escalated) params.escalated = escalated;
      if (prioritySource) params.prioritySource = prioritySource;
      if (assignedStaff) params.assignedStaff = assignedStaff;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/admin/complaints', { params });
      if (res.data && res.data.complaints) {
        setComplaints(res.data.complaints);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('[AdminComplaints] Error loading complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [debouncedSearch, category, status, priority, slaStatus, escalated, prioritySource, assignedStaff, startDate, endDate, pagination.page]);

  // CSV Export
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (category) params.category = category;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (slaStatus) params.slaStatus = slaStatus;
      if (escalated) params.escalated = escalated;
      if (prioritySource) params.prioritySource = prioritySource;
      if (assignedStaff) params.assignedStaff = assignedStaff;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/admin/complaints/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campuscare-admin-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export CSV] Error:', err);
      alert('Failed to export complaints CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPriority('');
    setSlaStatus('');
    setEscalated('');
    setPrioritySource('');
    setAssignedStaff('');
    setStartDate('');
    setEndDate('');
  };

  // Open detail modal and synchronize form states
  const openComplaintDrawer = (complaint) => {
    setSelectedComplaint(complaint);
    setSelectedStaffId(complaint.assignedTo?._id || '');
    setSelectedStatus(complaint.status);
    setOverridePriority(complaint.priority || 'MEDIUM');
    setOverrideReason('');
    setActionSuccess('');
    setActionError('');
  };

  const closeComplaintDrawer = () => {
    setSelectedComplaint(null);
    setActionSuccess('');
    setActionError('');
  };

  // Admin Action: Manual Priority Override
  const handleOverridePriority = async () => {
    if (!overridePriority) {
      setActionError('Please select a priority.');
      return;
    }
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      setActionError('A valid operational reason of at least 5 characters is required for manual priority override.');
      return;
    }

    setActionLoading(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.put(`/admin/complaints/${selectedComplaint._id}/priority`, {
        priority: overridePriority,
        reason: overrideReason.trim(),
      });

      if (res.data && res.data.complaint) {
        setSelectedComplaint(res.data.complaint);
        setActionSuccess(`Priority overridden to ${res.data.complaint.priority} (Source: MANUAL). Reason logged.`);
        fetchComplaints(pagination.page);
      }
    } catch (err) {
      console.error('[OverridePriority] Error:', err);
      setActionError(err.response?.data?.message || 'Failed to override priority.');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Action: Assign Staff
  const handleAssignStaff = async () => {
    if (!selectedStaffId) {
      setActionError('Please select a staff member to assign.');
      return;
    }

    setActionLoading(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.put(`/admin/complaints/${selectedComplaint._id}/assign`, {
        staffId: selectedStaffId,
      });

      if (res.data && res.data.complaint) {
        setSelectedComplaint(res.data.complaint);
        setSelectedStatus(res.data.complaint.status);
        setActionSuccess(`Assigned successfully to ${res.data.complaint.assignedTo?.name}`);
        fetchComplaints(pagination.page);
      }
    } catch (err) {
      console.error('[AssignStaff] Error:', err);
      setActionError(err.response?.data?.message || 'Failed to assign staff member.');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Action: Change Status Override
  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === selectedComplaint.status) return;

    setActionLoading(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.put(`/admin/complaints/${selectedComplaint._id}/status`, {
        status: newStatus,
        notes: `Status set to ${newStatus} by admin override`,
      });

      if (res.data && res.data.complaint) {
        setSelectedComplaint(res.data.complaint);
        setSelectedStatus(res.data.complaint.status);
        setActionSuccess(`Status updated to ${newStatus}`);
        fetchComplaints(pagination.page);
      }
    } catch (err) {
      console.error('[StatusChange] Error:', err);
      setActionError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };


  const hasActiveFilters = Boolean(
    search || category || status || priority || slaStatus || escalated || prioritySource || assignedStaff || startDate || endDate
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-muted tracking-wider">
            Administrative Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            Complaint Management
          </h1>
          <p className="text-xs text-muted mt-1">
            Complete database of campus issues with triage, staff assignment, SLA tracking, and status controls.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || complaints.length === 0}
            className="text-xs font-mono"
            title="Export filtered records to CSV"
          >
            <Download size={13} className="mr-1.5" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
          <span className="text-xs font-mono text-muted">
            Total: <strong className="text-ink font-medium">{pagination.total}</strong> tickets
          </span>
        </div>
      </div>

      {/* Advanced Filters Toolbar */}
      <div className="my-6 p-4 bg-paper border border-line rounded-lg space-y-3">
        {/* Row 1: Search & Category & Status */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-6 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by title, location or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand"
            />
          </div>

          {/* Category */}
          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="md:col-span-3">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Priority, Staff, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2 border-t border-line/60 items-center">
          {/* Priority */}
          <div className="md:col-span-3">
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Staff */}
          <div className="md:col-span-3">
            <select
              value={assignedStaff}
              onChange={(e) => {
                setAssignedStaff(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand"
            >
              <option value="">All Staff</option>
              <option value="unassigned">-- Unassigned Tickets --</option>
              {staffUsers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="md:col-span-6 flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-1/2 px-2.5 py-1.5 bg-paper text-xs text-ink border border-line rounded font-mono"
              title="Start date"
            />
            <span className="text-muted text-xs font-mono">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-1/2 px-2.5 py-1.5 bg-paper text-xs text-ink border border-line rounded font-mono"
              title="End date"
            />
          </div>
        </div>

        {/* Row 3: SLA Status, Priority Source, Escalation, Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2 border-t border-line/60 items-center">
          {/* SLA Status Filter */}
          <div className="md:col-span-3">
            <select
              value={slaStatus}
              onChange={(e) => {
                setSlaStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {SLA_STATUS_OPTIONS.map((sla) => (
                <option key={sla.value} value={sla.value}>
                  {sla.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Source Filter */}
          <div className="md:col-span-3">
            <select
              value={prioritySource}
              onChange={(e) => {
                setPrioritySource(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {PRIORITY_SOURCE_OPTIONS.map((src) => (
                <option key={src.value} value={src.value}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>

          {/* Escalation Filter */}
          <div className="md:col-span-3">
            <select
              value={escalated}
              onChange={(e) => {
                setEscalated(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {ESCALATED_OPTIONS.map((esc) => (
                <option key={esc.value} value={esc.value}>
                  {esc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-3 flex justify-end">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs font-mono text-muted hover:text-ink w-full md:w-auto"
              >
                <RotateCcw size={12} className="mr-1" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dense Administrative Table */}
      <div className="border border-line rounded-lg bg-paper overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-line/20 text-muted font-mono uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-medium">Ticket ID</th>
                <th className="py-3 px-4 font-medium">Title & Location</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Priority</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">SLA State</th>
                <th className="py-3 px-4 font-medium">Assigned Staff</th>
                <th className="py-3 px-4 font-medium">Created</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    <LoadingSpinner label="Loading complaint registry..." size={20} />
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10">
                    <EmptyState
                      title="No Complaints Found"
                      message={
                        hasActiveFilters
                          ? 'No tickets match the selected search, status, SLA, staff, or date criteria.'
                          : 'No complaints registered in the system yet.'
                      }
                      action={
                        hasActiveFilters && (
                          <Button variant="secondary" size="sm" onClick={handleResetFilters} className="text-xs">
                            <RotateCcw size={12} className="mr-1" />
                            Clear Filters
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                complaints.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => openComplaintDrawer(item)}
                    className="hover:bg-line/20 transition-colors cursor-pointer group"
                  >
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono text-muted whitespace-nowrap">
                      #{item._id.slice(-6).toUpperCase()}
                    </td>

                    {/* Title & Location */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                      <span className="font-medium text-ink group-hover:text-brand transition-colors block truncate">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-muted flex items-center mt-0.5 truncate">
                        <MapPin size={11} className="mr-1 shrink-0" />
                        {item.location}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 font-mono text-muted text-[11px]">
                        {getCategoryIcon(item.category, 14)}
                        <span>{item.category}</span>
                      </div>
                    </td>

                    {/* Priority & Source */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <PriorityBadge priority={item.priority} />
                          <span
                            className={`px-1 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider ${
                              item.prioritySource === 'MANUAL'
                                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                : 'bg-line/60 text-muted'
                            }`}
                            title={`Priority Source: ${item.prioritySource || 'AUTOMATIC'}`}
                          >
                            {item.prioritySource === 'MANUAL' ? 'Manual' : 'Auto'}
                          </span>
                        </div>
                        {item.priorityReason && (
                          <span
                            className="text-[10px] text-muted truncate max-w-[140px] font-sans"
                            title={item.priorityReason}
                          >
                            {item.priorityReason}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* SLA State */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SlaBadge
                        status={item.sla?.status || 'ON_TRACK'}
                        escalated={item.sla?.escalated}
                        escalationLevel={item.sla?.escalationLevel}
                        timeRemaining={
                          item.status === 'RESOLVED'
                            ? 'Resolved'
                            : formatSlaTimeRemaining(item.sla?.resolutionDeadline)
                        }
                      />
                    </td>

                    {/* Assigned Staff */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.assignedTo ? (
                        <div className="flex items-center space-x-1.5 text-ink font-medium">
                          <Wrench size={13} className="text-status-assigned shrink-0" />
                          <span className="truncate max-w-[120px]">{item.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-line/50 text-muted">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono text-muted text-[11px] whitespace-nowrap">
                      {formatRelativeDate(item.createdAt)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="text-xs font-mono text-brand group-hover:underline">
                        Manage →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-line bg-paper/60 flex items-center justify-between text-xs font-mono text-muted">
          <div>
            Showing Page <strong className="text-ink">{pagination.page}</strong> of{' '}
            <strong className="text-ink">{pagination.pages || 1}</strong>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="px-2 py-1 h-8 text-xs font-mono"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="px-2 py-1 h-8 text-xs font-mono"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Admin Action Drawer / Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-paper h-full shadow-2xl border-l border-line flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 border-b border-line flex items-center justify-between sticky top-0 bg-paper z-10">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-muted uppercase">
                  Ticket #{selectedComplaint._id.slice(-6).toUpperCase()}
                </span>
                <span className="text-line">•</span>
                <StatusBadge status={selectedComplaint.status} />
              </div>
              <button
                onClick={closeComplaintDrawer}
                className="p-1 rounded text-muted hover:text-ink focus-visible:outline-brand"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inline Notifications */}
            {actionSuccess && (
              <div className="mx-6 mt-4 p-3 rounded bg-status-resolved/10 border border-status-resolved/30 text-xs text-status-resolved flex items-center space-x-2 font-mono">
                <CheckCircle size={15} />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="mx-6 mt-4 p-3 rounded bg-priority-critical/10 border border-priority-critical/30 text-xs text-priority-critical flex items-center space-x-2 font-mono">
                <AlertCircle size={15} />
                <span>{actionError}</span>
              </div>
            )}

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-left">
              {/* Title & Info */}
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-muted mb-1">
                  {getCategoryIcon(selectedComplaint.category, 14)}
                  <span>{selectedComplaint.category}</span>
                  <span>•</span>
                  <span>Priority: {selectedComplaint.priority}</span>
                </div>
                <h2 className="text-xl font-medium tracking-tight text-ink">
                  {selectedComplaint.title}
                </h2>
                <div className="flex items-center text-xs text-muted mt-2 font-mono">
                  <MapPin size={13} className="mr-1.5 text-brand shrink-0" />
                  <span>{selectedComplaint.location}</span>
                </div>
              </div>

              {/* Submitter Details */}
              <div className="p-3.5 bg-paper/60 border border-line rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-mono uppercase text-[10px]">Logged By</span>
                  <span className="font-mono text-muted text-[11px]">
                    {formatFullDateTime(selectedComplaint.createdAt)}
                  </span>
                </div>
                <div className="font-medium text-ink">
                  {selectedComplaint.createdBy?.name} ({selectedComplaint.createdBy?.email})
                </div>
                {selectedComplaint.createdBy?.studentId && (
                  <div className="text-muted font-mono text-[11px]">
                    PRN: {selectedComplaint.createdBy?.studentId}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-1.5">
                  Detailed Complaint
                </h3>
                <p className="text-xs text-ink leading-relaxed p-3.5 rounded-lg bg-paper/40 border border-line whitespace-pre-line">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Attached Images */}
              {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                <div className="pt-2">
                  <ComplaintImageGallery
                    complaintId={selectedComplaint._id}
                    images={selectedComplaint.images}
                  />
                </div>
              )}

              {/* Batch 3: Potential Duplicate Warning */}
              {selectedComplaint.duplicateDetected && (
                <div className="p-3.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-start space-x-2.5 text-xs text-amber-600">
                  <CopyCheck size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-ink block">Potential Duplicate Ticket Detected</span>
                    <p className="text-[11px] text-muted mt-0.5">
                      {selectedComplaint.duplicateMatchReason || 'Identified by lexical & location similarity engine'}
                    </p>
                    {selectedComplaint.duplicateOf && (
                      <span className="text-[11px] font-mono text-brand mt-1 block">
                        Linked Parent Ticket: #{selectedComplaint.duplicateOf.toString().slice(-6).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Batch 3: AI-Assisted Classification Telemetry */}
              <div className="p-3.5 bg-paper/60 border border-line rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-muted font-mono text-[11px] uppercase">
                    <Sparkles size={12} className="text-brand" />
                    <span>Classification Engine</span>
                  </div>
                  <div className="font-medium text-ink flex items-center space-x-2">
                    <span>Source: {selectedComplaint.classificationSource || 'RULE_BASED'}</span>
                    {selectedComplaint.classificationConfidence && (
                      <span className="text-muted font-mono text-[11px]">
                        ({Math.round(selectedComplaint.classificationConfidence * 100)}% confidence)
                      </span>
                    )}
                  </div>
                  {selectedComplaint.classificationKeywords && selectedComplaint.classificationKeywords.length > 0 && (
                    <div className="flex items-center space-x-1 flex-wrap gap-1 mt-1">
                      {selectedComplaint.classificationKeywords.map((kw, i) => (
                        <span key={i} className="px-1.5 py-0.2 rounded bg-line/30 text-muted font-mono text-[10px]">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReclassifyComplaint}
                  disabled={actionLoading}
                  className="text-xs font-mono shrink-0"
                >
                  <Bot size={13} className="mr-1 text-brand" />
                  <span>Reclassify via AI</span>
                </Button>
              </div>

              {/* SLA Telemetry & Operational Health Panel */}
              <div className="p-4 border border-line rounded-lg bg-paper/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Clock size={14} className="text-brand" />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
                      Service Level Agreement (SLA)
                    </h3>
                  </div>
                  <SlaBadge
                    status={selectedComplaint.sla?.status || 'ON_TRACK'}
                    escalated={selectedComplaint.sla?.escalated}
                    escalationLevel={selectedComplaint.sla?.escalationLevel}
                    timeRemaining={
                      selectedComplaint.status === 'RESOLVED'
                        ? 'Resolved'
                        : formatSlaTimeRemaining(selectedComplaint.sla?.resolutionDeadline)
                    }
                  />
                </div>

                {selectedComplaint.sla?.escalated && (
                  <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center space-x-2 font-mono">
                    <Flame size={14} className="shrink-0 animate-pulse" />
                    <span>
                      Escalated to Level {selectedComplaint.sla.escalationLevel || 1}
                      {selectedComplaint.sla.escalatedAt ? ` on ${formatFullDateTime(selectedComplaint.sla.escalatedAt)}` : ''}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Response SLA */}
                  <div className="p-2.5 rounded bg-line/20 border border-line/40 space-y-1">
                    <span className="text-[10px] text-muted uppercase block">Response Target & Deadline</span>
                    <div className="text-ink font-medium">
                      Target: {selectedComplaint.sla?.responseTargetMinutes ? `${selectedComplaint.sla.responseTargetMinutes / 60}h` : '—'}
                    </div>
                    <div className="text-[11px] text-muted">
                      Deadline: {formatFullDateTime(selectedComplaint.sla?.responseDeadline) || '—'}
                    </div>
                    <div className="text-[11px]">
                      {selectedComplaint.sla?.responseAt ? (
                        <span className="text-status-resolved">
                          ✓ Responded: {formatFullDateTime(selectedComplaint.sla.responseAt)}
                        </span>
                      ) : selectedComplaint.sla?.responseBreached ? (
                        <span className="text-priority-critical">⚠ Response SLA Breached</span>
                      ) : (
                        <span className="text-muted">Awaiting first response action</span>
                      )}
                    </div>
                  </div>

                  {/* Resolution SLA */}
                  <div className="p-2.5 rounded bg-line/20 border border-line/40 space-y-1">
                    <span className="text-[10px] text-muted uppercase block">Resolution Target & Deadline</span>
                    <div className="text-ink font-medium">
                      Target: {selectedComplaint.sla?.resolutionTargetMinutes ? `${selectedComplaint.sla.resolutionTargetMinutes / 60}h` : '—'}
                    </div>
                    <div className="text-[11px] text-muted">
                      Deadline: {formatFullDateTime(selectedComplaint.sla?.resolutionDeadline) || '—'}
                    </div>
                    <div className="text-[11px]">
                      {selectedComplaint.sla?.resolutionAt ? (
                        <span className="text-status-resolved">
                          ✓ Resolved: {formatFullDateTime(selectedComplaint.sla.resolutionAt)}
                        </span>
                      ) : selectedComplaint.sla?.resolutionBreached ? (
                        <span className="text-priority-critical">⚠ Resolution Breached</span>
                      ) : (
                        <span className="text-muted">
                          {formatSlaTimeRemaining(selectedComplaint.sla?.resolutionDeadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions: Assignment & Status Override */}
              <div className="p-4 border border-line rounded-lg bg-paper/80 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-ink font-medium flex items-center space-x-1.5">
                  <Shield size={14} className="text-status-reviewed" />
                  <span>Administrative Dispatch & Override</span>
                </h3>

                {/* 1. Assign to Staff */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-ink block">
                    Assign Maintenance Staff Member
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand cursor-pointer"
                    >
                      <option value="">-- Choose technician from directory --</option>
                      {staffUsers.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.name} ({staff.email})
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAssignStaff}
                      disabled={actionLoading || !selectedStaffId}
                      className="text-xs font-mono shrink-0"
                    >
                      Assign Staff
                    </Button>
                  </div>

                  {/* Smart Staff Recommendations Panel */}
                  {recommendations && recommendations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-line/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted uppercase tracking-wider flex items-center space-x-1">
                          <Zap size={11} className="text-brand" />
                          <span>Smart Recommended Technicians</span>
                        </span>
                        <span className="text-[10px] text-muted font-mono">Ranked by Trade & Capacity</span>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {recommendations.slice(0, 3).map((rec) => (
                          <div
                            key={rec.staffId}
                            className="p-2 rounded bg-paper-subtle border border-line/70 flex items-center justify-between text-xs hover:border-brand/40 transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-medium text-ink truncate">{rec.name}</span>
                                <span className="px-1.5 py-0.2 rounded bg-brand/10 text-brand text-[10px] font-mono font-medium">
                                  {rec.matchScore}%
                                </span>
                              </div>
                              <p className="text-[11px] text-muted truncate mt-0.5">
                                {rec.reasons?.[0]} • {rec.activeTasks} active task(s)
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAssignStaffDirect(rec.staffId)}
                              disabled={actionLoading || rec.isCurrentlyAssigned}
                              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors shrink-0 ${
                                rec.isCurrentlyAssigned
                                  ? 'bg-line/40 text-muted cursor-default'
                                  : 'bg-brand text-white hover:bg-brand/90'
                              }`}
                            >
                              {rec.isCurrentlyAssigned ? 'Assigned' : 'Quick Assign'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedComplaint.assignedTo && (
                    <span className="text-[11px] font-mono text-status-assigned block pt-1">
                      Currently assigned to: {selectedComplaint.assignedTo.name}
                    </span>
                  )}
                </div>

                {/* 2. Manual Priority Override with Mandatory Reason */}
                <div className="space-y-2 pt-3 border-t border-line">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-ink block">
                      Manual Priority Override (Audited)
                    </label>
                    <span className="text-[10px] font-mono text-muted uppercase">
                      Current: {selectedComplaint.priority} ({selectedComplaint.prioritySource || 'AUTOMATIC'})
                    </span>
                  </div>
                  {selectedComplaint.priorityReason && (
                    <div className="text-[11px] text-muted italic bg-line/20 p-2 rounded border border-line/40">
                      Reason: &ldquo;{selectedComplaint.priorityReason}&rdquo;
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-4">
                      <select
                        value={overridePriority}
                        onChange={(e) => setOverridePriority(e.target.value)}
                        className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand cursor-pointer font-mono"
                      >
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-8">
                      <input
                        type="text"
                        placeholder="Reason (e.g. Affects entire computer laboratory)"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleOverridePriority}
                      disabled={actionLoading || !overrideReason.trim() || overrideReason.trim().length < 5}
                      className="text-xs font-mono"
                    >
                      <Zap size={12} className="mr-1" />
                      Save Priority Override
                    </Button>
                  </div>
                </div>

                {/* 3. Change Status Override */}
                <div className="space-y-1.5 pt-3 border-t border-line">
                  <label className="text-xs font-medium text-ink block">
                    Change Lifecycle Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="flex-1 px-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand cursor-pointer font-mono"
                    >
                      {['PENDING', 'REVIEWED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(selectedStatus)}
                      disabled={actionLoading || selectedStatus === selectedComplaint.status}
                      className="text-xs font-mono shrink-0"
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              </div>

              {/* Feedback Summary (if submitted) */}
              {selectedComplaint.feedback && (
                <div className="pt-2">
                  <ComplaintFeedback
                    complaintId={selectedComplaint._id}
                    existingFeedback={selectedComplaint.feedback}
                    isOwner={false}
                  />
                </div>
              )}

              {/* Live Ticket Rail & Detailed Activity History */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
                    Live Resolution Rail
                  </h3>
                  <div className="p-4 bg-paper/60 border border-line rounded-lg">
                    <StatusRail
                      orientation="vertical"
                      currentStatus={selectedComplaint.status}
                      statusHistory={selectedComplaint.statusHistory}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-1.5 mb-3">
                    <History size={14} className="text-brand" />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium">
                      Audit Trail
                    </h3>
                  </div>
                  <div className="p-4 bg-paper/60 border border-line rounded-lg">
                    <ActivityTimeline timeline={selectedComplaint.activityTimeline} />
                  </div>
                </div>
              </div>

              {/* Discussion Thread */}
              <div className="pt-4 border-t border-line">
                <ComplaintComments complaintId={selectedComplaint._id} />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-line bg-paper sticky bottom-0 flex justify-end">
              <Button variant="secondary" size="sm" onClick={closeComplaintDrawer}>
                Close Panel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
