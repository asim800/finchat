// ============================================================================
// FILE: scripts/test-historical-prices.js
// Test script to verify historical_prices table access patterns
// ============================================================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

  for (const priceData of testPrices) {
    try {
      await prisma.historicalPrice.create({
        data: {
          symbol: priceData.symbol.toUpperCase(),
          price: priceData.price,
          date: priceData.date,
          source: priceData.source,
          assetType: 'stock'
        }
      });
      created++;
      console.log(`✅ Created: ${priceData.symbol} - $${priceData.price} (${priceData.date.toISOString().split('T')[0]})`);
    } catch (error) {
      if (error.code === 'P2002') {
        skipped++;
        console.log(`⏭️  Skipped: ${priceData.symbol} - $${priceData.price} (already exists)`);
      } else {
        console.error(`❌ Error creating ${priceData.symbol}:`, error.message);
      }
    }
  }

  console.log(`\n📈 Test data summary: ${created} created, ${skipped} skipped\n`);
  return { created, skipped };
}

async function testLatestPriceRetrieval() {
  console.log('🧪 Test 1: Latest price retrieval');
  
  try {
    // Test getLatestPrice equivalent
    const latestAAPL = await prisma.historicalPrice.findFirst({
      where: { symbol: 'AAPL' },
      orderBy: { date: 'desc' },
      select: { price: true }
    });
    
    const latestPrice = latestAAPL?.price;
    const expected = 195.50;
    const passed = latestPrice === expected;
    
    console.log(passed ? '✅ PASSED' : '❌ FAILED', `- AAPL Latest Price: Expected ${expected}, Got ${latestPrice}`);
    
    // Test getLatestPricesForSymbols equivalent  
    const latestPrices = await prisma.historicalPrice.findMany({
      where: {
        symbol: { in: ['AAPL', 'GOOGL', 'MSFT'] }
      },
      orderBy: { date: 'desc' },
      distinct: ['symbol'],
      select: { symbol: true, price: true }
    });
    
    const priceMap = {};
    latestPrices.forEach(p => {
      priceMap[p.symbol] = p.price;
    });
    
    const expectedPrices = { 'AAPL': 195.50, 'GOOGL': 142.80, 'MSFT': 378.85 };
    let bulkTestPassed = true;
    
    for (const [symbol, expectedPrice] of Object.entries(expectedPrices)) {
      const actualPrice = priceMap[symbol];
      const symbolPassed = actualPrice === expectedPrice;
      bulkTestPassed = bulkTestPassed && symbolPassed;
      
      console.log(symbolPassed ? '✅' : '❌', `${symbol}: Expected ${expectedPrice}, Got ${actualPrice}`);
    }
    
    return passed && bulkTestPassed;
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    return false;
  }
}

async function testPriceHistory() {
  console.log('\n🧪 Test 2: Price history date ordering');
  
  try {
    const history = await prisma.historicalPrice.findMany({
      where: { symbol: 'AAPL' },
      orderBy: { date: 'desc' },
      take: 5,
      select: { date: true, price: true }
    });
    
    // Check if dates are in descending order
    let isDescending = true;
    let previousDate = null;
    
    for (const entry of history) {
      if (previousDate && entry.date > previousDate) {
        isDescending = false;
        break;
      }
      previousDate = entry.date;
    }
    
    console.log(isDescending ? '✅ PASSED' : '❌ FAILED', `- Returned ${history.length} entries in descending date order`);
    
    // Show the data
    console.log('📅 Price history (newest to oldest):');
    history.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.date.toISOString().split('T')[0]}: $${entry.price}`);
    });
    
    return isDescending && history.length > 0;
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    return false;
  }
}

async function testDatabasePerformance() {
  console.log('\n🧪 Test 3: Database query performance');
  
  try {
    const startTime = Date.now();
    
    // Test concurrent queries
    const promises = ['AAPL', 'GOOGL', 'MSFT'].map(symbol => 
      prisma.historicalPrice.findFirst({
        where: { symbol },
        orderBy: { date: 'desc' },
        select: { price: true }
      })
    );
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const passed = duration < 1000;
    
    console.log(passed ? '✅ PASSED' : '⚠️  SLOW', `- Query time: ${duration}ms for 3 symbols`);
    return passed;
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    return false;
  }
}

async function testEdgeCases() {
  console.log('\n🧪 Test 4: Edge cases');
  
  try {
    const nonExistent = await prisma.historicalPrice.findFirst({
      where: { symbol: 'NONEXISTENT' },
      orderBy: { date: 'desc' },
      select: { price: true }
    });
    
    const passed = nonExistent === null;
    console.log(passed ? '✅ PASSED' : '❌ FAILED', `- Non-existent symbol returns null: ${nonExistent === null}`);
    
    return passed;
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    return false;
  }
}

async function verifyDatabaseState() {
  console.log('\n🔍 Database state verification...');
  
  try {
    // Total entries
    const totalEntries = await prisma.historicalPrice.count();
    console.log(`📊 Total historical price entries: ${totalEntries}`);
    
    // Entries per symbol
    const symbolCounts = await prisma.historicalPrice.groupBy({
      by: ['symbol'],
      _count: { symbol: true },
      orderBy: { symbol: 'asc' }
    });
    
    console.log('📈 Entries per symbol:');
    symbolCounts.forEach(({ symbol, _count }) => {
      console.log(`   ${symbol}: ${_count.symbol} entries`);
    });
    
    // Date range
    const dateStats = await prisma.historicalPrice.aggregate({
      _min: { date: true },
      _max: { date: true }
    });
    
    if (dateStats._min.date && dateStats._max.date) {
      console.log(`📅 Date range: ${dateStats._min.date.toISOString().split('T')[0]} to ${dateStats._max.date.toISOString().split('T')[0]}`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying database state:', error.message);
  }
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
    console.error('❌ Error cleaning up:', error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting Historical Prices Access Pattern Test\n');
  
  const testResults = [];
  
  try {
    // Initial state
    await verifyDatabaseState();
    
    // Create test data
    await createTestData();
    
    // Run tests
    testResults.push(await testLatestPriceRetrieval());
    testResults.push(await testPriceHistory());
    testResults.push(await testDatabasePerformance());
    testResults.push(await testEdgeCases());
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const passed = testResults.filter(r => r).length;
    const total = testResults.length;
    const passRate = (passed / total * 100).toFixed(1);
    
    console.log(`✅ Passed: ${passed}/${total} (${passRate}%)`);
    console.log(`🎯 CONCLUSION: ${passed === total ? '🎉 All tests passed! Historical prices access patterns work correctly.' : '⚠️  Some tests failed - review needed.'}`);
    
    // Final state
    console.log('\n🔍 Final database state:');
    await verifyDatabaseState();
    
    // Cleanup
    await cleanupTestData();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);