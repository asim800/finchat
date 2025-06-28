// ============================================================================
// FILE: app/api/auth/logout/route.ts
// User logout endpoint
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Create a redirect response to the main page
  const response = NextResponse.redirect(new URL('/', request.url));
  
  // Clear the auth cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Immediately expire
  });
  
  return response;
}

