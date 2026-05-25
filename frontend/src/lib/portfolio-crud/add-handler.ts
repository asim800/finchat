// ADD operation for regexp-matched portfolio queries.

import { PortfolioService } from '../portfolio-service';
import { GuestPortfolioService } from '../guest-portfolio';
import { ParsedAsset } from '../portfolio-parser';
import { RegexpMatch } from '../query-triage';
import { formatCurrency } from '../number-utils';
import { QuantityValidationUtils } from '../validation';
import { CrudResult } from './types';
import { findPortfolioWithFallback } from './portfolio-resolver';

export async function handleAdd(
  match: RegexpMatch,
  userId?: string,
  guestSessionId?: string,
  isGuestMode: boolean = false
): Promise<CrudResult> {
  const { symbol, quantity, avgCost, portfolioName } = match;

  const quantityCheck = QuantityValidationUtils.parseQuantity(quantity ?? NaN);
  if (!quantity || !quantityCheck.isValid) {
    return {
      success: false,
      message: `Invalid quantity for ${symbol}`,
      error: quantityCheck.error ?? 'Quantity must be greater than 0',
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
      const { portfolio, fallbackMessage } = await findPortfolioWithFallback(userId, portfolioName);

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
