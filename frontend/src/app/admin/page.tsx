// ============================================================================
// FILE: app/admin/page.tsx
// Admin dashboard with user management and database access
// ============================================================================

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { isAdmin } from '@/lib/admin-auth';

export default async function AdminPage() {
  // Check if user is authenticated and is admin
  let user = null;
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    
    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch[1]);
      const jwt = await import('jsonwebtoken');
      const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
      
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
  } catch {
    // Not authenticated or invalid token
  }

  // Redirect if not authenticated or not admin
  if (!user) {
    redirect('/login?redirect=/admin');
  }

  if (!isAdmin(user)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-red-100">Welcome, {user.firstName} {user.lastName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-red-700 px-3 py-1 rounded text-sm">
                Administrator
              </span>
              <a 
                href="/dashboard" 
                className="bg-white text-red-600 px-4 py-2 rounded hover:bg-gray-100 transition-colors"
              >
                Back to App
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="max-w-7xl mx-auto p-6">
        <AdminDashboard user={user} />
      </div>
    </div>
  );
}