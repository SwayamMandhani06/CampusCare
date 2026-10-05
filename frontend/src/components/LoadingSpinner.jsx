import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ label = 'Loading...', size = 20, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-10 space-y-3 text-muted ${className}`}>
      <Loader2 size={size} className="animate-spin text-brand" />
      {label && <span className="text-xs font-mono tracking-wide">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
