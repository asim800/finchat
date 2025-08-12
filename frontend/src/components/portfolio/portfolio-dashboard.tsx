// ============================================================================
// FILE: components/portfolio/portfolio-dashboard.tsx
// Comprehensive portfolio dashboard with risk metrics and performance indicators
// ============================================================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Shield, Target, BarChart3 } from 'lucide-react';

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  price?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PortfolioMetrics {
  beta?: number;
  volatility?: number;
  var?: number;
  sharpeRatio?: number;
  dailyGain?: number;
  dailyGainPercent?: number;
  monthlyGain?: number;
  monthlyGainPercent?: number;
}

interface PortfolioDashboardProps {
  portfolioId: string;
  portfolioName: string;
  assets: DisplayAsset[];
  portfolioValue: number;
  portfolioCost: number;
  metrics?: PortfolioMetrics;
  loading?: boolean;
  onRefresh?: () => void;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  portfolioId,
  portfolioName,
  assets,
  portfolioValue,
  portfolioCost,
  metrics = {},
  loading = false,
  onRefresh
}) => {
  // Calculate basic metrics if not provided
  const totalGainLoss = portfolioValue - portfolioCost;
  const totalGainLossPercent = portfolioCost > 0 ? (totalGainLoss / portfolioCost) * 100 : 0;

  // Risk level determination based on available metrics
  const getRiskLevel = (): { level: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } => {
    if (metrics.beta && metrics.volatility) {
      if (metrics.beta > 1.5 || metrics.volatility > 25) {
        return { level: 'High Risk', color: 'text-red-600', variant: 'destructive' };
      } else if (metrics.beta > 1.2 || metrics.volatility > 15) {
        return { level: 'Medium Risk', color: 'text-yellow-600', variant: 'warning' };
      } else {
        return { level: 'Low Risk', color: 'text-green-600', variant: 'success' };
      }
    }
    return { level: 'Unknown', color: 'text-gray-600', variant: 'secondary' };
  };

  const riskInfo = getRiskLevel();

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage values
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold text-gray-900">Portfolio Analytics</h4>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-3 rounded-lg border animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-3 rounded-lg border">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-semibold text-gray-900">Portfolio Analytics</h4>
          <Badge variant={riskInfo.variant} className="text-xs">
            {riskInfo.level}
          </Badge>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Portfolio Beta */}
        <Card className="bg-white border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-blue-800">Beta</CardTitle>
            <Activity className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-900">
              {metrics.beta ? metrics.beta.toFixed(2) : '--'}
            </div>
            <p className="text-xs text-blue-600 leading-tight">
              {metrics.beta ? (
                metrics.beta > 1 ? 'High volatility' : 
                metrics.beta < 1 ? 'Low volatility' : 'Market volatility'
              ) : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        {/* Volatility */}
        <Card className="bg-white border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-orange-800">Volatility</CardTitle>
            <BarChart3 className="h-3 w-3 text-orange-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-orange-900">
              {metrics.volatility ? `${metrics.volatility.toFixed(1)}%` : '--'}
            </div>
            <p className="text-xs text-orange-600 leading-tight">
              Annualized
            </p>
          </CardContent>
        </Card>

        {/* Value at Risk (VaR) */}
        <Card className="bg-white border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-red-800">Daily VaR</CardTitle>
            <Shield className="h-3 w-3 text-red-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-red-900">
              {metrics.var ? formatCurrency(Math.abs(metrics.var)) : '--'}
            </div>
            <p className="text-xs text-red-600 leading-tight">
              95% confidence
            </p>
          </CardContent>
        </Card>

        {/* Sharpe Ratio */}
        <Card className="bg-white border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-green-800">Sharpe Ratio</CardTitle>
            <Target className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-green-900">
              {metrics.sharpeRatio ? metrics.sharpeRatio.toFixed(2) : '--'}
            </div>
            <p className="text-xs text-green-600 leading-tight">
              Risk-adjusted
            </p>
          </CardContent>
        </Card>

        {/* Today's Gain/Loss */}
        <Card className="bg-white border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-purple-800">Today's P&L</CardTitle>
            {metrics.dailyGain && metrics.dailyGain >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`text-lg font-bold ${
              metrics.dailyGain && metrics.dailyGain >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {metrics.dailyGain ? formatCurrency(metrics.dailyGain) : '--'}
            </div>
            <p className={`text-xs leading-tight ${
              metrics.dailyGainPercent && metrics.dailyGainPercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.dailyGainPercent ? formatPercent(metrics.dailyGainPercent) : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Gain/Loss */}
        <Card className="bg-white border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-indigo-800">Month's P&L</CardTitle>
            {metrics.monthlyGain && metrics.monthlyGain >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`text-lg font-bold ${
              metrics.monthlyGain && metrics.monthlyGain >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {metrics.monthlyGain ? formatCurrency(metrics.monthlyGain) : '--'}
            </div>
            <p className={`text-xs leading-tight ${
              metrics.monthlyGainPercent && metrics.monthlyGainPercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.monthlyGainPercent ? formatPercent(metrics.monthlyGainPercent) : 'Calculating...'}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Summary Footer */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs">
          <div className="text-gray-600">
            {assets.length} assets • {new Date().toLocaleTimeString()}
          </div>
          <div className={`font-medium ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Total: {formatCurrency(totalGainLoss)} ({formatPercent(totalGainLossPercent)})
          </div>
        </div>
      </div>
    </div>
  );
};