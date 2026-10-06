import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import SlaBadge from '../../components/SlaBadge';
import StatusRail from '../../components/StatusRail';
import ComplaintComments from '../../components/ComplaintComments';
import ComplaintImageGallery from '../../components/ComplaintImageGallery';
import ActivityTimeline from '../../components/ActivityTimeline';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { CATEGORIES } from '../../utils/categoryIcons';
import { formatRelativeDate, formatFullDateTime, formatSlaTimeRemaining } from '../../utils/formatDate';
import {
  Play,
  CheckCircle,
  MapPin,
  AlertCircle,
  Search,
  RotateCcw,
  Check,
  Download,
  History,
  Clock,
  Flame,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: '', label: 'All Tasks' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const SLA_FILTERS = [
  { value: '', label: 'All SLA Statuses' },
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'BREACHED', label: 'Breached' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const StaffTasksPage = () => {
  const [searchParams] = useSearchParams();
  const initialTaskId = searchParams.get('taskId');

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Resolution form state
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Live socket state
  const [isLive, setIsLive] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Real-time socket events for technician workbench
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => setIsLive(true);
    const handleDisconnect = () => setIsLive(false);

    if (socket.connected) {
      setIsLive(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const handleTaskUpdated = (data) => {
      if (!data || !data.complaint) return;
      const updated = data.complaint;
      setTasks((prev) => {
        const index = prev.findIndex((t) => t._id === updated._id);
        if (index >= 0) {
          const clone = [...prev];
          clone[index] = { ...clone[index], ...updated };
          return clone;
        }
        return [updated, ...prev];
      });

      setSelectedTask((current) => {
        if (current && current._id === updated._id) {
          return { ...current, ...updated };
        }
        return current;
      });
    };

    socket.on('complaint_updated', handleTaskUpdated);
    socket.on('staff_task_updated', handleTaskUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('complaint_updated', handleTaskUpdated);
      socket.off('staff_task_updated', handleTaskUpdated);
    };
  }, []);

  // Room subscription for currently selected task
  useEffect(() => {
    if (!selectedTask?._id) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join_complaint', selectedTask._id);
    return () => {
      socket.emit('leave_complaint', selectedTask._id);
    };
  }, [selectedTask?._id]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (slaFilter) params.slaStatus = slaFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await api.get('/staff/tasks', { params });
      if (res.data && res.data.tasks) {
        setTasks(res.data.tasks);

        // Auto-select task if specified or preserve selection
        if (initialTaskId) {
          const matched = res.data.tasks.find((t) => t._id === initialTaskId);
          if (matched) setSelectedTask(matched);
        } else if (res.data.tasks.length > 0) {
          setSelectedTask((current) => {
            if (!current) return res.data.tasks[0];
            const updated = res.data.tasks.find((t) => t._id === current._id);
            return updated || res.data.tasks[0];
          });
        } else {
          setSelectedTask(null);
        }
      }
    } catch (err) {
      console.error('[StaffTasks] Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, categoryFilter, slaFilter, debouncedSearch]);

  const hasActiveFilters = Boolean(
    search || statusFilter || priorityFilter || categoryFilter || slaFilter
  );

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setSlaFilter('');
    setCategoryFilter('');
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (slaFilter) params.slaStatus = slaFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await api.get('/staff/tasks/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `staff-tasks-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export Tasks CSV] Error:', err);
      alert('Failed to export tasks CSV.');
    } finally {
      setExporting(false);
    }
  };

  // Action 1: Start Work (sets status to IN_PROGRESS)
  const handleStartWork = async () => {
    if (!selectedTask) return;
    setActionLoading(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.put(`/staff/tasks/${selectedTask._id}/status`, {
        status: 'IN_PROGRESS',
        notes: 'Technician commenced on-site diagnostic & repair work.',
      });

      if (res.data && res.data.task) {
        setSelectedTask(res.data.task);
        setActionSuccess('Work order is now marked IN PROGRESS.');
        setTasks((prev) =>
          prev.map((t) => (t._id === res.data.task._id ? res.data.task : t))
        );
      }
    } catch (err) {
      console.error('[StartWork] Error:', err);
      setActionError(err.response?.data?.message || 'Failed to update task status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Action 2: Resolve Task (sets status to RESOLVED and saves resolutionNotes)
  const handleResolveTask = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setActionError('Please document resolution actions before marking resolved.');
      return;
    }

    setActionLoading(true);
    setActionSuccess('');
    setActionError('');

    try {
      const res = await api.put(`/staff/tasks/${selectedTask._id}/resolve`, {
        resolutionNotes: resolutionNotes.trim(),
      });

      if (res.data && res.data.task) {
        setSelectedTask(res.data.task);
        setActionSuccess('Work order marked RESOLVED successfully.');
        setResolutionNotes('');
        setTasks((prev) =>
          prev.map((t) => (t._id === res.data.task._id ? res.data.task : t))
        );
      }
    } catch (err) {
      console.error('[ResolveTask] Error:', err);
      setActionError(err.response?.data?.message || 'Failed to resolve work order.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase text-muted tracking-wider">
              Technician Workbench
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${
              isLive ? 'bg-success/10 text-success border-success/30' : 'bg-line/20 text-muted border-line'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isLive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              {isLive ? 'LIVE' : 'SYNCED'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            Assigned Work Orders
          </h1>
          <p className="text-xs text-muted mt-1">
            Review assignment details, record progress states, communicate via comments, and log resolutions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || tasks.length === 0}
            className="text-xs font-mono"
            title="Export assigned tasks to CSV"
          >
            <Download size={13} className="mr-1.5" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="my-6 p-4 bg-paper border border-line rounded-lg space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-3 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand"
            />
          </div>

          {/* Status Tabs */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* SLA Status Filter */}
          <div className="md:col-span-2">
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {SLA_FILTERS.map((sla) => (
                <option key={sla.value} value={sla.value}>
                  {sla.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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

          {/* Reset */}
          <div className="md:col-span-1 flex justify-end">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs font-mono text-muted hover:text-ink w-full"
                title="Reset Filters"
              >
                <RotateCcw size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Workbench Layout: Task List Left (1/3), Detail & Actions Right (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Task Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-mono uppercase text-muted tracking-wider">
              Assigned Queue ({tasks.length})
            </span>
          </div>

          {loading ? (
            <div className="py-12 border border-line rounded-lg bg-paper">
              <LoadingSpinner label="Loading tasks..." size={18} />
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="No Tasks Found"
              message={
                hasActiveFilters
                  ? 'No assigned work orders match your active filter settings.'
                  : 'You have no assigned tasks in your queue right now.'
              }
              action={
                hasActiveFilters && (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    <RotateCcw size={12} className="mr-1.5" />
                    Reset Filters
                  </Button>
                )
              }
            />
          ) : (
            <div className="border border-line rounded-lg divide-y divide-line bg-paper overflow-hidden shadow-sm max-h-[750px] overflow-y-auto">
              {tasks.map((task) => {
                const isSelected = selectedTask?._id === task._id;
                return (
                  <div
                    key={task._id}
                    onClick={() => {
                      setSelectedTask(task);
                      setActionSuccess('');
                      setActionError('');
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-line/40 border-l-4 border-l-brand'
                        : 'hover:bg-line/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-mono text-muted">
                        #{task._id.slice(-6).toUpperCase()}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                    </div>

                    <h4 className="text-sm font-medium text-ink truncate mb-1">
                      {task.title}
                    </h4>

                    {/* SLA Status & Indicator */}
                    <div className="my-1.5 flex items-center justify-between gap-2">
                      <SlaBadge
                        status={task.sla?.status || 'ON_TRACK'}
                        escalated={task.sla?.escalated}
                        escalationLevel={task.sla?.escalationLevel}
                        timeRemaining={
                          task.status === 'RESOLVED'
                            ? 'Resolved'
                            : formatSlaTimeRemaining(task.sla?.resolutionDeadline)
                        }
                        size="sm"
                      />
                      {task.priorityReason && (
                        <span
                          className="text-[10px] text-muted truncate max-w-[140px] font-sans"
                          title={task.priorityReason}
                        >
                          {task.priorityReason}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted pt-0.5">
                      <span className="truncate max-w-[200px] flex items-center font-mono text-[11px]">
                        <MapPin size={11} className="mr-1 shrink-0 text-brand" />
                        {task.location}
                      </span>
                      <span className="font-mono text-[11px]">
                        {formatRelativeDate(task.updatedAt || task.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Task Detail, StatusRail, Actions, Timeline, Comments (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTask ? (
            <Card className="p-6 sm:p-8 space-y-6">
              {/* Feedback messages */}
              {actionSuccess && (
                <div className="p-3 rounded bg-status-resolved/10 border border-status-resolved/30 text-xs text-status-resolved flex items-center space-x-2 font-mono">
                  <CheckCircle size={15} />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="p-3 rounded bg-priority-critical/10 border border-priority-critical/30 text-xs text-priority-critical flex items-center space-x-2 font-mono">
                  <AlertCircle size={15} />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Task Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-line">
                <div className="flex items-center space-x-2 font-mono text-xs text-muted">
                  <span>Work Order #{selectedTask._id.slice(-6).toUpperCase()}</span>
                  <span>•</span>
                  <span>{selectedTask.category}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PriorityBadge priority={selectedTask.priority} />
                  <StatusBadge status={selectedTask.status} />
                </div>
              </div>

              {/* Title & Location */}
              <div>
                <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-ink">
                  {selectedTask.title}
                </h2>
                <div className="flex items-center text-xs text-muted mt-2 font-mono bg-paper/60 p-2.5 rounded border border-line">
                  <MapPin size={14} className="mr-2 text-brand shrink-0" />
                  <span>{selectedTask.location}</span>
                </div>
              </div>

              {/* SLA Target & Deadlines Banner */}
              <div className="p-4 rounded-lg border border-line bg-paper/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Clock size={15} className="text-brand" />
                    <span className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
                      Service Level Agreement (SLA)
                    </span>
                  </div>
                  <SlaBadge
                    status={selectedTask.sla?.status || 'ON_TRACK'}
                    escalated={selectedTask.sla?.escalated}
                    escalationLevel={selectedTask.sla?.escalationLevel}
                    timeRemaining={
                      selectedTask.status === 'RESOLVED'
                        ? 'Resolved'
                        : formatSlaTimeRemaining(selectedTask.sla?.resolutionDeadline)
                    }
                  />
                </div>

                {selectedTask.sla?.escalated && (
                  <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center space-x-2 font-mono">
                    <Flame size={14} className="shrink-0 animate-pulse" />
                    <span>
                      Management Escalation: Level {selectedTask.sla.escalationLevel || 1}
                      {selectedTask.sla.escalatedAt ? ` on ${formatFullDateTime(selectedTask.sla.escalatedAt)}` : ''}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Response Deadline */}
                  <div className="p-2.5 rounded bg-line/20 border border-line/40 space-y-1">
                    <span className="text-[10px] text-muted uppercase block">Response Target & Deadline</span>
                    <div className="text-ink font-medium">
                      Target: {selectedTask.sla?.responseTargetMinutes ? `${selectedTask.sla.responseTargetMinutes / 60}h` : '—'}
                    </div>
                    <div className="text-[11px] text-muted">
                      Deadline: {formatFullDateTime(selectedTask.sla?.responseDeadline) || '—'}
                    </div>
                    <div className="text-[11px]">
                      {selectedTask.sla?.responseAt ? (
                        <span className="text-status-resolved">
                          ✓ Responded: {formatFullDateTime(selectedTask.sla.responseAt)}
                        </span>
                      ) : selectedTask.sla?.responseBreached ? (
                        <span className="text-priority-critical font-medium">⚠ Response SLA Breached</span>
                      ) : (
                        <span className="text-muted">Awaiting first response action</span>
                      )}
                    </div>
                  </div>

                  {/* Resolution Deadline */}
                  <div className="p-2.5 rounded bg-line/20 border border-line/40 space-y-1">
                    <span className="text-[10px] text-muted uppercase block">Resolution Target & Deadline</span>
                    <div className="text-ink font-medium">
                      Target: {selectedTask.sla?.resolutionTargetMinutes ? `${selectedTask.sla.resolutionTargetMinutes / 60}h` : '—'}
                    </div>
                    <div className="text-[11px] text-muted">
                      Deadline: {formatFullDateTime(selectedTask.sla?.resolutionDeadline) || '—'}
                    </div>
                    <div className="text-[11px]">
                      {selectedTask.sla?.resolutionAt ? (
                        <span className="text-status-resolved">
                          ✓ Resolved: {formatFullDateTime(selectedTask.sla.resolutionAt)}
                        </span>
                      ) : selectedTask.sla?.resolutionBreached ? (
                        <span className="text-priority-critical font-medium">⚠ Resolution Breached</span>
                      ) : (
                        <span className="text-muted">
                          {formatSlaTimeRemaining(selectedTask.sla?.resolutionDeadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Priority Source & Reason */}
                <div className="pt-2 border-t border-line/60 flex flex-wrap items-center justify-between text-xs font-mono text-muted gap-2">
                  <div className="flex items-center space-x-1.5">
                    <span>Priority Source:</span>
                    <span className="text-ink font-medium uppercase">
                      {selectedTask.prioritySource || 'AUTOMATIC'}
                    </span>
                  </div>
                  {selectedTask.priorityReason && (
                    <div className="text-[11px] text-muted italic">
                      &ldquo;{selectedTask.priorityReason}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-1.5">
                  Reported Issue Description
                </h3>
                <p className="text-xs text-ink leading-relaxed p-3.5 rounded bg-paper/30 border border-line whitespace-pre-line">
                  {selectedTask.description}
                </p>
              </div>

              {/* Attached Images */}
              {selectedTask.images && selectedTask.images.length > 0 && (
                <div className="pt-2">
                  <ComplaintImageGallery
                    complaintId={selectedTask._id}
                    images={selectedTask.images}
                  />
                </div>
              )}

              {/* Student Submitter Info */}
              <div className="p-3 bg-paper/60 border border-line rounded text-xs space-y-1">
                <span className="text-muted font-mono uppercase text-[10px] block">
                  Reported By
                </span>
                <div className="font-medium text-ink">
                  {selectedTask.createdBy?.name} ({selectedTask.createdBy?.email})
                </div>
                {selectedTask.createdBy?.studentId && (
                  <div className="text-muted font-mono text-[11px]">
                    PRN: {selectedTask.createdBy?.studentId}
                  </div>
                )}
              </div>

              {/* Technician Actions Area */}
              <div className="pt-4 border-t border-line space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
                  Technician Action Console
                </h3>

                {/* State 1: Newly Assigned -> "Start Work" button */}
                {selectedTask.status === 'ASSIGNED' && (
                  <div className="p-4 bg-status-assigned/10 border border-status-assigned/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-ink block">
                        Ready to begin repairs?
                      </span>
                      <span className="text-[11px] text-muted leading-relaxed">
                        Transition this ticket to IN PROGRESS to notify the student that technician is on-site.
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleStartWork}
                      loading={actionLoading}
                      disabled={actionLoading}
                      className="shrink-0 font-mono text-xs"
                    >
                      <Play size={13} />
                      <span>Start Work</span>
                    </Button>
                  </div>
                )}

                {/* State 2: In Progress -> "Resolve" form */}
                {selectedTask.status === 'IN_PROGRESS' && (
                  <form onSubmit={handleResolveTask} className="p-4 bg-paper border border-line rounded-lg space-y-3">
                    <div>
                      <span className="text-xs font-medium text-ink block">
                        Work Complete — Document Resolution
                      </span>
                      <span className="text-[11px] text-muted">
                        Explain parts replaced, adjustments made, and test results for student and admin review.
                      </span>
                    </div>

                    <Textarea
                      id="resolutionNotes"
                      rows={3}
                      placeholder="e.g. Replaced faulty circuit breaker B-12 and tested voltage load under normal operating conditions. Equipment functional."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      required
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={actionLoading}
                        disabled={actionLoading || !resolutionNotes.trim()}
                        className="font-mono text-xs bg-status-resolved hover:bg-[#59785e]"
                      >
                        <Check size={14} />
                        <span>Mark Resolved</span>
                      </Button>
                    </div>
                  </form>
                )}

                {/* State 3: Resolved State */}
                {selectedTask.status === 'RESOLVED' && (
                  <div className="p-4 bg-status-resolved/10 border border-status-resolved/30 rounded-lg space-y-2">
                    <div className="flex items-center space-x-2 text-status-resolved">
                      <CheckCircle size={16} />
                      <span className="text-xs font-mono font-medium uppercase">
                        Work Order Resolved
                      </span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
                      {selectedTask.resolutionNotes || 'Task resolved by staff technician.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Live Ticket Rail & Timeline */}
              <div className="space-y-4 pt-4 border-t border-line">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
                    Resolution Pipeline Progress
                  </h3>
                  <div className="p-4 bg-paper/60 border border-line rounded">
                    <StatusRail
                      orientation="vertical"
                      currentStatus={selectedTask.status}
                      statusHistory={selectedTask.statusHistory}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-1.5 mb-3">
                    <History size={14} className="text-brand" />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium">
                      Activity Trail
                    </h3>
                  </div>
                  <div className="p-4 bg-paper/60 border border-line rounded">
                    <ActivityTimeline timeline={selectedTask.activityTimeline} />
                  </div>
                </div>
              </div>

              {/* Staff Discussion / Comments */}
              <div className="pt-4 border-t border-line">
                <ComplaintComments complaintId={selectedTask._id} />
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-xs font-mono text-muted">
              Select a work order from the left queue to view details and update progress.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffTasksPage;
