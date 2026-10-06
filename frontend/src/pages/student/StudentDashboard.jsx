import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import AnimatedCounter from '../../components/AnimatedCounter';
import { SkeletonCard, SkeletonTable } from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { formatRelativeDate } from '../../utils/formatDate';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  MapPin,
  Sparkles,
  Inbox,
  Shield,
  Layers,
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/complaints');
      if (res.data && res.data.complaints) {
        setComplaints(res.data.complaints);
      }
    } catch (err) {
      console.error('[StudentDashboard] Error fetching complaints:', err);
      setError('Unable to load your complaints from the campus facilities server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Compute stat counts
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(
    (c) => c.status === 'PENDING' || c.status === 'REVIEWED'
  ).length;
  const inProgressCount = complaints.filter(
    (c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS'
  ).length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;
  const activeBacklog = pendingCount + inProgressCount;

  const recentComplaints = complaints.slice(0, 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full"
    >
      {/* 1. Header & Primary CTA */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4"
      >
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase text-muted tracking-wider">
              Student Workspace
            </span>
            <span className="text-line">•</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-brand/10 text-brand border border-brand/20 font-semibold">
              PRN: {user?.studentId || 'N/A'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-1">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {activeBacklog > 0 ? (
              <span>
                You have <strong className="text-ink font-semibold">{activeBacklog} active ticket{activeBacklog > 1 ? 's' : ''}</strong> being handled by campus technicians.
              </span>
            ) : (
              <span>All your reported campus facilities requests are currently resolved.</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/complaints/new" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full sm:w-auto shadow-sm">
              <PlusCircle size={16} />
              <span>Raise a Complaint</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* 2. Four Stat Cards with Count-up */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="my-8">
          <ErrorState message={error} onRetry={fetchComplaints} />
        </div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8"
        >
          {/* Total Complaints */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted font-medium">
                Total Logged
              </span>
              <div className="w-7 h-7 rounded-lg bg-subtle text-muted flex items-center justify-center">
                <FileText size={15} />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-ink mt-3">
              <AnimatedCounter value={totalCount} />
            </div>
            <span className="text-[11px] text-muted font-medium mt-1 block">
              Lifetime submitted requests
            </span>
          </Card>

          {/* Pending */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-status-pending font-medium">
                Pending Review
              </span>
              <div className="w-7 h-7 rounded-lg bg-status-pending/10 text-status-pending flex items-center justify-center">
                <Clock size={15} />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-ink mt-3">
              <AnimatedCounter value={pendingCount} />
            </div>
            <span className="text-[11px] text-muted font-medium mt-1 block">
              Awaiting technician assignment
            </span>
          </Card>

          {/* In Progress */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-status-progress font-medium">
                In Progress
              </span>
              <div className="w-7 h-7 rounded-lg bg-status-progress/10 text-status-progress flex items-center justify-center">
                <AlertCircle size={15} />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-ink mt-3">
              <AnimatedCounter value={inProgressCount} />
            </div>
            <span className="text-[11px] text-muted font-medium mt-1 block">
              Technicians actively repairing
            </span>
          </Card>

          {/* Resolved */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-status-resolved font-medium">
                Resolved
              </span>
              <div className="w-7 h-7 rounded-lg bg-status-resolved/10 text-status-resolved flex items-center justify-center">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="text-3xl font-bold font-mono text-ink mt-3">
              <AnimatedCounter value={resolvedCount} />
            </div>
            <span className="text-[11px] text-muted font-medium mt-1 block">
              Verified & signed off
            </span>
          </Card>
        </motion.div>
      )}

      {/* 3. Recent Complaints Section */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">
              Recent Complaints
            </h2>
            <p className="text-xs text-muted">
              Track the live resolution lifecycle of your latest submitted tickets
            </p>
          </div>

          {complaints.length > 0 && (
            <Link
              to="/complaints"
              className="text-xs font-mono text-brand hover:underline inline-flex items-center space-x-1"
            >
              <span>View all ({complaints.length})</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {/* Empty State */}
        {!loading && complaints.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <div className="w-12 h-12 rounded-xl bg-subtle text-muted mx-auto flex items-center justify-center mb-3">
              <Inbox size={22} />
            </div>
            <h3 className="text-sm font-semibold text-ink">No complaints logged yet</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
              If any campus facility (electrical, Wi-Fi, plumbing, laboratory) requires repair, report it for immediate dispatch.
            </p>
            <Link to="/complaints/new">
              <Button variant="primary" size="sm">
                <PlusCircle size={14} />
                <span>Report an Issue</span>
              </Button>
            </Link>
          </Card>
        ) : !loading && (
          /* Recent Complaints List */
          <div className="border border-line rounded-xl divide-y divide-line bg-surface overflow-hidden shadow-xs">
            {recentComplaints.map((item) => (
              <Link
                key={item._id}
                to={`/complaints/${item._id}`}
                className="p-4 sm:px-6 hover:bg-subtle/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="p-2.5 rounded-lg bg-subtle shrink-0 mt-0.5 border border-line/60">
                    {getCategoryIcon(item.category, 16)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-ink group-hover:text-brand transition-colors truncate">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                      <span className="inline-flex items-center text-[11px] text-muted">
                        <MapPin size={11} className="mr-1 shrink-0 text-muted" />
                        <span className="truncate max-w-[200px]">{item.location}</span>
                      </span>
                      <span className="text-line">•</span>
                      <span className="text-[11px] font-mono text-muted">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center">
                  <PriorityBadge priority={item.priority} />
                  <StatusBadge status={item.status} />
                  <span className="text-xs font-mono text-muted hidden md:inline">
                    {formatRelativeDate(item.createdAt)}
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-muted group-hover:text-ink transition-transform group-hover:translate-x-1"
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

export default StudentDashboard;
