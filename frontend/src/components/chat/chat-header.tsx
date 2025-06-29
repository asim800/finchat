// ============================================================================
// FILE: components/chat/chat-header.tsx
// Chat page header with action buttons
// ============================================================================

'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';

interface ChatHeaderProps {
  isGuestMode: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isGuestMode
}) => {
  const title = 'Interactive Chat';
  const description = isGuestMode 
    ? 'Chat with our AI assistant about general financial topics. Sign up for personalized advice!'
    : 'Get personalized financial insights and portfolio analysis from our AI assistant.';

  const actions = [
    {
      type: 'link' as const,
      href: '/dashboard/portfolio',
      label: 'Portfolio',
      icon: '📊',
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