// UPDATE operation for regexp-matched portfolio queries.

import { PortfolioService } from '../portfolio-service';
import { GuestPortfolioService } from '../guest-portfolio';
import { RegexpMatch } from '../query-triage';
import { CrudResult } from './types';
import { findPortfolioByName } from './portfolio-resolver';

export async function handleUpdate(
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
        ? await findPortfolioByName(userId, portfolioName)
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
