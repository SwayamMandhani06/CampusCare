import React from 'react';

export const SkeletonBox = ({ className = '' }) => (
  <div className={`bg-line/50 dark:bg-subtle rounded-md animate-pulse ${className}`} />
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`p-6 rounded-xl border border-line bg-surface space-y-3.5 shadow-xs ${className}`}>
    <div className="flex justify-between items-center">
      <SkeletonBox className="h-4 w-1/3" />
      <SkeletonBox className="h-4 w-16" />
    </div>
    <SkeletonBox className="h-3 w-3/4" />
    <SkeletonBox className="h-3 w-1/2" />
    <div className="pt-2 flex justify-between items-center">
      <SkeletonBox className="h-3 w-20" />
      <SkeletonBox className="h-3 w-24" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 4, className = '' }) => (
  <div className={`space-y-2.5 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 bg-surface rounded-lg border border-line/70 animate-pulse" />
    ))}
  </div>
);

export default SkeletonCard;
