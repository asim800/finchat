// ============================================================================
// FILE: components/chat/chart-display.tsx
// Chart component for financial data visualization
// ============================================================================

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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

interface ChartDisplayProps {
  data: ChartData;
  onClose?: () => void;
}

export const ChartDisplay: React.FC<ChartDisplayProps> = ({ data, onClose }) => {
  if (!data || !data.type) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const renderChart = () => {
    switch (data.type) {
      case 'figure':
        if (data.figureData?.type === 'svg') {
          return (
            <div 
              className="w-full flex justify-center items-center overflow-auto"
              style={{ 
                minHeight: Math.min(data.figureData.height || 400, 240), // Max 240px on mobile
                maxWidth: '100%'
              }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: data.figureData.content }}
                className="max-w-full h-auto"
                style={{
                  maxWidth: '100%', // Responsive width
                  maxHeight: window.innerWidth < 768 ? '240px' : (data.figureData.height || 600), // Mobile vs desktop
                  width: 'auto',
                  height: 'auto'
                }}
              />
            </div>
          );
        }
        return <div className="text-gray-500">Figure format not supported</div>;
      
      case 'pie':
        if (!data.data) return <div className="text-gray-500">No data provided</div>;
        return (
          <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 300}>
            <PieChart>
              <Pie
                data={data.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={window.innerWidth < 768 ? 60 : 80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.data.map((entry, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        if (!data.data) return <div className="text-gray-500">No data provided</div>;
        return (
          <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 300}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                fontSize={window.innerWidth < 768 ? 10 : 12}
                angle={window.innerWidth < 768 ? -45 : 0}
                textAnchor={window.innerWidth < 768 ? 'end' : 'middle'}
                height={window.innerWidth < 768 ? 60 : 40}
              />
              <YAxis fontSize={window.innerWidth < 768 ? 10 : 12} />
              <Tooltip />
              {window.innerWidth >= 768 && <Legend />}
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div className="text-gray-500">Chart type not supported</div>;
    }
  };

  return (
    <div className="relative bg-white p-2 md:p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h4 className="text-xs md:text-sm font-medium text-gray-700 truncate pr-8">{data.title}</h4>
        
        {/* Optional Close Button for Inline Charts */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 md:top-3 md:right-3 w-6 h-6 md:w-5 md:h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Hide chart"
            title="Hide chart"
          >
            <svg 
              className="w-3 h-3 md:w-2.5 md:h-2.5" 
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
      {renderChart()}
    </div>
  );
};


