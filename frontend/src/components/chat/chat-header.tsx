// ============================================================================
// FILE: components/chat/chat-header.tsx
// Chat page header with action buttons
// ============================================================================

'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { CsvManager } from '@/components/portfolio/csv-manager';

interface ChatHeaderProps {
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

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isGuestMode,
  guestAssets = [],
  onCsvUploadComplete
}) => {
  const title = 'Interactive Chat';
  const description = isGuestMode 
    ? 'Chat with our AI assistant about general financial topics. Sign up for personalized advice!'
    : 'Get personalized financial insights and portfolio analysis from our AI assistant.';

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