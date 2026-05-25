// Fast portfolio CRUD operations for regexp-matched queries.

import { PortfolioService } from '../portfolio-service';
import { GuestPortfolioService } from '../guest-portfolio';
import { RegexpMatch } from '../query-triage';
import { ValidationPatterns } from '../validation';
import { CrudResult } from './types';
import { findPortfolioByName } from './portfolio-resolver';
import { handleAdd } from './add-handler';
import { handleRemove } from './remove-handler';
import { handleUpdate } from './update-handler';
import { handleShow } from './show-handler';

export type { CrudResult, PortfolioPosition } from './types';

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
          result = await handleAdd(regexpMatch, userId, guestSessionId, isGuestMode);
          break;
        case 'remove':
          result = await handleRemove(regexpMatch, userId, guestSessionId, isGuestMode);
          break;
        case 'update':
          result = await handleUpdate(regexpMatch, userId, guestSessionId, isGuestMode);
          break;
        case 'show':
          result = await handleShow(regexpMatch, userId, guestSessionId, isGuestMode);
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

  // Validate if a symbol is likely valid (1-5 uppercase letters)
  static validateSymbol(symbol: string): boolean {
    return ValidationPatterns.stockSymbol.test(symbol);
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
          ? await findPortfolioByName(userId, portfolioName)
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
