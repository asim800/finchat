// ============================================================================
// FILE: app/dashboard/profile/page.tsx
// User profile page with comprehensive financial information
// ============================================================================

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProfilePageWrapper } from '@/components/profile/profile-page-wrapper';

export default async function ProfilePage() {
  const headersList = await headers();
  const isGuestMode = headersList.get('x-guest-mode') === 'true';
  
  // Redirect guests to login
  if (isGuestMode) {
    redirect('/login');
  }
  
  // Get user information
  let user = null;
  try {
    // Extract auth token from cookies
    const cookieHeader = headersList.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    
    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch[1]);
      // Import JWT verification here to avoid circular imports
      const jwt = await import('jsonwebtoken');
      const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
      
      // Fetch user from database with all profile fields
      const { prisma } = await import('@/lib/db');
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          phone: true,
          birthDate: true,
          housingType: true,
          homeValue: true,
          monthlyRent: true,
          monthlyMortgage: true,
          monthlyIncome: true,
          monthlyAlimony: true,
          monthlyFixedExpenses: true,
          employmentStatus: true,
          dependents: true,
          emergencyFund: true,
          totalDebt: true,
          estimatedSocialSecurityAt65: true,
          investmentGoals: true,
          riskTolerance: true,
          investmentExperience: true,
          createdAt: true,
          updatedAt: true
        }
      });
    }
  } catch (error) {
    console.error('Error getting user:', error);
    redirect('/login');
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProfilePageWrapper user={user} />
    </div>
  );
}