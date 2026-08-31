import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import AnimatedCounter from '../../components/AnimatedCounter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  ShieldCheck,
  FileText,
  Clock,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Users,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('[AdminDashboard] Error:', err);
      setError('Unable to load administration metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Status colors mapped to exact design tokens
  const STATUS_COLORS = {
    PENDING: '#8A8F98',
    REVIEWED: '#4A6FA1',
    ASSIGNED: '#C9A227',
    IN_PROGRESS: '#C2683D',
    RESOLVED: '#6B8F71',
  };

  // Prepare chart data
  const summary = data?.summary || {
    total: 0,
    pending: 0,
    reviewed: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    totalStudents: 0,
    totalStaff: 0,
  };

  const statusPieData = [
    { name: 'Pending', value: summary.pending, color: STATUS_COLORS.PENDING },
    { name: 'Reviewed', value: summary.reviewed, color: STATUS_COLORS.REVIEWED },
    { name: 'Assigned', value: summary.assigned, color: STATUS_COLORS.ASSIGNED },
    { name: 'In Progress', value: summary.inProgress, color: STATUS_COLORS.IN_PROGRESS },
    { name: 'Resolved', value: summary.resolved, color: STATUS_COLORS.RESOLVED },
  ].filter((item) => item.value > 0);

  // Category data with fallback
  const categoryBarData = (data?.byCategory || []).map((item) => ({
    category: item.category,
    count: item.count,
  }));

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
              Administration Console
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-status-reviewed/10 text-status-reviewed border border-status-reviewed/30">
              Admin
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            Operational Dashboard
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time workload distribution, facility breakdowns, and staff routing metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDashboardData}
            className="text-xs font-mono"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </Button>
          <Link to="/admin/complaints">
            <Button variant="primary" size="sm">
              <FileText size={15} />
              <span>Manage Complaints</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* 2. Top Five Status Stat Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 my-8"
      >
        {/* Total */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">Total</span>
            <FileText size={15} />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={summary.total} />
          </div>
          <span className="text-[10px] font-mono text-muted mt-1 block">Campus tickets</span>
        </Card>

        {/* Pending */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-status-pending">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">Pending</span>
            <Clock size={15} />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={summary.pending} />
          </div>
          <span className="text-[10px] font-mono text-muted mt-1 block">Needs review</span>
        </Card>

        {/* Assigned */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-status-assigned">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">Assigned</span>
            <Wrench size={15} />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={summary.assigned} />
          </div>
          <span className="text-[10px] font-mono text-muted mt-1 block">Routed to staff</span>
        </Card>

        {/* In Progress */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-status-progress">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">In Progress</span>
            <AlertCircle size={15} />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={summary.inProgress} />
          </div>
          <span className="text-[10px] font-mono text-muted mt-1 block">Active repair</span>
        </Card>

        {/* Resolved */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-status-resolved">
            <span className="text-xs font-mono uppercase tracking-wider font-medium">Resolved</span>
            <CheckCircle2 size={15} />
          </div>
          <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
            <AnimatedCounter value={summary.resolved} />
          </div>
          <span className="text-[10px] font-mono text-muted mt-1 block">Closed & signed</span>
        </Card>
      </motion.div>

      {/* 3. Analytics Charts (Recharts) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
        {/* Category Breakdown (Bar Chart) */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
            <div>
              <h2 className="text-sm font-medium tracking-tight text-ink">
                Complaints by Category
              </h2>
              <p className="text-xs text-muted">Distribution across campus domains</p>
            </div>
            <span className="text-xs font-mono text-muted uppercase">Bar Graph</span>
          </div>

          <div className="h-64 w-full">
            {categoryBarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-muted">
                No category data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fontFamily: 'Geist Mono', fill: 'var(--muted)' }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fontFamily: 'Geist Mono', fill: 'var(--muted)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--paper)',
                      borderColor: 'var(--line)',
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: 'Geist Mono',
                    }}
                    cursor={{ fill: 'rgba(61, 90, 128, 0.05)' }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {categoryBarData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="var(--brand)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Status Distribution (Pie / Donut Chart) */}
        <Card className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
            <div>
              <h2 className="text-sm font-medium tracking-tight text-ink">
                Pipeline Status Distribution
              </h2>
              <p className="text-xs text-muted">Active tickets across workflow stages</p>
            </div>
            <span className="text-xs font-mono text-muted uppercase">Donut Graph</span>
          </div>

          <div className="h-64 w-full">
            {statusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-muted">
                No ticket status data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`slice-${index}`} fill={entry.color} stroke="var(--paper)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--paper)',
                      borderColor: 'var(--line)',
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: 'Geist Mono',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => (
                      <span className="text-xs font-mono text-ink mr-2">{val}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </motion.div>

      {/* 4. Quick Administrative Navigation Strip */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/complaints" className="block group">
          <Card hover className="p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded bg-brand/10 text-brand flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                  Complaint Management Table
                </h3>
                <p className="text-xs text-muted">
                  Assign staff technicians, override statuses, and audit live resolution rails.
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted group-hover:text-ink transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>

        <Link to="/admin/users" className="block group">
          <Card hover className="p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded bg-status-reviewed/10 text-status-reviewed flex items-center justify-center">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                  User & Staff Directory
                </h3>
                <p className="text-xs text-muted">
                  {summary.totalStudents} registered students • {summary.totalStaff} active maintenance staff
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted group-hover:text-ink transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
