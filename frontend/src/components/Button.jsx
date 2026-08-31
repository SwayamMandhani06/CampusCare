import React from 'react';

/**
 * Design System Button
 * Variants: primary (filled --brand), secondary (outline --line), danger (red tint)
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
    'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-brand';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-4 py-2 h-10 gap-2',
    lg: 'text-base px-5 py-2.5 h-12 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-brand text-paper hover:bg-brand-hover active:bg-[#253952] border border-transparent shadow-sm',
    secondary:
      'bg-transparent text-ink border border-line hover:border-muted/40 hover:bg-paper/80 active:bg-line/40',
    danger:
      'bg-transparent text-priority-critical border border-priority-critical/40 hover:bg-priority-critical/10 active:bg-priority-critical/20',
    ghost:
      'bg-transparent text-muted hover:text-ink hover:bg-line/30 active:bg-line/60 border border-transparent',
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
