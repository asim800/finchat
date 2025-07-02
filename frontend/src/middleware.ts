// ============================================================================
// FILE: middleware.ts (UPDATED)
// Updated middleware to allow guest access to certain pages
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define different route categories
const protectedRoutes = ['/dashboard/portfolio', '/api-keys', '/accounts'];
const authRoutes = ['/login', '/register'];
const guestAllowedRoutes = ['/dashboard/chat', '/demo']; // Chat available for guests with limited features

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;
  
  // Simple token presence check (actual validation happens in API routes)
  const isAuthenticated = !!token;
  
  
  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard/chat', request.url));
  }
  
  // Redirect unauthenticated users away from fully protected pages
  if (!isAuthenticated && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // For guest-allowed routes, set appropriate mode headers
  if (guestAllowedRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    if (!isAuthenticated) {
      response.headers.set('x-guest-mode', 'true');
    } else {
      response.headers.set('x-guest-mode', 'false');
    }
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};



