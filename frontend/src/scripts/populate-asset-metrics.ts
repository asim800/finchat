// ============================================================================
// FILE: scripts/populate-asset-metrics.ts
// Script to populate initial asset metrics data for testing and development
// ============================================================================

import { AssetMetricsService } from '../lib/asset-metrics-service';

// Sample asset metrics data for popular stocks
const sampleMetrics = [
  {
    symbol: 'AAPL',
    beta: 1.25,
    volatility: 0.24,
    peRatio: 28.5,
    dividendYield: 0.0044,
    eps: 6.13,
    marketCap: 3500000000000,
    sector: 'Technology',
    industry: 'Consumer Electronics'
  },
  {
    symbol: 'MSFT',
    beta: 0.89,
    volatility: 0.26,
    peRatio: 32.1,
    dividendYield: 0.0068,
    eps: 12.05,
    marketCap: 2800000000000,
    sector: 'Technology',
    industry: 'Software'
  },
  {
    symbol: 'GOOGL',
    beta: 1.05,
    volatility: 0.29,
    peRatio: 25.8,
    dividendYield: 0.0,
    eps: 5.80,
    marketCap: 2100000000000,
    sector: 'Technology',
    industry: 'Internet Services'
  },
  {
    symbol: 'AMZN',
    beta: 1.15,
    volatility: 0.35,
    peRatio: 47.2,
    dividendYield: 0.0,
    eps: 3.08,
    marketCap: 1800000000000,
    sector: 'Consumer Discretionary',
    industry: 'E-commerce'
  },
  {
    symbol: 'TSLA',
    beta: 2.05,
    volatility: 0.65,
    peRatio: 85.4,
    dividendYield: 0.0,
    eps: 4.73,
    marketCap: 800000000000,
    sector: 'Consumer Discretionary',
    industry: 'Electric Vehicles'
  },
  {
    symbol: 'NVDA',
    beta: 1.75,
    volatility: 0.52,
    peRatio: 65.2,
    dividendYield: 0.0009,
    eps: 12.96,
    marketCap: 1900000000000,
    sector: 'Technology',
    industry: 'Semiconductors'
  },
  {
    symbol: 'JPM',
    beta: 1.12,
    volatility: 0.32,
    peRatio: 12.8,
    dividendYield: 0.025,
    eps: 15.36,
    marketCap: 580000000000,
    sector: 'Financial',
    industry: 'Banking'
  },
  {
    symbol: 'JNJ',
    beta: 0.68,
    volatility: 0.16,
    peRatio: 15.7,
    dividendYield: 0.029,
    eps: 10.70,
    marketCap: 450000000000,
    sector: 'Healthcare',
    industry: 'Pharmaceuticals'
  },
  {
    symbol: 'V',
    beta: 0.95,
    volatility: 0.28,
    peRatio: 35.6,
    dividendYield: 0.007,
    eps: 7.75,
    marketCap: 520000000000,
    sector: 'Financial',
    industry: 'Payment Services'
  },
  {
    symbol: 'WMT',
    beta: 0.52,
    volatility: 0.22,
    peRatio: 27.3,
    dividendYield: 0.015,
    eps: 5.93,
    marketCap: 650000000000,
    sector: 'Consumer Staples',
    industry: 'Retail'
  },
  {
    symbol: 'KO',
    beta: 0.61,
    volatility: 0.18,
    peRatio: 25.4,
    dividendYield: 0.031,
    eps: 2.41,
    marketCap: 260000000000,
    sector: 'Consumer Staples',
    industry: 'Beverages'
  },
  {
    symbol: 'DIS',
    beta: 1.23,
    volatility: 0.34,
    peRatio: 38.9,
    dividendYield: 0.0,
    eps: 2.32,
    marketCap: 180000000000,
    sector: 'Communication Services',
    industry: 'Entertainment'
  },
  {
    symbol: 'NFLX',
    beta: 1.18,
    volatility: 0.42,
    peRatio: 44.2,
    dividendYield: 0.0,
    eps: 10.55,
    marketCap: 200000000000,
    sector: 'Communication Services',
    industry: 'Streaming Services'
  },
  {
    symbol: 'BA',
    beta: 1.35,
    volatility: 0.45,
    peRatio: -12.5, // Negative due to losses
    dividendYield: 0.0,
    eps: -15.24,
    marketCap: 120000000000,
    sector: 'Industrial',
    industry: 'Aerospace & Defense'
  },
  {
    symbol: 'XOM',
    beta: 1.85,
    volatility: 0.38,
    peRatio: 13.2,
    dividendYield: 0.051,
    eps: 8.97,
    marketCap: 480000000000,
    sector: 'Energy',
    industry: 'Oil & Gas'
  }
];

/**
 * Populate asset metrics data
 * Usage: npx tsx src/scripts/populate-asset-metrics.ts
 */
async function populateAssetMetrics() {
  try {
    console.log('Starting asset metrics population...');
    
    const result = await AssetMetricsService.bulkUpsertMetrics(sampleMetrics);
    
    console.log(`✅ Successfully populated ${result.success} asset metrics`);
    
    if (result.errors.length > 0) {
      console.log('❌ Errors encountered:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n📊 Asset metrics populated:');
    sampleMetrics.forEach(metric => {
      console.log(`  • ${metric.symbol} (${metric.sector})`);
    });
    
  } catch (error) {
    console.error('❌ Error populating asset metrics:', error);
    process.exit(1);
  }
}

/**
 * Update specific asset metrics
 */
export async function updateAssetMetric(symbol: string, data: Partial<typeof sampleMetrics[0]>) {
  try {
    const result = await AssetMetricsService.upsertMetrics(symbol, data);
    if (result) {
      console.log(`✅ Updated metrics for ${symbol}`);
      return result;
    } else {
      throw new Error(`Failed to update ${symbol}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get metrics summary for all assets
 */
export async function getMetricsSummary() {
  try {
    const { metrics, total } = await AssetMetricsService.getAllMetrics(1, 100);
    
    console.log(`\n📊 Asset Metrics Summary (${total} total):`);
    console.log('─'.repeat(80));
    
    const sectorGroups: Record<string, number> = {};
    metrics.forEach(metric => {
      if (metric.sector) {
        sectorGroups[metric.sector] = (sectorGroups[metric.sector] || 0) + 1;
      }
    });
    
    Object.entries(sectorGroups).forEach(([sector, count]) => {
      console.log(`  ${sector}: ${count} assets`);
    });
    
    return { metrics, sectorGroups };
  } catch (error) {
    console.error('❌ Error getting metrics summary:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  populateAssetMetrics()
    .then(() => getMetricsSummary())
    .then(() => {
      console.log('\n✅ Asset metrics population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}