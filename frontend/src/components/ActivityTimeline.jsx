import React from 'react';
import {
  FileText,
  Clock,
  Wrench,
  CheckCircle,
  MessageSquare,
  Star,
  Image,
  ArrowRight,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { formatTimeAgo, formatFullDateTime } from '../utils/formatDate';

const ActivityTimeline = ({ timeline = [] }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-4 rounded border border-dashed border-line text-center text-xs text-muted">
        No activity logged yet.
      </div>
    );
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'CREATED':
        return <FileText size={13} className="text-brand" />;
      case 'ASSIGNED':
        return <Wrench size={13} className="text-status-assigned" />;
      case 'STATUS_CHANGED':
        return <Clock size={13} className="text-status-reviewed" />;
      case 'RESOLVED':
        return <CheckCircle size={13} className="text-status-resolved" />;
      case 'COMMENT_ADDED':
        return <MessageSquare size={13} className="text-brand" />;
      case 'FEEDBACK_SUBMITTED':
        return <Star size={13} className="text-status-assigned" />;
      case 'IMAGE_UPLOADED':
        return <Image size={13} className="text-brand" />;
      default:
        return <Clock size={13} className="text-muted" />;
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <Shield size={10} className="text-status-reviewed" />;
    if (role === 'staff') return <Wrench size={10} className="text-status-assigned" />;
    return <GraduationCap size={10} className="text-brand" />;
  };

  return (
    <div className="relative pl-6 space-y-5 text-left before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-line">
      {timeline.map((event, index) => (
        <div key={event._id || index} className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-paper border border-line flex items-center justify-center shadow-xs">
            {getEventIcon(event.eventType)}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-medium text-ink">
                  {event.actorName || 'System'}
                </span>
                {event.actorRole && (
                  <span className="inline-flex items-center space-x-1 px-1 py-0.2 rounded text-[9px] font-mono uppercase bg-line/40 text-muted">
                    {getRoleIcon(event.actorRole)}
                    <span>{event.actorRole}</span>
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-mono text-muted"
                title={formatFullDateTime(event.timestamp)}
              >
                {formatTimeAgo(event.timestamp)}
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {event.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
