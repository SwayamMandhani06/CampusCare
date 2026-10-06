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
  ExternalLink,
  AlertTriangle,
  AlertOctagon,
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
  const dropdownRef = useRef(null);

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
      const res = await api.get('/notifications?limit=15');
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

  // Fetch list when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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
      const complaintId = typeof notif.complaintId === 'object' ? notif.complaintId._id : notif.complaintId;
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
        return <AlertTriangle size={14} className="text-amber-500" />;
      case 'SLA_BREACH':
      case 'SLA_BREACHED':
        return <AlertOctagon size={14} className="text-red-500" />;
      case 'COMPLAINT_ESCALATED':
        return <Flame size={14} className="text-rose-500" />;
      default:
        return <Bell size={14} className="text-muted" />;
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-1.5 rounded text-muted hover:text-ink hover:bg-line/40 transition-colors focus:outline-none focus:ring-1 focus:ring-brand"
        title="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-priority-critical text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-paper border border-line shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-paper/90 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-ink">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-priority-critical/10 text-priority-critical font-medium">
                  {unreadCount} new
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

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-line/40">
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
                  className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer text-left ${
                    !n.read ? 'bg-brand/5 hover:bg-brand/10' : 'hover:bg-line/20'
                  }`}
                >
                  <div className="mt-0.5 p-1 rounded bg-line/30 shrink-0">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs truncate ${!n.read ? 'font-medium text-ink' : 'text-muted'}`}>
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
                      className="p-1 text-muted hover:text-brand rounded shrink-0"
                      title="Mark as read"
                    >
                      <span className="w-2 h-2 rounded-full bg-brand block" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-line/60 bg-paper/60 text-center">
            <span className="text-[10px] font-mono text-muted">
              Auto-syncs facility updates
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
