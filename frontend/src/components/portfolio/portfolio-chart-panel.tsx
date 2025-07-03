// ============================================================================
// FILE: components/portfolio/portfolio-chart-panel.tsx
// Dedicated portfolio chart panel that displays outside of chat
// ============================================================================

'use client';

import React from 'react';
import { ChartDisplay } from '@/components/chat/chart-display';

interface ChartData {
  type: 'pie' | 'bar';
  title: string;
  data: Array<{ name: string; value: number }>;
}

interface PortfolioChartPanelProps {
  chartData: ChartData | null;
  className?: string;
}

export const PortfolioChartPanel: React.FC<PortfolioChartPanelProps> = ({ 
  chartData, 
  className = '' 
}) => {
  return (
    <div className={`bg-white border border-gray-100 ${className}`}>
      {/* Minimalist Header */}
      {chartData && (
        <div className="p-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{chartData.title}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {chartData.type.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Chart Content */}
      <div className="p-3">
        {chartData ? (
          <div className="h-80">
            <ChartDisplay data={chartData} />
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
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
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Showing {chartData.data.length} items
            </span>
            <div className="flex space-x-2">
              <button 
                className="text-blue-600 hover:text-blue-800 text-xs"
                onClick={() => {
                  // Future: Add export functionality
                  console.log('Export chart functionality to be implemented');
                }}
              >
                Export
              </button>
              <button 
                className="text-blue-600 hover:text-blue-800 text-xs"
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