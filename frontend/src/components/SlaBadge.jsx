import React from 'react';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Flame,
} from 'lucide-react';

/**
 * SlaBadge Component
 * Semantic status pill for SLA tracking with distinct icons and typography
 * Does not rely on color alone (includes icon + clear text indicator).
 */
const SlaBadge = ({
  status = 'ON_TRACK',
  escalated = false,
  escalationLevel = 0,
  showEscalation = true,
  timeRemaining = null,
  className = '',
  size = 'sm',
}) => {
  const normStatus = (status || 'ON_TRACK').toUpperCase();

  const config = {
    ON_TRACK: {
      label: 'ON TRACK',
      icon: Clock,
      color: '#10b981', // emerald
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
    },
    AT_RISK: {
      label: 'AT RISK',
      icon: AlertTriangle,
      color: '#f59e0b', // amber
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
    },
    BREACHED: {
      label: 'BREACHED',
      icon: AlertOctagon,
      color: '#ef4444', // rose/red
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
    },
    RESOLVED: {
      label: 'RESOLVED',
      icon: CheckCircle,
      color: '#3b82f6', // blue
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.35)',
    },
  };

  const current = config[normStatus] || config.ON_TRACK;
  const Icon = current.icon;

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 11 : 13;
  const padding = isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <div className={`inline-flex items-center flex-wrap gap-1.5 ${className}`}>
      {/* Primary SLA State Pill */}
      <span
        style={{
          color: current.color,
          backgroundColor: current.bg,
          borderColor: current.border,
        }}
        className={`inline-flex items-center rounded-full font-mono font-medium tracking-wider border shadow-2xs ${padding}`}
        title={`SLA Status: ${current.label}${timeRemaining ? ` (${timeRemaining})` : ''}`}
      >
        <Icon size={iconSize} className="mr-1 shrink-0" />
        <span>{current.label}</span>
        {timeRemaining && (
          <span className="ml-1 opacity-85 text-[10px] font-sans font-normal border-l border-current/30 pl-1">
            {timeRemaining}
          </span>
        )}
      </span>

      {/* Escalation Tag */}
      {showEscalation && escalated && (
        <span
          className={`inline-flex items-center rounded-full font-mono font-medium uppercase tracking-wider bg-red-500/15 text-red-500 border border-red-500/40 shadow-2xs ${padding}`}
          title={`Escalated to management (Level ${escalationLevel || 1})`}
        >
          <Flame size={iconSize} className="mr-1 shrink-0 animate-pulse" />
          <span>ESCALATED {escalationLevel > 0 ? `L${escalationLevel}` : ''}</span>
        </span>
      )}
    </div>
  );
};

export default SlaBadge;
