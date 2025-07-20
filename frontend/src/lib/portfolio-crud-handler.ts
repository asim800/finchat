// ============================================================================
// FILE: lib/portfolio-crud-handler.ts
// Fast portfolio CRUD operations for regexp-matched queries
// ============================================================================

import { PortfolioService, Portfolio } from './portfolio-service';
import { GuestPortfolioService } from './guest-portfolio';
import { ParsedAsset } from './portfolio-parser';
import { RegexpMatch } from './query-triage';
import { formatCurrency } from './number-utils';

export interface CrudResult {
  success: boolean;
  message: string;
  data?: {
    action: string;
    symbol: string;
    portfolio: string;
    changes: Array<{
      symbol: string;
      operation: 'added' | 'removed' | 'updated' | 'queried';
      quantity?: number;
      price?: number;
      previousValue?: number;
      newValue?: number;
    }>;
  };
  error?: string;
  executionTimeMs: number;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost?: number;
  currentValue?: number;
  totalValue: number;
  portfolioName: string;
}

export class PortfolioCrudHandler {
  
  // Main entry point for processing regexp matches
  static async processRegexpMatch(
    regexpMatch: RegexpMatch,
    userId?: string,
    guestSessionId?: string,
    isGuestMode: boolean = false
  ): Promise<CrudResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔧 Processing ${regexpMatch.action} operation for ${regexpMatch.symbol}`);
      
      let result: CrudResult;
      
      switch (regexpMatch.action) {
        case 'add':
          result = await this.handleAdd(regexpMatch, userId, guestSessionId, isGuestMode);
          break;
        case 'remove':
          result = await this.handleRemove(regexpMatch, userId, guestSessionId, isGuestMode);
          break;
        case 'update':
          result = await this.handleUpdate(regexpMatch, userId, guestSessionId, isGuestMode);
          break;
        case 'show':
          result = await this.handleShow(regexpMatch, userId, guestSessionId, isGuestMode);
          break;
        default:
          result = {
            success: false,
            message: `Unsupported action: ${regexpMatch.action}`,
            error: 'Invalid action type',
            executionTimeMs: Date.now() - startTime
          };
      }
      
      result.executionTimeMs = Date.now() - startTime;
      
      console.log(`✅ ${regexpMatch.action} operation completed in ${result.executionTimeMs}ms`);
      return result;
      
    } catch (error) {
      console.error(`❌ Error processing ${regexpMatch.action} operation:`, error);
      return {
        success: false,
        message: `Failed to ${regexpMatch.action} ${regexpMatch.symbol}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime
      };
    }
  }
  
  // Handle ADD operations
  private static async handleAdd(
    match: RegexpMatch,
    userId?: string,
    guestSessionId?: string,
    isGuestMode: boolean = false
  ): Promise<CrudResult> {
    const { symbol, quantity, avgCost, portfolioName } = match;
    
    if (!quantity || quantity <= 0) {
      return {
        success: false,
        message: `Invalid quantity for ${symbol}`,
        error: 'Quantity must be greater than 0',
        executionTimeMs: 0
      };
    }
    
    const parsedAsset: ParsedAsset = {
      symbol: symbol.toUpperCase(),
      quantity,
      avgCost: avgCost || null,
      assetType: 'stock'
    };
    
    try {
      if (isGuestMode && guestSessionId) {
        // Handle guest mode
        // const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        GuestPortfolioService.addAssetsToGuestPortfolio(guestSessionId, [parsedAsset]);
        
        const portfolioDisplayName = portfolioName || 'main';
        const valueAdded = avgCost ? quantity * avgCost : 0;
        
        return {
          success: true,
          message: `Added ${quantity} shares of ${symbol}${avgCost ? ` at ${formatCurrency(avgCost)}` : ''} to ${portfolioDisplayName} portfolio`,
          data: {
            action: 'add',
            symbol,
            portfolio: portfolioDisplayName,
            changes: [{
              symbol,
              operation: 'added',
              quantity,
              price: avgCost,
              newValue: valueAdded
            }]
          },
          executionTimeMs: 0
        };
      } else if (userId) {
        // Handle authenticated user
        const { portfolio, fallbackMessage } = await this.findPortfolioWithFallback(userId, portfolioName);
        
        if (!portfolio) {
          return {
            success: false,
            message: `Portfolio "${portfolioName}" not found`,
            error: 'Portfolio not found',
            executionTimeMs: 0
          };
        }
        
        const result = await PortfolioService.addAssetsToPortfolio(userId, portfolio.id, [parsedAsset]);
        
        if (result.success) {
          const valueAdded = avgCost ? quantity * avgCost : 0;
          
          // Construct message with optional fallback notice
          let message = `Added ${quantity} shares of ${symbol}${avgCost ? ` at ${formatCurrency(avgCost)}` : ''} to ${portfolio.name} portfolio`;
          if (fallbackMessage) {
            message = `${fallbackMessage} ${message}`;
          }
          
          return {
            success: true,
            message,
            data: {
              action: 'add',
              symbol,
              portfolio: portfolio.name,
              changes: [{
                symbol,
                operation: 'added',
                quantity,
                price: avgCost,
                newValue: valueAdded
              }]
            },
            executionTimeMs: 0
          };
        } else {
          return {
            success: false,
            message: `Failed to add ${symbol} to portfolio`,
            error: result.errors.join(', '),
            executionTimeMs: 0
          };
        }
      } else {
        return {
          success: false,
          message: 'Authentication required',
          error: 'No user or guest session provided',
          executionTimeMs: 0
        };
      }
    } catch (error) {
      throw new Error(`Add operation failed: ${error}`);
    }
  }
  
  // Handle REMOVE operations
  private static async handleRemove(
    match: RegexpMatch,
    userId?: string,
    guestSessionId?: string,
    isGuestMode: boolean = false
  ): Promise<CrudResult> {
    const { symbol, quantity, portfolioName } = match;
    
    try {
      if (isGuestMode && guestSessionId) {
        // Handle guest mode
        const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        const asset = guestPortfolio?.assets?.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
        const portfolioDisplayName = portfolioName || 'main';
        
        if (!asset) {
          return {
            success: false,
            message: `${symbol} not found in ${portfolioDisplayName} portfolio`,
            error: 'Asset not found',
            executionTimeMs: 0
          };
        }
        
        let success = false;
        let message = '';
        let removedQuantity = 0;
        
        if (quantity && quantity > 0) {
          // Partial quantity removal
          if (quantity >= asset.quantity) {
            // Remove entire position if requested quantity >= current quantity
            success = GuestPortfolioService.removeAssetFromGuestPortfolio(guestSessionId, symbol);
            removedQuantity = asset.quantity;
            message = success 
              ? `Removed all ${removedQuantity} shares of ${symbol} from ${portfolioDisplayName} portfolio`
              : `Failed to remove ${symbol} from ${portfolioDisplayName} portfolio`;
          } else {
            // Reduce quantity
            const newQuantity = asset.quantity - quantity;
            success = GuestPortfolioService.updateGuestAsset(guestSessionId, symbol, newQuantity, asset.avgCost);
            removedQuantity = quantity;
            message = success 
              ? `Removed ${quantity} shares of ${symbol} (${newQuantity} remaining) from ${portfolioDisplayName} portfolio`
              : `Failed to remove ${quantity} shares of ${symbol} from ${portfolioDisplayName} portfolio`;
          }
        } else {
          // Complete removal (no quantity specified)
          success = GuestPortfolioService.removeAssetFromGuestPortfolio(guestSessionId, symbol);
          removedQuantity = asset.quantity;
          message = success 
            ? `Removed all ${removedQuantity} shares of ${symbol} from ${portfolioDisplayName} portfolio`
            : `Failed to remove ${symbol} from ${portfolioDisplayName} portfolio`;
        }
        
        return {
          success,
          message,
          data: success ? {
            action: 'remove',
            symbol,
            portfolio: portfolioDisplayName,
            changes: [{
              symbol,
              operation: 'removed',
              quantity: removedQuantity,
              previousValue: asset.avgCost ? asset.quantity * asset.avgCost : 0,
              newValue: quantity && quantity < asset.quantity ? 
                (asset.avgCost ? (asset.quantity - quantity) * asset.avgCost : 0) : 0
            }]
          } : undefined,
          executionTimeMs: 0
        };
      } else if (userId) {
        // Handle authenticated user
        const portfolio = portfolioName 
          ? await this.findPortfolioByName(userId, portfolioName)
          : await PortfolioService.getOrCreateDefaultPortfolio(userId);
        
        if (!portfolio) {
          return {
            success: false,
            message: `Portfolio "${portfolioName}" not found`,
            error: 'Portfolio not found',
            executionTimeMs: 0
          };
        }
        
        const asset = portfolio.assets.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
        
        if (!asset) {
          return {
            success: false,
            message: `${symbol} not found in ${portfolio.name} portfolio`,
            error: 'Asset not found',
            executionTimeMs: 0
          };
        }
        
        let success = false;
        let message = '';
        let removedQuantity = 0;
        
        if (quantity && quantity > 0) {
          // Partial quantity removal
          if (quantity >= asset.quantity) {
            // Remove entire position if requested quantity >= current quantity
            success = await PortfolioService.removeAsset(userId, portfolio.id, symbol);
            removedQuantity = asset.quantity;
            message = success 
              ? `Removed all ${removedQuantity} shares of ${symbol} from ${portfolio.name} portfolio`
              : `Failed to remove ${symbol} from ${portfolio.name} portfolio`;
          } else {
            // Reduce quantity
            const newQuantity = asset.quantity - quantity;
            success = await PortfolioService.updateAsset(userId, portfolio.id, symbol, newQuantity, asset.avgCost);
            removedQuantity = quantity;
            message = success 
              ? `Removed ${quantity} shares of ${symbol} (${newQuantity} remaining) from ${portfolio.name} portfolio`
              : `Failed to remove ${quantity} shares of ${symbol} from ${portfolio.name} portfolio`;
          }
        } else {
          // Complete removal (no quantity specified)
          success = await PortfolioService.removeAsset(userId, portfolio.id, symbol);
          removedQuantity = asset.quantity;
          message = success 
            ? `Removed all ${removedQuantity} shares of ${symbol} from ${portfolio.name} portfolio`
            : `Failed to remove ${symbol} from ${portfolio.name} portfolio`;
        }
        
        return {
          success,
          message,
          data: success ? {
            action: 'remove',
            symbol,
            portfolio: portfolio.name,
            changes: [{
              symbol,
              operation: 'removed',
              quantity: removedQuantity,
              previousValue: asset.avgCost ? asset.quantity * asset.avgCost : 0,
              newValue: quantity && quantity < asset.quantity ? 
                (asset.avgCost ? (asset.quantity - quantity) * asset.avgCost : 0) : 0
            }]
          } : undefined,
          executionTimeMs: 0
        };
      } else {
        return {
          success: false,
          message: 'Authentication required',
          error: 'No user or guest session provided',
          executionTimeMs: 0
        };
      }
    } catch (error) {
      throw new Error(`Remove operation failed: ${error}`);
    }
  }
  
  // Handle UPDATE operations
  private static async handleUpdate(
    match: RegexpMatch,
    userId?: string,
    guestSessionId?: string,
    isGuestMode: boolean = false
  ): Promise<CrudResult> {
    const { symbol, quantity, avgCost, portfolioName } = match;
    
    if (!quantity && !avgCost) {
      return {
        success: false,
        message: `No update values provided for ${symbol}`,
        error: 'Either quantity or price must be specified',
        executionTimeMs: 0
      };
    }
    
    try {
      if (isGuestMode && guestSessionId) {
        // Handle guest mode
        const success = GuestPortfolioService.updateGuestAsset(
          guestSessionId, 
          symbol, 
          quantity, 
          avgCost
        );
        
        const portfolioDisplayName = portfolioName || 'main';
        const updateType = quantity ? 'quantity' : 'price';
        const updateValue = quantity || avgCost;
        
        return {
          success,
          message: success 
            ? `Updated ${symbol} ${updateType} to ${updateValue} in ${portfolioDisplayName} portfolio`
            : `${symbol} not found in ${portfolioDisplayName} portfolio`,
          data: success ? {
            action: 'update',
            symbol,
            portfolio: portfolioDisplayName,
            changes: [{
              symbol,
              operation: 'updated',
              quantity,
              price: avgCost
            }]
          } : undefined,
          executionTimeMs: 0
        };
      } else if (userId) {
        // Handle authenticated user
        const portfolio = portfolioName 
          ? await this.findPortfolioByName(userId, portfolioName)
          : await PortfolioService.getOrCreateDefaultPortfolio(userId);
        
        if (!portfolio) {
          return {
            success: false,
            message: `Portfolio "${portfolioName}" not found`,
            error: 'Portfolio not found',
            executionTimeMs: 0
          };
        }
        
        const success = await PortfolioService.updateAsset(
          userId, 
          portfolio.id, 
          symbol, 
          quantity || 0, 
          avgCost
        );
        
        const updateType = quantity ? 'quantity' : 'average cost';
        const updateValue = quantity || avgCost;
        
        return {
          success,
          message: success 
            ? `Updated ${symbol} ${updateType} to ${updateValue} in ${portfolio.name} portfolio`
            : `${symbol} not found in ${portfolio.name} portfolio`,
          data: success ? {
            action: 'update',
            symbol,
            portfolio: portfolio.name,
            changes: [{
              symbol,
              operation: 'updated',
              quantity,
              price: avgCost
            }]
          } : undefined,
          executionTimeMs: 0
        };
      } else {
        return {
          success: false,
          message: 'Authentication required',
          error: 'No user or guest session provided',
          executionTimeMs: 0
        };
      }
    } catch (error) {
      throw new Error(`Update operation failed: ${error}`);
    }
  }
  
  // Handle SHOW operations
  private static async handleShow(
    match: RegexpMatch,
    userId?: string,
    guestSessionId?: string,
    isGuestMode: boolean = false
  ): Promise<CrudResult> {
    const { symbol, portfolioName } = match;
    
    try {
      // Check if this is a portfolio overview request
      if (symbol === 'ALL') {
        return this.handleShowPortfolioOverview(portfolioName, userId, guestSessionId, isGuestMode);
      }
      
      // Handle individual asset show
      if (isGuestMode && guestSessionId) {
        // Handle guest mode
        const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        const asset = guestPortfolio?.assets?.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
        
        const portfolioDisplayName = portfolioName || 'main';
        
        if (asset) {
          const totalValue = asset.avgCost ? asset.quantity * asset.avgCost : 0;
          
          return {
            success: true,
            message: `${symbol} position: ${asset.quantity} shares${asset.avgCost ? ` at ${formatCurrency(asset.avgCost)} each (total: ${formatCurrency(totalValue)})` : ''} in ${portfolioDisplayName} portfolio`,
            data: {
              action: 'show',
              symbol,
              portfolio: portfolioDisplayName,
              changes: [{
                symbol,
                operation: 'queried',
                quantity: asset.quantity,
                price: asset.avgCost || undefined,
                newValue: totalValue
              }]
            },
            executionTimeMs: 0
          };
        } else {
          return {
            success: false,
            message: `${symbol} not found in ${portfolioDisplayName} portfolio`,
            error: 'Asset not found',
            executionTimeMs: 0
          };
        }
      } else if (userId) {
        // Handle authenticated user
        const portfolio = portfolioName 
          ? await this.findPortfolioByName(userId, portfolioName)
          : await PortfolioService.getOrCreateDefaultPortfolio(userId);
        
        if (!portfolio) {
          return {
            success: false,
            message: `Portfolio "${portfolioName}" not found`,
            error: 'Portfolio not found',
            executionTimeMs: 0
          };
        }
        
        const asset = portfolio.assets.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
        
        if (asset) {
          const totalValue = asset.avgCost ? asset.quantity * asset.avgCost : 0;
          const currentValue = asset.currentValue || totalValue;
          
          return {
            success: true,
            message: `${symbol} position: ${asset.quantity} shares${asset.avgCost ? ` at ${formatCurrency(asset.avgCost)} avg cost` : ''}${asset.price ? ` (current: ${formatCurrency(asset.price)})` : ''} - Total value: ${formatCurrency(currentValue)} in ${portfolio.name} portfolio`,
            data: {
              action: 'show',
              symbol,
              portfolio: portfolio.name,
              changes: [{
                symbol,
                operation: 'queried',
                quantity: asset.quantity,
                price: asset.avgCost || undefined,
                newValue: currentValue
              }]
            },
            executionTimeMs: 0
          };
        } else {
          return {
            success: false,
            message: `${symbol} not found in ${portfolio.name} portfolio`,
            error: 'Asset not found',
            executionTimeMs: 0
          };
        }
      } else {
        return {
          success: false,
          message: 'Authentication required',
          error: 'No user or guest session provided',
          executionTimeMs: 0
        };
      }
    } catch (error) {
      throw new Error(`Show operation failed: ${error}`);
    }
  }

  // Handle portfolio overview requests
  private static async handleShowPortfolioOverview(
    portfolioName?: string,
    userId?: string,
    guestSessionId?: string,
    isGuestMode: boolean = false
  ): Promise<CrudResult> {
    try {
      if (isGuestMode && guestSessionId) {
        // Handle guest mode portfolio overview
        const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        const portfolioDisplayName = portfolioName || 'main';
        
        if (guestPortfolio.assets.length === 0) {
          return {
            success: true,
            message: `Your ${portfolioDisplayName} portfolio is empty. Add some assets to get started!`,
            data: {
              action: 'show',
              symbol: 'ALL',
              portfolio: portfolioDisplayName,
              changes: []
            },
            executionTimeMs: 0
          };
        }
        
        // Build portfolio summary
        let portfolioSummary = `Your ${portfolioDisplayName} portfolio contains ${guestPortfolio.assets.length} asset(s):\n\n`;
        let totalPortfolioValue = 0;
        
        const changes: Array<{
          symbol: string;
          operation: 'queried';
          quantity: number;
          price?: number;
          newValue: number;
        }> = [];
        
        guestPortfolio.assets.forEach((asset, index) => {
          const assetValue = asset.avgCost ? asset.quantity * asset.avgCost : 0;
          totalPortfolioValue += assetValue;
          
          portfolioSummary += `${index + 1}. ${asset.symbol}: ${asset.quantity} shares`;
          if (asset.avgCost) {
            portfolioSummary += ` at ${formatCurrency(asset.avgCost)} each (value: ${formatCurrency(assetValue)})`;
          }
          portfolioSummary += '\n';
          
          changes.push({
            symbol: asset.symbol,
            operation: 'queried',
            quantity: asset.quantity,
            price: asset.avgCost || undefined,
            newValue: assetValue
          });
        });
        
        portfolioSummary += `\nTotal Portfolio Value: ${formatCurrency(totalPortfolioValue)}`;
        
        return {
          success: true,
          message: portfolioSummary,
          data: {
            action: 'show',
            symbol: 'ALL',
            portfolio: portfolioDisplayName,
            changes
          },
          executionTimeMs: 0
        };
        
      } else if (userId) {
        // Handle authenticated user portfolio overview
        const portfolio = portfolioName 
          ? await this.findPortfolioByName(userId, portfolioName)
          : await PortfolioService.getOrCreateDefaultPortfolio(userId);
        
        if (!portfolio) {
          return {
            success: false,
            message: `Portfolio "${portfolioName}" not found`,
            error: 'Portfolio not found',
            executionTimeMs: 0
          };
        }
        
        if (portfolio.assets.length === 0) {
          return {
            success: true,
            message: `Your ${portfolio.name} portfolio is empty. Add some assets to get started!`,
            data: {
              action: 'show',
              symbol: 'ALL',
              portfolio: portfolio.name,
              changes: []
            },
            executionTimeMs: 0
          };
        }
        
        // Build portfolio summary
        let portfolioSummary = `Your ${portfolio.name} portfolio contains ${portfolio.assets.length} asset(s):\n\n`;
        let totalPortfolioValue = 0;
        
        const changes: Array<{
          symbol: string;
          operation: 'queried';
          quantity: number;
          price?: number;
          newValue: number;
        }> = [];
        
        portfolio.assets.forEach((asset, index) => {
          const assetValue = asset.currentValue || (asset.avgCost ? asset.quantity * asset.avgCost : 0);
          totalPortfolioValue += assetValue;
          
          portfolioSummary += `${index + 1}. ${asset.symbol}: ${asset.quantity} shares`;
          if (asset.avgCost) {
            portfolioSummary += ` at ${formatCurrency(asset.avgCost)} avg cost`;
          }
          if (asset.price && asset.price !== asset.avgCost) {
            portfolioSummary += ` (current: ${formatCurrency(asset.price)})`;
          }
          portfolioSummary += ` - Value: ${formatCurrency(assetValue)}\n`;
          
          changes.push({
            symbol: asset.symbol,
            operation: 'queried',
            quantity: asset.quantity,
            price: asset.avgCost || undefined,
            newValue: assetValue
          });
        });
        
        portfolioSummary += `\nTotal Portfolio Value: ${formatCurrency(totalPortfolioValue)}`;
        
        return {
          success: true,
          message: portfolioSummary,
          data: {
            action: 'show',
            symbol: 'ALL',
            portfolio: portfolio.name,
            changes
          },
          executionTimeMs: 0
        };
        
      } else {
        return {
          success: false,
          message: 'Authentication required',
          error: 'No user or guest session provided',
          executionTimeMs: 0
        };
      }
    } catch (error) {
      throw new Error(`Portfolio overview failed: ${error}`);
    }
  }
  
  // Helper method to find portfolio by name
  private static async findPortfolioByName(userId: string, portfolioName: string): Promise<Portfolio | null> {
    try {
      const portfolios = await PortfolioService.getUserPortfolios(userId);
      
      // Check for exact name match first
      let portfolio = portfolios.find(p => 
        p.name.toLowerCase() === portfolioName.toLowerCase()
      );
      
      // If not found, check for partial matches
      if (!portfolio) {
        portfolio = portfolios.find(p => 
          p.name.toLowerCase().includes(portfolioName.toLowerCase())
        );
      }
      
      // If still not found and portfolioName is "main", get default
      if (!portfolio && portfolioName.toLowerCase() === 'main') {
        portfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
      }
      
      return portfolio || null;
    } catch (error) {
      console.error('Error finding portfolio by name:', error);
      return null;
    }
  }

  // Helper method to get portfolio with fallback message
  private static async findPortfolioWithFallback(userId: string, portfolioName?: string): Promise<{portfolio: Portfolio | null, fallbackMessage?: string}> {
    if (!portfolioName) {
      const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
      return { portfolio };
    }

    const portfolio = await this.findPortfolioByName(userId, portfolioName);
    
    if (!portfolio) {
      // Try to fall back to default portfolio
      const defaultPortfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
      if (defaultPortfolio) {
        return {
          portfolio: defaultPortfolio,
          fallbackMessage: `I did not find '${portfolioName}' portfolio. Using ${defaultPortfolio.name} portfolio instead.`
        };
      }
    }
    
    return { portfolio };
  }
  
  // Validate if a symbol is likely valid (basic check)
  static validateSymbol(symbol: string): boolean {
    // Basic validation: 1-5 uppercase letters
    return /^[A-Z]{1,5}$/.test(symbol);
  }
  
  // Extract portfolio information for response
  static async getPortfolioSummary(
    userId?: string,
    guestSessionId?: string,
    isGuestMode: boolean = false,
    portfolioName?: string
  ): Promise<{
    name: string;
    totalValue: number;
    assetCount: number;
    lastUpdated: Date;
  } | null> {
    try {
      if (isGuestMode && guestSessionId) {
        const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        if (guestPortfolio) {
          const totalValue = guestPortfolio.assets.reduce((sum, asset) => 
            sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0), 0
          );
          
          return {
            name: portfolioName || 'main',
            totalValue,
            assetCount: guestPortfolio.assets.length,
            lastUpdated: new Date()
          };
        }
      } else if (userId) {
        const portfolio = portfolioName 
          ? await this.findPortfolioByName(userId, portfolioName)
          : await PortfolioService.getOrCreateDefaultPortfolio(userId);
        
        if (portfolio) {
          return {
            name: portfolio.name,
            totalValue: portfolio.totalValue,
            assetCount: portfolio.assets.length,
            lastUpdated: portfolio.updatedAt
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      return null;
    }
  }
}