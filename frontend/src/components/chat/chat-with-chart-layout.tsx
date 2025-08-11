// ============================================================================
// FILE: components/chat/chat-with-chart-layout.tsx
// Layout component that combines chat interface with portfolio chart panel
// ============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import { ChatInterface } from './chat-interface';
import { PortfolioChartPanel } from '@/components/portfolio/portfolio-chart-panel';

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

interface ChatWithChartLayoutProps {
  isGuestMode?: boolean;
  userId?: string;
}

export const ChatWithChartLayout: React.FC<ChatWithChartLayoutProps> = ({ 
  isGuestMode = false, 
  userId 
}) => {
  const [currentChartData, setCurrentChartData] = useState<ChartData | null>(null);

  const handleChartUpdate = useCallback((chartData: ChartData | null) => {
    setCurrentChartData(chartData);
  }, []);

  return (
    <div className="flex h-full gap-6">
      {/* Chat Interface - Left Panel */}
      <div className="flex-1 min-w-0">
        <ChatInterface 
          isGuestMode={isGuestMode} 
          userId={userId}
          onChartUpdate={handleChartUpdate}
          hideInlineCharts={true}
        />
      </div>

      {/* Portfolio Chart Panel - Right Panel */}
      <div className="w-96 flex-shrink-0">
        <PortfolioChartPanel 
          chartData={currentChartData}
          className="h-full"
        />
      </div>
    </div>
  );
};