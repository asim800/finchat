-- ============================================================================
-- Migration: Add chat history limit to user settings
-- Description: Add chatHistoryLimit field to users table with default value of 3
-- ============================================================================

-- Add chatHistoryLimit column with default value of 3
ALTER TABLE "users" ADD COLUMN "chatHistoryLimit" INTEGER NOT NULL DEFAULT 3;