import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * ErrorState Component
 * Actionable error presentation without exposing raw stack traces
 */
const ErrorState = ({
  title = 'Unable to Load Content',
  message = 'An unexpected error occurred while communicating with the campus facilities server.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-10 rounded-xl border border-priority-critical/30 bg-priority-critical/5 text-center flex flex-col items-center justify-center space-y-3.5 shadow-xs ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-priority-critical/15 text-priority-critical border border-priority-critical/20 flex items-center justify-center">
        <AlertCircle size={22} strokeWidth={2} />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
        <p className="text-xs text-muted leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <div className="pt-1">
          <Button variant="secondary" size="sm" onClick={onRetry} className="text-xs">
            <RefreshCw size={13} className="mr-1.5" />
            <span>Try Again</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
