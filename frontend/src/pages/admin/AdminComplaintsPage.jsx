import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import StatusRail from '../../components/StatusRail';
import { CATEGORIES, getCategoryIcon } from '../../utils/categoryIcons';
import { formatRelativeDate, formatFullDateTime } from '../../utils/formatDate';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  CheckCircle,
  X,
  MapPin,
  Calendar,
  User,
  Wrench,
  AlertCircle,
  Shield,
  RotateCcw,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const AdminComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // Selected Complaint for Drawer / Detail Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Staff users for assignment dropdown
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
  }, [debouncedSearch, category, status, pagination.page]);

  // Open detail modal and synchronize form states
  const openComplaintDrawer = (complaint) => {
    setSelectedComplaint(complaint);
    setSelectedStaffId(complaint.assignedTo?._id || '');
    setSelectedStatus(complaint.status);
    setActionSuccess('');
    setActionError('');
  };

  const closeComplaintDrawer = () => {
    setSelectedComplaint(null);
    setActionSuccess('');
    setActionError('');
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
        // Refresh table list in background
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

  const hasActiveFilters = Boolean(search || category || status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
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
            Complete database of campus issues with triage, staff assignment, and status controls.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-muted">
          <span>Total: <strong className="text-ink font-medium">{pagination.total}</strong> tickets</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="my-6 p-4 bg-paper border border-line rounded-lg flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search complaints by title, location or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand"
          />
        </div>

        {/* Category */}
        <div className="w-full md:w-52">
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
        <div className="w-full md:w-44">
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

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setCategory('');
              setStatus('');
            }}
            className="text-xs font-mono text-muted shrink-0"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </Button>
        )}
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
                <th className="py-3 px-4 font-medium">Assigned Staff</th>
                <th className="py-3 px-4 font-medium">Created</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted font-mono">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      <span>Loading complaint registry...</span>
                    </div>
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted font-mono">
                    No complaints found matching current query filters.
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

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={item.priority} />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
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
          <div className="w-full max-w-xl bg-paper h-full shadow-xl border-l border-line flex flex-col overflow-y-auto">
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
              <div className="p-3 bg-paper/60 border border-line rounded text-xs space-y-1">
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
                <p className="text-xs text-ink leading-relaxed p-3.5 rounded bg-paper/40 border border-line whitespace-pre-line">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Admin Actions: Assignment & Status Override */}
              <div className="p-4 border border-line rounded-lg bg-paper/80 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-ink font-medium flex items-center space-x-1.5">
                  <Shield size={14} className="text-status-reviewed" />
                  <span>Administrative Dispatch & Override</span>
                </h3>

                {/* 1. Assign to Staff */}
                <div className="space-y-1.5">
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
                  {selectedComplaint.assignedTo && (
                    <span className="text-[11px] font-mono text-status-assigned block">
                      Currently assigned to: {selectedComplaint.assignedTo.name}
                    </span>
                  )}
                </div>

                {/* 2. Change Status Override */}
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

              {/* Live Ticket Rail Audit Timeline */}
              <div className="pt-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
                  Live Resolution Timeline
                </h3>
                <div className="p-4 bg-paper/60 border border-line rounded">
                  <StatusRail
                    orientation="vertical"
                    currentStatus={selectedComplaint.status}
                    statusHistory={selectedComplaint.statusHistory}
                  />
                </div>
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
