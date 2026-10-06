import React from 'react';
import { Clock, CheckCircle, Flame } from 'lucide-react';

/**
 * SlaBadge Component
 * Semantic status pill for SLA tracking with calm operational styling.
 * Avoids alarmist visual design while clearly conveying deadline status.
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
      color: '#059669', // calm emerald
      bg: 'rgba(5, 150, 105, 0.08)',
      border: 'rgba(5, 150, 105, 0.25)',
      desc: 'Within SLA deadline',
    },
    AT_RISK: {
      label: 'AT RISK',
      icon: Clock,
      color: '#d97706', // calm amber
      bg: 'rgba(217, 119, 6, 0.08)',
      border: 'rgba(217, 119, 6, 0.25)',
      desc: 'Approaching SLA deadline',
    },
    BREACHED: {
      label: 'BREACHED',
      icon: Clock,
      color: '#be123c', // restrained rose/wine
      bg: 'rgba(190, 18, 60, 0.08)',
      border: 'rgba(190, 18, 60, 0.24)',
      desc: 'Deadline exceeded — requires attention',
    },
    RESOLVED: {
      label: 'RESOLVED',
      icon: CheckCircle,
      color: '#2563eb', // subtle blue
      bg: 'rgba(37, 99, 235, 0.08)',
      border: 'rgba(37, 99, 235, 0.25)',
      desc: 'Resolved within SLA target',
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
        className={`inline-flex items-center rounded-full font-mono font-medium tracking-wide border shadow-2xs ${padding}`}
        title={`SLA Status: ${current.label} — ${current.desc}${timeRemaining ? ` (${timeRemaining})` : ''}`}
      >
        <Icon size={iconSize} className="mr-1 shrink-0" />
        <span>{current.label}</span>
        {timeRemaining && (
          <span className="ml-1 opacity-80 text-[10px] font-sans font-normal border-l border-current/25 pl-1">
            {timeRemaining}
          </span>
        )}
      </span>

      {/* Escalation Tag — Calm operational styling without constant pulsing */}
      {showEscalation && escalated && (
        <span
          className={`inline-flex items-center rounded-full font-mono font-medium uppercase tracking-wider bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 shadow-2xs ${padding}`}
          title={`Escalated to facilities supervisor (Level ${escalationLevel || 1})`}
        >
          <Flame size={iconSize} className="mr-1 shrink-0 text-rose-500" />
          <span>ESCALATED {escalationLevel > 0 ? `L${escalationLevel}` : ''}</span>
        </span>
      )}
    </div>
  );
};

export default SlaBadge;
