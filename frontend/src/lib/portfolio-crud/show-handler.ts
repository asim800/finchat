// SHOW operations (single asset + full portfolio overview).

import { PortfolioService } from '../portfolio-service';
import { GuestPortfolioService } from '../guest-portfolio';
import { RegexpMatch } from '../query-triage';
import { formatCurrency } from '../number-utils';
import { CrudResult } from './types';
import { findPortfolioByName } from './portfolio-resolver';

export async function handleShow(
  match: RegexpMatch,
  userId?: string,
  guestSessionId?: string,
  isGuestMode: boolean = false
): Promise<CrudResult> {
  const { symbol, portfolioName } = match;

  try {
    // Check if this is a portfolio overview request
    if (symbol === 'ALL') {
      return handleShowPortfolioOverview(portfolioName, userId, guestSessionId, isGuestMode);
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
export async function handleShowPortfolioOverview(
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
