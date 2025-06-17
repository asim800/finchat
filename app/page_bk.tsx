import Image from "next/image";

// ============================================================================
// FILE: app/page.tsx
// Root page - redirect to login
// ============================================================================

import { redirect } from 'next/navigation';

export default function HomePage() {
  // For now, redirect to login page
  // Later you can add a landing page here
  redirect('/login');
}


// ============================================================================
// FILE: app/(dashboard)/chat/page.tsx
// Chat page that works for both authenticated and guest users
// ============================================================================

import { headers } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ChatPage() {
  const headersList = headers();
  const isGuestMode = headersList.get('x-guest-mode') === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Finance App
              </Link>
              {isGuestMode && (
                <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Demo Mode
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {isGuestMode ? (
                <>
                  <Link href="/login">
                    <Button variant="outline" size="sm">Sign In</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/portfolio">
                    <Button variant="outline" size="sm">Portfolio</Button>
                  </Link>
                  <Link href="/api-keys">
                    <Button variant="outline" size="sm">Settings</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  You're in demo mode
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    You can chat with our AI assistant, but some features like portfolio management and bank integration require an account.
                    <Link href="/register" className="font-medium underline hover:text-blue-600 ml-1">
                      Sign up for free
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isGuestMode ? 'AI Financial Assistant - Demo' : 'AI Financial Assistant'}
          </h1>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chat Interface Coming Soon</h3>
            <p className="text-gray-600 mb-4">
              {isGuestMode 
                ? 'This is where you\'ll be able to chat with our AI assistant about general financial topics.'
                : 'This is where you\'ll chat with our AI assistant about your portfolio and financial goals.'
              }
            </p>
            <p className="text-sm text-gray-500">
              We'll build the chat interface next!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
