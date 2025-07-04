#!/usr/bin/env npx tsx
// ============================================================================
// FILE: scripts/update-prices-advanced.ts
// Advanced script to update historical prices with JSON config support
// Usage: npm run update-prices-advanced [config-file.json]
// ============================================================================

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Asset price data interface
interface AssetPrice {
  symbol: string;
  price: number;
  assetType?: string;
  source?: string;
}

interface PriceConfig {
  description?: string;
  date?: string;
  assets: AssetPrice[];
}

async function loadPriceConfig(configPath?: string): Promise<PriceConfig> {
  // Default config file paths to try
  const defaultPaths = [
    'scripts/price-config.json',
    'price-config.json',
    'scripts/price-config.example.json'
  ];

  const pathsToTry = configPath ? [configPath, ...defaultPaths] : defaultPaths;

  for (const configFile of pathsToTry) {
    const fullPath = path.resolve(configFile);
    
    if (fs.existsSync(fullPath)) {
      console.log(`📁 Loading config from: ${configFile}`);
      
      try {
        const configData = fs.readFileSync(fullPath, 'utf-8');
        const config: PriceConfig = JSON.parse(configData);
        
        // Validate config structure
        if (!config.assets || !Array.isArray(config.assets)) {
          throw new Error('Config must have an "assets" array');
        }
        
        return config;
      } catch (error) {
        console.error(`❌ Error loading config file ${configFile}:`, error);
        throw error;
      }
    }
  }

  throw new Error(`Config file not found. Tried: ${pathsToTry.join(', ')}`);
}

async function updateHistoricalPrices(config: PriceConfig) {
  console.log('🚀 Starting historical price update...');
  
  // Use date from config or current date
  const priceDate = config.date ? new Date(config.date) : new Date();
  console.log(`📅 Using date: ${priceDate.toISOString()}`);
  console.log(`📊 Processing ${config.assets.length} assets`);
  
  if (config.description) {
    console.log(`📝 Description: ${config.description}`);
  }
  
  console.log('─'.repeat(60));

  const results = {
    updated: 0,
    created: 0,
    errors: 0,
    skipped: 0,
    details: [] as string[]
  };

  for (const asset of config.assets) {
    try {
      console.log(`🔄 Processing ${asset.symbol}...`);

      // Validate asset data
      if (!asset.symbol || typeof asset.price !== 'number' || asset.price <= 0) {
        const errorMsg = `Invalid data (symbol: ${asset.symbol}, price: ${asset.price})`;
        console.log(`❌ ${asset.symbol}: ${errorMsg}`);
        results.details.push(`❌ ${asset.symbol}: ${errorMsg}`);
        results.errors++;
        continue;
      }

      // Check if price already exists for this symbol and date
      const startOfDay = new Date(priceDate.getFullYear(), priceDate.getMonth(), priceDate.getDate());
      const endOfDay = new Date(priceDate.getFullYear(), priceDate.getMonth(), priceDate.getDate() + 1);
      
      const existingPrice = await prisma.historicalPrice.findFirst({
        where: {
          symbol: asset.symbol.toUpperCase(),
          date: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      if (existingPrice) {
        // Check if price is different before updating
        if (Math.abs(existingPrice.price - asset.price) < 0.01) {
          console.log(`⏭️  ${asset.symbol}: Price unchanged ($${asset.price.toFixed(2)}), skipping`);
          results.details.push(`⏭️  ${asset.symbol}: Price unchanged`);
          results.skipped++;
          continue;
        }

        // Update existing price
        await prisma.historicalPrice.update({
          where: { id: existingPrice.id },
          data: {
            price: asset.price,
            source: asset.source || 'manual',
            assetType: asset.assetType || existingPrice.assetType || 'stock'
          }
        });
        
        const updateMsg = `Updated $${existingPrice.price.toFixed(2)} → $${asset.price.toFixed(2)}`;
        console.log(`✅ ${asset.symbol}: ${updateMsg}`);
        results.details.push(`✅ ${asset.symbol}: ${updateMsg}`);
        results.updated++;
      } else {
        // Create new price record
        await prisma.historicalPrice.create({
          data: {
            symbol: asset.symbol.toUpperCase(),
            price: asset.price,
            date: priceDate,
            source: asset.source || 'manual',
            assetType: asset.assetType || 'stock'
          }
        });
        
        const createMsg = `Created new price record at $${asset.price.toFixed(2)}`;
        console.log(`🆕 ${asset.symbol}: ${createMsg}`);
        results.details.push(`🆕 ${asset.symbol}: ${createMsg}`);
        results.created++;
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));

    } catch (error) {
      const errorMsg = `Error updating price: ${error}`;
      console.error(`❌ ${asset.symbol}: ${errorMsg}`);
      results.details.push(`❌ ${asset.symbol}: ${errorMsg}`);
      results.errors++;
    }
  }

  // Summary
  console.log('─'.repeat(60));
  console.log('📈 Price Update Summary:');
  console.log(`✅ Updated: ${results.updated}`);
  console.log(`🆕 Created: ${results.created}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Errors: ${results.errors}`);
  console.log(`📊 Total Processed: ${results.updated + results.created + results.errors + results.skipped}`);

  if (results.errors > 0) {
    console.log('\n⚠️  Assets with errors:');
    results.details.filter(d => d.startsWith('❌')).forEach(detail => console.log(detail));
  }

  if (results.errors === 0) {
    console.log('\n🎉 All assets processed successfully!');
  }

  return results;
}

async function main() {
  try {
    // Get config file from command line argument
    const configFile = process.argv[2];
    
    if (configFile) {
      console.log(`🔍 Using config file: ${configFile}`);
    } else {
      console.log('🔍 Looking for default config files...');
    }

    const config = await loadPriceConfig(configFile);
    await updateHistoricalPrices(config);
  } catch (error) {
    console.error('💥 Fatal error during price update:', error);
    console.log('\n💡 Usage: npm run update-prices-advanced [config-file.json]');
    console.log('💡 Example: npm run update-prices-advanced scripts/my-prices.json');
    console.log('💡 Or create scripts/price-config.json with your asset prices');
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

export { updateHistoricalPrices, loadPriceConfig };