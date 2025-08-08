// ============================================================================
// FILE: lib/asset-metrics-service.ts
// Asset metrics service for managing financial data (beta, PE ratio, etc.)
// ============================================================================

import { prisma } from './db';

export interface AssetMetrics {
  id: string;
  symbol: string;
  beta?: number | null;
  volatility?: number | null;
  peRatio?: number | null;
  dividendYield?: number | null;
  eps?: number | null;
  marketCap?: number | null;
  sector?: string | null;
  industry?: string | null;
  lastUpdated: Date;
  createdAt: Date;
}

export class AssetMetricsService {
  
  // Get metrics for a specific symbol
  static async getMetricsBySymbol(symbol: string): Promise<AssetMetrics | null> {
    try {
      const metrics = await prisma.assetMetrics.findUnique({
        where: { symbol: symbol.toUpperCase() }
      });
      
      return metrics;
    } catch (error) {
      console.error('Error getting asset metrics:', error);
      return null;
    }
  }

  // Get metrics for multiple symbols
  static async getMetricsForSymbols(symbols: string[]): Promise<Record<string, AssetMetrics>> {
    try {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      const metrics = await prisma.assetMetrics.findMany({
        where: {
          symbol: { in: upperSymbols }
        }
      });

      const metricsMap: Record<string, AssetMetrics> = {};
      metrics.forEach(metric => {
        metricsMap[metric.symbol] = metric;
      });

      return metricsMap;
    } catch (error) {
      console.error('Error getting metrics for symbols:', error);
      return {};
    }
  }

  // Create or update metrics for a symbol
  static async upsertMetrics(
    symbol: string,
    metricsData: {
      beta?: number | null;
      volatility?: number | null;
      peRatio?: number | null;
      dividendYield?: number | null;
      eps?: number | null;
      marketCap?: number | null;
      sector?: string | null;
      industry?: string | null;
    }
  ): Promise<AssetMetrics | null> {
    try {
      const metrics = await prisma.assetMetrics.upsert({
        where: { symbol: symbol.toUpperCase() },
        update: {
          ...metricsData,
          lastUpdated: new Date()
        },
        create: {
          symbol: symbol.toUpperCase(),
          ...metricsData,
          lastUpdated: new Date()
        }
      });

      return metrics;
    } catch (error) {
      console.error('Error upserting asset metrics:', error);
      return null;
    }
  }

  // Bulk upsert metrics for multiple symbols
  static async bulkUpsertMetrics(
    metricsArray: Array<{
      symbol: string;
      beta?: number | null;
      volatility?: number | null;
      peRatio?: number | null;
      dividendYield?: number | null;
      eps?: number | null;
      marketCap?: number | null;
      sector?: string | null;
      industry?: string | null;
    }>
  ): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    for (const metricsData of metricsArray) {
      try {
        await this.upsertMetrics(metricsData.symbol, metricsData);
        success++;
      } catch (error) {
        errors.push(`Failed to update ${metricsData.symbol}: ${error}`);
      }
    }

    return { success, errors };
  }

  // Delete metrics for a symbol
  static async deleteMetrics(symbol: string): Promise<boolean> {
    try {
      await prisma.assetMetrics.delete({
        where: { symbol: symbol.toUpperCase() }
      });
      return true;
    } catch (error) {
      console.error('Error deleting asset metrics:', error);
      return false;
    }
  }

  // Get all metrics with pagination
  static async getAllMetrics(
    page: number = 1,
    limit: number = 100,
    sector?: string
  ): Promise<{ metrics: AssetMetrics[]; total: number; hasMore: boolean }> {
    try {
      const whereClause = sector ? { sector } : {};
      
      const [metrics, total] = await Promise.all([
        prisma.assetMetrics.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { symbol: 'asc' }
        }),
        prisma.assetMetrics.count({ where: whereClause })
      ]);

      return {
        metrics,
        total,
        hasMore: page * limit < total
      };
    } catch (error) {
      console.error('Error getting all metrics:', error);
      return { metrics: [], total: 0, hasMore: false };
    }
  }

  // Get unique sectors
  static async getSectors(): Promise<string[]> {
    try {
      const result = await prisma.assetMetrics.findMany({
        select: { sector: true },
        distinct: ['sector'],
        where: { 
          sector: { not: null }
        }
      });

      return result
        .map(r => r.sector)
        .filter((sector): sector is string => sector !== null)
        .sort();
    } catch (error) {
      console.error('Error getting sectors:', error);
      return [];
    }
  }

  // Get unique industries
  static async getIndustries(sector?: string): Promise<string[]> {
    try {
      const whereClause = sector ? { sector } : {};
      const result = await prisma.assetMetrics.findMany({
        select: { industry: true },
        distinct: ['industry'],
        where: {
          ...whereClause,
          industry: { not: null }
        }
      });

      return result
        .map(r => r.industry)
        .filter((industry): industry is string => industry !== null)
        .sort();
    } catch (error) {
      console.error('Error getting industries:', error);
      return [];
    }
  }

  // Check if metrics data is stale (older than specified hours)
  static async getStaleMetrics(hoursThreshold: number = 24): Promise<string[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

      const staleMetrics = await prisma.assetMetrics.findMany({
        select: { symbol: true },
        where: {
          lastUpdated: { lt: thresholdDate }
        }
      });

      return staleMetrics.map(m => m.symbol);
    } catch (error) {
      console.error('Error getting stale metrics:', error);
      return [];
    }
  }

  // Search metrics by symbol prefix
  static async searchBySymbol(prefix: string, limit: number = 20): Promise<AssetMetrics[]> {
    try {
      const metrics = await prisma.assetMetrics.findMany({
        where: {
          symbol: { startsWith: prefix.toUpperCase() }
        },
        take: limit,
        orderBy: { symbol: 'asc' }
      });

      return metrics;
    } catch (error) {
      console.error('Error searching metrics by symbol:', error);
      return [];
    }
  }
}