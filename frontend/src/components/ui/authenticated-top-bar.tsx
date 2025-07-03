// ============================================================================
// FILE: components/ui/authenticated-top-bar.tsx
// Top bar template for authenticated users
// ============================================================================

'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
import { ChevronDownIcon, UserIcon, CogIcon, LogOutIcon, MenuIcon, XIcon } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Hi, <span className="font-medium text-gray-900">{user.firstName}</span>
            </span>
            
            <div className="flex items-center space-x-3 sm:space-x-2">
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
              <Link href="/learning">
                <Button 
                  variant={pathname?.includes('/learning') ? "default" : "outline"} 
                  size="sm"
                  className="text-sm font-medium"
                >
                  Learning
                </Button>
              </Link>
              <Link href="/contact">
                <Button 
                  variant={pathname?.includes('/contact') ? "default" : "outline"} 
                  size="sm"
                  className="text-sm font-medium"
                >
                  Contact us
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

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              Hi, <span className="font-medium text-gray-900">{user.firstName}</span>
            </span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <XIcon className="h-5 w-5" />
              ) : (
                <MenuIcon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white py-4">
            <div className="flex flex-col space-y-3">
              <Link href="/dashboard/portfolio" onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant={isPortfolioPage ? "default" : "ghost"} 
                  size="sm"
                  className="w-full justify-start text-sm font-medium"
                >
                  Portfolio
                </Button>
              </Link>
              <Link href="/dashboard/chat" onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant={pathname?.includes('/chat') ? "default" : "ghost"} 
                  size="sm"
                  className="w-full justify-start text-sm font-medium"
                >
                  Chat
                </Button>
              </Link>
              <Link href="/learning" onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant={pathname?.includes('/learning') ? "default" : "ghost"} 
                  size="sm"
                  className="w-full justify-start text-sm font-medium"
                >
                  Learning
                </Button>
              </Link>
              <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                <Button 
                  variant={pathname?.includes('/contact') ? "default" : "ghost"} 
                  size="sm"
                  className="w-full justify-start text-sm font-medium"
                >
                  Contact us
                </Button>
              </Link>
              
              <div className="border-t pt-3 mt-3">
                <Link href="/dashboard/profile" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-sm font-medium"
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </Link>
                <Link href="/dashboard/account" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-sm font-medium"
                  >
                    <CogIcon className="mr-2 h-4 w-4" />
                    Account
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
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
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};