import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import AnimatedCounter from '../../components/AnimatedCounter';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { formatRelativeDate } from '../../utils/formatDate';
import {
  Wrench,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MapPin,
  RefreshCw,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStaffTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff/tasks');
      if (res.data && res.data.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('[StaffDashboard] Error fetching tasks:', err);
      setError('Unable to load assigned work orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffTasks();
  }, []);

  // Compute stats
  const totalAssigned = tasks.length;
  const pendingAction = tasks.filter((t) => t.status === 'ASSIGNED').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completed = tasks.filter((t) => t.status === 'RESOLVED').length;

  // Active tasks needing attention (not yet resolved)
  const priorityRank = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };

  const activeTasks = tasks
    .filter((t) => t.status !== 'RESOLVED')
    .sort((a, b) => {
      const rankA = priorityRank[a.priority] || 99;
      const rankB = priorityRank[b.priority] || 99;
      return rankA - rankB;
    });

  // Priority border color mapping for rows
  const getPriorityBorderClass = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-l-4 border-l-priority-critical';
      case 'HIGH':
        return 'border-l-4 border-l-priority-high';
      case 'MEDIUM':
        return 'border-l-4 border-l-priority-medium';
      case 'LOW':
        return 'border-l-4 border-l-priority-low';
      default:
        return 'border-l-4 border-l-line';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full"
    >
      {/* 1. Header & Actions */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4"
      >
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase text-muted tracking-wider">
              Maintenance Staff Portal
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-status-assigned/10 text-status-assigned border border-status-assigned/30">
              Technician
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            Welcome, {user?.name || 'Staff Member'}
          </h1>
          <p className="text-xs text-muted mt-1 font-mono">
            {user?.email} • Assigned Dispatch Queue
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchStaffTasks}
            className="text-xs font-mono"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Queue</span>
          </Button>
          <Link to="/staff/tasks">
            <Button variant="primary" size="sm">
              <Wrench size={15} />
              <span>All Assigned Tasks ({totalAssigned})</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* 2. Four Stat Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8"
      >
        {/* Total Assigned */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">
              Assigned Tasks
            </span>
            <Inbox size={16} />
          </div>
          <div className="text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={totalAssigned} />
          </div>
          <span className="text-[11px] font-mono text-muted mt-1 block">
            Total work orders routed
          </span>
        </Card>

        {/* Pending Action */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-status-assigned">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">
              Pending Action
            </span>
            <Clock size={16} />
          </div>
          <div className="text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={pendingAction} />
          </div>
          <span className="text-[11px] font-mono text-muted mt-1 block">
            Awaiting inspection start
          </span>
        </Card>

        {/* In Progress */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-status-progress">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">
              In Progress
            </span>
            <AlertCircle size={16} />
          </div>
          <div className="text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={inProgress} />
          </div>
          <span className="text-[11px] font-mono text-muted mt-1 block">
            Active repair on site
          </span>
        </Card>

        {/* Completed */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-status-resolved">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">
              Completed
            </span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={completed} />
          </div>
          <span className="text-[11px] font-mono text-muted mt-1 block">
            Signed off & resolved
          </span>
        </Card>
      </motion.div>

      {/* 3. Priority-Ranked Active Tasks Section */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-medium tracking-tight text-ink">
                Active Tasks Needing Attention
              </h2>
              {activeTasks.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-line text-ink">
                  {activeTasks.length} active
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Priority-ranked work orders currently in queue (Critical and High issues listed first)
            </p>
          </div>

          <Link
            to="/staff/tasks"
            className="text-xs font-mono text-brand hover:underline inline-flex items-center space-x-1"
          >
            <span>Task Manager</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Empty State */}
        {activeTasks.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="w-10 h-10 rounded-full bg-line/50 mx-auto flex items-center justify-center text-muted mb-3">
              <Wrench size={18} />
            </div>
            <h3 className="text-sm font-medium text-ink">Nothing assigned right now.</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 leading-relaxed">
              All currently assigned maintenance tickets have been resolved. New tasks will appear here as soon as campus administration dispatches them.
            </p>
          </Card>
        ) : (
          /* Priority Ranked Task Rows */
          <div className="border border-line rounded-lg divide-y divide-line bg-paper overflow-hidden shadow-sm">
            {activeTasks.map((task) => (
              <Link
                key={task._id}
                to={`/staff/tasks?taskId=${task._id}`}
                className={`p-4 sm:p-5 hover:bg-line/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${getPriorityBorderClass(
                  task.priority
                )}`}
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="p-2.5 rounded bg-line/40 shrink-0 mt-0.5">
                    {getCategoryIcon(task.category, 18)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono text-muted">
                        #{task._id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-line">•</span>
                      <span className="text-[11px] font-mono text-muted">
                        {task.category}
                      </span>
                      {task.priority === 'CRITICAL' && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-priority-critical bg-priority-critical/10 px-1.5 py-0.2 rounded border border-priority-critical/30">
                          <AlertTriangle size={10} />
                          <span>URGENT</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-medium text-ink group-hover:text-brand transition-colors truncate">
                      {task.title}
                    </h3>

                    <div className="flex items-center text-xs text-muted">
                      <MapPin size={12} className="mr-1 shrink-0 text-brand" />
                      <span className="truncate max-w-[320px] font-mono text-[11px]">
                        {task.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  <span className="text-xs font-mono text-muted hidden md:inline">
                    {formatRelativeDate(task.updatedAt || task.createdAt)}
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-muted group-hover:text-ink transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default StaffDashboard;
