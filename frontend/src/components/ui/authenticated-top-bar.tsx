// ============================================================================
// FILE: components/ui/authenticated-top-bar.tsx
// Top bar template for authenticated users
// ============================================================================

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDownIcon, UserIcon, CogIcon, LogOutIcon } from 'lucide-react';

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
                  variant={isPortfolioPage ? "default" : "outline"} 
                  size="sm"
                  className="text-sm font-medium"
                >
                  Portfolio
                </Button>
              </Link>
              <Link href="/dashboard/chat">
                <Button 
                  variant={pathname?.includes('/chat') ? "default" : "outline"} 
                  size="sm"
                  className="text-sm font-medium"
                >
                  Chat
                </Button>
              </Link>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-sm font-medium">
                  Settings
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/account" className="flex items-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center">
                    <CogIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center text-red-600 focus:text-red-600"
                  onClick={() => {
                    const form = document.createElement('form');
                    form.action = '/api/auth/logout';
                    form.method = 'POST';
                    document.body.appendChild(form);
                    form.submit();
                  }}
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};