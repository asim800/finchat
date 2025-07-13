// ============================================================================
// FILE: lib/logger.ts
// Conditional logging utility for production builds
// ============================================================================

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = {
  // Development-only logging
  debug: (message: any, ...args: any[]) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  // Information logs - shown in development
  info: (message: any, ...args: any[]) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  // Warning logs - shown in development and production
  warn: (message: any, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  // Error logs - always shown
  error: (message: any, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  // Success logs - shown in development
  success: (message: any, ...args: any[]) => {
    if (isDev) {
      console.log(`[SUCCESS] ✅ ${message}`, ...args);
    }
  },

  // Feature logs for debugging features
  feature: (feature: string, message: any, ...args: any[]) => {
    if (isDev) {
      console.log(`[${feature.toUpperCase()}] ${message}`, ...args);
    }
  },

  // Analytics logs - only in development and test
  analytics: (event: string, data?: any) => {
    if (isDev || isTest) {
      console.log(`[ANALYTICS] ${event}`, data);
    }
  },

  // API logs for debugging API calls
  api: (method: string, url: string, data?: any) => {
    if (isDev) {
      console.log(`[API] ${method.toUpperCase()} ${url}`, data);
    }
  },

  // Performance logs
  time: (label: string) => {
    if (isDev) {
      console.time(`[PERF] ${label}`);
    }
  },

  timeEnd: (label: string) => {
    if (isDev) {
      console.timeEnd(`[PERF] ${label}`);
    }
  }
};

// Legacy console.log replacement
export const devLog = (message: any, ...args: any[]) => {
  if (isDev) {
    console.log(message, ...args);
  }
};