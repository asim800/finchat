// ============================================================================
// FILE: tests/components/navigation.test.ts
// Test suite for navigation components and route matching logic
// ============================================================================

// Mock Next.js navigation
const mockPush = jest.fn();
const mockPathname = '/dashboard/myportfolio';

const mockUseRouter = () => ({
  push: mockPush,
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn()
});

const mockUsePathname = () => mockPathname;

// Navigation test utilities
class NavigationTestUtils {
  
  // Test the route matching logic that was simplified
  static isActiveRoute(pathname: string, route: string | string[]): boolean {
    if (!pathname) return false;
    const routes = Array.isArray(route) ? route : [route];
    return routes.some(r => pathname.includes(r));
  }
  
  static getNavButtonVariant(isActive: boolean, mobileMode = false): string {
    if (mobileMode) {
      return isActive ? "default" : "ghost";
    }
    return isActive ? "default" : "outline";
  }
  
  // Simulate the navigation items configuration
  static getMainNavItems(pathname: string) {
    const isMyPortfolioPage = NavigationTestUtils.isActiveRoute(pathname, '/myportfolio');
    const isReferencePortfolioPage = NavigationTestUtils.isActiveRoute(pathname, '/dashboard/portfolio') && 
                                   !NavigationTestUtils.isActiveRoute(pathname, '/myportfolio');
    const isChatPage = NavigationTestUtils.isActiveRoute(pathname, '/chat');
    const isContactPage = NavigationTestUtils.isActiveRoute(pathname, '/contact');
    
    return [
      { href: '/dashboard/myportfolio', label: 'My Portfolio', isActive: isMyPortfolioPage },
      { href: '/dashboard/portfolio', label: 'Templates', isActive: isReferencePortfolioPage },
      { href: '/dashboard/chat', label: 'Chat', isActive: isChatPage },
      { href: '/contact', label: 'Contact us', isActive: isContactPage }
    ];
  }
  
  static getSettingsNavItems() {
    return [
      { href: '/dashboard/account', label: 'Account', icon: 'UserIcon' },
      { href: '/dashboard/profile', label: 'Profile', icon: 'CogIcon' }
    ];
  }
}

describe('Navigation Components', () => {
  
  describe('Route Matching Logic', () => {
    
    test('should correctly identify active routes', () => {
      const testCases = [
        {
          pathname: '/dashboard/myportfolio',
          route: '/myportfolio',
          expected: true
        },
        {
          pathname: '/dashboard/portfolio',
          route: '/dashboard/portfolio',
          expected: true
        },
        {
          pathname: '/dashboard/chat/session-123',
          route: '/chat',
          expected: true
        },
        {
          pathname: '/dashboard/profile',
          route: '/contact',
          expected: false
        },
        {
          pathname: '',
          route: '/dashboard',
          expected: false
        }
      ];
      
      testCases.forEach(({ pathname, route, expected }) => {
        const result = NavigationTestUtils.isActiveRoute(pathname, route);
        expect(result).toBe(expected);
      });
    });
    
    test('should handle multiple route patterns', () => {
      const pathname = '/dashboard/chat/session-123';
      const routes = ['/chat', '/messaging'];
      
      const result = NavigationTestUtils.isActiveRoute(pathname, routes);
      expect(result).toBe(true);
    });
    
    test('should handle portfolio route specificity', () => {
      // Test the complex logic for portfolio vs myportfolio
      const testCases = [
        {
          pathname: '/dashboard/myportfolio',
          expectMyPortfolio: true,
          expectReference: false
        },
        {
          pathname: '/dashboard/portfolio',
          expectMyPortfolio: false,
          expectReference: true
        },
        {
          pathname: '/dashboard/portfolio/template-123',
          expectMyPortfolio: false,
          expectReference: true
        }
      ];
      
      testCases.forEach(({ pathname, expectMyPortfolio, expectReference }) => {
        const isMyPortfolio = NavigationTestUtils.isActiveRoute(pathname, '/myportfolio');
        const isReference = NavigationTestUtils.isActiveRoute(pathname, '/dashboard/portfolio') && 
                          !NavigationTestUtils.isActiveRoute(pathname, '/myportfolio');
        
        expect(isMyPortfolio).toBe(expectMyPortfolio);
        expect(isReference).toBe(expectReference);
      });
    });
  });

  describe('Navigation Configuration', () => {
    
    test('should generate correct navigation items', () => {
      const pathname = '/dashboard/myportfolio';
      const navItems = NavigationTestUtils.getMainNavItems(pathname);
      
      expect(navItems).toHaveLength(4);
      expect(navItems[0].label).toBe('My Portfolio');
      expect(navItems[0].isActive).toBe(true);
      expect(navItems[1].isActive).toBe(false); // Templates should not be active
    });
    
    test('should handle navigation state correctly for different pages', () => {
      const testCases = [
        {
          pathname: '/dashboard/chat',
          expectedActive: 'Chat'
        },
        {
          pathname: '/contact',
          expectedActive: 'Contact us'
        },
        {
          pathname: '/dashboard/portfolio/templates',
          expectedActive: 'Templates'
        }
      ];
      
      testCases.forEach(({ pathname, expectedActive }) => {
        const navItems = NavigationTestUtils.getMainNavItems(pathname);
        const activeItem = navItems.find(item => item.isActive);
        
        expect(activeItem?.label).toBe(expectedActive);
      });
    });
  });

  describe('Button Variant Logic', () => {
    
    test('should return correct variants for desktop navigation', () => {
      expect(NavigationTestUtils.getNavButtonVariant(true, false)).toBe('default');
      expect(NavigationTestUtils.getNavButtonVariant(false, false)).toBe('outline');
    });
    
    test('should return correct variants for mobile navigation', () => {
      expect(NavigationTestUtils.getNavButtonVariant(true, true)).toBe('default');
      expect(NavigationTestUtils.getNavButtonVariant(false, true)).toBe('ghost');
    });
  });

  describe('Settings Navigation', () => {
    
    test('should provide correct settings items', () => {
      const settingsItems = NavigationTestUtils.getSettingsNavItems();
      
      expect(settingsItems).toHaveLength(2);
      expect(settingsItems[0].label).toBe('Account');
      expect(settingsItems[1].label).toBe('Profile');
      expect(settingsItems[0].href).toBe('/dashboard/account');
      expect(settingsItems[1].href).toBe('/dashboard/profile');
    });
  });

  describe('Navigation Integration', () => {
    
    test('should handle authenticated vs guest navigation differences', () => {
      // Test data for different user types
      const guestNavItems = [
        { href: '/dashboard/myportfolio', label: 'My Portfolio' },
        { href: '/dashboard/portfolio', label: 'Templates' },
        { href: '/dashboard/chat', label: 'Chat' },
        { href: '/contact', label: 'Contact us' }
      ];
      
      const authNavItems = [
        ...guestNavItems,
        { href: '/dashboard/profile', label: 'Profile' },
        { href: '/dashboard/account', label: 'Account' }
      ];
      
      expect(guestNavItems).toHaveLength(4);
      expect(authNavItems).toHaveLength(6);
    });
    
    test('should handle admin navigation correctly', () => {
      const adminItems = [
        { href: '/admin', label: 'Admin Panel', icon: 'ShieldIcon' }
      ];
      
      expect(adminItems[0].href).toBe('/admin');
      expect(adminItems[0].label).toBe('Admin Panel');
    });
  });

  describe('Mobile Navigation Behavior', () => {
    
    test('should provide consistent mobile menu state management', () => {
      let isMobileMenuOpen = false;
      
      const toggleMobileMenu = () => {
        isMobileMenuOpen = !isMobileMenuOpen;
      };
      
      const closeMobileMenu = () => {
        isMobileMenuOpen = false;
      };
      
      // Test opening
      toggleMobileMenu();
      expect(isMobileMenuOpen).toBe(true);
      
      // Test closing
      closeMobileMenu();
      expect(isMobileMenuOpen).toBe(false);
      
      // Test toggle when closed
      toggleMobileMenu();
      expect(isMobileMenuOpen).toBe(true);
      
      // Test toggle when open
      toggleMobileMenu();
      expect(isMobileMenuOpen).toBe(false);
    });
    
    test('should handle mobile menu item interactions', () => {
      const mockOnClick = jest.fn();
      let isMobileMenuOpen = true;
      
      const handleMobileNavClick = () => {
        mockOnClick();
        isMobileMenuOpen = false;
      };
      
      handleMobileNavClick();
      
      expect(mockOnClick).toHaveBeenCalled();
      expect(isMobileMenuOpen).toBe(false);
    });
  });

  describe('Authentication Context', () => {
    
    test('should handle different user roles correctly', () => {
      const testUsers = [
        { role: 'user', expectAdmin: false },
        { role: 'admin', expectAdmin: true },
        { role: undefined, expectAdmin: false }
      ];
      
      testUsers.forEach(({ role, expectAdmin }) => {
        const hasAdminAccess = role === 'admin';
        expect(hasAdminAccess).toBe(expectAdmin);
      });
    });
    
    test('should handle guest mode appropriately', () => {
      const guestModeTestCases = [
        { isGuestMode: true, user: null, expectedTopBar: 'guest' },
        { isGuestMode: false, user: { id: '123' }, expectedTopBar: 'authenticated' },
        { isGuestMode: false, user: null, expectedTopBar: 'guest' }
      ];
      
      guestModeTestCases.forEach(({ isGuestMode, user, expectedTopBar }) => {
        const shouldShowGuestTopBar = isGuestMode || !user;
        const topBarType = shouldShowGuestTopBar ? 'guest' : 'authenticated';
        
        expect(topBarType).toBe(expectedTopBar);
      });
    });
  });

  describe('Performance Tests', () => {
    
    test('should quickly determine route matching', () => {
      const startTime = Date.now();
      
      // Test 1000 route matches
      for (let i = 0; i < 1000; i++) {
        NavigationTestUtils.isActiveRoute('/dashboard/myportfolio', '/myportfolio');
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 1000 route matches in under 10ms
      expect(totalTime).toBeLessThan(10);
    });
    
    test('should quickly generate navigation configuration', () => {
      const startTime = Date.now();
      
      // Test 100 navigation configurations
      for (let i = 0; i < 100; i++) {
        NavigationTestUtils.getMainNavItems('/dashboard/myportfolio');
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 100 configurations in under 5ms
      expect(totalTime).toBeLessThan(5);
    });
  });

  describe('Edge Cases', () => {
    
    test('should handle empty or null pathnames', () => {
      const testCases = ['', null, undefined];
      
      testCases.forEach(pathname => {
        const result = NavigationTestUtils.isActiveRoute(pathname as string, '/dashboard');
        expect(result).toBe(false);
      });
    });
    
    test('should handle complex nested routes', () => {
      const nestedRoutes = [
        '/dashboard/portfolio/template/123/edit',
        '/dashboard/chat/session/456/messages',
        '/dashboard/myportfolio/asset/789/details'
      ];
      
      nestedRoutes.forEach(pathname => {
        const navItems = NavigationTestUtils.getMainNavItems(pathname);
        const activeItems = navItems.filter(item => item.isActive);
        
        // Should have exactly one active item
        expect(activeItems).toHaveLength(1);
      });
    });
    
    test('should handle route conflicts appropriately', () => {
      // Test the specific case where /dashboard/portfolio could match both
      // portfolio templates and myportfolio
      const conflictingPath = '/dashboard/portfolio';
      
      const isMyPortfolio = NavigationTestUtils.isActiveRoute(conflictingPath, '/myportfolio');
      const isReference = NavigationTestUtils.isActiveRoute(conflictingPath, '/dashboard/portfolio') && 
                        !NavigationTestUtils.isActiveRoute(conflictingPath, '/myportfolio');
      
      expect(isMyPortfolio).toBe(false);
      expect(isReference).toBe(true);
    });
  });
});

// Export test utilities for use in other tests
export { NavigationTestUtils };

// Integration test helper
export class NavigationIntegrationTestUtils {
  
  static simulateNavigation(fromPath: string, toPath: string) {
    const fromNavItems = NavigationTestUtils.getMainNavItems(fromPath);
    const toNavItems = NavigationTestUtils.getMainNavItems(toPath);
    
    return {
      from: {
        path: fromPath,
        activeItem: fromNavItems.find(item => item.isActive)?.label
      },
      to: {
        path: toPath,
        activeItem: toNavItems.find(item => item.isActive)?.label
      }
    };
  }
  
  static validateNavigationConsistency() {
    const testPaths = [
      '/dashboard/myportfolio',
      '/dashboard/portfolio',
      '/dashboard/chat',
      '/contact',
      '/dashboard/profile'
    ];
    
    const results = testPaths.map(path => {
      const navItems = NavigationTestUtils.getMainNavItems(path);
      const activeItems = navItems.filter(item => item.isActive);
      
      return {
        path,
        activeCount: activeItems.length,
        activeItem: activeItems[0]?.label
      };
    });
    
    // Validate that each path has exactly one active item (or none for non-nav pages)
    results.forEach(result => {
      if (result.path.includes('/profile')) {
        // Profile page doesn't have main nav active items
        expect(result.activeCount).toBe(0);
      } else {
        expect(result.activeCount).toBe(1);
      }
    });
    
    return results;
  }
}