// ============================================================================
// FILE: components/portfolio/portfolio-chart-panel.tsx
// Dedicated portfolio chart panel that displays outside of chat
// ============================================================================

'use client';

import React from 'react';
import { ChartDisplay } from '@/components/chat/chart-display';

interface ChartData {
  type: 'pie' | 'bar' | 'figure';
  title: string;
  data?: Array<{ name: string; value: number }>; // Optional for backward compatibility
  figureData?: {
    type: 'svg' | 'interactive';
    content: string;
    width?: number;
    height?: number;
  };
}

interface PortfolioChartPanelProps {
  chartData: ChartData | null;
  className?: string;
  onClose?: () => void;
}

export const PortfolioChartPanel: React.FC<PortfolioChartPanelProps> = ({ 
  chartData, 
  className = '',
  onClose
}) => {
  return (
    <div className={`relative bg-white border border-gray-100 ${className}`}>
      {/* Minimalist Header */}
      {chartData && (
        <div className="p-2 md:p-3 border-b border-gray-100">
          <div className="flex items-center justify-between pr-8 md:pr-10">
            <span className="text-sm font-medium text-gray-700 truncate mr-2">{chartData.title}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
              {chartData.type.toUpperCase()}
            </span>
          </div>
          
          {/* Close Button - Touch Friendly */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close chart"
              title="Close chart"
            >
              <svg 
                className="w-4 h-4 md:w-3 md:h-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div className="p-2 md:p-3">
        {chartData ? (
          <div className="h-64 md:h-80">
            <ChartDisplay data={chartData} />
          </div>
        ) : (
          <div className="h-64 md:h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg 
                className="mx-auto h-12 w-12 text-gray-300 mb-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                />
              </svg>
              <p className="text-sm text-gray-500">No chart data available</p>
              <p className="text-xs text-gray-400 mt-1">
                Ask for a portfolio analysis to see charts here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart Actions */}
      {chartData && (
        <div className="p-2 md:p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-gray-600 truncate mr-2">
              {chartData.type === 'figure' ? (
                chartData.figureData ? 'Interactive Dashboard' : 'Figure Display'
              ) : (
                `Showing ${chartData.data?.length || 0} items`
              )}
            </span>
            <div className="flex space-x-2 flex-shrink-0">
              <button 
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                onClick={() => {
                  // Future: Add export functionality
                  console.log('Export chart functionality to be implemented');
                }}
              >
                Export
              </button>
              <button 
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 hidden md:inline-block"
                onClick={() => {
                  // Future: Add fullscreen functionality
                  console.log('Fullscreen chart functionality to be implemented');
                }}
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};