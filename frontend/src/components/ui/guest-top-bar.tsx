// ============================================================================
// FILE: components/ui/guest-top-bar.tsx
// Top bar template for guest users
// ============================================================================

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface GuestTopBarProps {}

export const GuestTopBar: React.FC<GuestTopBarProps> = () => {
  const pathname = usePathname();
  const isPortfolioPage = pathname?.includes('/portfolio');

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              RiskLens
            </Link>
            
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Demo Mode
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
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
            </div>

            <div className="border-l border-gray-200 pl-4 flex items-center space-x-2">
              <Link href="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};