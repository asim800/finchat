// ============================================================================
// FILE: components/layouts/dashboard-layout.tsx
// Dashboard layout wrapper with templated TopBar
// ============================================================================

import React from 'react';
import { headers } from 'next/headers';
import { AuthenticatedTopBar } from '@/components/ui/authenticated-top-bar';
import { GuestTopBar } from '@/components/ui/guest-top-bar';
import { FinancialDisclaimerFooter } from '@/components/ui/financial-disclaimer-footer';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = async ({ children }) => {
  const headersList = await headers();
  const isGuestMode = headersList.get('x-guest-mode') === 'true';
  
  // Get user information if not in guest mode
  let user: User | null = null;
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
            lastName: true,
            role: true
          }
        });
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Render appropriate TopBar based on authentication */}
      {isGuestMode || !user ? (
        <GuestTopBar />
      ) : (
        <AuthenticatedTopBar user={user} />
      )}

      {/* Main content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Financial Disclaimer Footer */}
      <FinancialDisclaimerFooter />

      {/* Admin floater - only show for admin users */}
      {user?.role === 'admin' && (
        <div className="fixed top-20 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-50 flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Admin Mode
        </div>
      )}
    </div>
  );
};