import React from 'react';

/**
 * Select Component
 */
const Select = ({
  label,
  id,
  options = [],
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
      <select
        id={id}
        className={`w-full px-3 py-2 bg-paper text-sm text-ink border rounded transition-all duration-150 cursor-pointer ${
          error
            ? 'border-priority-critical focus:border-priority-critical focus-visible:outline-priority-critical'
            : 'border-line hover:border-muted/50 focus:border-brand focus-visible:outline-brand'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-priority-critical font-mono">{error}</span>}
      {!error && helperText && <span className="text-xs text-muted">{helperText}</span>}
    </div>
  );
};

export default Select;
