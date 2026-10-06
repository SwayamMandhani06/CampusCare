import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Shield, Wrench, GraduationCap, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { formatTimeAgo } from '../utils/formatDate';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

const ComplaintComments = ({ complaintId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const fetchComments = async () => {
    try {
      const res = await api.get(`/complaints/${complaintId}/comments`);
      if (res.data && res.data.comments) {
        setComments(res.data.comments);
      }
    } catch (err) {
      console.error('[ComplaintComments] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      fetchComments();
    }
  }, [complaintId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/complaints/${complaintId}/comments`, {
        text: text.trim(),
      });
      if (res.data && res.data.comment) {
        setComments((prev) => [...prev, res.data.comment]);
        setText('');
      }
    } catch (err) {
      console.error('[ComplaintComments] Post error:', err);
      setError(err.response?.data?.message || 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-status-reviewed/10 text-status-reviewed font-medium border border-status-reviewed/20">
            <Shield size={10} />
            <span>Admin</span>
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-status-assigned/10 text-status-assigned font-medium border border-status-assigned/20">
            <Wrench size={10} />
            <span>Technician</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-brand/10 text-brand font-medium border border-brand/20">
            <GraduationCap size={10} />
            <span>Student</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-brand" />
          <h3 className="text-sm font-medium text-ink">Discussion Thread</h3>
        </div>
        <span className="text-xs font-mono text-muted">
          {comments.length} {comments.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {/* Comment List */}
      <div className="space-y-3">
        {loading ? (
          <LoadingSpinner label="Loading conversation..." size={16} className="py-6" />
        ) : comments.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-line bg-subtle/20 text-center text-xs text-muted">
            No discussion messages yet. You can communicate with facility staff here.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="p-3.5 rounded-xl border border-line bg-surface space-y-1.5 text-left shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-ink">{comment.authorName}</span>
                  {getRoleBadge(comment.authorRole)}
                </div>
                <span className="text-[10px] font-mono text-muted">
                  {formatTimeAgo(comment.createdAt)}
                </span>
              </div>
              <p className="text-xs text-ink leading-relaxed whitespace-pre-line pl-0.5">
                {comment.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* New Comment Input Form */}
      <form onSubmit={handleSubmit} className="pt-2 space-y-2">
        {error && (
          <div className="p-2.5 rounded-lg bg-priority-critical/10 text-priority-critical text-xs flex items-center space-x-1.5 border border-priority-critical/20">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message or response regarding this facility issue..."
            maxLength={1000}
            disabled={submitting}
            className="w-full px-3 py-2 text-xs text-ink bg-surface border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand resize-none placeholder:text-muted/60 transition-colors"
          />
          <div className="absolute right-2.5 bottom-2.5 text-[10px] font-mono text-muted">
            {text.length}/1000
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!text.trim() || submitting}
            className="text-xs"
          >
            <Send size={13} className="mr-1.5" />
            <span>{submitting ? 'Sending...' : 'Send Message'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ComplaintComments;
