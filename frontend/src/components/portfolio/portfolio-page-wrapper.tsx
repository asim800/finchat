// ============================================================================
// FILE: components/portfolio/portfolio-page-wrapper.tsx
// Client wrapper for portfolio page
// ============================================================================

'use client';

import React, { useState } from 'react';
import { PortfolioHeader } from './portfolio-header';
import { PortfolioTable } from './portfolio-table';
import { MultiPortfolioManager } from './multi-portfolio-manager';
import { PortfolioBadges } from './portfolio-badges';

interface PortfolioPageWrapperProps {
  isGuestMode: boolean;
  userId?: string;
}

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  price?: number | null;
  percentage?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export const PortfolioPageWrapper: React.FC<PortfolioPageWrapperProps> = ({ 
  isGuestMode, 
  userId 
}) => {
  const [currentAssets, setCurrentAssets] = useState<DisplayAsset[]>([]);

  const handleAssetsChange = (assets: DisplayAsset[]) => {
    setCurrentAssets(assets);
  };

  // Calculate portfolio metrics for guest mode badges
  const portfolioValue = currentAssets.reduce((sum, asset) => sum + (asset.price ? asset.quantity * asset.price : 0), 0);
  const portfolioCost = currentAssets.reduce((sum, asset) => sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0), 0);

  // Convert DisplayAsset to format expected by CSV functionality
  const csvAssets = currentAssets.map(asset => ({
    symbol: asset.symbol,
    quantity: asset.quantity,
    avgCost: asset.avgCost,
    percentage: asset.percentage,
    assetType: asset.assetType
  }));

  if (isGuestMode) {
    // Guest mode - use single portfolio table
    return (
      <>
        {/* Guest Mode Portfolio Header with Badges */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Guest Portfolio</h2>
              <div className="mt-2">
                <PortfolioBadges 
                  assets={currentAssets}
                  portfolioValue={portfolioValue}
                  portfolioCost={portfolioCost}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Portfolio Value</div>
              <div className="text-lg font-bold text-gray-900">${portfolioValue.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Portfolio Header with action buttons */}
        <PortfolioHeader 
          isGuestMode={isGuestMode}
          guestAssets={csvAssets}
          onCsvUploadComplete={() => window.location.reload()}
        />

        {/* Portfolio Table */}
        <div className="bg-white rounded-lg shadow">
          <PortfolioTable 
            isGuestMode={isGuestMode} 
            userId={userId} 
            onAssetsChange={handleAssetsChange}
          />
        </div>
      </>
    );
  }

  // Authenticated mode - use multi-portfolio manager (no global header needed)
  return (
    <div className="bg-white rounded-lg shadow">
      <MultiPortfolioManager 
        isGuestMode={isGuestMode} 
        userId={userId} 
      />
    </div>
  );
};