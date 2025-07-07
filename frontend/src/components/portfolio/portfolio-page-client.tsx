// ============================================================================
// FILE: components/portfolio/portfolio-page-client.tsx
// Client-side wrapper for portfolio page functionality
// ============================================================================

'use client';

import React, { useCallback } from 'react';
import { PortfolioTable } from './portfolio-table';

interface PortfolioPageClientProps {
  isGuestMode: boolean;
  userId?: string;
  onAssetsChange?: (assets: Array<{
    symbol: string;
    quantity: number;
    avgCost?: number | null;
    percentage?: number | null;
    assetType: string;
  }>) => void;
}

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  percentage?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioPageClientComponent: React.FC<PortfolioPageClientProps> = ({ 
  isGuestMode, 
  userId,
  onAssetsChange: parentOnAssetsChange
}) => {
  // const [currentAssets, setCurrentAssets] = useState<DisplayAsset[]>([]);

  const handleAssetsChange = useCallback((assets: DisplayAsset[]) => {
    // setCurrentAssets(assets);
    
    // Notify parent component of asset changes for CSV functionality
    if (parentOnAssetsChange) {
      const exportableAssets = assets.map(asset => ({
        symbol: asset.symbol,
        quantity: asset.quantity,
        avgCost: asset.avgCost,
        percentage: asset.percentage,
        assetType: asset.assetType
      }));
      parentOnAssetsChange(exportableAssets);
    }
  }, [parentOnAssetsChange]);


  return (
    <div className="bg-white rounded-lg shadow">
      <PortfolioTable 
        isGuestMode={isGuestMode} 
        userId={userId} 
        onAssetsChange={handleAssetsChange}
      />
    </div>
  );
};

export const PortfolioPageClient = React.memo(PortfolioPageClientComponent);