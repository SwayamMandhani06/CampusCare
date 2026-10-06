import React, { useState } from 'react';
import { Star, Check, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Button from './Button';
import { formatFullDateTime } from '../utils/formatDate';

const ComplaintFeedback = ({ complaintId, existingFeedback, isOwner, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(existingFeedback?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(existingFeedback || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !rating) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/complaints/${complaintId}/feedback`, {
        rating,
        comment: comment.trim(),
      });
      if (res.data && res.data.feedback) {
        setFeedback(res.data.feedback);
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted(res.data.feedback);
        }
      }
    } catch (err) {
      console.error('[ComplaintFeedback] Error:', err);
      setError(err.response?.data?.message || 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // If feedback already submitted, display the summary card
  if (feedback && feedback.rating) {
    return (
      <div className="p-4 rounded-lg border border-status-resolved/30 bg-status-resolved/5 space-y-2 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-status-resolved font-medium">
              Student Resolution Rating
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                className={
                  star <= feedback.rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-muted/30'
                }
              />
            ))}
            <span className="text-xs font-mono font-bold text-ink ml-1">
              {feedback.rating}/5
            </span>
          </div>
        </div>

        {feedback.comment ? (
          <p className="text-xs text-ink italic leading-relaxed pt-1 border-t border-status-resolved/20">
            "{feedback.comment}"
          </p>
        ) : (
          <p className="text-[11px] text-muted italic">No written comment provided.</p>
        )}

        {feedback.submittedAt && (
          <span className="text-[10px] font-mono text-muted block pt-1">
            Submitted: {formatFullDateTime(feedback.submittedAt)}
          </span>
        )}
      </div>
    );
  }

  // If not resolved or user is not the owner student, show awaiting feedback banner
  if (!isOwner) {
    return (
      <div className="p-4 rounded-xl border border-line bg-subtle/30 text-left text-xs text-muted">
        <span className="font-mono text-[11px] uppercase tracking-wider block text-muted mb-1">
          Service Feedback
        </span>
        Awaiting student satisfaction rating following ticket resolution.
      </div>
    );
  }

  // Student Rating Form
  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-line bg-surface space-y-3.5 text-left shadow-2xs">
      <div>
        <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
          Rate Service Resolution
        </h4>
        <p className="text-xs text-muted mt-0.5">
          How satisfied are you with the facility maintenance work completed?
        </p>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-priority-critical/10 text-priority-critical text-xs flex items-center space-x-1.5 border border-priority-critical/20">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5-Star Picker */}
      <div className="flex items-center space-x-1.5 py-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 rounded hover:bg-line/40 transition-colors focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label={`Rate ${star} star`}
          >
            <Star
              size={22}
              className={`transition-colors ${
                star <= (hoverRating || rating)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-line hover:text-amber-200'
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-mono text-muted ml-2">
          {rating === 5 && 'Excellent'}
          {rating === 4 && 'Good'}
          {rating === 3 && 'Satisfactory'}
          {rating === 2 && 'Needs Improvement'}
          {rating === 1 && 'Poor'}
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-mono text-muted uppercase tracking-wider">
          Optional Feedback Notes (max 500 chars)
        </label>
        <textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share feedback on speed, quality, or technician conduct..."
          maxLength={500}
          className="w-full px-3 py-2 text-xs text-ink bg-surface border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand resize-none placeholder:text-muted/60 transition-colors"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={submitting}
          className="text-xs"
        >
          <Check size={13} className="mr-1.5" />
          <span>{submitting ? 'Submitting...' : 'Submit Rating'}</span>
        </Button>
      </div>
    </form>
  );
};

export default ComplaintFeedback;
