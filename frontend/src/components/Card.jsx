import React from 'react';

/**
 * Card Component
 * Surface container with subtle hairline border and elevation
 */
const Card = ({ children, className = '', hover = false, onClick, ...props }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-line rounded-xl p-6 transition-all duration-200 shadow-xs ${
        hover ? 'hover:border-line-strong hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
