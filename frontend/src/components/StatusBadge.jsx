import React from 'react';

/**
 * StatusBadge Component
 * Semantic pill using Geist Mono and CSS variables
 */
const StatusBadge = ({ status = 'PENDING', className = '' }) => {
  const upper = (status || 'PENDING').toUpperCase();

  const styles = {
    PENDING: {
      color: 'var(--status-pending)',
      bg: 'rgba(138, 143, 152, 0.12)',
      border: 'rgba(138, 143, 152, 0.3)',
      label: 'PENDING',
    },
    REVIEWED: {
      color: 'var(--status-reviewed)',
      bg: 'rgba(74, 111, 161, 0.12)',
      border: 'rgba(74, 111, 161, 0.3)',
      label: 'REVIEWED',
    },
    ASSIGNED: {
      color: 'var(--status-assigned)',
      bg: 'rgba(201, 162, 39, 0.12)',
      border: 'rgba(201, 162, 39, 0.3)',
      label: 'ASSIGNED',
    },
    IN_PROGRESS: {
      color: 'var(--status-progress)',
      bg: 'rgba(194, 104, 61, 0.12)',
      border: 'rgba(194, 104, 61, 0.3)',
      label: 'IN PROGRESS',
    },
    RESOLVED: {
      color: 'var(--status-resolved)',
      bg: 'rgba(107, 143, 113, 0.14)',
      border: 'rgba(107, 143, 113, 0.35)',
      label: 'RESOLVED',
    },
  };

  const current = styles[upper] || styles.PENDING;

  return (
    <span
      style={{
        color: current.color,
        backgroundColor: current.bg,
        borderColor: current.border,
      }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono tracking-wider uppercase border ${className}`}
    >
      <span
        style={{ backgroundColor: current.color }}
        className="w-1.5 h-1.5 rounded-full mr-1.5 opacity-90"
      />
      {current.label}
    </span>
  );
};

export default StatusBadge;
