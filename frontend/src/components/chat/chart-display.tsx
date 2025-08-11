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
}

export const ChartDisplay: React.FC<ChartDisplayProps> = ({ data }) => {
  if (!data || !data.type) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const renderChart = () => {
    switch (data.type) {
      case 'figure':
        if (data.figureData?.type === 'svg') {
          return (
            <div 
              className="w-full flex justify-center items-center"
              style={{ 
                minHeight: data.figureData.height || 400,
                maxWidth: '100%',
                overflow: 'auto'
              }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: data.figureData.content }}
                className="max-w-full h-auto"
                style={{
                  maxWidth: data.figureData.width || 800,
                  maxHeight: data.figureData.height || 600
                }}
              />
            </div>
          );
        }
        return <div className="text-gray-500">Figure format not supported</div>;
      
      case 'pie':
        if (!data.data) return <div className="text-gray-500">No data provided</div>;
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div className="text-gray-500">Chart type not supported</div>;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{data.title}</h4>
      {renderChart()}
    </div>
  );
};


