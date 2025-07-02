// ============================================================================
// FILE: app/dashboard/chat/page.tsx (UPDATED)
// Updated chat page with actual chat interface
// ============================================================================

import { headers } from 'next/headers';
import { ChatPageClient } from '@/components/chat/chat-page-client';

export default async function ChatPage() {
  const headersList = await headers();
  const isGuestMode = headersList.get('x-guest-mode') === 'true';
  const guestModeHeader = headersList.get('x-guest-mode');
  
  // Get user information if not in guest mode
  let user = null;
  if (!isGuestMode) {
    try {
      // Use the same authentication logic as API routes
      const { getUserFromRequest } = await import('@/lib/auth');
      
      // Create a mock request object with the headers
      const mockRequest = {
        cookies: {
          get: (name: string) => {
            const cookieHeader = headersList.get('cookie') || '';
            const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
            return match ? { value: decodeURIComponent(match[1]) } : undefined;
          }
        },
        headers: {
          get: (name: string) => headersList.get(name)
        }
      } as any;
      
      user = await getUserFromRequest(mockRequest);
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


