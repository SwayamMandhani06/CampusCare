import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * EmptyState Component
 * Explains what is empty, why, and what action the user can take next
 */
const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No Records Found',
  message = 'There are no active items matching your criteria in this view.',
  action,
  className = '',
}) => {
  return (
    <div className={`p-10 sm:p-12 rounded-xl border border-line bg-surface text-center flex flex-col items-center justify-center space-y-3.5 shadow-xs ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-subtle text-muted border border-line/80 flex items-center justify-center">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
        <p className="text-xs text-muted leading-relaxed">{message}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
