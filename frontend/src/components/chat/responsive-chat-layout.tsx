// ============================================================================
// FILE: components/chat/responsive-chat-layout.tsx
// Responsive layout that adapts to different screen sizes
// ============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import { ChatInterface } from './chat-interface';
import { PortfolioChartPanel } from '@/components/portfolio/portfolio-chart-panel';
import { Button } from '@/components/ui/button';

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
  const [isChartVisible, setIsChartVisible] = useState(false);

  const handleChartUpdate = useCallback((chartData: ChartData | null) => {
    setCurrentChartData(chartData);
    if (chartData) {
      setIsChartVisible(true);
    }
  }, []);

  const toggleChart = () => {
    setIsChartVisible(!isChartVisible);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row lg:gap-6 min-h-0">
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile Chart Toggle Button */}
        {currentChartData && (
          <div className="lg:hidden mb-2">
            <Button 
              onClick={toggleChart}
              variant="outline" 
              size="sm"
              className="w-full"
            >
              {isChartVisible ? 'Hide Chart' : 'Show Chart'} 📊
            </Button>
          </div>
        )}

        {/* Mobile Chart Panel (when visible) */}
        {currentChartData && isChartVisible && (
          <div className="lg:hidden mb-4">
            <div className="h-80 border rounded-lg">
              <PortfolioChartPanel 
                chartData={currentChartData}
                className="h-full"
              />
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          <ChatInterface 
            isGuestMode={isGuestMode} 
            userId={userId}
            onChartUpdate={handleChartUpdate}
            hideInlineCharts={true}
          />
        </div>
      </div>

      {/* Desktop/Tablet Chart Panel - Right Sidebar */}
      <div className="hidden lg:block lg:w-96 lg:flex-shrink-0">
        <PortfolioChartPanel 
          chartData={currentChartData}
          className="h-full sticky top-0"
        />
      </div>
    </div>
  );
};