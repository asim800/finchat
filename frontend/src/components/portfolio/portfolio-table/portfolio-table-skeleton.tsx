// Loading skeleton for the portfolio table (summary cards + mobile/desktop rows).

import React from 'react';

interface PortfolioTableSkeletonProps {
  showSummary?: boolean;
}

export const PortfolioTableSkeleton: React.FC<PortfolioTableSkeletonProps> = ({ showSummary = true }) => {
  return (
    <div className={showSummary ? "p-6" : ""}>
      {/* Portfolio Summary Skeleton */}
      {showSummary && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Assets Loading Skeleton */}
      <div className="mb-4 flex justify-between items-center">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div>
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
      </div>

      {/* Mobile Card Skeletons */}
      <div className="block md:hidden space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-lg shadow border p-4 animate-pulse">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-12"></div>
              </div>
              <div className="text-right">
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-12 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-8"></div>
              </div>
              <div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-12"></div>
              </div>
              <div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-14 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-10"></div>
              </div>
              <div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-18 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block rounded-md border">
        <div className="space-y-4 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-12"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-12"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-12"></div>
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
