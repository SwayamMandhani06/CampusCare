import React from 'react';

/**
 * PriorityBadge Component
 * Semantic pill using Geist Mono for priority levels
 */
const PriorityBadge = ({ priority = 'MEDIUM', className = '' }) => {
  const upper = (priority || 'MEDIUM').toUpperCase();

  const styles = {
    LOW: {
      color: 'var(--priority-low)',
      bg: 'rgba(107, 143, 113, 0.12)',
      border: 'rgba(107, 143, 113, 0.3)',
    },
    MEDIUM: {
      color: 'var(--priority-medium)',
      bg: 'rgba(201, 162, 39, 0.12)',
      border: 'rgba(201, 162, 39, 0.3)',
    },
    HIGH: {
      color: 'var(--priority-high)',
      bg: 'rgba(194, 104, 61, 0.12)',
      border: 'rgba(194, 104, 61, 0.3)',
    },
    CRITICAL: {
      color: 'var(--priority-critical)',
      bg: 'rgba(177, 74, 74, 0.12)',
      border: 'rgba(177, 74, 74, 0.3)',
    },
  };

  const current = styles[upper] || styles.MEDIUM;

  return (
    <span
      style={{
        color: current.color,
        backgroundColor: current.bg,
        borderColor: current.border,
      }}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono tracking-wider border ${className}`}
    >
      <span
        style={{ backgroundColor: current.color }}
        className="w-1.5 h-1.5 rounded-full mr-1.5"
      />
      {upper}
    </span>
  );
};

export default PriorityBadge;
