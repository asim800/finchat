// ============================================================================
// FILE: app/dashboard/myportfolio/page.tsx
// User's personal portfolio management page with CRUD functionality
// ============================================================================

import { headers } from 'next/headers';
import Link from 'next/link';
import { PortfolioPageWrapper } from '@/components/portfolio/portfolio-page-wrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Enhanced UI Demo */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Portfolio</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant="success">Profitable</Badge>
            <Badge variant="warning">Volatile</Badge>
            <Badge variant="destructive">At Risk</Badge>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="success" size="sm" className="text-sm font-medium">Add Asset</Button>
          <Button variant="outline" size="sm" className="text-sm font-medium">Export</Button>
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


        {/* Portfolio Management with Header */}
        <PortfolioPageWrapper isGuestMode={isGuestMode || !user} userId={user?.id} />
    </div>
  );
}