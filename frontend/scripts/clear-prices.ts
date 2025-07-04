#!/usr/bin/env npx tsx
// ============================================================================
// FILE: scripts/clear-prices.ts
// Script to delete all historical price records
// Usage: npm run clear-prices
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllPrices() {
  console.log('🗑️  Historical Price Table Cleanup');
  console.log('─'.repeat(60));

  try {
    // Get current count before deletion
    const currentCount = await prisma.historicalPrice.count();
    console.log(`📊 Current records in table: ${currentCount}`);

    if (currentCount === 0) {
      console.log('✅ Table is already empty!');
      return;
    }

    // Confirm deletion (in a real scenario, you'd want interactive confirmation)
    console.log('⚠️  WARNING: This will delete ALL historical price records!');
    console.log('🔄 Proceeding with deletion...');

    // Delete all records
    const result = await prisma.historicalPrice.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} historical price records`);
    console.log('🎉 Historical price table is now empty');

  } catch (error) {
    console.error('❌ Error clearing historical prices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  clearAllPrices().catch((error) => {
    console.error('💥 Fatal error during cleanup:', error);
    process.exit(1);
  });
}

export { clearAllPrices };