// ============================================================================
// FILE: scripts/populate-metrics.js
// Simple script to populate asset metrics via API endpoints
// Usage: npm run populate-metrics
// ============================================================================

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
  }
];

async function populateMetrics() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  console.log('🚀 Starting asset metrics population...');
  console.log(`📍 API Base URL: ${baseUrl}`);
  
  try {
    // Note: In a real implementation, you would need authentication
    // This is a simplified version for development
    
    const response = await fetch(`${baseUrl}/api/asset-metrics/bulk`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers here when available
        // 'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ metrics: sampleMetrics })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log(`✅ Successfully populated ${result.success} asset metrics`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      result.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    console.log('\n📊 Populated metrics for:');
    sampleMetrics.forEach(metric => {
      console.log(`   • ${metric.symbol} (${metric.sector})`);
    });
    
  } catch (error) {
    console.error('❌ Error populating metrics:', error.message);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
      console.log('\n💡 Make sure your Next.js development server is running:');
      console.log('   npm run dev');
    }
    
    if (error.message.includes('Unauthorized')) {
      console.log('\n💡 This script requires authentication. You may need to:');
      console.log('   1. Log in to your application');
      console.log('   2. Update this script with proper authentication');
      console.log('   3. Or use the database population script instead');
    }
    
    process.exit(1);
  }
}

// Alternative method using direct database access (requires database setup)
async function populateMetricsDirectly() {
  console.log('📊 Alternative: Using direct database population...');
  console.log('💡 Run this instead: npx tsx src/scripts/populate-asset-metrics.ts');
}

console.log('🎯 Asset Metrics Population Script');
console.log('══════════════════════════════════════');

populateMetrics()
  .then(() => {
    console.log('\n✅ Population completed successfully!');
    console.log('🎉 You can now view metrics in your portfolio by expanding asset rows');
  })
  .catch(() => {
    console.log('\n💡 Alternative method:');
    populateMetricsDirectly();
  });