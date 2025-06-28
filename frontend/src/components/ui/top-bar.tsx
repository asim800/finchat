// ============================================================================
// FILE: components/ui/top-bar.tsx
// Reusable top navigation bar component
// ============================================================================

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface TopBarProps {
  isGuestMode?: boolean;
  user?: User | null;
}

export const TopBar: React.FC<TopBarProps> = ({ isGuestMode = false, user }) => {
  return (
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
                <Link href="/dashboard/portfolio">
                  <Button variant="outline" size="sm">Portfolio</Button>
                </Link>
                <Link href="/dashboard/chat">
                  <Button variant="outline" size="sm">Chat</Button>
                </Link>
                <Link href="/dashboard/api-keys">
                  <Button variant="outline" size="sm">Settings</Button>
                </Link>
                <form action="/api/auth/logout" method="POST" className="inline">
                  <Button type="submit" variant="outline" size="sm">Logout</Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};