#!/usr/bin/env npx tsx
// ============================================================================
// FILE: scripts/test-langgraph-integration.ts
// Script to test LangGraph integration functionality
// ============================================================================

import { langGraphUnifiedService } from '../lib/langgraph/services/langgraph-unified-service';
import { getLangGraphFeatureFlags, shouldUseLangGraph } from '../lib/langgraph/feature-flags';

async function testLangGraphIntegration() {
  console.log('🚀 Testing LangGraph Integration\n');

  // Test 1: Feature Flags
  console.log('1. Testing Feature Flags...');
  const flags = getLangGraphFeatureFlags();
  console.log('   Feature flags:', JSON.stringify(flags, null, 2));
  console.log('   Should use LangGraph for user123:', shouldUseLangGraph('user123'));
  console.log('   Should use LangGraph for guest:', shouldUseLangGraph(undefined, 'guest-456'));
  console.log('');

  // Test 2: Service Health
  console.log('2. Checking Service Health...');
  try {
    const health = await langGraphUnifiedService.getHealthStatus();
    console.log('   Health status:', health.unified.isInitialized ? '✅ Healthy' : '❌ Unhealthy');
    console.log('   Frontend status:', health.frontend.isInitialized ? '✅' : '❌');
    console.log('   Backend status:', health.backend.isInitialized ? '✅' : '❌');
  } catch (error) {
    console.log('   ❌ Health check failed:', error);
  }
  console.log('');

  // Test 3: Complexity Analysis
  console.log('3. Testing Complexity Analysis...');
  const testQueries = [
    'hello',
    'show my portfolio',
    'what is a stock?',
    'analyze my portfolio risk and recommend optimizations',
    'add 100 shares of AAPL at $150',
    'calculate Sharpe ratio for my holdings'
  ];

  for (const query of testQueries) {
    try {
      const analysis = await langGraphUnifiedService.analyzeMessageComplexity(query, {
        isGuestMode: false
      });
      
      console.log(`   Query: "${query}"`);
      console.log(`   Route: ${analysis.routeTo} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`);
      console.log(`   Complexity: ${(analysis.complexityScore * 100).toFixed(0)}%`);
      console.log(`   Reasoning: ${analysis.explanation}`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error analyzing "${query}":`, error);
    }
  }

  // Test 4: Frontend Processing
  console.log('4. Testing Frontend Processing...');
  const frontendQueries = ['hello', 'show my portfolio', 'what is diversification?'];
  
  for (const query of frontendQueries) {
    try {
      const startTime = Date.now();
      const result = await langGraphUnifiedService.processMessage(query, {
        isGuestMode: false,
        portfolios: []
      });
      
      console.log(`   Query: "${query}"`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      console.log(`   Processing: ${result.processingType}`);
      console.log(`   Time: ${result.executionTimeMs}ms`);
      console.log(`   Response: "${result.content.substring(0, 100)}..."`);
      
      if (result.chartData) {
        console.log(`   Chart: ${result.chartData.type} with ${result.chartData.data.length} items`);
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error processing "${query}":`, error);
    }
  }

  // Test 5: Local Capability Check
  console.log('5. Testing Local Capability Detection...');
  const capabilityQueries = [
    'hello world',
    'show my AAPL position',
    'analyze portfolio risk with Monte Carlo simulation',
    'what are the current market trends?'
  ];

  for (const query of capabilityQueries) {
    try {
      const canHandle = await langGraphUnifiedService.canHandleLocally(query, {
        isGuestMode: false
      });
      
      console.log(`   "${query}" -> ${canHandle ? '📱 Frontend' : '🖥️  Backend'}`);
    } catch (error) {
      console.log(`   ❌ Error checking capability for "${query}":`, error);
    }
  }
  console.log('');

  // Test 6: Guest Mode
  console.log('6. Testing Guest Mode...');
  try {
    const guestResult = await langGraphUnifiedService.processMessage(
      'show me a sample portfolio chart',
      {
        isGuestMode: true,
        guestSessionId: 'test-guest-123'
      }
    );

    console.log(`   Guest query success: ${guestResult.success ? '✅' : '❌'}`);
    console.log(`   Processing type: ${guestResult.processingType}`);
    console.log(`   Has chart: ${guestResult.chartData ? '✅' : '❌'}`);
    console.log(`   Response: "${guestResult.content.substring(0, 80)}..."`);
  } catch (error) {
    console.log('   ❌ Guest mode test failed:', error);
  }
  console.log('');

  // Test 7: Performance Benchmarks
  console.log('7. Performance Benchmarks...');
  const benchmarkQueries = [
    { query: 'hello', expectedType: 'frontend' },
    { query: 'show my portfolio', expectedType: 'frontend' },
    { query: 'what is a stock?', expectedType: 'frontend' }
  ];

  for (const { query, expectedType } of benchmarkQueries) {
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = Date.now();
        const result = await langGraphUnifiedService.processMessage(query, {
          isGuestMode: false
        });
        const endTime = Date.now();

        if (result.success && result.processingType === expectedType) {
          times.push(endTime - startTime);
        }
      } catch (error) {
        console.log(`   ❌ Benchmark error for "${query}":`, error);
      }
    }

    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`   "${query}" (${expectedType}):`);
      console.log(`     Average: ${avgTime.toFixed(0)}ms`);
      console.log(`     Range: ${minTime}ms - ${maxTime}ms`);
    }
  }
  console.log('');

  // Test 8: Error Handling
  console.log('8. Testing Error Handling...');
  const errorQueries = ['', '   ', null, undefined];

  for (const query of errorQueries) {
    try {
      const result = await langGraphUnifiedService.processMessage(query as any, {
        isGuestMode: false
      });

      console.log(`   Query: ${JSON.stringify(query)}`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error.message}`);
        console.log(`   Recoverable: ${result.error.recoverable ? '✅' : '❌'}`);
      }
    } catch (error) {
      console.log(`   Query: ${JSON.stringify(query)} -> Caught error: ${error}`);
    }
  }
  console.log('');

  console.log('🎉 LangGraph Integration Test Complete!');
  console.log('\nTo enable LangGraph in your app:');
  console.log('1. Set NEXT_PUBLIC_LANGGRAPH_ENABLED=true');
  console.log('2. Set NEXT_PUBLIC_LANGGRAPH_ROLLOUT=100 for full rollout');
  console.log('3. Use the new useLangGraphChat hook in your components');
  console.log('4. Monitor performance with the /api/chat/langgraph health endpoint');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testLangGraphIntegration().catch(console.error);
}

export { testLangGraphIntegration };