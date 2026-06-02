// Updated middleware to allow guest access to certain pages

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define different route categories
const protectedRoutes = ['/dashboard/myportfolio', '/dashboard/income', '/dashboard/retirement', '/dashboard/reference', '/dashboard/monte-carlo', '/api-keys', '/accounts'];
const guestAllowedRoutes = ['/dashboard/chat', '/dashboard/portfolio', '/directory', '/demo']; // Chat, Templates, Directory available for guests

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Simple token presence check (actual validation happens in API routes)
  const isAuthenticated = !!token;

  // NOTE: we used to redirect authenticated users away from /login + /register to
  // /dashboard/chat. Removed because it broke the "switch demo user" flow — a
  // user with a stale or different auth cookie clicking "Sign In" got teleported
  // to chat with no way to actually re-login. The login form submits to
  // /api/auth/login which overwrites the cookie, so re-authentication works
  // correctly from the form even when already logged in.
  
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


