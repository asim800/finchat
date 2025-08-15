// ============================================================================
// FILE: components/chat/responsive-chat-layout.tsx
// Responsive layout that adapts to different screen sizes
// ============================================================================

'use client';

import React from 'react';
import { ChatInterface } from './chat-interface';

interface ResponsiveChatLayoutProps {
  isGuestMode?: boolean;
  userId?: string;
}

export const ResponsiveChatLayout: React.FC<ResponsiveChatLayoutProps> = ({ 
  isGuestMode = false, 
  userId 
}) => {

  return (
    <div className="h-full flex flex-col">
      {/* Chat Interface - Full Height with Inline Charts */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatInterface 
          isGuestMode={isGuestMode} 
          userId={userId}
          hideInlineCharts={false}
        />
      </div>
    </div>
  );
};