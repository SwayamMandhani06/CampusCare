import React from 'react';

/**
 * Input Component
 * Consistent hairline border and intentional focus outline in --brand
 */
const Input = ({
  label,
  id,
  type = 'text',
  error,
  helperText,
  className = '',
  required = false,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-xs font-medium tracking-wide text-ink">
          {label} {required && <span className="text-priority-critical">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`w-full px-3 py-2 bg-paper text-sm text-ink border rounded transition-all duration-150 placeholder:text-muted/60 ${
          error
            ? 'border-priority-critical focus:border-priority-critical focus-visible:outline-priority-critical'
            : 'border-line hover:border-muted/50 focus:border-brand focus-visible:outline-brand'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-priority-critical font-mono">{error}</span>}
      {!error && helperText && <span className="text-xs text-muted">{helperText}</span>}
    </div>
  );
};

export default Input;
