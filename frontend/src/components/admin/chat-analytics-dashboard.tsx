// ============================================================================
// FILE: components/admin/chat-analytics-dashboard.tsx
// Real-time analytics dashboard for chat query analysis
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LogAnalytics } from '@/lib/chat-logger';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'green' | 'red' | 'blue' | 'yellow';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend, color = 'blue' }) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    blue: 'text-blue-600 bg-blue-50',
    yellow: 'text-yellow-600 bg-yellow-50'
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${colorClasses[color]}`}>
            {trend === 'up' && '↗️'}
            {trend === 'down' && '↘️'}
            {trend === 'stable' && '→'}
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function ChatAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<LogAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/chat-analytics?timeRange=${timeRange}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setAnalytics(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch analytics');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // You might want to show a toast notification here
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [timeRange, autoRefresh]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/admin/chat-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export',
          format,
          timeRange
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const blob = new Blob([result.data], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-logs-${timeRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      // You might want to show a toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600">No analytics data available</p>
          <Button onClick={() => setIsLoading(true)} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Chat Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "🔄 Auto" : "⏸️ Manual"}
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Regexp Success Rate"
          value={`${analytics.queryPatterns.regexpSuccessRate.toFixed(1)}%`}
          subtitle="Direct processing"
          trend={analytics.queryPatterns.regexpSuccessRate > 70 ? 'up' : 'down'}
          color={analytics.queryPatterns.regexpSuccessRate > 70 ? 'green' : 'red'}
        />
        <MetricCard
          title="LLM Fallback Rate"
          value={`${analytics.queryPatterns.llmFallbackRate.toFixed(1)}%`}
          subtitle="Complex queries"
          trend={analytics.queryPatterns.llmFallbackRate < 30 ? 'up' : 'down'}
          color={analytics.queryPatterns.llmFallbackRate < 30 ? 'green' : 'yellow'}
        />
        <MetricCard
          title="Average Latency"
          value={`${analytics.performance.averageLatency.toFixed(0)}ms`}
          subtitle="End-to-end response"
          trend={analytics.performance.averageLatency < 500 ? 'up' : 'down'}
          color={analytics.performance.averageLatency < 500 ? 'green' : 'red'}
        />
        <MetricCard
          title="Error Rate"
          value={`${analytics.errors.totalErrors}`}
          subtitle="Failed queries"
          trend={analytics.errors.totalErrors === 0 ? 'up' : 'down'}
          color={analytics.errors.totalErrors === 0 ? 'green' : 'red'}
        />
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Processing Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Regexp Processing</span>
                  <span className="text-sm text-gray-500">{analytics.performance.regexpAvgLatency.toFixed(0)}ms</span>
                </div>
                <Progress value={Math.min((analytics.performance.regexpAvgLatency / 1000) * 100, 100)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">LLM Processing</span>
                  <span className="text-sm text-gray-500">{analytics.performance.llmAvgLatency.toFixed(0)}ms</span>
                </div>
                <Progress value={Math.min((analytics.performance.llmAvgLatency / 3000) * 100, 100)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Hybrid Processing</span>
                  <span className="text-sm text-gray-500">{analytics.performance.hybridAvgLatency.toFixed(0)}ms</span>
                </div>
                <Progress value={Math.min((analytics.performance.hybridAvgLatency / 2000) * 100, 100)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Query Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Regexp Queries</span>
                <div className="flex items-center space-x-2">
                  <Progress value={analytics.queryPatterns.regexpSuccessRate} className="w-20 h-2" />
                  <span className="text-sm text-gray-500">{analytics.queryPatterns.regexpSuccessRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">LLM Queries</span>
                <div className="flex items-center space-x-2">
                  <Progress value={analytics.queryPatterns.llmFallbackRate} className="w-20 h-2" />
                  <span className="text-sm text-gray-500">{analytics.queryPatterns.llmFallbackRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Hybrid Queries</span>
                <div className="flex items-center space-x-2">
                  <Progress value={analytics.queryPatterns.hybridUsageRate} className="w-20 h-2" />
                  <span className="text-sm text-gray-500">{analytics.queryPatterns.hybridUsageRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Actions and Symbols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Most Common Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.queryPatterns.mostCommonActions.slice(0, 10).map((action, index) => (
                <div key={action.action} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium w-8">{index + 1}.</span>
                    <Badge variant="outline">{action.action}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{action.count}</span>
                    <span className="text-xs text-gray-400">({action.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Queried Symbols</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.queryPatterns.mostQueriedSymbols.slice(0, 10).map((symbol, index) => (
                <div key={symbol.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium w-8">{index + 1}.</span>
                    <Badge variant="outline">{symbol.symbol}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{symbol.count}</span>
                    <span className="text-xs text-gray-400">({symbol.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Analysis */}
      {analytics.errors.totalErrors > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Errors by Type</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.errors.errorsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <Badge variant="destructive">{type}</Badge>
                      <span className="text-sm">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Errors by Processing Type</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.errors.errorsByProcessingType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <Badge variant="outline">{type}</Badge>
                      <span className="text-sm">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>User Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.userBehavior.sessionLength.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Avg Session Length</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.userBehavior.queriesPerSession.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Queries per Session</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analytics.userBehavior.repeatUsers}</div>
              <div className="text-sm text-gray-500">Repeat Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {analytics.userBehavior.guestVsAuth.guest + analytics.userBehavior.guestVsAuth.authenticated}
              </div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}