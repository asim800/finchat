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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MenuIcon, XIcon, ChevronDownIcon, BookOpenIcon, DatabaseIcon } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GuestTopBarProps {}

export const GuestTopBar: React.FC<GuestTopBarProps> = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation helper functions
  const isActiveRoute = (route: string | string[]): boolean => {
    if (!pathname) return false;
    const routes = Array.isArray(route) ? route : [route];
    return routes.some(r => pathname.includes(r));
  };

  const isMyPortfolioPage = isActiveRoute('/myportfolio');
  const isReferencePortfolioPage = isActiveRoute('/dashboard/portfolio') && !isActiveRoute('/myportfolio');
  const isChatPage = isActiveRoute('/chat');
  const isLearningPage = isActiveRoute('/learning');
  const isContactPage = isActiveRoute('/contact');

  const getNavButtonVariant = (isActive: boolean, mobileMode = false) => {
    if (mobileMode) {
      return isActive ? "default" : "ghost";
    }
    return isActive ? "default" : "outline";
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Navigation configuration
  const mainNavItems = [
    { href: '/dashboard/myportfolio', label: 'My Portfolio', isActive: isMyPortfolioPage },
    { href: '/dashboard/portfolio', label: 'Templates', isActive: isReferencePortfolioPage },
    { href: '/dashboard/chat', label: 'Chat', isActive: isChatPage },
    { href: '/contact', label: 'Contact us', isActive: isContactPage }
  ];

  const authNavItems = [
    { href: '/login', label: 'Sign In', variant: 'outline' as const },
    { href: '/register', label: 'Sign Up', variant: 'default' as const }
  ];

  const renderNavButton = (item: typeof mainNavItems[0], mobileMode = false) => (
    <Link key={item.href} href={item.href} onClick={mobileMode ? closeMobileMenu : undefined}>
      <Button 
        variant={getNavButtonVariant(item.isActive, mobileMode)}
        size="sm"
        className={`text-sm font-medium ${mobileMode ? 'w-full justify-start' : ''}`}
      >
        {item.label}
      </Button>
    </Link>
  );

  const renderAuthButton = (item: typeof authNavItems[0], mobileMode = false) => (
    <Link key={item.href} href={item.href} onClick={mobileMode ? closeMobileMenu : undefined}>
      <Button 
        variant={item.variant}
        size="sm"
        className={`text-sm font-medium ${mobileMode ? 'w-full justify-start mb-2' : ''}`}
      >
        {item.label}
      </Button>
    </Link>
  );

  return (
    <div className="bg-background shadow-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
              MyStocks.ai
            </Link>
            
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Demo Mode
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-3 sm:space-x-2">
              {mainNavItems.map(item => renderNavButton(item))}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={getNavButtonVariant(isLearningPage)}
                    size="sm"
                    className="text-sm font-medium"
                  >
                    Learning
                    <ChevronDownIcon className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/learning/financial-terms" className="flex items-center">
                      <BookOpenIcon className="mr-2 h-4 w-4" />
                      Financial Terms
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Link href="/learning/supported-assets">
                <Button 
                  variant={getNavButtonVariant(isLearningPage)}
                  size="sm"
                  className="text-sm font-medium"
                >
                  <DatabaseIcon className="mr-2 h-4 w-4" />
                  Supported Assets
                </Button>
              </Link>
            </div>

            <div className="border-l border-gray-200 pl-4 flex items-center space-x-2">
              {authNavItems.map(item => renderAuthButton(item))}
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-3">
            <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
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
          <div className="md:hidden border-t border-border bg-background py-4">
            <div className="flex flex-col space-y-3">
              {mainNavItems.map(item => renderNavButton(item, true))}
              
              <Link href="/learning/financial-terms" onClick={closeMobileMenu}>
                <Button 
                  variant={getNavButtonVariant(isLearningPage, true)}
                  size="sm"
                  className="w-full justify-start text-sm font-medium"
                >
                  <BookOpenIcon className="mr-2 h-4 w-4" />
                  Financial Terms
                </Button>
              </Link>
              
              <Link href="/learning/supported-assets" onClick={closeMobileMenu}>
                <Button 
                  variant={getNavButtonVariant(isLearningPage, true)}
                  size="sm"
                  className="w-full justify-start text-sm font-medium"
                >
                  <DatabaseIcon className="mr-2 h-4 w-4" />
                  Supported Assets
                </Button>
              </Link>
              
              <div className="border-t pt-3 mt-3">
                {authNavItems.map(item => renderAuthButton(item, true))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};