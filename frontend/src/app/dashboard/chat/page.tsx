// ============================================================================
// FILE: app/dashboard/chat/page.tsx (UPDATED)
// Updated chat page with actual chat interface
// ============================================================================

import { headers } from 'next/headers';
import Link from 'next/link';
import { TopBar } from '@/components/ui/top-bar';
import { ResponsiveChatLayout } from '@/components/chat/responsive-chat-layout';

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <TopBar isGuestMode={isGuestMode} user={user} />

      {/* Main content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        {isGuestMode && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  You&apos;re in demo mode
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    You can chat with our AI assistant about general financial topics, but personalized advice requires an account.
                    <Link href="/register" className="font-medium underline hover:text-blue-600 ml-1">
                      Sign up for free
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personalized Welcome Message */}
        {!isGuestMode && user && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-lg">
                    {user.firstName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Welcome back, {user.firstName}! 👋
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  How can I help you with your finances today?
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Container - Takes remaining space */}
        <div className="flex-1 min-h-0">
          <ResponsiveChatLayout isGuestMode={isGuestMode} userId={user?.id} />
        </div>
      </div>
    </div>
  );
}


