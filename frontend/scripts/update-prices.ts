#!/usr/bin/env npx tsx
// ============================================================================
// FILE: scripts/update-prices.ts
// Manual script to update historical prices for given assets
// Usage: npm run update-prices
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Asset price data interface
interface AssetPrice {
  symbol: string;
  price: number;
  assetType?: string;
  source?: string;
}

// Configuration: Add your assets and current prices here
const ASSET_PRICES: AssetPrice[] = [
  // Example assets - update with your actual data
  { symbol: 'AAPL', price: 195.89, assetType: 'stock', source: 'manual' },
  { symbol: 'GOOGL', price: 140.34, assetType: 'stock', source: 'manual' },
  { symbol: 'MSFT', price: 378.85, assetType: 'stock', source: 'manual' },
  { symbol: 'TSLA', price: 248.42, assetType: 'stock', source: 'manual' },
  { symbol: 'NVDA', price: 875.28, assetType: 'stock', source: 'manual' },
  { symbol: 'SPY', price: 493.52, assetType: 'etf', source: 'manual' },
  { symbol: 'QQQ', price: 408.33, assetType: 'etf', source: 'manual' },
  { symbol: 'BTC-USD', price: 43250.75, assetType: 'crypto', source: 'manual' },
  { symbol: 'ETH-USD', price: 2380.42, assetType: 'crypto', source: 'manual' },
];

// Date to use for all price updates (defaults to now)
const PRICE_DATE = new Date();

async function updateHistoricalPrices() {
  console.log('🚀 Starting historical price update...');
  console.log(`📅 Using date: ${PRICE_DATE.toISOString()}`);
  console.log(`📊 Processing ${ASSET_PRICES.length} assets`);
  console.log('─'.repeat(60));

  const results = {
    updated: 0,
    created: 0,
    errors: 0,
    skipped: 0
  };

  for (const asset of ASSET_PRICES) {
    try {
      console.log(`🔄 Processing ${asset.symbol}...`);

      // Validate asset data
      if (!asset.symbol || typeof asset.price !== 'number' || asset.price <= 0) {
        console.log(`❌ ${asset.symbol}: Invalid data (symbol: ${asset.symbol}, price: ${asset.price})`);
        results.errors++;
        continue;
      }

      // Check if price already exists for this symbol and date
      const existingPrice = await prisma.historicalPrice.findFirst({
        where: {
          symbol: asset.symbol.toUpperCase(),
          date: {
            gte: new Date(PRICE_DATE.getFullYear(), PRICE_DATE.getMonth(), PRICE_DATE.getDate()),
            lt: new Date(PRICE_DATE.getFullYear(), PRICE_DATE.getMonth(), PRICE_DATE.getDate() + 1)
          }
        }
      });

      if (existingPrice) {
        // Update existing price
        await prisma.historicalPrice.update({
          where: { id: existingPrice.id },
          data: {
            price: asset.price,
            source: asset.source || 'manual',
            assetType: asset.assetType || 'stock'
          }
        });
        console.log(`✅ ${asset.symbol}: Updated existing price to $${asset.price.toFixed(2)}`);
        results.updated++;
      } else {
        // Create new price record
        await prisma.historicalPrice.create({
          data: {
            symbol: asset.symbol.toUpperCase(),
            price: asset.price,
            date: PRICE_DATE,
            source: asset.source || 'manual',
            assetType: asset.assetType || 'stock'
          }
        });
        console.log(`🆕 ${asset.symbol}: Created new price record at $${asset.price.toFixed(2)}`);
        results.created++;
      }

    } catch (error) {
      console.error(`❌ ${asset.symbol}: Error updating price -`, error);
      results.errors++;
    }
  }

  console.log('─'.repeat(60));
  console.log('📈 Price Update Summary:');
  console.log(`✅ Updated: ${results.updated}`);
  console.log(`🆕 Created: ${results.created}`);
  console.log(`❌ Errors: ${results.errors}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`📊 Total Processed: ${results.updated + results.created + results.errors + results.skipped}`);

  if (results.errors > 0) {
    console.log('⚠️  Some assets had errors. Check the logs above for details.');
  } else {
    console.log('🎉 All assets processed successfully!');
  }
}

async function main() {
  try {
    await updateHistoricalPrices();
  } catch (error) {
    console.error('💥 Fatal error during price update:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run only if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { updateHistoricalPrices, ASSET_PRICES };