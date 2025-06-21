// ============================================================================
// FILE: lib/auth.ts
// Authentication utilities and JWT handling
// ============================================================================

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Hash password for storage
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Extract user from request (for API routes)
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    // Here you'd typically fetch full user data from database
    // For now, returning basic info from token
    return {
      id: payload.userId,
      email: payload.email,
      firstName: '', // Would come from DB
      lastName: ''   // Would come from DB
    };
  } catch {
    return null;
  }
}

