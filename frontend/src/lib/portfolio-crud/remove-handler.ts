// REMOVE operation for regexp-matched portfolio queries.

import { PortfolioService } from '../portfolio-service';
import { GuestPortfolioService } from '../guest-portfolio';
import { RegexpMatch } from '../query-triage';
import { CrudResult } from './types';
import { findPortfolioByName } from './portfolio-resolver';

export async function handleRemove(
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
