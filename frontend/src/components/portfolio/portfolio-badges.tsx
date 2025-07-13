// ============================================================================
// FILE: components/portfolio/portfolio-badges.tsx
// Portfolio-specific badge indicators for risk assessment
// ============================================================================

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  price?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PortfolioBadgesProps {
  assets: DisplayAsset[];
  portfolioValue?: number;
  portfolioCost?: number;
}

export const PortfolioBadges: React.FC<PortfolioBadgesProps> = ({ 
  assets, 
  portfolioValue = 0, 
  portfolioCost = 0 
}) => {
  // Early return if no assets
  if (assets.length === 0) {
    return null;
  }

  // Calculate portfolio metrics for badge determination
  const gainLoss = portfolioValue - portfolioCost;
  const gainLossPercentage = portfolioCost > 0 ? (gainLoss / portfolioCost) * 100 : 0;
  
  // Analyze asset diversity and volatility indicators
  const assetTypes = new Set(assets.map(asset => asset.assetType));
  const hasHighRiskAssets = assets.some(asset => 
    asset.assetType === 'crypto' || asset.assetType === 'option'
  );
  
  // Calculate concentration risk (if any single asset is >50% of portfolio value)
  const assetConcentrations = assets.map(asset => 
    portfolioValue > 0 ? asset.totalValue / portfolioValue : 0
  );
  const maxConcentration = Math.max(...assetConcentrations, 0);
  const isConcentrated = maxConcentration > 0.5;

  // Determine badges based on portfolio characteristics
  const badges = [];

  // At Risk badge: Significant losses or high concentration in declining assets (highest priority)
  if (gainLossPercentage < -15 || (isConcentrated && gainLoss < 0)) {
    badges.push(
      <Badge key="at-risk" variant="destructive">
        At Risk
      </Badge>
    );
  }
  // Profitable badge: Portfolio has positive gains and sufficient cost basis
  else if (gainLoss > 0 && portfolioCost > 0 && gainLossPercentage > 5) {
    badges.push(
      <Badge key="profitable" variant="success">
        Profitable
      </Badge>
    );
  }

  // Volatile badge: High-risk assets or concentrated positions
  if (hasHighRiskAssets || isConcentrated || (assetTypes.size === 1 && assets.length > 1)) {
    badges.push(
      <Badge key="volatile" variant="warning">
        Volatile
      </Badge>
    );
  }

  // Diversified badge: Well-distributed portfolio
  if (assetTypes.size >= 3 && !isConcentrated && !hasHighRiskAssets) {
    badges.push(
      <Badge key="diversified" variant="secondary">
        Diversified
      </Badge>
    );
  }

  // If no specific conditions met, show a neutral badge for portfolios with assets
  if (badges.length === 0) {
    badges.push(
      <Badge key="stable" variant="secondary">
        Stable
      </Badge>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {badges}
    </div>
  );
};