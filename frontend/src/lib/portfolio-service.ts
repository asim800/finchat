// ============================================================================
// FILE: lib/portfolio-service.ts
// Portfolio management service for authenticated users
// ============================================================================

import { prisma } from './db';
import { ParsedAsset } from './portfolio-parser';
import { HistoricalPriceService } from './historical-price-service';

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
  price?: number | null; // Current market price from historical data
  assetType: string;
  currentValue?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PortfolioService {
  
  // Get user's portfolios with main portfolio always first
  static async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        assets: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const portfoliosWithValue = portfolios.map(portfolio => ({
      ...portfolio,
      totalValue: portfolio.assets.reduce((sum, asset) => {
        return sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
      }, 0)
    }));

    // Sort to ensure main portfolio (with user's first name or "Main Portfolio") comes first
    return portfoliosWithValue.sort((a, b) => {
      // Check if portfolio name indicates it's the main portfolio
      const isMainA = a.name.endsWith("'s Portfolio") || a.name === 'Main Portfolio';
      const isMainB = b.name.endsWith("'s Portfolio") || b.name === 'Main Portfolio';
      
      if (isMainA && !isMainB) return -1; // a is main, put it first
      if (!isMainA && isMainB) return 1;  // b is main, put it first
      
      // If both are main or both are not main, sort by creation date
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  // Get or create default portfolio for user (using user's first name)
  static async getOrCreateDefaultPortfolio(userId: string): Promise<Portfolio> {
    // First, check if user has any portfolios
    let portfolio = await prisma.portfolio.findFirst({
      where: { userId },
      include: {
        assets: true
      },
      orderBy: { createdAt: 'asc' } // Get the oldest (default) portfolio
    });

    if (!portfolio) {
      // Get user's first name for default portfolio name
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true }
      });
      
      const defaultName = user?.firstName ? `${user.firstName}'s Portfolio` : 'Main Portfolio';
      
      portfolio = await prisma.portfolio.create({
        data: {
          userId,
          name: defaultName,
          description: 'Main investment portfolio'
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

  // Create a new portfolio
  static async createPortfolio(userId: string, name: string, description?: string): Promise<Portfolio> {
    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name,
        description
      },
      include: {
        assets: true
      }
    });

    return {
      ...portfolio,
      totalValue: 0
    };
  }

  // Update portfolio name/description
  static async updatePortfolio(portfolioId: string, userId: string, name?: string, description?: string): Promise<Portfolio | null> {
    try {
      const updateData: { name?: string; description?: string; updatedAt: Date } = {
        updatedAt: new Date()
      };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const portfolio = await prisma.portfolio.update({
        where: { 
          id: portfolioId,
          userId // Ensure user owns this portfolio
        },
        data: updateData,
        include: {
          assets: true
        }
      });

      return {
        ...portfolio,
        totalValue: portfolio.assets.reduce((sum, asset) => {
          return sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
        }, 0)
      };
    } catch (error) {
      console.error('Error updating portfolio:', error);
      return null;
    }
  }

  // Delete a portfolio (except if it's the user's only portfolio)
  static async deletePortfolio(portfolioId: string, userId: string): Promise<boolean> {
    try {
      // Check if user has more than one portfolio
      const portfolioCount = await prisma.portfolio.count({
        where: { userId }
      });

      if (portfolioCount <= 1) {
        return false; // Cannot delete the last portfolio
      }

      await prisma.portfolio.delete({
        where: {
          id: portfolioId,
          userId // Ensure user owns this portfolio
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      return false;
    }
  }

  // Add assets to specific portfolio
  static async addAssetsToPortfolio(userId: string, portfolioId: string, assets: ParsedAsset[]): Promise<{
    success: boolean;
    portfolio: Portfolio;
    addedAssets: Asset[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const addedAssets: Asset[] = [];

    try {
      // Get the specified portfolio
      const portfolioData = await prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId
        },
        include: {
          assets: true
        }
      });

      if (!portfolioData) {
        throw new Error('Portfolio not found');
      }

      const portfolio: Portfolio = {
        ...portfolioData,
        totalValue: portfolioData.assets.reduce((sum, asset) => {
          return sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
        }, 0)
      };

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
                portfolioId: portfolioId,
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
      const updatedPortfolioData = await prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId
        },
        include: {
          assets: true
        }
      });

      const updatedPortfolio: Portfolio = {
        ...updatedPortfolioData!,
        totalValue: updatedPortfolioData!.assets.reduce((sum, asset) => {
          return sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
        }, 0)
      };

      return {
        success: addedAssets.length > 0,
        portfolio: updatedPortfolio,
        addedAssets,
        errors
      };

    } catch (error) {
      // Return default portfolio on error
      const defaultPortfolio = await this.getOrCreateDefaultPortfolio(userId);
      return {
        success: false,
        portfolio: defaultPortfolio,
        addedAssets: [],
        errors: [`Failed to update portfolio: ${error}`]
      };
    }
  }

  // Add assets to user's default portfolio (legacy method for backwards compatibility)
  static async addAssetsToDefaultPortfolio(userId: string, assets: ParsedAsset[]): Promise<{
    success: boolean;
    portfolio: Portfolio;
    addedAssets: Asset[];
    errors: string[];
  }> {
    const defaultPortfolio = await this.getOrCreateDefaultPortfolio(userId);
    return this.addAssetsToPortfolio(userId, defaultPortfolio.id, assets);
  }

  // Get portfolio summary for chat context (uses all portfolios)
  static async getPortfolioSummary(userId: string): Promise<{
    totalAssets: number;
    totalValue: number;
    topHoldings: Array<{ symbol: string; value: number; percentage: number }>;
    lastUpdated: Date;
    portfolioCount: number;
  }> {
    const portfolios = await this.getAllPortfoliosWithMarketValues(userId);
    
    if (portfolios.length === 0) {
      const defaultPortfolio = await this.getOrCreateDefaultPortfolio(userId);
      portfolios.push(defaultPortfolio);
    }
    
    // Combine all assets from all portfolios
    const allAssets = portfolios.flatMap(p => p.assets);
    const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
    
    const topHoldings = allAssets
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

    const latestUpdate = portfolios.reduce((latest, p) => 
      p.updatedAt > latest ? p.updatedAt : latest, 
      portfolios[0]?.updatedAt || new Date()
    );

    return {
      totalAssets: allAssets.length,
      totalValue,
      topHoldings,
      lastUpdated: latestUpdate,
      portfolioCount: portfolios.length
    };
  }

  // Remove asset from specific portfolio
  static async removeAsset(userId: string, portfolioId: string, symbol: string): Promise<boolean> {
    try {
      // Verify user owns the portfolio
      const portfolio = await prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId
        }
      });

      if (!portfolio) {
        return false;
      }
      
      const deletedAsset = await prisma.asset.deleteMany({
        where: {
          portfolioId: portfolioId,
          symbol: symbol.toUpperCase()
        }
      });

      return deletedAsset.count > 0;
    } catch (error) {
      console.error('Error removing asset:', error);
      return false;
    }
  }

  // Update asset quantity in specific portfolio
  static async updateAssetQuantity(userId: string, portfolioId: string, symbol: string, newQuantity: number): Promise<boolean> {
    try {
      // Verify user owns the portfolio
      const portfolio = await prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId
        }
      });

      if (!portfolio) {
        return false;
      }
      
      const updatedAsset = await prisma.asset.updateMany({
        where: {
          portfolioId: portfolioId,
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

  // Update asset quantity and/or average price in specific portfolio
  static async updateAsset(userId: string, portfolioId: string, symbol: string, newQuantity: number, newAvgPrice?: number | null): Promise<boolean> {
    try {
      // Verify user owns the portfolio
      const portfolio = await prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId
        }
      });

      if (!portfolio) {
        return false;
      }
      
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
          portfolioId: portfolioId,
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

  // Refresh asset prices from historical data for specific portfolio
  static async refreshAssetPrices(userId: string, portfolioId: string): Promise<{ updated: number; notFound: number }> {
    try {
      // Verify user owns the portfolio
      const portfolio = await prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId
        }
      });

      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      return await HistoricalPriceService.updateAssetPrices(portfolioId);
    } catch (error) {
      console.error('Error refreshing asset prices:', error);
      return { updated: 0, notFound: 0 };
    }
  }

  // Get specific portfolio with updated market values
  static async getPortfolioWithMarketValues(userId: string, portfolioId: string): Promise<Portfolio | null> {
    try {
      const portfolioData = await prisma.portfolio.findFirst({
        where: {
          id: portfolioId,
          userId
        },
        include: {
          assets: true
        }
      });

      if (!portfolioData) {
        return null;
      }

      const portfolio: Portfolio = {
        ...portfolioData,
        totalValue: 0
      };
      
      // Get latest prices for all symbols
      const symbols = portfolio.assets.map(asset => asset.symbol);
      const priceMap = await HistoricalPriceService.getLatestPricesForSymbols(symbols);
      
      // Calculate market values
      const assetsWithMarketValue = portfolio.assets.map(asset => {
        const marketPrice = priceMap[asset.symbol.toUpperCase()];
        return {
          ...asset,
          price: marketPrice,
          currentValue: marketPrice ? asset.quantity * marketPrice : null
        };
      });

      const totalMarketValue = assetsWithMarketValue.reduce((sum, asset) => {
        return sum + (asset.currentValue || 0);
      }, 0);

      return {
        ...portfolio,
        assets: assetsWithMarketValue,
        totalValue: totalMarketValue
      };
    } catch (error) {
      console.error('Error getting portfolio with market values:', error);
      return null;
    }
  }

  // Get all user portfolios with updated market values (main portfolio first)
  static async getAllPortfoliosWithMarketValues(userId: string): Promise<Portfolio[]> {
    try {
      const portfolios = await this.getUserPortfolios(userId); // Already sorted with main first
      const portfoliosWithMarketValues: Portfolio[] = [];

      for (const portfolio of portfolios) {
        const portfolioWithMarketValues = await this.getPortfolioWithMarketValues(userId, portfolio.id);
        if (portfolioWithMarketValues) {
          portfoliosWithMarketValues.push(portfolioWithMarketValues);
        }
      }

      return portfoliosWithMarketValues; // Maintains the order from getUserPortfolios
    } catch (error) {
      console.error('Error getting all portfolios with market values:', error);
      return [];
    }
  }
}