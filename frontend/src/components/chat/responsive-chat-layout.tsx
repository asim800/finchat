// ============================================================================
// FILE: components/chat/responsive-chat-layout.tsx
// Responsive layout that adapts to different screen sizes
// ============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import { ChatInterface } from './chat-interface';
import { PortfolioChartPanel } from '@/components/portfolio/portfolio-chart-panel';
// import { Button } from '@/components/ui/button';

interface ChartData {
  type: 'pie' | 'bar';
  title: string;
  data: Array<{ name: string; value: number }>;
}

interface ResponsiveChatLayoutProps {
  isGuestMode?: boolean;
  userId?: string;
}

export const ResponsiveChatLayout: React.FC<ResponsiveChatLayoutProps> = ({ 
  isGuestMode = false, 
  userId 
}) => {
  const [currentChartData, setCurrentChartData] = useState<ChartData | null>(null);
  // const [isChartVisible, setIsChartVisible] = useState(false);

  const handleChartUpdate = useCallback((chartData: ChartData | null) => {
    setCurrentChartData(chartData);
    if (chartData) {
      // setIsChartVisible(true);
    }
  }, []);

  // const toggleChart = () => {
  //   setIsChartVisible(!isChartVisible);
  // };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface 
          isGuestMode={isGuestMode} 
          userId={userId}
          onChartUpdate={handleChartUpdate}
          hideInlineCharts={true}
        />
      </div>

      {/* Chart Panel - Follows Chat Box */}
      {currentChartData && (
        <div className="flex-shrink-0 mt-4">
          <div className="h-80 border border-gray-100 rounded">
            <PortfolioChartPanel 
              chartData={currentChartData}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};