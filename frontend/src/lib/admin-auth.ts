// ============================================================================
// FILE: lib/admin-auth.ts
// Admin authentication and authorization utilities
// ============================================================================

import { NextRequest } from 'next/server';
import { getUserFromRequest } from './auth';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Check if a user has admin privileges
 */
export function isAdmin(user: { role?: string }): boolean {
  return user.role === 'admin';
}

/**
 * Get admin user from request, returns null if not admin
 */
export async function getAdminFromRequest(request: NextRequest): Promise<AdminUser | null> {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return null;
    }
    
    // Check if user has admin role
    if (!isAdmin(user)) {
      console.warn(`Non-admin user attempted admin access: ${user.email}`);
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'user'
    };
  } catch (error) {
    console.error('Admin auth error:', error);
    return null;
  }
}

/**
 * Admin authorization error response
 */
export const ADMIN_UNAUTHORIZED = {
  error: 'Admin access required',
  message: 'You must be an administrator to access this resource'
};

/**
 * Admin route protection helper
 */
export async function requireAdmin(request: NextRequest): Promise<AdminUser> {
  const admin = await getAdminFromRequest(request);
  
  if (!admin) {
    throw new Error('Admin access required');
  }
  
  return admin;
}