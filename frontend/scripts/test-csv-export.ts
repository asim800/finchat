#!/usr/bin/env npx tsx
// ============================================================================
// FILE: scripts/test-csv-export.ts
// Test script for new CSV export functionality
// ============================================================================

import { exportPortfolioToCsv, ExportableAsset } from '../src/lib/csv-export';

// Sample portfolio data with both regular and options assets
const testAssets: ExportableAsset[] = [
  {
    symbol: 'AAPL',
    quantity: 100,
    avgPrice: 150.50,
    assetType: 'stock',
    totalValue: 15050
  },
  {
    symbol: 'SPY',
    quantity: 50,
    avgPrice: 493.52,
    assetType: 'etf',
    totalValue: 24676
  },
  {
    symbol: 'AAPL',
    quantity: 10,
    avgPrice: 5.20,
    assetType: 'options',
    totalValue: 52,
    optionType: 'call',
    strikePrice: 160.00,
    expirationDate: new Date('2024-12-20')
  },
  {
    symbol: 'BTC-USD',
    quantity: 0.5,
    avgPrice: 43250.75,
    assetType: 'crypto',
    totalValue: 21625.38
  }
];

function testCsvExport() {
  console.log('🧪 Testing CSV Export with New Format');
  console.log('─'.repeat(60));

  // Test 1: Export with all fields
  console.log('Test 1: Export with all fields including options');
  const csvWithOptions = exportPortfolioToCsv(testAssets, {
    includeHeaders: true,
    includePrice: true,
    includeTotalValue: true,
    includeAssetType: true,
    includeOptionsFields: true
  });
  
  console.log('Generated CSV:');
  console.log(csvWithOptions);
  console.log('');

  // Test 2: Export without options fields
  console.log('Test 2: Export without options fields');
  const csvBasic = exportPortfolioToCsv(testAssets, {
    includeHeaders: true,
    includePrice: true,
    includeTotalValue: true,
    includeAssetType: true,
    includeOptionsFields: false
  });
  
  console.log('Generated CSV:');
  console.log(csvBasic);
  console.log('');

  // Test 3: Minimal export
  console.log('Test 3: Minimal export (symbol and quantity only)');
  const csvMinimal = exportPortfolioToCsv(testAssets, {
    includeHeaders: true,
    includePrice: false,
    includeTotalValue: false,
    includeAssetType: false,
    includeOptionsFields: false
  });
  
  console.log('Generated CSV:');
  console.log(csvMinimal);
  console.log('');

  console.log('✅ All CSV export tests completed successfully!');
}

if (require.main === module) {
  testCsvExport();
}