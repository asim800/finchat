// ============================================================================
// FILE: components/chat/chat-page-client.tsx
// Client wrapper for chat page with guest asset support
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatHeader } from './chat-header';
import { ResponsiveChatLayout } from './responsive-chat-layout';
import { GuestPortfolioService, generateGuestSessionId } from '@/lib/guest-portfolio';

interface ChatPageClientProps {
  isGuestMode: boolean;
  userId?: string;
}

export const ChatPageClient: React.FC<ChatPageClientProps> = ({ 
  isGuestMode, 
  userId 
}) => {
  const [guestAssets, setGuestAssets] = useState<Array<{
    symbol: string;
    quantity: number;
    avgPrice?: number | null;
    percentage?: number | null;
    assetType: string;
  }>>([]);

  // Load guest assets on mount
  useEffect(() => {
    if (isGuestMode) {
      const loadGuestAssets = () => {
        try {
          const guestSessionId = generateGuestSessionId();
          const guestService = new GuestPortfolioService(guestSessionId);
          const assets = guestService.getAssets();
          
          const formattedAssets = assets.map(asset => ({
            symbol: asset.symbol,
            quantity: asset.quantity,
            avgPrice: asset.avgPrice,
            percentage: asset.percentage,
            assetType: asset.assetType
          }));
          
          setGuestAssets(formattedAssets);
        } catch (error) {
          console.error('Error loading guest assets:', error);
          setGuestAssets([]);
        }
      };

      loadGuestAssets();
      
      // Set up an interval to refresh guest assets periodically
      const interval = setInterval(loadGuestAssets, 5000);
      return () => clearInterval(interval);
    }
  }, [isGuestMode]);

  const handleCsvUploadComplete = () => {
    // Refresh guest assets after CSV upload
    if (isGuestMode) {
      const guestSessionId = generateGuestSessionId();
      const guestService = new GuestPortfolioService(guestSessionId);
      const assets = guestService.getAssets();
      
      const formattedAssets = assets.map(asset => ({
        symbol: asset.symbol,
        quantity: asset.quantity,
        avgPrice: asset.avgPrice,
        percentage: asset.percentage,
        assetType: asset.assetType
      }));
      
      setGuestAssets(formattedAssets);
    }
    // For authenticated users, page will refresh automatically
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Chat Header with CSV Manager */}
      <ChatHeader 
        isGuestMode={isGuestMode} 
        guestAssets={guestAssets}
        onCsvUploadComplete={handleCsvUploadComplete}
      />

      {/* Guest Mode Notice */}
      {isGuestMode && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                You&apos;re in demo mode
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  You can chat with our AI assistant about general financial topics, but personalized advice requires an account.
                  <Link href="/register" className="font-medium underline hover:text-blue-600 ml-1">
                    Sign up for free
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="bg-white rounded-lg shadow min-h-[600px]">
        <ResponsiveChatLayout isGuestMode={isGuestMode} userId={userId} />
      </div>
    </div>
  );
};