import React from 'react';

export const SkeletonBox = ({ className = '' }) => (
  <div className={`bg-line/60 rounded animate-pulse ${className}`} />
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`p-5 rounded-lg border border-line bg-paper/60 space-y-3 ${className}`}>
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
      <div key={i} className="h-12 bg-line/40 rounded border border-line/50 animate-pulse" />
    ))}
  </div>
);

export default SkeletonCard;
