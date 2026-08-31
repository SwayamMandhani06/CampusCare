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
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(false);
        const res = await api.get('/complaints');
        if (res.data && res.data.complaints) {
          setComplaints(res.data.complaints);
        }
      } catch (err) {
        console.error('[StudentDashboard] Error fetching complaints:', err);
        setError('Unable to load complaints. Please check connection.');
      } finally {
        setLoading(false);
      }
    };

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
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
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
          <span className="text-xs font-mono uppercase text-muted tracking-wider">
            Student Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            Welcome, {user?.name || 'Student'}
          </h1>
          <p className="text-xs text-muted mt-1">
            PRN: <span className="font-mono text-ink">{user?.studentId || 'N/A'}</span> • {user?.email}
          </p>
        </div>

        <div>
          <Link to="/complaints/new">
            <Button variant="primary" size="md" className="w-full sm:w-auto shadow-sm">
              <PlusCircle size={16} />
              <span>Raise a Complaint</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* 2. Four Stat Cards with Count-up */}
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
            <FileText size={16} className="text-muted" />
          </div>
          <div className="text-3xl font-medium text-ink mt-3">
            <AnimatedCounter value={totalCount} />
          </div>
          <span className="text-[11px] text-muted font-mono mt-1 block">
            All submitted issues
          </span>
        </Card>

        {/* Pending */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-status-pending font-medium">
              Pending
            </span>
            <Clock size={16} className="text-status-pending" />
          </div>
          <div className="text-3xl font-medium text-ink mt-3">
            <AnimatedCounter value={pendingCount} />
          </div>
          <span className="text-[11px] text-muted font-mono mt-1 block">
            Awaiting technician review
          </span>
        </Card>

        {/* In Progress */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-status-progress font-medium">
              In Progress
            </span>
            <AlertCircle size={16} className="text-status-progress" />
          </div>
          <div className="text-3xl font-medium text-ink mt-3">
            <AnimatedCounter value={inProgressCount} />
          </div>
          <span className="text-[11px] text-muted font-mono mt-1 block">
            Assigned or under repair
          </span>
        </Card>

        {/* Resolved */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-status-resolved font-medium">
              Resolved
            </span>
            <CheckCircle2 size={16} className="text-status-resolved" />
          </div>
          <div className="text-3xl font-medium text-ink mt-3">
            <AnimatedCounter value={resolvedCount} />
          </div>
          <span className="text-[11px] text-muted font-mono mt-1 block">
            Repairs completed & closed
          </span>
        </Card>
      </motion.div>

      {/* 3. Recent Complaints Section */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-ink">
              Recent Complaints
            </h2>
            <p className="text-xs text-muted">
              Your latest submitted infrastructure and facility requests
            </p>
          </div>

          {complaints.length > 0 && (
            <Link
              to="/complaints"
              className="text-xs font-mono text-brand hover:underline inline-flex items-center space-x-1"
            >
              <span>View all ({complaints.length})</span>
              <ArrowRight size={12} />
            </Link>
          )}
        </div>

        {/* Empty State */}
        {complaints.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <div className="w-10 h-10 rounded-full bg-line/60 mx-auto flex items-center justify-center text-muted mb-3">
              <FileText size={18} />
            </div>
            <h3 className="text-sm font-medium text-ink">No complaints yet</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
              If something on campus needs attention, report it.
            </p>
            <Link to="/complaints/new">
              <Button variant="primary" size="sm">
                <PlusCircle size={14} />
                <span>Report an Issue</span>
              </Button>
            </Link>
          </Card>
        ) : (
          /* Recent Complaints List */
          <div className="border border-line rounded-lg divide-y divide-line bg-paper overflow-hidden">
            {recentComplaints.map((item) => (
              <Link
                key={item._id}
                to={`/complaints/${item._id}`}
                className="p-4 sm:px-6 hover:bg-line/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="p-2 rounded bg-line/50 shrink-0 mt-0.5">
                    {getCategoryIcon(item.category, 16)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-ink group-hover:text-brand transition-colors truncate">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                      <span className="inline-flex items-center text-[11px] text-muted">
                        <MapPin size={11} className="mr-1 shrink-0" />
                        <span className="truncate max-w-[200px]">{item.location}</span>
                      </span>
                      <span className="text-line">•</span>
                      <span className="text-[11px] font-mono">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                  <PriorityBadge priority={item.priority} />
                  <StatusBadge status={item.status} />
                  <span className="text-xs font-mono text-muted hidden md:inline">
                    {formatRelativeDate(item.createdAt)}
                  </span>
                  <ArrowRight
                    size={14}
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

export default StudentDashboard;
