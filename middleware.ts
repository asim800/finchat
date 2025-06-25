// ============================================================================
// FILE: middleware.ts (UPDATED)
// Updated middleware to allow guest access to certain pages
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define different route categories
const protectedRoutes = ['/portfolio', '/api-keys', '/accounts'];
const authRoutes = ['/login', '/register'];
const guestAllowedRoutes = ['/chat', '/demo']; // Chat available for guests with limited features

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;
  
  // Simple check: if token exists, assume authenticated (JWT verification happens in API routes)
  const isAuthenticated = !!token;
  
  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }
  
  // Redirect unauthenticated users away from fully protected pages
  if (!isAuthenticated && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // For guest-allowed routes, add a header to indicate guest status
  if (!isAuthenticated && guestAllowedRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    response.headers.set('x-guest-mode', 'true');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};



