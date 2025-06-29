// ============================================================================
// FILE: app/dashboard/chat/page.tsx (UPDATED)
// Updated chat page with actual chat interface
// ============================================================================

import { headers } from 'next/headers';
import { ChatPageClient } from '@/components/chat/chat-page-client';

export default async function ChatPage() {
  const headersList = await headers();
  const isGuestMode = headersList.get('x-guest-mode') === 'true';
  
  // Get user information if not in guest mode
  let user = null;
  if (!isGuestMode) {
    try {
      // Extract auth token from cookies
      const cookieHeader = headersList.get('cookie') || '';
      const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
      
      if (tokenMatch) {
        const token = decodeURIComponent(tokenMatch[1]);
        // Import JWT verification here to avoid circular imports
        const jwt = await import('jsonwebtoken');
        const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
        
        // Fetch user from database
        const { prisma } = await import('@/lib/db');
        user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        });
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }

  return (
    <ChatPageClient 
      isGuestMode={isGuestMode || !user} 
      userId={user?.id} 
    />
  );
}


