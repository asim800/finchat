// ============================================================================
// FILE: lib/portfolio-service.ts
// Portfolio management service for authenticated users
// ============================================================================

import { prisma } from './db';
import { ParsedAsset } from './portfolio-parser';

export interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  assets: Asset[];
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  assetType: string;
  currentValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PortfolioService {
  
  // Get user's portfolios
  static async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        assets: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return portfolios.map(portfolio => ({
      ...portfolio,
      totalValue: portfolio.assets.reduce((sum, asset) => {
        return sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
      }, 0)
    }));
  }

  // Get or create default portfolio for user
  static async getOrCreateDefaultPortfolio(userId: string): Promise<Portfolio> {
    let portfolio = await prisma.portfolio.findFirst({
      where: { 
        userId,
        name: 'My Portfolio'
      },
      include: {
        assets: true
      }
    });

    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          userId,
          name: 'My Portfolio',
          description: 'My main investment portfolio'
        },
        include: {
          assets: true
        }
      });
    }

    return {
      ...portfolio,
      totalValue: portfolio.assets.reduce((sum, asset) => {
        return sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
      }, 0)
    };
  }

  // Add assets to user's portfolio
  static async addAssetsToPortfolio(userId: string, assets: ParsedAsset[]): Promise<{
    success: boolean;
    portfolio: Portfolio;
    addedAssets: Asset[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const addedAssets: Asset[] = [];

    try {
      // Get or create default portfolio
      const portfolio = await this.getOrCreateDefaultPortfolio(userId);

      // Process each asset
      for (const parsedAsset of assets) {
        try {
          // Check if asset already exists in portfolio
          const existingAsset = await prisma.asset.findFirst({
            where: {
              portfolioId: portfolio.id,
              symbol: parsedAsset.symbol
            }
          });

          if (existingAsset) {
            // Update existing asset (add to quantity, average the price)
            const newQuantity = existingAsset.quantity + parsedAsset.quantity;
            let newAvgPrice = existingAsset.avgPrice;

            if (parsedAsset.avgPrice && existingAsset.avgPrice) {
              // Calculate weighted average price
              const totalValue = (existingAsset.quantity * existingAsset.avgPrice) + 
                               (parsedAsset.quantity * parsedAsset.avgPrice);
              newAvgPrice = totalValue / newQuantity;
            } else if (parsedAsset.avgPrice) {
              newAvgPrice = parsedAsset.avgPrice;
            }

            const updatedAsset = await prisma.asset.update({
              where: { id: existingAsset.id },
              data: {
                quantity: newQuantity,
                avgPrice: newAvgPrice,
                updatedAt: new Date()
              }
            });

            addedAssets.push(updatedAsset);
          } else {
            // Create new asset
            const newAsset = await prisma.asset.create({
              data: {
                portfolioId: portfolio.id,
                symbol: parsedAsset.symbol,
                quantity: parsedAsset.quantity,
                avgPrice: parsedAsset.avgPrice,
                assetType: parsedAsset.assetType || 'stock'
              }
            });

            addedAssets.push(newAsset);
          }
        } catch (assetError) {
          errors.push(`Failed to add ${parsedAsset.symbol}: ${assetError}`);
        }
      }

      // Get updated portfolio
      const updatedPortfolio = await this.getOrCreateDefaultPortfolio(userId);

      return {
        success: addedAssets.length > 0,
        portfolio: updatedPortfolio,
        addedAssets,
        errors
      };

    } catch (error) {
      return {
        success: false,
        portfolio: await this.getOrCreateDefaultPortfolio(userId),
        addedAssets: [],
        errors: [`Failed to update portfolio: ${error}`]
      };
    }
  }

  // Get portfolio summary for chat context
  static async getPortfolioSummary(userId: string): Promise<{
    totalAssets: number;
    totalValue: number;
    topHoldings: Array<{ symbol: string; value: number; percentage: number }>;
    lastUpdated: Date;
  }> {
    const portfolio = await this.getOrCreateDefaultPortfolio(userId);
    
    const totalValue = portfolio.totalValue;
    const topHoldings = portfolio.assets
      .map(asset => ({
        symbol: asset.symbol,
        value: asset.avgPrice ? asset.quantity * asset.avgPrice : 0,
        percentage: 0
      }))
      .filter(holding => holding.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(holding => ({
        ...holding,
        percentage: totalValue > 0 ? (holding.value / totalValue) * 100 : 0
      }));

    return {
      totalAssets: portfolio.assets.length,
      totalValue,
      topHoldings,
      lastUpdated: portfolio.updatedAt
    };
  }

  // Remove asset from portfolio
  static async removeAsset(userId: string, symbol: string): Promise<boolean> {
    try {
      const portfolio = await this.getOrCreateDefaultPortfolio(userId);
      
      const deletedAsset = await prisma.asset.deleteMany({
        where: {
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase()
        }
      });

      return deletedAsset.count > 0;
    } catch (error) {
      console.error('Error removing asset:', error);
      return false;
    }
  }

  // Update asset quantity
  static async updateAssetQuantity(userId: string, symbol: string, newQuantity: number): Promise<boolean> {
    try {
      const portfolio = await this.getOrCreateDefaultPortfolio(userId);
      
      const updatedAsset = await prisma.asset.updateMany({
        where: {
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase()
        },
        data: {
          quantity: newQuantity,
          updatedAt: new Date()
        }
      });

      return updatedAsset.count > 0;
    } catch (error) {
      console.error('Error updating asset quantity:', error);
      return false;
    }
  }

  // Update asset quantity and/or average price
  static async updateAsset(userId: string, symbol: string, newQuantity: number, newAvgPrice?: number | null): Promise<boolean> {
    try {
      const portfolio = await this.getOrCreateDefaultPortfolio(userId);
      
      const updateData: { quantity: number; avgPrice?: number | null; updatedAt: Date } = {
        quantity: newQuantity,
        updatedAt: new Date()
      };

      // Only update avgPrice if it's provided (allow null to clear the price)
      if (newAvgPrice !== undefined) {
        updateData.avgPrice = newAvgPrice;
      }
      
      const updatedAsset = await prisma.asset.updateMany({
        where: {
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase()
        },
        data: updateData
      });

      return updatedAsset.count > 0;
    } catch (error) {
      console.error('Error updating asset:', error);
      return false;
    }
  }
}