import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import StatusRail from '../../components/StatusRail';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { formatRelativeDate, formatFullDateTime } from '../../utils/formatDate';
import {
  Wrench,
  Play,
  CheckCircle,
  MapPin,
  Calendar,
  User,
  AlertCircle,
  Search,
  RotateCcw,
  Check,
  FileText,
  Clock,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: '', label: 'All Tasks' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Completed' },
];

const StaffTasksPage = () => {
  const [searchParams] = useSearchParams();
  const initialTaskId = searchParams.get('taskId');

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  // Resolution form state
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/staff/tasks', { params });
      if (res.data && res.data.tasks) {
        setTasks(res.data.tasks);

        // Auto-select task if specified by query parameter
        if (initialTaskId) {
          const matched = res.data.tasks.find((t) => t._id === initialTaskId);
          if (matched) {
            setSelectedTask(matched);
          }
        } else if (res.data.tasks.length > 0 && !selectedTask) {
          setSelectedTask(res.data.tasks[0]);
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
  }, [statusFilter]);

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
        // Update item in list
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
        // Update item in list
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-muted tracking-wider">
            Technician Workbench
          </span>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            Assigned Work Orders
          </h1>
          <p className="text-xs text-muted mt-1">
            Review assignment details, record progress states, and log resolution notes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                statusFilter === filter.value
                  ? 'bg-ink text-paper border-ink font-medium'
                  : 'bg-paper text-muted border-line hover:text-ink'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workbench Layout: Task List Left (1/3), Detail & Actions Right (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {/* Left Column: Task Queue (4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-mono uppercase text-muted tracking-wider">
              Assigned Queue ({tasks.length})
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-muted border border-line rounded-lg bg-paper">
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <span className="text-xs text-muted">
                {statusFilter ? `No ${statusFilter.toLowerCase().replace('_', ' ')} tasks right now.` : 'Nothing assigned right now.'}
              </span>
            </Card>
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

                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="truncate max-w-[200px] flex items-center font-mono text-[11px]">
                        <MapPin size={11} className="mr-1 shrink-0" />
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

        {/* Right Column: Task Detail, StatusRail & Action Workflow (7 cols) */}
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

              {/* Description */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-1.5">
                  Reported Issue Description
                </h3>
                <p className="text-xs text-ink leading-relaxed p-3.5 rounded bg-paper/30 border border-line whitespace-pre-line">
                  {selectedTask.description}
                </p>
              </div>

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

              {/* Live Ticket Rail Forward Motion */}
              <div className="pt-4 border-t border-line">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-4">
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
                        Transition this ticket to IN PROGRESS to let the student know technician is active on site.
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
