import React from 'react';
import { motion } from 'framer-motion';

/**
 * StatusRail Component — Visual signature of CampusCare
 * 
 * Flow: PENDING -> REVIEWED -> ASSIGNED -> IN_PROGRESS -> RESOLVED
 * Reached nodes fill solid with semantic status color; unreached nodes render hollow/outlined in line color.
 * 
 * Supports:
 * - orientation: "vertical" (detail view / sidebar cards) | "horizontal" (landing / dashboard summaries)
 * - currentStatus: string
 * - statusHistory: array of { status, changedAt, changedBy, notes }
 */
const STATUS_STEPS = [
  {
    key: 'PENDING',
    label: 'Submitted',
    color: 'var(--status-pending)',
    activeHex: '#8A8F98',
  },
  {
    key: 'REVIEWED',
    label: 'Reviewed',
    color: 'var(--status-reviewed)',
    activeHex: '#4A6FA1',
  },
  {
    key: 'ASSIGNED',
    label: 'Assigned',
    color: 'var(--status-assigned)',
    activeHex: '#C9A227',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    color: 'var(--status-progress)',
    activeHex: '#C2683D',
  },
  {
    key: 'RESOLVED',
    label: 'Resolved',
    color: 'var(--status-resolved)',
    activeHex: '#6B8F71',
  },
];

const StatusRail = ({
  currentStatus = 'PENDING',
  statusHistory = [],
  orientation = 'vertical',
  compact = false,
  className = '',
}) => {
  const currentIndex = STATUS_STEPS.findIndex(
    (s) => s.key === (currentStatus || '').toUpperCase()
  );
  // Fallback to 0 if not found
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  // Format date helper for history
  const getHistoryInfo = (key) => {
    if (!statusHistory || !Array.isArray(statusHistory)) return null;
    return statusHistory.find((h) => (h.status || '').toUpperCase() === key);
  };

  if (orientation === 'horizontal') {
    return (
      <div className={`w-full ${className}`}>
        <div className="relative flex items-center justify-between">
          {/* Connector rail behind nodes */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-line z-0" />
          
          {/* Reached rail highlight */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] z-0 transition-all duration-300"
            style={{
              width: `${(activeIdx / (STATUS_STEPS.length - 1)) * 100}%`,
              backgroundColor: STATUS_STEPS[activeIdx].color,
            }}
          />

          {STATUS_STEPS.map((step, idx) => {
            const isReached = idx <= activeIdx;
            const isCurrent = idx === activeIdx;

            return (
              <div
                key={step.key}
                className="relative z-10 flex flex-col items-center group"
              >
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isReached ? step.activeHex : 'var(--paper)',
                    borderColor: isReached ? step.activeHex : 'var(--line)',
                  }}
                  transition={{ duration: 0.2 }}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isCurrent ? 'ring-4 ring-offset-2 ring-line' : ''
                  }`}
                >
                  {isReached ? (
                    <div className="w-2 h-2 rounded-full bg-paper" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-line" />
                  )}
                </motion.div>

                {!compact && (
                  <span
                    className={`mt-2 text-xs font-mono tracking-tight text-center ${
                      isReached ? 'font-medium text-ink' : 'text-muted'
                    }`}
                  >
                    {step.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical Orientation (Default)
  return (
    <div className={`flex flex-col space-y-0 ${className}`}>
      {STATUS_STEPS.map((step, idx) => {
        const isReached = idx <= activeIdx;
        const isCurrent = idx === activeIdx;
        const isLast = idx === STATUS_STEPS.length - 1;
        const historyItem = getHistoryInfo(step.key);

        return (
          <div key={step.key} className="flex items-start group">
            {/* Column 1: Node + Vertical Connector line */}
            <div className="flex flex-col items-center mr-4">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isReached ? step.activeHex : 'var(--paper)',
                  borderColor: isReached ? step.activeHex : 'var(--line)',
                }}
                transition={{ duration: 0.2 }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isCurrent ? 'ring-4 ring-offset-1 ring-line' : ''
                }`}
              >
                {isReached ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-paper" />
                ) : (
                  <div className="w-1 h-1 rounded-full bg-line" />
                )}
              </motion.div>

              {!isLast && (
                <div
                  className="w-[2px] h-9 my-1 transition-colors duration-200"
                  style={{
                    backgroundColor: idx < activeIdx ? STATUS_STEPS[idx + 1].color : 'var(--line)',
                  }}
                />
              )}
            </div>

            {/* Column 2: Label, Timestamp, and History Notes */}
            <div className="pb-3 pt-0.5 flex-1">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono uppercase tracking-wider ${
                    isReached ? 'font-medium text-ink' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>

                {historyItem && historyItem.changedAt && (
                  <span className="text-[11px] font-mono text-muted">
                    {new Date(historyItem.changedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {historyItem && historyItem.notes && (
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  {historyItem.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusRail;
