// ============================================================================
// FILE: scripts/add-sample-prices.ts
// Script to add sample historical price data for testing
// ============================================================================

import { HistoricalPriceService } from '../lib/historical-price-service';

// Sample price data for common stocks
const samplePrices = [
  // AAPL prices (last 30 days simulation)
  { symbol: 'AAPL', price: 195.89, date: new Date('2025-01-02'), source: 'sample' },
  { symbol: 'AAPL', price: 194.27, date: new Date('2025-01-01'), source: 'sample' },
  { symbol: 'AAPL', price: 193.58, date: new Date('2024-12-31'), source: 'sample' },
  
  // GOOGL prices
  { symbol: 'GOOGL', price: 165.87, date: new Date('2025-01-02'), source: 'sample' },
  { symbol: 'GOOGL', price: 164.12, date: new Date('2025-01-01'), source: 'sample' },
  { symbol: 'GOOGL', price: 163.45, date: new Date('2024-12-31'), source: 'sample' },
  
  // MSFT prices
  { symbol: 'MSFT', price: 420.55, date: new Date('2025-01-02'), source: 'sample' },
  { symbol: 'MSFT', price: 418.92, date: new Date('2025-01-01'), source: 'sample' },
  { symbol: 'MSFT', price: 417.23, date: new Date('2024-12-31'), source: 'sample' },
  
  // TSLA prices
  { symbol: 'TSLA', price: 350.83, date: new Date('2025-01-02'), source: 'sample' },
  { symbol: 'TSLA', price: 348.12, date: new Date('2025-01-01'), source: 'sample' },
  { symbol: 'TSLA', price: 345.67, date: new Date('2024-12-31'), source: 'sample' },
  
  // AMZN prices
  { symbol: 'AMZN', price: 174.89, date: new Date('2025-01-02'), source: 'sample' },
  { symbol: 'AMZN', price: 173.24, date: new Date('2025-01-01'), source: 'sample' },
  { symbol: 'AMZN', price: 171.98, date: new Date('2024-12-31'), source: 'sample' },
  
  // NVDA prices
  { symbol: 'NVDA', price: 132.45, date: new Date('2025-01-02'), source: 'sample' },
  { symbol: 'NVDA', price: 130.87, date: new Date('2025-01-01'), source: 'sample' },
  { symbol: 'NVDA', price: 129.12, date: new Date('2024-12-31'), source: 'sample' },
  
  // META prices
  { symbol: 'META', price: 563.27, date: new Date('2025-01-02'), source: 'sample' },
  { symbol: 'META', price: 561.45, date: new Date('2025-01-01'), source: 'sample' },
  { symbol: 'META', price: 559.89, date: new Date('2024-12-31'), source: 'sample' },
];

export async function addSamplePrices(): Promise<void> {
  console.log('Adding sample historical prices...');
  
  try {
    const result = await HistoricalPriceService.addPricesBulk(samplePrices);
    console.log(`Successfully added ${result.success} prices, ${result.errors} errors/duplicates`);
    
    // Log latest prices for verification
    console.log('\nLatest prices:');
    for (const symbol of ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META']) {
      const price = await HistoricalPriceService.getLatestPrice(symbol);
      console.log(`${symbol}: $${price || 'N/A'}`);
    }
  } catch (error) {
    console.error('Error adding sample prices:', error);
  }
}

// Run if called directly
if (require.main === module) {
  addSamplePrices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}