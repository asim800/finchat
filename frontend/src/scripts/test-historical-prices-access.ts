// ============================================================================
// FILE: scripts/test-historical-prices-access.ts
// Test script to verify historical_prices table access patterns
// ============================================================================

import { prisma } from '../lib/db';
import { HistoricalPriceService } from '../lib/historical-price-service';

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  data?: any;
}

async function createTestData() {
  console.log('📊 Creating test data with multiple historical entries...');
  
  // Create test data for AAPL with different dates (newest to oldest)
  const testPrices = [
    { symbol: 'AAPL', price: 195.50, date: new Date('2024-01-15'), source: 'test' },
    { symbol: 'AAPL', price: 193.80, date: new Date('2024-01-14'), source: 'test' },
    { symbol: 'AAPL', price: 192.30, date: new Date('2024-01-13'), source: 'test' },
    { symbol: 'AAPL', price: 190.75, date: new Date('2024-01-12'), source: 'test' },
    { symbol: 'AAPL', price: 188.90, date: new Date('2024-01-11'), source: 'test' },
    
    // Test data for GOOGL
    { symbol: 'GOOGL', price: 142.80, date: new Date('2024-01-15'), source: 'test' },
    { symbol: 'GOOGL', price: 141.50, date: new Date('2024-01-14'), source: 'test' },
    { symbol: 'GOOGL', price: 140.25, date: new Date('2024-01-13'), source: 'test' },
    
    // Test data for MSFT
    { symbol: 'MSFT', price: 378.85, date: new Date('2024-01-15'), source: 'test' },
    { symbol: 'MSFT', price: 376.40, date: new Date('2024-01-14'), source: 'test' },
  ];

  let created = 0;
  let skipped = 0;

  for (const price of testPrices) {
    const result = await HistoricalPriceService.addPrice(price);
    if (result) {
      created++;
      console.log(`✅ Created: ${price.symbol} - $${price.price} (${price.date.toISOString().split('T')[0]})`);
    } else {
      skipped++;
      console.log(`⏭️  Skipped: ${price.symbol} - $${price.price} (already exists)`);
    }
  }

  console.log(`\n📈 Test data summary: ${created} created, ${skipped} skipped\n`);
  return { created, skipped };
}

async function testLatestPriceRetrieval(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: getLatestPrice should return most recent price
  console.log('🧪 Test 1: getLatestPrice returns most recent price');
  try {
    const latestAAPL = await HistoricalPriceService.getLatestPrice('AAPL');
    const passed = latestAAPL === 195.50; // Should be the most recent price from 2024-01-15
    
    results.push({
      testName: 'getLatestPrice - AAPL',
      passed,
      details: `Expected: 195.50, Got: ${latestAAPL}`,
      data: { expected: 195.50, actual: latestAAPL }
    });

    console.log(passed ? '✅ PASSED' : '❌ FAILED', `- Expected: 195.50, Got: ${latestAAPL}`);
  } catch (error) {
    results.push({
      testName: 'getLatestPrice - AAPL',
      passed: false,
      details: `Error: ${error}`,
      data: { error }
    });
    console.log('❌ FAILED - Error:', error);
  }

  // Test 2: getLatestPricesForSymbols should return latest for each symbol
  console.log('\n🧪 Test 2: getLatestPricesForSymbols returns latest for all symbols');
  try {
    const latestPrices = await HistoricalPriceService.getLatestPricesForSymbols(['AAPL', 'GOOGL', 'MSFT']);
    
    const expectedPrices = { 'AAPL': 195.50, 'GOOGL': 142.80, 'MSFT': 378.85 };
    let allPassed = true;
    const details: string[] = [];

    for (const [symbol, expectedPrice] of Object.entries(expectedPrices)) {
      const actualPrice = latestPrices[symbol];
      const symbolPassed = actualPrice === expectedPrice;
      allPassed = allPassed && symbolPassed;
      
      details.push(`${symbol}: Expected ${expectedPrice}, Got ${actualPrice}`);
      console.log(symbolPassed ? '✅' : '❌', `${symbol}: Expected ${expectedPrice}, Got ${actualPrice}`);
    }

    results.push({
      testName: 'getLatestPricesForSymbols',
      passed: allPassed,
      details: details.join('; '),
      data: { expected: expectedPrices, actual: latestPrices }
    });
  } catch (error) {
    results.push({
      testName: 'getLatestPricesForSymbols',
      passed: false,
      details: `Error: ${error}`,
      data: { error }
    });
    console.log('❌ FAILED - Error:', error);
  }

  return results;
}

async function testPriceHistory(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n🧪 Test 3: getPriceHistory returns data in descending date order');
  
  try {
    const history = await HistoricalPriceService.getPriceHistory('AAPL', undefined, undefined, 5);
    
    // Check if dates are in descending order
    let isDescending = true;
    let previousDate: Date | null = null;
    
    for (const entry of history) {
      if (previousDate && entry.date > previousDate) {
        isDescending = false;
        break;
      }
      previousDate = entry.date;
    }

    const details = `Returned ${history.length} entries, dates in descending order: ${isDescending}`;
    console.log(isDescending ? '✅ PASSED' : '❌ FAILED', `-`, details);

    results.push({
      testName: 'getPriceHistory - Date Order',
      passed: isDescending && history.length > 0,
      details,
      data: { 
        historyCount: history.length,
        firstDate: history[0]?.date,
        lastDate: history[history.length - 1]?.date,
        prices: history.map(h => ({ date: h.date, price: h.price }))
      }
    });
  } catch (error) {
    results.push({
      testName: 'getPriceHistory - Date Order',
      passed: false,
      details: `Error: ${error}`,
      data: { error }
    });
    console.log('❌ FAILED - Error:', error);
  }

  return results;
}

async function testDatabaseQueryPerformance(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n🧪 Test 4: Database query performance with multiple entries');
  
  try {
    const startTime = Date.now();
    
    // Test multiple concurrent latest price queries
    const symbols = ['AAPL', 'GOOGL', 'MSFT'];
    const promises = symbols.map(symbol => HistoricalPriceService.getLatestPrice(symbol));
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const passed = duration < 1000; // Should complete within 1 second
    
    const details = `Query time: ${duration}ms for ${symbols.length} symbols`;
    console.log(passed ? '✅ PASSED' : '⚠️  SLOW', `-`, details);

    results.push({
      testName: 'Database Query Performance',
      passed,
      details,
      data: { duration, symbols: symbols.length }
    });
  } catch (error) {
    results.push({
      testName: 'Database Query Performance',
      passed: false,
      details: `Error: ${error}`,
      data: { error }
    });
    console.log('❌ FAILED - Error:', error);
  }

  return results;
}

async function testEdgeCases(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n🧪 Test 5: Edge cases - Non-existent symbol');
  
  try {
    const nonExistentPrice = await HistoricalPriceService.getLatestPrice('NONEXISTENT');
    const passed = nonExistentPrice === null;
    
    const details = `Non-existent symbol returns null: ${nonExistentPrice === null}`;
    console.log(passed ? '✅ PASSED' : '❌ FAILED', `-`, details);

    results.push({
      testName: 'Non-existent Symbol',
      passed,
      details,
      data: { result: nonExistentPrice }
    });
  } catch (error) {
    results.push({
      testName: 'Non-existent Symbol',
      passed: false,
      details: `Error: ${error}`,
      data: { error }
    });
    console.log('❌ FAILED - Error:', error);
  }

  return results;
}

async function verifyDatabaseState() {
  console.log('\n🔍 Verifying current database state...');
  
  // Check total entries
  const totalEntries = await prisma.historicalPrice.count();
  console.log(`📊 Total historical price entries: ${totalEntries}`);
  
  // Check entries per symbol
  const symbolCounts = await prisma.historicalPrice.groupBy({
    by: ['symbol'],
    _count: { symbol: true },
    orderBy: { symbol: 'asc' }
  });
  
  console.log('📈 Entries per symbol:');
  symbolCounts.forEach(({ symbol, _count }) => {
    console.log(`   ${symbol}: ${_count.symbol} entries`);
  });
  
  // Check date range
  const dateRange = await prisma.historicalPrice.aggregate({
    _min: { date: true },
    _max: { date: true }
  });
  
  console.log(`📅 Date range: ${dateRange._min.date?.toISOString().split('T')[0]} to ${dateRange._max.date?.toISOString().split('T')[0]}`);
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const result = await prisma.historicalPrice.deleteMany({
      where: { source: 'test' }
    });
    
    console.log(`🗑️  Deleted ${result.count} test entries`);
    return result.count;
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting Historical Prices Access Pattern Test\n');
  
  let allResults: TestResult[] = [];
  
  try {
    // Verify initial state
    await verifyDatabaseState();
    
    // Create test data
    await createTestData();
    
    // Run tests
    const latestPriceResults = await testLatestPriceRetrieval();
    const priceHistoryResults = await testPriceHistory();
    const performanceResults = await testDatabaseQueryPerformance();
    const edgeCaseResults = await testEdgeCases();
    
    allResults = [
      ...latestPriceResults,
      ...priceHistoryResults,
      ...performanceResults,
      ...edgeCaseResults
    ];
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const passed = allResults.filter(r => r.passed).length;
    const total = allResults.length;
    const passRate = (passed / total * 100).toFixed(1);
    
    console.log(`✅ Passed: ${passed}/${total} (${passRate}%)`);
    
    if (passed < total) {
      console.log('\n❌ Failed Tests:');
      allResults.filter(r => !r.passed).forEach(result => {
        console.log(`   - ${result.testName}: ${result.details}`);
      });
    }
    
    // Verify final state
    console.log('\n🔍 Final database state:');
    await verifyDatabaseState();
    
    // Cleanup
    await cleanupTestData();
    
    console.log(`\n🎯 CONCLUSION: ${passed === total ? 'All tests passed!' : 'Some tests failed - review implementation'}`);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

export { main as testHistoricalPricesAccess };