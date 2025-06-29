// ============================================================================
// FILE: components/portfolio/portfolio-page-wrapper.tsx
// Client wrapper that manages asset state for CSV functionality
// ============================================================================

'use client';

import React, { useState } from 'react';
import { PortfolioHeader } from './portfolio-header';
import { PortfolioTable } from './portfolio-table';

interface PortfolioPageWrapperProps {
  isGuestMode: boolean;
  userId?: string;
}

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
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

  // Convert DisplayAsset to format expected by CSV functionality
  const csvAssets = currentAssets.map(asset => ({
    symbol: asset.symbol,
    quantity: asset.quantity,
    avgPrice: asset.avgPrice,
    percentage: asset.percentage,
    assetType: asset.assetType
  }));

  return (
    <>
      {/* Portfolio Header with action buttons */}
      <PortfolioHeader 
        isGuestMode={isGuestMode}
        guestAssets={isGuestMode ? csvAssets : undefined}
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
};