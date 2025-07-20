// ============================================================================
// FILE: hooks/usePortfolioCRUD.ts
// Portfolio CRUD operations hook
// ============================================================================

import { useCallback } from 'react';
import { GuestPortfolioService } from '@/lib/guest-portfolio';
import type { DisplayAsset, NewAsset } from './usePortfolioState';

interface ApiAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  assetType: string;
  createdAt: string;
  updatedAt: string;
  purchaseDate?: string | null;
  
  // Options-specific fields
  optionType?: string | null;
  expirationDate?: string | null;
  strikePrice?: number | null;
}

interface UsePortfolioCRUDProps {
  isGuestMode: boolean;
  userId?: string;
  portfolioId?: string;
  guestSessionId: string;
  onError: (error: string) => void;
}

/**
 * Hook for portfolio CRUD operations
 * Handles both guest mode and authenticated user operations
 */
export const usePortfolioCRUD = ({
  isGuestMode,
  userId,
  portfolioId,
  guestSessionId,
  onError
}: UsePortfolioCRUDProps) => {

  /**
   * Transform API asset to display asset
   */
  const transformApiAsset = useCallback((apiAsset: ApiAsset): DisplayAsset => ({
    ...apiAsset,
    createdAt: new Date(apiAsset.createdAt),
    updatedAt: new Date(apiAsset.updatedAt),
    purchaseDate: apiAsset.purchaseDate ? new Date(apiAsset.purchaseDate) : null,
    expirationDate: apiAsset.expirationDate ? new Date(apiAsset.expirationDate) : null,
    price: null, // Will be fetched separately
    totalValue: (apiAsset.avgCost || 0) * apiAsset.quantity
  }), []);

  /**
   * Load portfolio assets
   */
  const loadAssets = useCallback(async (): Promise<DisplayAsset[]> => {
    try {
      if (isGuestMode) {
        // Load guest portfolio
        const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        return guestPortfolio.assets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          quantity: asset.quantity,
          avgCost: asset.avgCost,
          price: null,
          assetType: asset.assetType,
          totalValue: (asset.avgCost || 0) * asset.quantity,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt,
          purchaseDate: asset.purchaseDate,
          optionType: asset.optionType,
          expirationDate: asset.expirationDate,
          strikePrice: asset.strikePrice
        }));
      } else {
        // Load authenticated user portfolio
        const url = portfolioId 
          ? `/api/portfolio?portfolioId=${portfolioId}`
          : '/api/portfolio';
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load portfolio: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.assets?.map(transformApiAsset) || [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load portfolio';
      onError(errorMessage);
      throw error;
    }
  }, [isGuestMode, portfolioId, guestSessionId, transformApiAsset, onError]);

  /**
   * Add new asset
   */
  const addAsset = useCallback(async (newAsset: NewAsset): Promise<DisplayAsset> => {
    try {
      if (isGuestMode) {
        // Add to guest portfolio
        const result = GuestPortfolioService.addAssetToGuestPortfolio(guestSessionId, {
          symbol: newAsset.symbol,
          quantity: newAsset.quantity,
          avgCost: newAsset.avgCost,
          assetType: newAsset.assetType as 'stock' | 'option' | 'crypto',
          purchaseDate: newAsset.purchaseDate ? new Date(newAsset.purchaseDate) : undefined,
          optionType: newAsset.optionType,
          expirationDate: newAsset.expirationDate ? new Date(newAsset.expirationDate) : undefined,
          strikePrice: newAsset.strikePrice
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to add asset');
        }
        
        return result.asset!;
      } else {
        // Add to authenticated user portfolio
        const requestBody = {
          ...newAsset,
          portfolioId
        };
        
        const response = await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return transformApiAsset(data.asset);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add asset';
      onError(errorMessage);
      throw error;
    }
  }, [isGuestMode, portfolioId, guestSessionId, transformApiAsset, onError]);

  /**
   * Update existing asset
   */
  const updateAsset = useCallback(async (id: string, updates: Partial<DisplayAsset>): Promise<DisplayAsset> => {
    try {
      if (isGuestMode) {
        // Update guest portfolio asset
        const result = GuestPortfolioService.updateGuestAsset(guestSessionId, id, updates);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update asset');
        }
        
        return result.asset!;
      } else {
        // Update authenticated user asset
        const response = await fetch(`/api/portfolio/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return transformApiAsset(data.asset);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update asset';
      onError(errorMessage);
      throw error;
    }
  }, [isGuestMode, guestSessionId, transformApiAsset, onError]);

  /**
   * Delete asset
   */
  const deleteAsset = useCallback(async (id: string): Promise<void> => {
    try {
      if (isGuestMode) {
        // Delete from guest portfolio
        const result = GuestPortfolioService.removeAssetFromGuestPortfolio(guestSessionId, id);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete asset');
        }
      } else {
        // Delete from authenticated user portfolio
        const response = await fetch(`/api/portfolio/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete asset';
      onError(errorMessage);
      throw error;
    }
  }, [isGuestMode, guestSessionId, onError]);

  return {
    loadAssets,
    addAsset,
    updateAsset,
    deleteAsset
  };
};