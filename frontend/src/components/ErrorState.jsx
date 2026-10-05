import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

const ErrorState = ({
  title = 'Unable to Load Content',
  message = 'An unexpected error occurred while communicating with the campus facilities server.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-8 rounded-lg border border-priority-critical/30 bg-priority-critical/5 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-priority-critical/10 text-priority-critical flex items-center justify-center">
        <AlertCircle size={22} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        <p className="text-xs text-muted max-w-md mt-1 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2 text-xs">
          <RefreshCw size={13} className="mr-1.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
