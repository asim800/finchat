// ============================================================================
// FILE: app/logout/page.tsx
// Simple logout page to clear authentication
// ============================================================================

'use client';

import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    // Clear the auth cookie and redirect
    document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to home page after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Logging out...</h1>
        <p className="text-gray-600">Clearing your session and redirecting to home page.</p>
      </div>
    </div>
  );
}