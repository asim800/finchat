// ============================================================================
// FILE: components/ui/guest-mode-indicator.tsx
// Guest mode capability indicator with clear upgrade prompts
// ============================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, XIcon } from 'lucide-react';

interface GuestModeIndicatorProps {
  variant?: 'banner' | 'inline' | 'minimal';
  feature?: string;
  showDismiss?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const GuestModeIndicator: React.FC<GuestModeIndicatorProps> = ({
  variant = 'banner',
  feature,
  showDismiss = false,
  onDismiss,
  className = ''
}) => {
  if (variant === 'minimal') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ${className}`}>
        Demo Mode
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <InfoIcon className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              {feature ? (
                <>Demo mode limits access to <strong>{feature}</strong>. Sign up to unlock all features.</>
              ) : (
                <>You're in demo mode. Your data won't be saved permanently.</>
              )}
            </p>
          </div>
          <Link href="/register">
            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white ml-3">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <Alert className={`bg-yellow-50 border-yellow-400 border-l-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-start">
          <InfoIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-yellow-800 font-medium text-sm mb-1">
              Demo Mode Active
            </h3>
            <AlertDescription className="text-yellow-700 text-sm">
              {feature ? (
                <>You're currently in demo mode. {feature} and other advanced features require an account. Your portfolio data won't be saved permanently.</>
              ) : (
                <>You're currently in demo mode. Your data won't be saved permanently. Create an account to keep your portfolio and access all features.</>
              )}
            </AlertDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Link href="/register">
            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap">
              Sign Up Now
            </Button>
          </Link>
          {showDismiss && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 p-1"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
};

// Capability check wrapper component
interface CapabilityCheckProps {
  feature: string;
  guestAllowed?: boolean;
  isGuestMode: boolean;
  children: React.ReactNode;
  showOverlay?: boolean;
  className?: string;
}

export const CapabilityCheck: React.FC<CapabilityCheckProps> = ({
  feature,
  guestAllowed = false,
  isGuestMode,
  children,
  showOverlay = true,
  className = ''
}) => {
  if (isGuestMode && !guestAllowed) {
    return (
      <div className={`relative ${className}`}>
        {children}
        {showOverlay && (
          <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center rounded-lg">
            <div className="text-center p-4 max-w-sm">
              <InfoIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-3 text-sm font-medium">
                Sign up to use {feature}
              </p>
              <p className="text-gray-500 mb-4 text-xs">
                This feature requires a free account to access
              </p>
              <Link href="/register">
                <Button size="sm" className="w-full">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

// Hook for guest mode detection
export const useGuestMode = () => {
  // This would typically check authentication context
  // For now, we'll check if there's no auth token
  const [isGuestMode, setIsGuestMode] = React.useState(true);

  React.useEffect(() => {
    // Check for auth token in cookies or localStorage
    const checkAuthStatus = () => {
      if (typeof window !== 'undefined') {
        const authToken = document.cookie.includes('auth-token=');
        setIsGuestMode(!authToken);
      }
    };

    checkAuthStatus();
    
    // Listen for auth changes
    const interval = setInterval(checkAuthStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return { isGuestMode };
};