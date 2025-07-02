// ============================================================================
// FILE: app/api/debug/auth/route.ts
// Debug endpoint to check authentication status
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const guestMode = request.headers.get('x-guest-mode');
  
  let tokenValid = false;
  let tokenError = null;
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      jwt.verify(token, process.env.JWT_SECRET!);
      tokenValid = true;
    } catch (error) {
      tokenError = error instanceof Error ? error.message : 'Invalid token';
    }
  }
  
  return NextResponse.json({
    hasToken: !!token,
    tokenValid,
    tokenError,
    guestModeHeader: guestMode,
    isGuestMode: guestMode === 'true'
  });
}