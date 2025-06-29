// ============================================================================
// FILE: components/portfolio/portfolio-header.tsx
// Portfolio page header with action buttons
// ============================================================================

'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { CsvManager } from './csv-manager';

interface PortfolioHeaderProps {
  isGuestMode: boolean;
  guestAssets?: Array<{
    symbol: string;
    quantity: number;
    avgPrice?: number | null;
    percentage?: number | null;
    assetType: string;
  }>;
  onCsvUploadComplete?: () => void;
}

export const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({
  isGuestMode,
  guestAssets = [],
  onCsvUploadComplete
}) => {
  const title = isGuestMode ? 'Demo Portfolio' : 'My Portfolio';
  const description = isGuestMode 
    ? 'Manage your demo portfolio. Sign up to save permanently!'
    : 'Manage your investment portfolio and track your assets.';

  const actions = [
    {
      type: 'component' as const,
      component: (
        <CsvManager 
          isGuestMode={isGuestMode}
          guestAssets={guestAssets}
          onUploadComplete={onCsvUploadComplete || (() => window.location.reload())}
        />
      )
    },
    {
      type: 'link' as const,
      href: '/dashboard/chat',
      label: 'Chat Assistant',
      icon: '💬',
      variant: 'outline' as const
    }
  ];

  return (
    <PageHeader 
      title={title}
      description={description}
      actions={actions}
    />
  );
};