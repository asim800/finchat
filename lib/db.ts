// ============================================================================
// FILE: lib/db.ts
// Database connection utility
// ============================================================================

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================================================
// FILE: types/auth.ts
// TypeScript types for authentication
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface AuthError {
  error: string;
  details?: any;
}

