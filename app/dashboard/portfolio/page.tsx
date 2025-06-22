// ============================================================================
// FILE: app/dashboard/portfolio/page.tsx
// Portfolio management page with CRUD functionality
// ============================================================================

import { headers } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PortfolioTable } from '@/components/portfolio/portfolio-table';

export default async function PortfolioPage() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Finance App
              </Link>
              {isGuestMode && (
                <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Demo Mode
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {isGuestMode ? (
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm">Sign In</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  {user && (
                    <span className="text-sm text-gray-600">
                      Hi, <span className="font-medium text-gray-900">{user.firstName}</span>
                    </span>
                  )}
                  <Link href="/dashboard/chat">
                    <Button variant="outline" size="sm">Chat</Button>
                  </Link>
                  <Link href="/dashboard/api-keys">
                    <Button variant="outline" size="sm">Settings</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isGuestMode ? 'Demo Portfolio' : 'My Portfolio'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isGuestMode 
                  ? 'Manage your demo portfolio. Sign up to save permanently!'
                  : 'Manage your investment portfolio and track your assets.'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/dashboard/chat">
                <Button variant="outline">
                  💬 Chat Assistant
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Guest Mode Notice */}
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
                  Demo Mode Portfolio
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    This is a demo portfolio that will not be saved permanently. Your changes are stored temporarily during this session.
                    <Link href="/register" className="font-medium underline hover:text-blue-600 ml-1">
                      Sign up for free
                    </Link> to save your portfolio permanently and access advanced features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personalized Welcome for Authenticated Users */}
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
                  Welcome to your portfolio, {user.firstName}! 📊
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add, edit, or remove assets from your investment portfolio below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Table Component */}
        <div className="bg-white rounded-lg shadow">
          <PortfolioTable isGuestMode={isGuestMode || !user} userId={user?.id} />
        </div>
      </div>
    </div>
  );
}