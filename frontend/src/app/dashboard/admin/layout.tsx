// ============================================================================
// FILE: app/dashboard/admin/layout.tsx
// Admin section layout with navigation
// ============================================================================

import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Administrative tools and analytics',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">System monitoring and analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <Link 
              href="/dashboard/admin/chat-analytics"
              className="py-4 px-2 border-b-2 border-blue-500 text-blue-600 font-medium"
            >
              Chat Analytics
            </Link>
            {/* Add more admin navigation items here */}
            <Link 
              href="/dashboard/admin/users"
              className="py-4 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              User Management
            </Link>
            <Link 
              href="/dashboard/admin/system"
              className="py-4 px-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              System Health
            </Link>
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}