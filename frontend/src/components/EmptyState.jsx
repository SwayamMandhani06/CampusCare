import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No Records Found',
  message = 'There are no active items matching your criteria in this view.',
  action,
  className = '',
}) => {
  return (
    <div className={`p-10 rounded-lg border border-line bg-paper/50 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-line/40 text-muted flex items-center justify-center">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        <p className="text-xs text-muted max-w-sm leading-relaxed">{message}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
