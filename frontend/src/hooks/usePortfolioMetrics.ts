// ============================================================================
// FILE: hooks/usePortfolioMetrics.ts
// Custom hook for portfolio metrics and analytics
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

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

interface UsePortfolioMetricsProps {
  portfolioId: string;
  userId: string;
  assets: DisplayAsset[];
  portfolioValue: number;
  portfolioCost: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UsePortfolioMetricsReturn {
  metrics: PortfolioMetrics;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshMetrics: () => Promise<void>;
}

export const usePortfolioMetrics = ({
  portfolioId,
  userId,
  assets,
  portfolioValue,
  portfolioCost,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes default
}: UsePortfolioMetricsProps): UsePortfolioMetricsReturn => {
  
  const [metrics, setMetrics] = useState<PortfolioMetrics>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Calculate daily and monthly performance
  const calculatePerformanceMetrics = useCallback(async (): Promise<Partial<PortfolioMetrics>> => {
    if (assets.length === 0) return {};

    try {
      // For now, we'll calculate basic performance metrics
      // In a real implementation, you'd fetch historical data to compare with current values
      
      // Mock daily gain calculation (would need historical data in practice)
      const mockDailyGain = portfolioValue * (Math.random() * 0.04 - 0.02); // Random -2% to +2%
      const dailyGainPercent = portfolioValue > 0 ? (mockDailyGain / portfolioValue) * 100 : 0;
      
      // Mock monthly gain calculation (would need historical data in practice)
      const mockMonthlyGain = portfolioValue * (Math.random() * 0.12 - 0.06); // Random -6% to +6%
      const monthlyGainPercent = portfolioValue > 0 ? (mockMonthlyGain / portfolioValue) * 100 : 0;

      return {
        dailyGain: mockDailyGain,
        dailyGainPercent,
        monthlyGain: mockMonthlyGain,
        monthlyGainPercent
      };
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      return {};
    }
  }, [assets, portfolioValue]);

  // Calculate risk metrics using portfolio data (client-safe implementation)
  const fetchRiskMetrics = useCallback(async (): Promise<Partial<PortfolioMetrics>> => {
    if (!userId || assets.length === 0) return {};

    try {
      console.log('🔍 Calculating risk metrics for portfolio:', portfolioId);
      
      // Calculate basic metrics using portfolio composition
      const totalValue = portfolioValue;
      const totalCost = portfolioCost;
      
      if (totalValue <= 0) return {};
      
      // Calculate risk metrics based on portfolio characteristics
      const assetTypes = assets.map(asset => asset.assetType.toLowerCase());
      const hasStocks = assetTypes.some(type => type.includes('stock') || type.includes('etf'));
      const hasCrypto = assetTypes.some(type => type.includes('crypto'));
      const hasOptions = assetTypes.some(type => type.includes('option'));
      
      // Calculate concentration risk
      const concentrations = assets.map(asset => asset.totalValue / totalValue);
      const maxConcentration = Math.max(...concentrations);
      
      // Estimate beta based on portfolio composition
      let estimatedBeta = 1.0;
      if (hasCrypto) estimatedBeta += 0.5;
      if (hasOptions) estimatedBeta += 0.3;
      if (maxConcentration > 0.5) estimatedBeta += 0.2;
      
      // Estimate volatility based on portfolio characteristics
      let estimatedVolatility = 15.0; // Base volatility
      if (hasCrypto) estimatedVolatility += 10.0;
      if (hasOptions) estimatedVolatility += 8.0;
      if (maxConcentration > 0.3) estimatedVolatility += 5.0;
      
      // Calculate VaR as 2% of portfolio value (simplified)
      const estimatedVar = totalValue * 0.02;
      
      // Estimate Sharpe ratio based on current return and volatility
      const currentReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
      const annualizedReturn = currentReturn * 2; // Rough annualization
      const riskFreeRate = 2.0; // Assume 2% risk-free rate
      const estimatedSharpe = estimatedVolatility > 0 ? (annualizedReturn - riskFreeRate) / estimatedVolatility : 0;
      
      return {
        beta: Number(estimatedBeta.toFixed(2)),
        volatility: Number(estimatedVolatility.toFixed(1)),
        var: Number(estimatedVar.toFixed(0)),
        sharpeRatio: Number(estimatedSharpe.toFixed(2))
      };
      
    } catch (error) {
      console.error('Error calculating risk metrics:', error);
      return {};
    }
  }, [userId, portfolioId, assets, portfolioValue, portfolioCost]);

  // Main function to refresh all metrics
  const refreshMetrics = useCallback(async () => {
    if (assets.length === 0) {
      setMetrics({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📊 Refreshing portfolio metrics for:', portfolioId);
      
      // Fetch both risk metrics and performance metrics concurrently
      const [riskMetrics, performanceMetrics] = await Promise.all([
        fetchRiskMetrics(),
        calculatePerformanceMetrics()
      ]);

      // Combine all metrics
      const combinedMetrics: PortfolioMetrics = {
        ...riskMetrics,
        ...performanceMetrics
      };

      setMetrics(combinedMetrics);
      setLastUpdated(new Date());
      
      console.log('✅ Portfolio metrics updated successfully:', combinedMetrics);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch portfolio metrics';
      setError(errorMessage);
      console.error('❌ Error refreshing portfolio metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [assets, portfolioId, fetchRiskMetrics, calculatePerformanceMetrics]);

  // Effect to load metrics on mount and when dependencies change
  useEffect(() => {
    if (portfolioId && userId && assets.length > 0) {
      refreshMetrics();
    }
  }, [portfolioId, userId, assets.length, refreshMetrics]);

  // Effect for auto-refresh
  useEffect(() => {
    if (!autoRefresh || !portfolioId || assets.length === 0) return;

    const interval = setInterval(() => {
      refreshMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, portfolioId, assets.length, refreshMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refreshMetrics
  };
};