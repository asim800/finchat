// ============================================================================
// FILE: lib/guest-portfolio.ts
// Temporary portfolio storage for guest users
// ============================================================================

import { ParsedAsset } from './portfolio-parser';

export interface GuestAsset {
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  assetType: string;
  addedAt: Date;
  
  // Options-specific fields
  optionType?: string;
  expirationDate?: string;
  strikePrice?: number;
}

export interface GuestPortfolio {
  assets: GuestAsset[];
  totalAssets: number;
  totalValue: number;
  lastUpdated: Date;
}

// In-memory storage for guest portfolios (in production, you might use Redis)
const guestPortfolios = new Map<string, GuestPortfolio>();

// Generate a session ID for guests
export function generateGuestSessionId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class GuestPortfolioService {

  // Get guest portfolio
  static getGuestPortfolio(sessionId: string): GuestPortfolio {
    const portfolio = guestPortfolios.get(sessionId);
    
    if (!portfolio) {
      return {
        assets: [],
        totalAssets: 0,
        totalValue: 0,
        lastUpdated: new Date()
      };
    }

    // Recalculate totals
    const totalValue = portfolio.assets.reduce((sum, asset) => {
      return sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0);
    }, 0);

    return {
      ...portfolio,
      totalAssets: portfolio.assets.length,
      totalValue
    };
  }

  // Add assets to guest portfolio
  static addAssetsToGuestPortfolio(sessionId: string, assets: ParsedAsset[]): {
    success: boolean;
    portfolio: GuestPortfolio;
    addedAssets: GuestAsset[];
    errors: string[];
  } {
    const errors: string[] = [];
    const addedAssets: GuestAsset[] = [];

    try {
      // Get existing portfolio or create new one
      const portfolio = this.getGuestPortfolio(sessionId);

      // Process each asset
      for (const parsedAsset of assets) {
        try {
          // Check if asset already exists
          const existingAssetIndex = portfolio.assets.findIndex(
            asset => asset.symbol === parsedAsset.symbol
          );

          if (existingAssetIndex >= 0) {
            // Update existing asset
            const existingAsset = portfolio.assets[existingAssetIndex];
            const newQuantity = existingAsset.quantity + parsedAsset.quantity;
            let newAvgPrice = existingAsset.avgCost;

            if (parsedAsset.avgCost && existingAsset.avgCost) {
              // Calculate weighted average price
              const totalValue = (existingAsset.quantity * existingAsset.avgCost) + 
                               (parsedAsset.quantity * parsedAsset.avgCost);
              newAvgPrice = totalValue / newQuantity;
            } else if (parsedAsset.avgCost) {
              newAvgPrice = parsedAsset.avgCost;
            }

            const updatedAsset: GuestAsset = {
              ...existingAsset,
              quantity: newQuantity,
              avgCost: newAvgPrice,
              addedAt: new Date()
            };

            portfolio.assets[existingAssetIndex] = updatedAsset;
            addedAssets.push(updatedAsset);
          } else {
            // Add new asset
            const newAsset: GuestAsset = {
              symbol: parsedAsset.symbol,
              quantity: parsedAsset.quantity,
              avgCost: parsedAsset.avgCost,
              assetType: parsedAsset.assetType || 'stock',
              addedAt: new Date(),
              // Include options fields if present
              ...(parsedAsset.assetType === 'options' && {
                optionType: parsedAsset.optionType,
                strikePrice: parsedAsset.strikePrice,
                expirationDate: parsedAsset.expirationDate
              })
            };

            portfolio.assets.push(newAsset);
            addedAssets.push(newAsset);
          }
        } catch (assetError) {
          errors.push(`Failed to add ${parsedAsset.symbol}: ${assetError}`);
        }
      }

      // Update portfolio metadata
      portfolio.lastUpdated = new Date();
      portfolio.totalAssets = portfolio.assets.length;
      portfolio.totalValue = portfolio.assets.reduce((sum, asset) => {
        return sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0);
      }, 0);

      // Store updated portfolio
      guestPortfolios.set(sessionId, portfolio);

      return {
        success: addedAssets.length > 0,
        portfolio,
        addedAssets,
        errors
      };

    } catch (error) {
      return {
        success: false,
        portfolio: this.getGuestPortfolio(sessionId),
        addedAssets: [],
        errors: [`Failed to update portfolio: ${error}`]
      };
    }
  }

  // Get portfolio summary for guest
  static getGuestPortfolioSummary(sessionId: string): {
    totalAssets: number;
    totalValue: number;
    topHoldings: Array<{ symbol: string; value: number; percentage: number }>;
    lastUpdated: Date;
  } {
    const portfolio = this.getGuestPortfolio(sessionId);
    
    const topHoldings = portfolio.assets
      .map(asset => ({
        symbol: asset.symbol,
        value: asset.avgCost ? asset.quantity * asset.avgCost : 0,
        percentage: 0
      }))
      .filter(holding => holding.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(holding => ({
        ...holding,
        percentage: portfolio.totalValue > 0 ? (holding.value / portfolio.totalValue) * 100 : 0
      }));

    return {
      totalAssets: portfolio.totalAssets,
      totalValue: portfolio.totalValue,
      topHoldings,
      lastUpdated: portfolio.lastUpdated
    };
  }

  // Update guest asset quantity and/or price
  static updateGuestAsset(sessionId: string, symbol: string, newQuantity?: number, newAvgPrice?: number): boolean {
    try {
      const portfolio = this.getGuestPortfolio(sessionId);
      
      const assetIndex = portfolio.assets.findIndex(
        asset => asset.symbol === symbol.toUpperCase()
      );

      if (assetIndex >= 0) {
        const asset = portfolio.assets[assetIndex];
        
        // Update quantity if provided
        if (newQuantity !== undefined) {
          asset.quantity = newQuantity;
        }
        
        // Update average cost if provided
        if (newAvgPrice !== undefined) {
          asset.avgCost = newAvgPrice;
        }
        
        asset.addedAt = new Date(); // Update timestamp
        
        // Recalculate totals
        portfolio.lastUpdated = new Date();
        portfolio.totalValue = portfolio.assets.reduce((sum, asset) => {
          return sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0);
        }, 0);

        guestPortfolios.set(sessionId, portfolio);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating guest asset:', error);
      return false;
    }
  }

  // Remove asset from guest portfolio
  static removeAssetFromGuestPortfolio(sessionId: string, symbol: string): boolean {
    try {
      const portfolio = this.getGuestPortfolio(sessionId);
      
      const assetIndex = portfolio.assets.findIndex(
        asset => asset.symbol === symbol.toUpperCase()
      );

      if (assetIndex >= 0) {
        portfolio.assets.splice(assetIndex, 1);
        portfolio.lastUpdated = new Date();
        portfolio.totalAssets = portfolio.assets.length;
        portfolio.totalValue = portfolio.assets.reduce((sum, asset) => {
          return sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0);
        }, 0);

        guestPortfolios.set(sessionId, portfolio);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error removing guest asset:', error);
      return false;
    }
  }

  // Clear guest portfolio (for cleanup)
  static clearGuestPortfolio(sessionId: string): void {
    guestPortfolios.delete(sessionId);
  }

  // Clean up old guest portfolios (call periodically)
  static cleanupOldGuestPortfolios(maxAgeHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    let cleaned = 0;

    for (const [sessionId, portfolio] of guestPortfolios.entries()) {
      if (portfolio.lastUpdated < cutoffTime) {
        guestPortfolios.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Convert guest portfolio to format for registration
  static exportGuestPortfolio(sessionId: string): ParsedAsset[] {
    const portfolio = this.getGuestPortfolio(sessionId);
    
    return portfolio.assets.map(asset => ({
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgCost: asset.avgCost,
      assetType: asset.assetType
    }));
  }
}