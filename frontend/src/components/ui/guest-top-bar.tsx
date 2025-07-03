// ============================================================================
// FILE: components/ui/guest-top-bar.tsx
// Top bar template for guest users
// ============================================================================

'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { MenuIcon, XIcon } from 'lucide-react';

interface GuestTopBarProps {}

export const GuestTopBar: React.FC<GuestTopBarProps> = () => {
  const pathname = usePathname();
  const isPortfolioPage = pathname?.includes('/portfolio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              RiskLens
            </Link>
            
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Demo Mode
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
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

            <div className="border-l border-gray-200 pl-4 flex items-center space-x-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-sm font-medium">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="text-sm font-medium">Sign Up</Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-3">
            <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Demo
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
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full justify-start text-sm font-medium mb-2"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button 
                    size="sm"
                    className="w-full justify-start text-sm font-medium"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};