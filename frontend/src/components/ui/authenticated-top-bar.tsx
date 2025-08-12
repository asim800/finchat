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
import { ChevronDownIcon, UserIcon, CogIcon, LogOutIcon, MenuIcon, XIcon, ShieldIcon, BookOpenIcon, DatabaseIcon } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface AuthenticatedTopBarProps {
  user: User;
}

export const AuthenticatedTopBar: React.FC<AuthenticatedTopBarProps> = ({ 
  user
}) => {
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

  const settingsNavItems = [
    { href: '/dashboard/account', label: 'Account', icon: UserIcon },
    { href: '/dashboard/profile', label: 'Profile', icon: CogIcon }
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

  const renderSettingsNavItem = (item: typeof settingsNavItems[0]) => (
    <DropdownMenuItem key={item.href} asChild>
      <Link href={item.href} className="flex items-center">
        <item.icon className="mr-2 h-4 w-4" />
        {item.label}
      </Link>
    </DropdownMenuItem>
  );

  return (
    <div className="bg-background shadow-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
              MyStocks.ai
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Hi, <span className="font-medium text-foreground">{user.firstName}</span>
            </span>
            
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
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-sm font-medium">
                  Settings
                  <ChevronDownIcon className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {settingsNavItems.map(item => renderSettingsNavItem(item))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/learning/supported-assets" className="flex items-center">
                    <DatabaseIcon className="mr-2 h-4 w-4" />
                    Supported Assets
                  </Link>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center">
                        <ShieldIcon className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
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
            <span className="text-sm text-muted-foreground">
              Hi, <span className="font-medium text-foreground">{user.firstName}</span>
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
              
              <div className="border-t pt-3 mt-3">
                {settingsNavItems.map(item => (
                  <Link key={item.href} href={item.href} onClick={closeMobileMenu}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full justify-start text-sm font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
                <Link href="/learning/supported-assets" onClick={closeMobileMenu}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-sm font-medium"
                  >
                    <DatabaseIcon className="mr-2 h-4 w-4" />
                    Supported Assets
                  </Button>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={closeMobileMenu}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full justify-start text-sm font-medium"
                    >
                      <ShieldIcon className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
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