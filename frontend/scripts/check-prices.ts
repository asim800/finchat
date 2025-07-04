#!/usr/bin/env npx tsx
// ============================================================================
// FILE: scripts/check-prices.ts
// Simple script to check recent historical prices
// Usage: npm run check-prices
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentPrices() {
  console.log('📊 Recent Historical Prices');
  console.log('─'.repeat(80));

  try {
    // Get all unique symbols
    const symbols = await prisma.historicalPrice.findMany({
      select: { symbol: true },
      distinct: ['symbol'],
      orderBy: { symbol: 'asc' }
    });

    console.log(`Found ${symbols.length} unique symbols in database\n`);

    // Get recent prices for each symbol
    for (const { symbol } of symbols) {
      const recentPrices = await prisma.historicalPrice.findMany({
        where: { symbol },
        orderBy: { date: 'desc' },
        take: 3,
        select: {
          price: true,
          date: true,
          source: true,
          assetType: true
        }
      });

      if (recentPrices.length > 0) {
        const latest = recentPrices[0];
        console.log(`📈 ${symbol.padEnd(10)} $${latest.price.toFixed(2).padStart(8)} (${latest.assetType || 'unknown'}) - ${latest.date.toLocaleDateString()}`);
        
        // Show price history if available
        if (recentPrices.length > 1) {
          recentPrices.slice(1).forEach((price, index) => {
            const change = latest.price - price.price;
            const changePercent = ((change / price.price) * 100).toFixed(2);
            const changeSign = change >= 0 ? '+' : '';
            console.log(`   ↳ ${price.date.toLocaleDateString().padEnd(10)} $${price.price.toFixed(2).padStart(8)} (${changeSign}${change.toFixed(2)}, ${changeSign}${changePercent}%)`);
          });
        }
        console.log('');
      }
    }

    // Summary statistics
    const totalPrices = await prisma.historicalPrice.count();
    const oldestPrice = await prisma.historicalPrice.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true, symbol: true }
    });
    const newestPrice = await prisma.historicalPrice.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true, symbol: true }
    });

    console.log('─'.repeat(80));
    console.log('📊 Database Summary:');
    console.log(`   Total price records: ${totalPrices}`);
    console.log(`   Unique symbols: ${symbols.length}`);
    if (oldestPrice) {
      console.log(`   Oldest record: ${oldestPrice.symbol} on ${oldestPrice.date.toLocaleDateString()}`);
    }
    if (newestPrice) {
      console.log(`   Newest record: ${newestPrice.symbol} on ${newestPrice.date.toLocaleDateString()}`);
    }

  } catch (error) {
    console.error('❌ Error checking prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkRecentPrices().catch(console.error);
}

export { checkRecentPrices };