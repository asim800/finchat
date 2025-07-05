-- ============================================================================
-- Migration: Rename avgPrice to avgCost
-- Description: Rename the avgPrice column to avgCost for better clarity
-- ============================================================================

-- Rename the column from avgPrice to avgCost
ALTER TABLE "assets" RENAME COLUMN "avgPrice" TO "avgCost";