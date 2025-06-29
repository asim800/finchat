// ============================================================================
// FILE: components/ui/authenticated-top-bar.tsx
// Top bar template for authenticated users
// ============================================================================

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthenticatedTopBarProps {
  user: User;
}

export const AuthenticatedTopBar: React.FC<AuthenticatedTopBarProps> = ({ 
  user
}) => {
  const pathname = usePathname();
  const isPortfolioPage = pathname?.includes('/portfolio');

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              RiskLens
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Hi, <span className="font-medium text-gray-900">{user.firstName}</span>
            </span>
            
            <div className="flex items-center space-x-2">
              <Link href="/dashboard/portfolio">
                <Button 
                  variant={isPortfolioPage ? "primary" : "outline"} 
                  size="sm"
                >
                  Portfolio
                </Button>
              </Link>
              <Link href="/dashboard/chat">
                <Button 
                  variant={pathname?.includes('/chat') ? "primary" : "outline"} 
                  size="sm"
                >
                  Chat
                </Button>
              </Link>
              <Link href="/dashboard/api-keys">
                <Button variant="outline" size="sm">Settings</Button>
              </Link>
            </div>

            <form action="/api/auth/logout" method="POST" className="inline">
              <Button type="submit" variant="outline" size="sm">Logout</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};