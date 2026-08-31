import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import { CATEGORIES, getCategoryIcon } from '../../utils/categoryIcons';
import { formatRelativeDate } from '../../utils/formatDate';
import {
  Search,
  Filter,
  PlusCircle,
  MapPin,
  ArrowRight,
  RotateCcw,
  FileQuestion,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const MyComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

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
      try {
        const params = {};
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (category) params.category = category;
        if (status) params.status = status;

        const res = await api.get('/complaints', { params });
        if (res.data && res.data.complaints) {
          setComplaints(res.data.complaints);
        }
      } catch (err) {
        console.error('[MyComplaints] Error:', err);
        setError('Failed to load complaints.');
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [debouncedSearch, category, status]);

  const hasActiveFilters = Boolean(search || category || status);

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('');
    setStatus('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
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

        <Link to="/complaints/new">
          <Button variant="primary" size="md">
            <PlusCircle size={16} />
            <span>Raise Complaint</span>
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="my-6 p-4 bg-paper border border-line rounded-lg flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={16}
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
        <div className="w-full md:w-52">
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
        <div className="w-full md:w-44">
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

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs font-mono text-muted shrink-0"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* Complaint List or Empty States */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-xs font-mono text-muted">Retrieving complaints...</span>
        </div>
      ) : complaints.length === 0 ? (
        hasActiveFilters ? (
          /* Empty state for filter mismatch */
          <Card className="p-12 text-center border-dashed">
            <div className="w-10 h-10 rounded-full bg-line/60 mx-auto flex items-center justify-center text-muted mb-3">
              <FileQuestion size={18} />
            </div>
            <h3 className="text-sm font-medium text-ink">No matching complaints</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-5">
              No tickets match your search terms or active status/category filters.
            </p>
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Clear Search Filters
            </Button>
          </Card>
        ) : (
          /* Empty state for zero total complaints */
          <Card className="p-12 text-center border-dashed">
            <div className="w-10 h-10 rounded-full bg-line/60 mx-auto flex items-center justify-center text-muted mb-3">
              <PlusCircle size={18} />
            </div>
            <h3 className="text-sm font-medium text-ink">No complaints yet</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-5">
              If something on campus needs attention, report it.
            </p>
            <Link to="/complaints/new">
              <Button variant="primary" size="sm">
                Report an Issue
              </Button>
            </Link>
          </Card>
        )
      ) : (
        /* Complaints List */
        <div className="border border-line rounded-lg divide-y divide-line bg-paper overflow-hidden">
          {complaints.map((item) => (
            <Link
              key={item._id}
              to={`/complaints/${item._id}`}
              className="p-4 sm:p-5 hover:bg-line/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="p-2.5 rounded bg-line/40 shrink-0 mt-0.5">
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
                  <div className="flex items-center text-xs text-muted">
                    <MapPin size={12} className="mr-1 shrink-0" />
                    <span className="truncate max-w-[300px]">{item.location}</span>
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
