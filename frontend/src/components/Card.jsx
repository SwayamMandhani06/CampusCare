import React from 'react';

/**
 * Card Component
 * Quiet, purposeful container with hairline borders
 */
const Card = ({ children, className = '', hover = false, onClick, ...props }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-paper border border-line rounded-lg p-6 transition-all duration-150 ${
        hover ? 'hover:border-muted/40 hover:shadow-sm cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
