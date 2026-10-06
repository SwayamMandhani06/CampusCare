import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import SlaBadge from '../../components/SlaBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { CATEGORIES, getCategoryIcon } from '../../utils/categoryIcons';
import { formatRelativeDate } from '../../utils/formatDate';
import {
  Search,
  PlusCircle,
  MapPin,
  ArrowRight,
  RotateCcw,
  Download,
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

const MyComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch complaints whenever filters change
  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (category) params.category = category;
        if (status) params.status = status;
        if (priority) params.priority = priority;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await api.get('/complaints', { params });
        if (res.data && res.data.complaints) {
          setComplaints(res.data.complaints);
        }
      } catch (err) {
        console.error('[MyComplaints] Error:', err);
        setError('Failed to load complaints. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [debouncedSearch, category, status, priority, startDate, endDate]);

  const hasActiveFilters = Boolean(
    search || category || status || priority || startDate || endDate
  );

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('');
    setStatus('');
    setPriority('');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (category) params.category = category;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/complaints/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `my-complaints-${new Date().toISOString().slice(0, 10)}.csv`
      );
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-muted tracking-wider">
            Ticket Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            My Complaints
          </h1>
          <p className="text-xs text-muted mt-1">
            Track and monitor the status of all requests you have logged.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting || complaints.length === 0}
            className="text-xs font-mono"
            title="Export your complaints to CSV"
          >
            <Download size={13} className="mr-1.5" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
          <Link to="/complaints/new">
            <Button variant="primary" size="sm">
              <PlusCircle size={15} />
              <span>Raise Complaint</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="my-6 p-4 bg-paper border border-line rounded-lg space-y-3">
        {/* Row 1: Search, Category, Status */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              placeholder="Search by title, location or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-paper text-xs text-ink border border-line rounded transition-all focus:border-brand focus-visible:outline-brand placeholder:text-muted/60"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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

        {/* Row 2: Priority, Date Range, Clear */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-2 border-t border-line/60 items-center">
          {/* Priority Filter */}
          <div className="md:col-span-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-paper text-xs text-ink border border-line rounded cursor-pointer focus:border-brand focus-visible:outline-brand font-mono"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="md:col-span-6 flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 px-2.5 py-1.5 bg-paper text-xs text-ink border border-line rounded font-mono"
              title="From date"
            />
            <span className="text-muted text-xs font-mono">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 px-2.5 py-1.5 bg-paper text-xs text-ink border border-line rounded font-mono"
              title="To date"
            />
          </div>

          {/* Clear Filters */}
          <div className="md:col-span-3 flex justify-end">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs font-mono text-muted hover:text-ink w-full md:w-auto"
              >
                <RotateCcw size={12} className="mr-1" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="my-4 p-3 bg-priority-critical/10 border border-priority-critical/30 rounded text-xs text-priority-critical font-mono">
          {error}
        </div>
      )}

      {/* Complaint List or Empty States */}
      {loading ? (
        <div className="py-16 text-center">
          <LoadingSpinner label="Retrieving complaints..." size={22} />
        </div>
      ) : complaints.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No Matching Complaints"
            message="No tickets match your active search terms, status, priority, or date filters."
            action={
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                <RotateCcw size={12} className="mr-1.5" />
                Clear Filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No Complaints Yet"
            message="If something on campus needs maintenance or repair, raise your first ticket."
            action={
              <Link to="/complaints/new">
                <Button variant="primary" size="sm">
                  <PlusCircle size={15} />
                  <span>Report an Issue</span>
                </Button>
              </Link>
            }
          />
        )
      ) : (
        /* Complaints List */
        <div className="border border-line rounded-lg divide-y divide-line bg-paper overflow-hidden shadow-sm">
          {complaints.map((item) => (
            <Link
              key={item._id}
              to={`/complaints/${item._id}`}
              className="p-4 sm:p-5 hover:bg-line/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="p-2.5 rounded bg-line/40 shrink-0 mt-0.5 text-muted group-hover:text-brand transition-colors">
                  {getCategoryIcon(item.category, 18)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono text-muted">
                      #{item._id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-line">•</span>
                    <span className="text-[11px] font-mono text-muted">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-medium text-ink group-hover:text-brand transition-colors truncate">
                    {item.title}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-muted flex-wrap">
                    <span className="flex items-center">
                      <MapPin size={12} className="mr-1 shrink-0 text-brand" />
                      <span className="truncate max-w-[250px]">{item.location}</span>
                    </span>
                    {item.status !== 'RESOLVED' && (item.sla?.status === 'BREACHED' || item.sla?.resolutionBreached) && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-amber-600 bg-amber-500/10 border border-amber-500/20">
                        Delayed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center flex-wrap">
                <PriorityBadge priority={item.priority} />
                <StatusBadge status={item.status} />
                {item.sla?.status && (
                  <SlaBadge status={item.sla.status} showEscalation={false} size="sm" />
                )}
                <span className="text-xs font-mono text-muted hidden md:inline">
                  {formatRelativeDate(item.createdAt)}
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
    </div>
  );
};

export default MyComplaintsPage;
