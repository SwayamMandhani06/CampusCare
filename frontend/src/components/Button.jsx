import React from 'react';

/**
 * Design System Button
 * Variants: primary (filled --brand with guaranteed high-contrast white text),
 *           secondary (surface with hairline border and subtle hover tint),
 *           danger (semantic critical tint),
 *           ghost (quiet hover)
 */
const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-4 py-2 h-10 gap-2',
    lg: 'text-base px-5 py-2.5 h-11 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-brand text-white hover:bg-brand-hover active:scale-[0.98] border border-transparent shadow-xs',
    secondary:
      'bg-surface text-ink border border-line hover:border-line-strong hover:bg-subtle active:scale-[0.98] shadow-xs',
    danger:
      'bg-priority-critical/10 text-priority-critical border border-priority-critical/30 hover:bg-priority-critical/20 active:scale-[0.98]',
    ghost:
      'bg-transparent text-muted hover:text-ink hover:bg-subtle active:scale-[0.98] border border-transparent',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      )}
      {children}
    </button>
  );
};

export default Button;
