import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import { CATEGORIES } from '../../utils/categoryIcons';
import { ArrowLeft, PlusCircle, AlertCircle } from 'lucide-react';

const PRIORITIES = [
  { value: 'LOW', label: 'Low — Minor issue, minimal impact', dotColor: 'var(--priority-low)' },
  { value: 'MEDIUM', label: 'Medium — Moderate inconvenience', dotColor: 'var(--priority-medium)' },
  { value: 'HIGH', label: 'High — Significant disruption to facilities', dotColor: 'var(--priority-high)' },
  { value: 'CRITICAL', label: 'Critical — Immediate hazard / urgent outage', dotColor: 'var(--priority-critical)' },
];

const RaiseComplaintPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Electrical',
    location: '',
    priority: 'MEDIUM',
    description: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (apiError) setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Please enter a clear summary title';
    } else if (formData.title.length > 100) {
      errs.title = 'Title cannot exceed 100 characters';
    }
    if (!formData.location.trim()) {
      errs.location = 'Specify the building, room, or area (e.g. Block C, Room 204)';
    }
    if (!formData.description.trim()) {
      errs.description = 'Provide specific details regarding the breakdown or fault';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const res = await api.post('/complaints', formData);
      if (res.data && res.data.complaint) {
        // Direct redirect to detail & tracking view
        navigate(`/complaints/${res.data.complaint._id}`);
      }
    } catch (err) {
      console.error('[RaiseComplaint] Error:', err);
      setApiError(
        err.response?.data?.message ||
          'Failed to submit complaint. Please check fields and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-xs font-mono text-muted hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft size={14} className="mr-1" />
        Back to Dashboard
      </Link>

      <Card className="p-6 sm:p-8 shadow-sm">
        <div className="mb-6 pb-4 border-b border-line">
          <div className="w-8 h-8 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-2">
            <PlusCircle size={18} />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            Raise a Complaint
          </h1>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Report infrastructure, equipment, or facility maintenance requests across campus.
          </p>
        </div>

        {apiError && (
          <div className="mb-6 p-3 rounded bg-priority-critical/10 border border-priority-critical/30 flex items-start space-x-2 text-xs text-priority-critical">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <Input
            label="Issue Summary Title"
            id="title"
            placeholder="e.g. Broken water tap leaking in Block B 2nd floor restroom"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="flex flex-col space-y-1.5 text-left">
              <label htmlFor="category" className="text-xs font-medium tracking-wide text-ink">
                Maintenance Category <span className="text-priority-critical">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-paper text-sm text-ink border border-line rounded transition-all duration-150 cursor-pointer focus:border-brand focus-visible:outline-brand"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <Input
              label="Exact Location"
              id="location"
              placeholder="e.g. Block C, Room 204 or Library 1st Floor"
              value={formData.location}
              onChange={handleChange}
              error={errors.location}
              required
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col space-y-1.5 text-left">
            <label htmlFor="priority" className="text-xs font-medium tracking-wide text-ink">
              Urgency / Priority Level <span className="text-priority-critical">*</span>
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-paper text-sm text-ink border border-line rounded transition-all duration-150 cursor-pointer focus:border-brand focus-visible:outline-brand font-mono text-xs"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  [{p.value}] — {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Description */}
          <Textarea
            label="Detailed Description"
            id="description"
            rows={5}
            placeholder="Describe what is broken, how long it has been occurring, and any hazard or disruption it causes..."
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            required
          />

          <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Submit Complaint
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RaiseComplaintPage;
