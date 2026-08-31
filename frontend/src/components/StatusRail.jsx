import React, { useState, useEffect, useRef } from 'react';
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
 * - Sequential animation on mount (~150ms per reached stage)
 * - Incremental animation for live status transitions
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
  const targetIndex = STATUS_STEPS.findIndex(
    (s) => s.key === (currentStatus || '').toUpperCase()
  );
  const finalActiveIdx = targetIndex >= 0 ? targetIndex : 0;

  // Track the highest step animated so far
  const [animatedIdx, setAnimatedIdx] = useState(0);
  const initialMounted = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setAnimatedIdx(finalActiveIdx);
      initialMounted.current = true;
      return;
    }

    if (!initialMounted.current) {
      // First mount: animate sequentially from 0 to finalActiveIdx
      initialMounted.current = true;
      let currentStep = 0;
      setAnimatedIdx(0);

      const interval = setInterval(() => {
        currentStep += 1;
        if (currentStep <= finalActiveIdx) {
          setAnimatedIdx(currentStep);
        } else {
          clearInterval(interval);
        }
      }, 150);

      return () => clearInterval(interval);
    } else {
      // Subsequent live update: advance animatedIdx incrementally to finalActiveIdx
      if (finalActiveIdx > animatedIdx) {
        let currentStep = animatedIdx;
        const interval = setInterval(() => {
          currentStep += 1;
          if (currentStep <= finalActiveIdx) {
            setAnimatedIdx(currentStep);
          } else {
            clearInterval(interval);
          }
        }, 180);

        return () => clearInterval(interval);
      } else {
        setAnimatedIdx(finalActiveIdx);
      }
    }
  }, [finalActiveIdx]);

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

          {/* Reached rail highlight with smooth stroke transition */}
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] z-0"
            initial={false}
            animate={{
              width: `${(animatedIdx / (STATUS_STEPS.length - 1)) * 100}%`,
              backgroundColor: STATUS_STEPS[animatedIdx]?.color || 'var(--brand)',
            }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          />

          {STATUS_STEPS.map((step, idx) => {
            const isReached = idx <= animatedIdx;
            const isCurrent = idx === animatedIdx;

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
                    scale: isCurrent ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.25 }}
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
                    className={`mt-2 text-xs font-mono tracking-tight text-center transition-colors duration-200 ${
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
        const isReached = idx <= animatedIdx;
        const isCurrent = idx === animatedIdx;
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
                  scale: isCurrent ? 1.1 : 1,
                }}
                transition={{ duration: 0.25 }}
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
                <div className="w-[2px] h-10 my-1 bg-line relative overflow-hidden">
                  <motion.div
                    className="w-full absolute top-0 left-0"
                    initial={{ height: 0 }}
                    animate={{
                      height: idx < animatedIdx ? '100%' : '0%',
                      backgroundColor:
                        idx < animatedIdx
                          ? STATUS_STEPS[idx + 1].color
                          : 'transparent',
                    }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </div>

            {/* Column 2: Label, Timestamp, and History Notes */}
            <div className="pb-3 pt-0.5 flex-1">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono uppercase tracking-wider transition-colors duration-200 ${
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
