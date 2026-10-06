import React from 'react';

/**
 * Textarea Component
 * Multi-line input with consistent hairline borders and surface elevation
 */
const Textarea = ({
  label,
  id,
  rows = 4,
  error,
  helperText,
  className = '',
  required = false,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-ink tracking-tight flex items-center justify-between">
          <span>
            {label} {required && <span className="text-priority-critical font-bold">*</span>}
          </span>
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`w-full px-3.5 py-2.5 bg-surface text-sm text-ink border rounded-lg transition-all duration-150 placeholder:text-muted/60 resize-y shadow-2xs ${
          error
            ? 'border-priority-critical focus:border-priority-critical focus-visible:outline-priority-critical focus:ring-1 focus:ring-priority-critical/30'
            : 'border-line hover:border-line-strong focus:border-brand focus-visible:outline-brand focus:ring-1 focus:ring-brand/30'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-priority-critical font-mono">{error}</span>}
      {!error && helperText && <span className="text-xs text-muted">{helperText}</span>}
    </div>
  );
};

export default Textarea;
