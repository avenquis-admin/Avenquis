/**
 * LoadingSkeleton - Refined shimmering placeholders for dense enterprise tables and cards
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#E8E2D5] rounded',
        className
      )}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div className="w-full border border-[#E3DDD2] rounded-lg bg-[#FAF8F3] overflow-hidden">
      {/* Header Skeleton */}
      <div className="flex items-center px-4 py-3 bg-[#F2EDE2] border-b border-[#E3DDD2] gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1">
            <Skeleton className="h-3.5 w-3/4 max-w-[120px]" />
          </div>
        ))}
      </div>

      {/* Row Skeletons */}
      <div className="divide-y divide-[#EDE7DC]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center px-4 py-3.5 gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className="flex-1">
                <Skeleton
                  className={cn(
                    'h-3.5',
                    c === 0 ? 'w-4/5' : c === columns - 1 ? 'w-16' : 'w-2/3'
                  )}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const MetricGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 border border-[#E5DFD4] rounded-lg bg-[#FAF8F3] space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
          <Skeleton className="h-8 w-32" />
          <div className="pt-2 border-t border-[#EDE7DC] flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};
