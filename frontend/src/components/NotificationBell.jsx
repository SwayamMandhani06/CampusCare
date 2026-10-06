import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  MessageSquare,
  AlertCircle,
  Wrench,
  Star,
  Flame,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { formatTimeAgo } from '../utils/formatDate';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placement, setPlacement] = useState('right');

  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data && typeof res.data.count === 'number') {
        setUnreadCount(res.data.count);
      }
    } catch {
      // Quiet fail if offline or not logged in
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=20');
      if (res.data && res.data.notifications) {
        setNotifications(res.data.notifications);
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      }
    } catch (err) {
      console.error('[NotificationBell] Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and 30-second polling
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch list and dynamically adjust placement when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // If closer to left screen edge than dropdown width (384px), open toward right
        if (rect.left < 300) {
          setPlacement('left');
        } else {
          setPlacement('right');
        }
      }
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('[NotificationBell] Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationBell] Mark all read error:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue navigation
      }
    }
    setIsOpen(false);

    if (notif.complaintId) {
      const complaintId =
        typeof notif.complaintId === 'object' ? notif.complaintId._id : notif.complaintId;
      navigate(`/complaints/${complaintId}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'COMPLAINT_CREATED':
        return <AlertCircle size={14} className="text-brand" />;
      case 'COMPLAINT_ASSIGNED':
        return <Wrench size={14} className="text-status-assigned" />;
      case 'STATUS_CHANGED':
        return <Clock size={14} className="text-status-reviewed" />;
      case 'COMPLAINT_RESOLVED':
        return <Check size={14} className="text-status-resolved" />;
      case 'COMMENT_ADDED':
        return <MessageSquare size={14} className="text-brand" />;
      case 'FEEDBACK_SUBMITTED':
        return <Star size={14} className="text-status-assigned" />;
      case 'PRIORITY_CHANGED':
        return <Zap size={14} className="text-amber-500" />;
      case 'SLA_AT_RISK':
        return <Clock size={14} className="text-amber-600 dark:text-amber-400" />;
      case 'SLA_BREACH':
      case 'SLA_BREACHED':
        return <Clock size={14} className="text-rose-600 dark:text-rose-400" />;
      case 'COMPLAINT_ESCALATED':
        return <Flame size={14} className="text-rose-500" />;
      default:
        return <Bell size={14} className="text-muted" />;
    }
  };

  const getItemStyle = (notif) => {
    if (notif.read) {
      return 'border-l-2 border-transparent hover:bg-subtle/50 text-muted';
    }
    if (notif.type === 'SLA_BREACH' || notif.type === 'SLA_BREACHED') {
      return 'border-l-2 border-rose-500/60 bg-rose-500/5 hover:bg-rose-500/10 text-ink';
    }
    if (notif.type === 'SLA_AT_RISK') {
      return 'border-l-2 border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-ink';
    }
    if (notif.type === 'COMPLAINT_RESOLVED') {
      return 'border-l-2 border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 text-ink';
    }
    return 'border-l-2 border-brand/50 bg-brand/5 hover:bg-brand/10 text-ink';
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button with calm operational badge */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg text-muted hover:text-ink hover:bg-line/40 transition-colors focus:outline-none focus:ring-1 focus:ring-brand"
        title="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-brand text-white text-[10px] font-mono font-medium rounded-full flex items-center justify-center shadow-2xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Viewport-Safe Popover Panel */}
      {isOpen && (
        <div
          className={`fixed top-14 inset-x-2.5 max-w-[calc(100vw-1.25rem)] mx-auto sm:max-w-none sm:mx-0 sm:absolute sm:top-full sm:mt-2 ${
            placement === 'left' ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'
          } sm:w-96 rounded-2xl bg-surface border border-line shadow-2xl z-50 overflow-hidden flex flex-col max-h-[min(480px,calc(100vh-5rem))] animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Sticky Header */}
          <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-surface/98 backdrop-blur-sm shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-ink">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-brand/10 text-brand font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-mono text-muted hover:text-brand flex items-center space-x-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Scrollable Notification List */}
          <div className="overflow-y-auto flex-1 divide-y divide-line/40">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted font-mono">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No notifications yet. You are all caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer text-left ${getItemStyle(
                    n
                  )}`}
                >
                  <div className="mt-0.5 p-1 rounded bg-line/30 shrink-0">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs truncate ${
                          !n.read ? 'font-medium text-ink' : 'text-muted'
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="text-[10px] font-mono text-muted shrink-0 ml-2">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n._id, e)}
                      className="p-1 text-muted hover:text-brand rounded shrink-0 self-center"
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand block" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2 border-t border-line/60 bg-subtle/40 text-center shrink-0">
            <span className="text-[10px] font-mono text-muted">
              CampusCare Operations Telemetry
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
