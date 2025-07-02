// ============================================================================
// FILE: lib/historical-price-service.ts
// Service for managing historical asset prices
// ============================================================================

import { prisma } from './db';

export interface HistoricalPriceData {
  id: string;
  symbol: string;
  price: number;
  date: Date;
  source?: string | null;
  assetType?: string | null;
  createdAt: Date;
}

export interface CreateHistoricalPriceData {
  symbol: string;
  price: number;
  date: Date;
  source?: string;
  assetType?: string;
}

export class HistoricalPriceService {
  
  /**
   * Get the most recent price for a symbol
   */
  static async getLatestPrice(symbol: string): Promise<number | null> {
    try {
      const latestPrice = await prisma.historicalPrice.findFirst({
        where: { symbol: symbol.toUpperCase() },
        orderBy: { date: 'desc' },
        select: { price: true }
      });
      
      return latestPrice?.price || null;
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get historical prices for a symbol within a date range
   */
  static async getPriceHistory(
    symbol: string, 
    startDate?: Date, 
    endDate?: Date,
    limit?: number
  ): Promise<HistoricalPriceData[]> {
    try {
      const whereClause: any = { symbol: symbol.toUpperCase() };
      
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = startDate;
        if (endDate) whereClause.date.lte = endDate;
      }

      const prices = await prisma.historicalPrice.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: limit,
      });

      return prices.map(price => ({
        ...price,
        date: new Date(price.date),
        createdAt: new Date(price.createdAt)
      }));
    } catch (error) {
      console.error(`Error fetching price history for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Add a new historical price entry
   */
  static async addPrice(data: CreateHistoricalPriceData): Promise<HistoricalPriceData | null> {
    try {
      const price = await prisma.historicalPrice.create({
        data: {
          symbol: data.symbol.toUpperCase(),
          price: data.price,
          date: data.date,
          source: data.source || 'manual',
          assetType: data.assetType || 'stock'
        }
      });

      return {
        ...price,
        date: new Date(price.date),
        createdAt: new Date(price.createdAt)
      };
    } catch (error) {
      // Handle unique constraint violation (duplicate symbol + date)
      if ((error as any).code === 'P2002') {
        console.warn(`Price already exists for ${data.symbol} on ${data.date}`);
        return null;
      }
      console.error(`Error adding price for ${data.symbol}:`, error);
      return null;
    }
  }

  /**
   * Add multiple historical prices in bulk
   */
  static async addPricesBulk(prices: CreateHistoricalPriceData[]): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    for (const priceData of prices) {
      const result = await this.addPrice(priceData);
      if (result) {
        success++;
      } else {
        errors++;
      }
    }

    return { success, errors };
  }

  /**
   * Update asset prices with latest historical data
   */
  static async updateAssetPrices(portfolioId?: string): Promise<{ updated: number; notFound: number }> {
    try {
      // Get all assets (optionally filtered by portfolio)
      const whereClause = portfolioId ? { portfolioId } : {};
      const assets = await prisma.asset.findMany({
        where: whereClause,
        select: { id: true, symbol: true, price: true }
      });

      let updated = 0;
      let notFound = 0;

      for (const asset of assets) {
        const latestPrice = await this.getLatestPrice(asset.symbol);
        
        if (latestPrice !== null) {
          // Only update if the price has changed
          if (asset.price !== latestPrice) {
            await prisma.asset.update({
              where: { id: asset.id },
              data: { price: latestPrice }
            });
            updated++;
          }
        } else {
          // Set to null if no historical price found
          if (asset.price !== null) {
            await prisma.asset.update({
              where: { id: asset.id },
              data: { price: null }
            });
          }
          notFound++;
        }
      }

      return { updated, notFound };
    } catch (error) {
      console.error('Error updating asset prices:', error);
      return { updated: 0, notFound: 0 };
    }
  }

  /**
   * Get price data for multiple symbols (for portfolio valuation)
   */
  static async getLatestPricesForSymbols(symbols: string[]): Promise<Record<string, number | null>> {
    try {
      const prices = await prisma.historicalPrice.findMany({
        where: {
          symbol: { in: symbols.map(s => s.toUpperCase()) }
        },
        orderBy: { date: 'desc' },
        distinct: ['symbol'],
        select: { symbol: true, price: true }
      });

      const priceMap: Record<string, number | null> = {};
      
      // Initialize all symbols with null
      symbols.forEach(symbol => {
        priceMap[symbol.toUpperCase()] = null;
      });
      
      // Fill in available prices
      prices.forEach(price => {
        priceMap[price.symbol] = price.price;
      });

      return priceMap;
    } catch (error) {
      console.error('Error fetching prices for symbols:', error);
      return {};
    }
  }

  /**
   * Delete old historical prices (for cleanup)
   */
  static async cleanupOldPrices(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.historicalPrice.deleteMany({
        where: {
          date: { lt: cutoffDate }
        }
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up old prices:', error);
      return 0;
    }
  }
}