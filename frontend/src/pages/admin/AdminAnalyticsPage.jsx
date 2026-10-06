import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import AnimatedCounter from '../../components/AnimatedCounter';
import ErrorState from '../../components/ErrorState';
import { SkeletonCard, SkeletonTable } from '../../components/LoadingSkeleton';
import { CATEGORIES } from '../../utils/categoryIcons';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertOctagon,
  Users,
  MapPin,
  Star,
  Sparkles,
  Filter,
  RotateCcw,
  ShieldCheck,
  Bot,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

const DATE_RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'custom', label: 'Custom' },
];

const PRIORITY_PALETTE = {
  LOW: '#6B8F71',
  MEDIUM: '#4A6FA1',
  HIGH: '#C9A227',
  CRITICAL: '#C2683D',
};

const SLA_PALETTE = {
  ON_TRACK: '#6B8F71',
  AT_RISK: '#C9A227',
  BREACHED: '#C2683D',
  RESOLVED: '#4A6FA1',
};

const CATEGORY_COLORS = [
  '#4A6FA1',
  '#C9A227',
  '#C2683D',
  '#6B8F71',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#64748B',
];

const AdminAnalyticsPage = () => {
  const navigate = useNavigate();

  // Primary Range Filter
  const [range, setRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Granular Operational Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSlaStatus, setFilterSlaStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStaff, setFilterStaff] = useState('');

  // Data & Lifecycle States
  const [analytics, setAnalytics] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Staff Table Sorting
  const [sortField, setSortField] = useState('assignedCount');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load Staff for Filter Dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/admin/users?role=staff');
        if (res.data?.users) {
          setStaffList(res.data.users);
        }
      } catch (err) {
        console.warn('[Analytics] Failed to fetch staff list:', err.message);
      }
    };
    fetchStaff();
  }, []);

  // Fetch Consolidated Analytics Dataset
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { range };
      if (range === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      }
      if (filterCategory) params.category = filterCategory;
      if (filterPriority) params.priority = filterPriority;
      if (filterStatus) params.status = filterStatus;
      if (filterSlaStatus) params.slaStatus = filterSlaStatus;
      if (filterLocation.trim()) params.location = filterLocation.trim();
      if (filterStaff) params.assignedStaff = filterStaff;

      const res = await api.get('/admin/analytics/overview', { params });
      if (res.data?.success && res.data.data) {
        setAnalytics(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Invalid server response');
      }
    } catch (err) {
      console.error('[Analytics Error]', err);
      setError(err.response?.data?.message || err.message || 'Failed to aggregate analytics');
    } finally {
      setLoading(false);
    }
  }, [range, customStart, customEnd, filterCategory, filterPriority, filterStatus, filterSlaStatus, filterLocation, filterStaff]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Reset All Filters
  const handleResetFilters = () => {
    setRange('30d');
    setCustomStart('');
    setCustomEnd('');
    setFilterCategory('');
    setFilterPriority('');
    setFilterStatus('');
    setFilterSlaStatus('');
    setFilterLocation('');
    setFilterStaff('');
  };

  // CSV Report Export Handler
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = { range };
      if (range === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      }
      if (filterCategory) params.category = filterCategory;
      if (filterPriority) params.priority = filterPriority;
      if (filterStatus) params.status = filterStatus;
      if (filterSlaStatus) params.slaStatus = filterSlaStatus;
      if (filterLocation.trim()) params.location = filterLocation.trim();
      if (filterStaff) params.assignedStaff = filterStaff;

      const res = await api.get('/admin/analytics/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `campuscare-analytics-${range}-${dateStamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Analytics Export Error]', err);
      alert('Failed to generate CSV export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Drill-down Helper
  const handleDrillDown = (filterParam, value) => {
    const searchParams = new URLSearchParams();
    searchParams.set(filterParam, value);
    navigate(`/admin/complaints?${searchParams.toString()}`);
  };

  // Sort Staff Performance
  const staffPerformance = analytics?.staffPerformance;
  const sortedStaff = React.useMemo(() => {
    if (!staffPerformance) return [];
    return [...staffPerformance].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [staffPerformance, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Formatter for Period Delta Badges
  const renderDelta = (value, unit = '%', isPercentagePoint = false) => {
    if (value === null || value === undefined) {
      return (
        <span className="text-[10px] font-mono text-muted bg-paper/60 px-1.5 py-0.5 rounded border border-line">
          No prior baseline
        </span>
      );
    }

    const isPositive = value > 0;
    const isZero = value === 0;
    const suffix = isPercentagePoint ? ' pp' : unit;
    const displayVal = `${isPositive ? '+' : ''}${value.toFixed(1)}${suffix}`;

    return (
      <span
        className={`inline-flex items-center space-x-1 text-[11px] font-mono px-1.5 py-0.5 rounded border ${
          isZero
            ? 'bg-line/40 text-muted border-line'
            : isPositive
            ? 'bg-[#6B8F71]/10 text-[#2E6037] border-[#6B8F71]/30'
            : 'bg-[#C2683D]/10 text-[#8B3416] border-[#C2683D]/30'
        }`}
      >
        {isPositive ? <TrendingUp size={11} /> : !isZero ? <TrendingDown size={11} /> : null}
        <span>{displayVal}</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full space-y-6">
      {/* 1. Header & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-line gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase text-muted tracking-wider">
              Administration Console
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-status-assigned/15 text-[#9E7D1A] border border-status-assigned/30 font-medium">
              Analytics Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            Operational Intelligence & Analytics
          </h1>
          <p className="text-xs text-muted mt-1">
            Deterministic telemetry, SLA compliance, technician capacity, and campus facility hotspot tracking.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector Pills */}
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 shadow-2xs">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  range === r.value
                    ? 'bg-brand text-white shadow-xs font-semibold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="text-xs font-mono"
            title="Refresh analytics dataset"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Export CSV Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="text-xs font-mono"
          >
            <Download size={13} className={exporting ? 'animate-bounce' : ''} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker (Conditional) */}
      {range === 'custom' && (
        <Card className="p-4 bg-surface border border-brand/30 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-ink font-medium">
              <Calendar size={14} className="text-brand" />
              <span>Select Custom Analysis Window:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="text-muted text-[11px] font-mono">From:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 border border-line rounded-lg bg-surface text-ink font-mono text-xs focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              />
              <label className="text-muted text-[11px] font-mono">To:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 border border-line rounded-lg bg-surface text-ink font-mono text-xs focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchAnalytics}
                className="text-xs py-1 h-auto"
              >
                Apply Range
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 2. Granular Operational Filters Bar */}
      <Card className="p-4 bg-surface border border-line rounded-xl shadow-xs">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-medium text-ink">
              <Filter size={14} className="text-muted" />
              <span>Operational Slicing Filters</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 text-[11px] font-mono text-muted hover:text-ink transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Reset Filters</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Category */}
            <div>
              <label className="text-[10px] font-mono uppercase text-muted block mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full text-xs py-1.5 px-2 rounded-lg border border-line bg-surface text-ink focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] font-mono uppercase text-muted block mb-1">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full text-xs py-1.5 px-2 rounded-lg border border-line bg-surface text-ink focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] font-mono uppercase text-muted block mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-xs py-1.5 px-2 rounded-lg border border-line bg-surface text-ink focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {/* SLA Status */}
            <div>
              <label className="text-[10px] font-mono uppercase text-muted block mb-1">SLA Status</label>
              <select
                value={filterSlaStatus}
                onChange={(e) => setFilterSlaStatus(e.target.value)}
                className="w-full text-xs py-1.5 px-2 rounded-lg border border-line bg-surface text-ink focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              >
                <option value="">All SLA States</option>
                <option value="ON_TRACK">On Track</option>
                <option value="AT_RISK">At Risk</option>
                <option value="BREACHED">Breached</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="text-[10px] font-mono uppercase text-muted block mb-1">Location Match</label>
              <input
                type="text"
                placeholder="e.g. Hostel A"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full text-xs py-1.5 px-2 rounded-lg border border-line bg-surface text-ink focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              />
            </div>

            {/* Assigned Staff */}
            <div>
              <label className="text-[10px] font-mono uppercase text-muted block mb-1">Technician</label>
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="w-full text-xs py-1.5 px-2 rounded-lg border border-line bg-surface text-ink focus:border-brand focus:ring-1 focus:ring-brand/30 transition-colors"
              >
                <option value="">All Personnel</option>
                <option value="unassigned">Unassigned Only</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Period Status Header */}
      {analytics?.period && (
        <div className="flex flex-wrap items-center justify-between text-xs text-muted border-l-2 border-brand pl-3 py-0.5">
          <div>
            <span className="font-medium text-ink">{analytics.period.label}:</span>{' '}
            <span>
              {analytics.period.startDate ? new Date(analytics.period.startDate).toLocaleDateString() : ''} to{' '}
              {analytics.period.endDate ? new Date(analytics.period.endDate).toLocaleDateString() : ''}
            </span>{' '}
            <span className="text-[10px] font-mono text-muted/80">({analytics.period.durationDays} days)</span>
          </div>
          <div className="text-[11px] font-mono text-muted">
            Comparison Baseline: Preceding {analytics.period.durationDays} day window
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorState
          title="Analytics Aggregation Failed"
          message={error}
          onRetry={fetchAnalytics}
        />
      )}

      {/* Loading Skeletons */}
      {loading && !analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonTable rows={6} />
        </div>
      )}

      {/* Main Analytics Content */}
      {analytics && (
        <>
          {/* 3. Executive Summary KPI Cards with Period-over-Period Deltas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Total Complaints */}
            <Card className="p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">Total Volume</span>
                <Layers size={15} />
              </div>
              <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
                <AnimatedCounter value={analytics.summary.totalComplaints} />
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted">vs prior period:</span>
                {renderDelta(analytics.periodComparison?.volumeChangePercent, '%')}
              </div>
            </Card>

            {/* Active Backlog */}
            <Card className="p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-status-assigned">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">Active Backlog</span>
                <Clock size={15} />
              </div>
              <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
                <AnimatedCounter value={analytics.summary.activeBacklog} />
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted">Resolved:</span>
                <span className="text-xs font-mono text-[#2E6037] font-medium">
                  {analytics.summary.resolvedComplaints} tickets
                </span>
              </div>
            </Card>

            {/* SLA Compliance Rate */}
            <Card className="p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-status-resolved">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">SLA Compliance</span>
                <ShieldCheck size={15} />
              </div>
              <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
                <AnimatedCounter value={analytics.slaAnalytics.compliancePercentage} />
                <span className="text-lg font-normal text-muted ml-0.5">%</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted">vs prior period:</span>
                {renderDelta(analytics.periodComparison?.slaCompliancePointChange, '', true)}
              </div>
            </Card>

            {/* Avg Resolution Hours */}
            <Card className="p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-brand">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">Avg Resolution</span>
                <TrendingUp size={15} />
              </div>
              <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
                <AnimatedCounter value={analytics.slaAnalytics.avgResolutionHours} />
                <span className="text-lg font-normal text-muted ml-0.5">h</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted">Median:</span>
                <span className="text-xs font-mono text-ink">
                  {analytics.slaAnalytics.medianResolutionHours}h
                </span>
              </div>
            </Card>

            {/* Breaches & Escalations */}
            <Card className="p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8B3416]">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">Breached SLA</span>
                <AlertOctagon size={15} />
              </div>
              <div className="text-2xl sm:text-3xl font-medium text-ink mt-2">
                <AnimatedCounter value={analytics.slaAnalytics.breached} />
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted">Escalated:</span>
                <span className="text-xs font-mono text-[#8B3416] font-medium">
                  {analytics.slaAnalytics.escalations.total} (L1:{analytics.slaAnalytics.escalations.level1}, L2:{analytics.slaAnalytics.escalations.level2})
                </span>
              </div>
            </Card>
          </div>

          {/* 4. Deterministic Operational Insights Banner */}
          <Card className="p-5 border-status-assigned/40 bg-status-assigned/5">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded bg-status-assigned/20 text-[#9E7D1A] shrink-0 mt-0.5">
                <Sparkles size={18} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">
                    Rule-Based Operational Insights
                  </h3>
                  <span className="text-[10px] font-mono text-muted uppercase">Deterministic Telemetry</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-ink/90">
                  {analytics.operationalInsights?.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-2 bg-paper/80 p-2.5 rounded border border-line/60"
                    >
                      <ArrowUpRight size={14} className="text-brand shrink-0 mt-0.5" />
                      <span className="leading-snug">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 5. Charts Grid (Logical Grouping) */}
          <div className="space-y-6">
            {/* Chart Row 1: Volume Trend & SLA Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Volume Over Time */}
              <Card className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-ink">Complaint Volume Over Time</h3>
                    <p className="text-xs text-muted">Created vs Resolved historical trajectory</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted bg-subtle/60 px-2 py-0.5 rounded border border-line">
                    Interval: {analytics.period?.interval || 'day'}
                  </span>
                </div>
                <div className="h-64 w-full">
                  {analytics.volumeTrends && analytics.volumeTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.volumeTrends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--line)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--ink)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone"
                          dataKey="created"
                          name="Created"
                          stroke="#4A6FA1"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="resolved"
                          name="Resolved"
                          stroke="#6B8F71"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="breached"
                          name="Breached"
                          stroke="#C2683D"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted font-mono">
                      No complaint records found in this date window
                    </div>
                  )}
                </div>
              </Card>

              {/* Chart 2: SLA Status Distribution */}
              <Card className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-ink">SLA Health Breakdown</h3>
                    <p className="text-xs text-muted">Compliance, risk levels, and overdue work orders</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted">Click slice to drill-down</span>
                </div>
                <div className="h-64 w-full">
                  {analytics.slaAnalytics?.totalManaged > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'On Track', value: analytics.slaAnalytics.onTrack, slaStatus: 'ON_TRACK', color: SLA_PALETTE.ON_TRACK },
                            { name: 'At Risk', value: analytics.slaAnalytics.atRisk, slaStatus: 'AT_RISK', color: SLA_PALETTE.AT_RISK },
                            { name: 'Breached', value: analytics.slaAnalytics.breached, slaStatus: 'BREACHED', color: SLA_PALETTE.BREACHED },
                            { name: 'Resolved in SLA', value: analytics.slaAnalytics.resolvedWithinSla, slaStatus: 'RESOLVED', color: SLA_PALETTE.RESOLVED },
                          ].filter((d) => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={45}
                          paddingAngle={3}
                          onClick={(entry) => handleDrillDown('slaStatus', entry.slaStatus)}
                          className="cursor-pointer"
                        >
                          {[
                            { color: SLA_PALETTE.ON_TRACK },
                            { color: SLA_PALETTE.AT_RISK },
                            { color: SLA_PALETTE.BREACHED },
                            { color: SLA_PALETTE.RESOLVED },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--surface)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--line)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--ink)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted font-mono">
                      No active SLA managed tickets in this period
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Chart Row 2: Category Breakdown & Priority Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Complaints by Category */}
              <Card className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-ink">Volume by Facility Category</h3>
                    <p className="text-xs text-muted">Click bar to filter complaints by category</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted">Interactive Drill-down</span>
                </div>
                <div className="h-64 w-full">
                  {analytics.categoryDistribution && analytics.categoryDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.categoryDistribution}
                        margin={{ top: 5, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--line)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--ink)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                          }}
                          formatter={(val, name, item) => [
                            `${val} complaints (${item.payload.percentage}%)`,
                            item.payload.category,
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          radius={[4, 4, 0, 0]}
                          onClick={(data) => handleDrillDown('category', data.category)}
                          className="cursor-pointer"
                        >
                          {analytics.categoryDistribution.map((entry, index) => (
                            <Cell
                              key={`cat-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted font-mono">
                      No category distribution data available
                    </div>
                  )}
                </div>
              </Card>

              {/* Chart 4: Priority & Status Breakdown */}
              <Card className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-ink">Priority Severity Distribution</h3>
                    <p className="text-xs text-muted">Criticality tiers across campus infrastructure</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted">Click bar to drill-down</span>
                </div>
                <div className="h-64 w-full">
                  {analytics.priorityDistribution && analytics.priorityDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.priorityDistribution}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="priority" tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--line)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--ink)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Count"
                          radius={[4, 4, 0, 0]}
                          onClick={(data) => handleDrillDown('priority', data.priority)}
                          className="cursor-pointer"
                        >
                          {analytics.priorityDistribution.map((entry, index) => (
                            <Cell
                              key={`prio-${index}`}
                              fill={PRIORITY_PALETTE[entry.priority] || '#4A6FA1'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted font-mono">
                      No priority distribution data available
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Chart Row 3: Campus Location Hotspots & Satisfaction Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 5: Campus Location Hotspots */}
              <Card className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-ink">Campus Facility Hotspots (Top 8)</h3>
                    <p className="text-xs text-muted">Concentration of infrastructure issues by physical location</p>
                  </div>
                  <MapPin size={15} className="text-muted" />
                </div>
                <div className="h-64 w-full">
                  {analytics.locationHotspots && analytics.locationHotspots.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={analytics.locationHotspots.slice(0, 8)}
                        margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="location"
                          tick={{ fontSize: 9, fill: 'var(--ink)' }}
                          width={110}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--line)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--ink)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                          }}
                          formatter={(val, name, item) => [
                            `${val} total (${item.payload.highPriorityCount} High/Crit, ${item.payload.breachCount} breaches)`,
                            item.payload.location,
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          fill="#C2683D"
                          radius={[0, 4, 4, 0]}
                          onClick={(data) => handleDrillDown('search', data.location)}
                          className="cursor-pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted font-mono">
                      No campus hotspot data found
                    </div>
                  )}
                </div>
              </Card>

              {/* Chart 6: Student Feedback Rating Distribution */}
              <Card className="p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-ink">Student Satisfaction & Feedback</h3>
                    <p className="text-xs text-muted">Post-resolution ratings and sentiment</p>
                  </div>
                  <div className="flex items-center space-x-1 text-xs font-mono text-ink bg-status-assigned/15 px-2 py-0.5 rounded border border-status-assigned/30">
                    <Star size={12} className="text-[#9E7D1A] fill-[#9E7D1A]" />
                    <span className="font-semibold">{analytics.feedbackAnalytics?.avgRating || 'N/A'}</span>
                    <span className="text-muted text-[10px]">({analytics.feedbackAnalytics?.totalRatings || 0} reviews)</span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  {analytics.feedbackAnalytics?.totalRatings > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { stars: '5 Stars', count: analytics.feedbackAnalytics.breakdown[5] || 0 },
                          { stars: '4 Stars', count: analytics.feedbackAnalytics.breakdown[4] || 0 },
                          { stars: '3 Stars', count: analytics.feedbackAnalytics.breakdown[3] || 0 },
                          { stars: '2 Stars', count: analytics.feedbackAnalytics.breakdown[2] || 0 },
                          { stars: '1 Star', count: analytics.feedbackAnalytics.breakdown[1] || 0 },
                        ]}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="stars" tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--line)',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--ink)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                        <Bar dataKey="count" fill="#C9A227" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted font-mono">
                      No student feedback ratings submitted in this period
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* 6. Staff Performance & Capacity Table */}
          <Card className="p-5 border-line shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink flex items-center space-x-2">
                  <Users size={16} className="text-brand" />
                  <span>Maintenance Staff Performance & Workload</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Resolution completion rates, active work order capacity, and SLA compliance per technician.
                </p>
              </div>
              <span className="text-[10px] font-mono text-muted">Click row to inspect assigned tickets</span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] font-mono uppercase text-muted bg-subtle/50">
                    <th className="py-2.5 px-3 cursor-pointer" onClick={() => toggleSort('name')}>
                      Technician {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => toggleSort('assignedCount')}>
                      Assigned {sortField === 'assignedCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => toggleSort('activeCount')}>
                      Active Workload {sortField === 'activeCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => toggleSort('resolvedCount')}>
                      Resolved {sortField === 'resolvedCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => toggleSort('breachedCount')}>
                      Breached {sortField === 'breachedCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => toggleSort('slaComplianceRate')}>
                      SLA Compliance {sortField === 'slaComplianceRate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => toggleSort('completionRate')}>
                      Completion Rate {sortField === 'completionRate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => toggleSort('avgResolutionHours')}>
                      Avg Resolution {sortField === 'avgResolutionHours' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {sortedStaff.map((s) => (
                    <tr
                      key={s.staffId}
                      className="hover:bg-subtle/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-medium text-ink">{s.name}</div>
                        <div className="text-[10px] font-mono text-muted">{s.email}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium">{s.assignedCount}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] ${
                            s.activeCount >= 4
                              ? 'bg-[#C2683D]/15 text-[#8B3416] border border-[#C2683D]/30 font-semibold'
                              : 'bg-surface text-ink border border-line'
                          }`}
                        >
                          {s.activeCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#2E6037]">{s.resolvedCount}</td>
                      <td className="py-3 px-3 text-center font-mono text-[#8B3416]">
                        {s.breachedCount > 0 ? (
                          <span className="font-medium">{s.breachedCount}</span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-medium">{s.slaComplianceRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs">{s.completionRate}%</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">
                        {s.avgResolutionHours > 0 ? `${s.avgResolutionHours}h` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDrillDown('assignedStaff', s.staffId)}
                          className="text-[11px] py-1 px-2 h-auto"
                        >
                          View Workload
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sortedStaff.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-xs text-muted font-mono">
                        No maintenance personnel records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 7. Operational Intelligence & Automation Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Duplicate Detection */}
            <Card className="p-4 bg-paper">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">Duplicate Filter</span>
                <Bot size={15} />
              </div>
              <div className="text-2xl font-medium text-ink mt-2">
                {analytics.qualityIntelligence?.duplicateCount || 0}
              </div>
              <p className="text-[11px] text-muted mt-1">
                {analytics.qualityIntelligence?.duplicateRate || 0}% redundant submissions flagged to prevent staff dispatch duplication.
              </p>
            </Card>

            {/* AI vs Rule-Based Dispatch */}
            <Card className="p-4 bg-paper">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">Auto-Classification</span>
                <Sparkles size={15} />
              </div>
              <div className="text-2xl font-medium text-ink mt-2">
                {analytics.qualityIntelligence?.aiClassifications || 0}
                <span className="text-xs text-muted font-normal ml-1">AI / {analytics.qualityIntelligence?.ruleBasedClassifications || 0} Rules</span>
              </div>
              <p className="text-[11px] text-muted mt-1">
                Automated facility routing and priority calibration engines.
              </p>
            </Card>

            {/* Manual Admin Overrides */}
            <Card className="p-4 bg-paper">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-mono uppercase tracking-wider font-medium">Manual Overrides</span>
                <ShieldCheck size={15} />
              </div>
              <div className="text-2xl font-medium text-ink mt-2">
                {analytics.qualityIntelligence?.manualPriorityOverrides || 0}
              </div>
              <p className="text-[11px] text-muted mt-1">
                {analytics.qualityIntelligence?.manualOverrideFrequency || 0}% tickets manually re-prioritized by campus administrators.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
