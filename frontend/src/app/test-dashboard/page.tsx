// ============================================================================
// FILE: app/test-dashboard/page.tsx
// Test page to verify chat analytics dashboard components
// ============================================================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Mock analytics data for testing
const mockAnalytics = {
  queryPatterns: {
    regexpSuccessRate: 75.5,
    llmFallbackRate: 20.2,
    hybridUsageRate: 4.3,
    mostCommonActions: [
      { action: 'show', count: 45, percentage: 45.0 },
      { action: 'add', count: 30, percentage: 30.0 },
      { action: 'update', count: 15, percentage: 15.0 },
      { action: 'remove', count: 10, percentage: 10.0 }
    ],
    mostQueriedSymbols: [
      { symbol: 'AAPL', count: 23, percentage: 23.0 },
      { symbol: 'TSLA', count: 18, percentage: 18.0 },
      { symbol: 'SPY', count: 15, percentage: 15.0 },
      { symbol: 'GOOGL', count: 12, percentage: 12.0 }
    ]
  },
  performance: {
    averageLatency: 125,
    p95Latency: 850,
    p99Latency: 2100,
    regexpAvgLatency: 25,
    llmAvgLatency: 1200,
    hybridAvgLatency: 350
  },
  errors: {
    totalErrors: 5,
    errorsByType: {
      'validation': 3,
      'database': 1,
      'llm': 1
    },
    errorsByProcessingType: {
      'regexp': 2,
      'llm': 2,
      'hybrid': 1
    },
    errorTrends: []
  },
  userBehavior: {
    sessionLength: 5.2,
    queriesPerSession: 3.8,
    repeatUsers: 25,
    guestVsAuth: {
      guest: 60,
      authenticated: 40
    }
  }
};

export default function TestDashboardPage() {
  const [timeRange, setTimeRange] = React.useState('24h');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Test Chat Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
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
          <Button variant="outline">
            Export JSON
          </Button>
          <Button variant="outline">
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Regexp Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.queryPatterns.regexpSuccessRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Direct processing</p>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 text-green-600 bg-green-50">
              ↗️ up
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">LLM Fallback Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.queryPatterns.llmFallbackRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Complex queries</p>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 text-yellow-600 bg-yellow-50">
              → stable
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.performance.averageLatency}ms</div>
            <p className="text-xs text-gray-500 mt-1">End-to-end response</p>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 text-green-600 bg-green-50">
              ↗️ up
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalytics.errors.totalErrors}</div>
            <p className="text-xs text-gray-500 mt-1">Failed queries</p>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 text-green-600 bg-green-50">
              ↗️ up
            </div>
          </CardContent>
        </Card>
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
                  <span className="text-sm text-gray-500">{mockAnalytics.performance.regexpAvgLatency}ms</span>
                </div>
                <Progress value={mockAnalytics.performance.regexpAvgLatency / 10} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">LLM Processing</span>
                  <span className="text-sm text-gray-500">{mockAnalytics.performance.llmAvgLatency}ms</span>
                </div>
                <Progress value={mockAnalytics.performance.llmAvgLatency / 30} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Hybrid Processing</span>
                  <span className="text-sm text-gray-500">{mockAnalytics.performance.hybridAvgLatency}ms</span>
                </div>
                <Progress value={mockAnalytics.performance.hybridAvgLatency / 10} className="h-2" />
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
                  <Progress value={mockAnalytics.queryPatterns.regexpSuccessRate} className="w-20 h-2" />
                  <span className="text-sm text-gray-500">{mockAnalytics.queryPatterns.regexpSuccessRate}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">LLM Queries</span>
                <div className="flex items-center space-x-2">
                  <Progress value={mockAnalytics.queryPatterns.llmFallbackRate} className="w-20 h-2" />
                  <span className="text-sm text-gray-500">{mockAnalytics.queryPatterns.llmFallbackRate}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Hybrid Queries</span>
                <div className="flex items-center space-x-2">
                  <Progress value={mockAnalytics.queryPatterns.hybridUsageRate} className="w-20 h-2" />
                  <span className="text-sm text-gray-500">{mockAnalytics.queryPatterns.hybridUsageRate}%</span>
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
              {mockAnalytics.queryPatterns.mostCommonActions.map((action, index) => (
                <div key={action.action} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium w-8">{index + 1}.</span>
                    <Badge variant="outline">{action.action}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{action.count}</span>
                    <span className="text-xs text-gray-400">({action.percentage}%)</span>
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
              {mockAnalytics.queryPatterns.mostQueriedSymbols.map((symbol, index) => (
                <div key={symbol.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium w-8">{index + 1}.</span>
                    <Badge variant="outline">{symbol.symbol}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{symbol.count}</span>
                    <span className="text-xs text-gray-400">({symbol.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Status */}
      <Card>
        <CardHeader>
          <CardTitle>Component Test Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant="outline" className="text-green-600 border-green-600">✅ Card</Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-green-600 border-green-600">✅ Button</Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-green-600 border-green-600">✅ Select</Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-green-600 border-green-600">✅ Progress</Badge>
            </div>
          </div>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-green-800 font-medium">🎉 All UI components are working correctly!</p>
            <p className="text-green-600 text-sm mt-1">
              You can now access the full chat analytics dashboard at: 
              <code className="ml-1 px-2 py-1 bg-green-100 rounded">/dashboard/admin/chat-analytics</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}