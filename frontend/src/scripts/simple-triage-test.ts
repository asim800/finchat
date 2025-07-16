#!/usr/bin/env node
// ============================================================================
// FILE: scripts/simple-triage-test.ts
// Simple standalone test for chat triage system
// ============================================================================

import { QueryTriage } from '../lib/query-triage';
import { ChatTriageProcessor } from '../lib/chat-triage-processor';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// Test queries with expected results
const testQueries = [
  {
    query: "add 50 shares of TSLA at $200 per share",
    expectedType: 'regexp',
    description: "Simple add operation with quantity and price",
    expectSuccess: true
  },
  {
    query: "delete NFLX from my portfolio", 
    expectedType: 'regexp',
    description: "Simple remove operation",
    expectSuccess: true
  },
  {
    query: "update avgCost of my SPY stock to 452",
    expectedType: 'regexp', 
    description: "Simple update operation for price",
    expectSuccess: true
  },
  {
    query: "show my AAPL position",
    expectedType: 'regexp',
    description: "Simple show operation", 
    expectSuccess: true
  },
  {
    query: "What's the best way to diversify my portfolio?",
    expectedType: 'llm',
    description: "Complex investment analysis",
    expectSuccess: true
  },
  {
    query: "add some AAPL",
    expectedType: 'hybrid',
    description: "Add operation missing quantity",
    expectSuccess: false // Will fail due to missing quantity
  }
];

async function runTriageTests(): Promise<void> {
  console.log(colorize('🚀 Testing Chat Triage System', 'bright'));
  console.log('='.repeat(60));
  
  let passCount = 0;
  let totalTests = 0;
  
  for (const testCase of testQueries) {
    totalTests++;
    console.log(`\n${colorize('Test ' + totalTests, 'cyan')}: ${testCase.description}`);
    console.log(colorize('Query:', 'yellow'), `"${testCase.query}"`);
    console.log(colorize('Expected:', 'yellow'), testCase.expectedType);
    
    try {
      // Test triage analysis
      const startTime = Date.now();
      const triageResult = QueryTriage.analyzeQuery(testCase.query);
      const analysisTime = Date.now() - startTime;
      
      console.log(colorize('Actual Type:', 'blue'), triageResult.processingType);
      console.log(colorize('Confidence:', 'blue'), `${(triageResult.confidence * 100).toFixed(1)}%`);
      console.log(colorize('Analysis Time:', 'blue'), `${analysisTime}ms`);
      
      // Check if triage is correct
      const triageCorrect = triageResult.processingType === testCase.expectedType;
      
      if (triageResult.regexpMatch) {
        console.log(colorize('Regexp Match:', 'blue'));
        console.log(`  Action: ${triageResult.regexpMatch.action}`);
        console.log(`  Symbol: ${triageResult.regexpMatch.symbol}`);
        if (triageResult.regexpMatch.quantity) {
          console.log(`  Quantity: ${triageResult.regexpMatch.quantity}`);
        }
        if (triageResult.regexpMatch.avgCost) {
          console.log(`  Price: $${triageResult.regexpMatch.avgCost}`);
        }
      }
      
      // Test end-to-end processing for regexp queries
      if (triageResult.processingType === 'regexp') {
        try {
          const mockGuestSessionId = 'test-session-' + Date.now();
          const processingResult = await ChatTriageProcessor.processQuery(testCase.query, {
            guestSessionId: mockGuestSessionId,
            isGuestMode: true
          });
          
          console.log(colorize('Processing Result:', 'blue'));
          console.log(`  Success: ${processingResult.success ? '✅' : '❌'}`);
          console.log(`  Execution Time: ${processingResult.executionTimeMs}ms`);
          console.log(`  Response: "${processingResult.content.substring(0, 100)}..."`);
          
          const processingCorrect = processingResult.success === testCase.expectSuccess;
          const overallCorrect = triageCorrect && processingCorrect;
          
          if (overallCorrect) {
            passCount++;
            console.log(colorize('✅ PASS', 'green'));
          } else {
            console.log(colorize('❌ FAIL', 'red'));
            if (!triageCorrect) {
              console.log(colorize(`  Triage: Expected ${testCase.expectedType}, got ${triageResult.processingType}`, 'red'));
            }
            if (!processingCorrect) {
              console.log(colorize(`  Processing: Expected success=${testCase.expectSuccess}, got ${processingResult.success}`, 'red'));
            }
          }
          
        } catch (processingError) {
          console.log(colorize('❌ Processing Error:', 'red'), processingError);
        }
      } else {
        // For LLM/hybrid queries, just check triage
        if (triageCorrect) {
          passCount++;
          console.log(colorize('✅ PASS (Triage Only)', 'green'));
        } else {
          console.log(colorize('❌ FAIL (Triage)', 'red'));
        }
      }
      
    } catch (error) {
      console.log(colorize('❌ ERROR:', 'red'), error);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(colorize('TEST SUMMARY', 'bright'));
  console.log('='.repeat(60));
  console.log(colorize(`Total Tests: ${totalTests}`, 'cyan'));
  console.log(colorize(`Passed: ${passCount}`, passCount === totalTests ? 'green' : 'yellow'));
  console.log(colorize(`Failed: ${totalTests - passCount}`, totalTests - passCount === 0 ? 'green' : 'red'));
  console.log(colorize(`Success Rate: ${((passCount / totalTests) * 100).toFixed(1)}%`, passCount === totalTests ? 'green' : 'yellow'));
  
  if (passCount === totalTests) {
    console.log(colorize('\n🎉 All tests passed! The triage system is working correctly.', 'green'));
  } else {
    console.log(colorize('\n⚠️  Some tests failed. Check the output above for details.', 'yellow'));
  }
}

async function runPerformanceTest(): Promise<void> {
  console.log('\n' + colorize('⚡ Performance Test', 'bright'));
  console.log('='.repeat(40));
  
  const performanceQueries = [
    "add 100 AAPL at 150",
    "remove TSLA from portfolio", 
    "update GOOGL quantity to 75",
    "show my MSFT position"
  ];
  
  const iterations = 100;
  const times: number[] = [];
  
  console.log(`Running ${iterations} iterations of triage analysis...`);
  
  for (let i = 0; i < iterations; i++) {
    const query = performanceQueries[i % performanceQueries.length];
    const startTime = Date.now();
    QueryTriage.analyzeQuery(query);
    const endTime = Date.now();
    times.push(endTime - startTime);
  }
  
  const avgTime = times.reduce((sum, time) => sum + time, 0) / iterations;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  const p95Time = times.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
  
  console.log(colorize('Performance Results:', 'green'));
  console.log(`  Average: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min: ${minTime}ms`);
  console.log(`  Max: ${maxTime}ms`);
  console.log(`  P95: ${p95Time}ms`);
  
  if (avgTime < 5) {
    console.log(colorize('✅ Excellent performance! Triage is very fast.', 'green'));
  } else if (avgTime < 20) {
    console.log(colorize('✅ Good performance! Triage is acceptably fast.', 'yellow'));
  } else {
    console.log(colorize('⚠️ Slow performance! Consider optimizing regexp patterns.', 'red'));
  }
}

async function testRegexpPatterns(): Promise<void> {
  console.log('\n' + colorize('🔍 Regexp Pattern Tests', 'bright'));
  console.log('='.repeat(40));
  
  const patternTests = [
    // ADD patterns
    { query: "add 50 shares of TSLA at $200", expectedAction: 'add', expectedSymbol: 'TSLA', expectedQuantity: 50, expectedPrice: 200 },
    { query: "buy 100 AAPL at 150", expectedAction: 'add', expectedSymbol: 'AAPL', expectedQuantity: 100, expectedPrice: 150 },
    { query: "purchased 25 shares of GOOGL", expectedAction: 'add', expectedSymbol: 'GOOGL', expectedQuantity: 25 },
    
    // REMOVE patterns  
    { query: "delete NFLX from my portfolio", expectedAction: 'remove', expectedSymbol: 'NFLX' },
    { query: "sell all AAPL", expectedAction: 'remove', expectedSymbol: 'AAPL' },
    { query: "remove all my TSLA holdings", expectedAction: 'remove', expectedSymbol: 'TSLA' },
    
    // UPDATE patterns
    { query: "update avgCost of my SPY stock to 452", expectedAction: 'update', expectedSymbol: 'SPY', expectedPrice: 452 },
    { query: "set TSLA quantity to 75", expectedAction: 'update', expectedSymbol: 'TSLA', expectedQuantity: 75 },
    
    // SHOW patterns
    { query: "show my AAPL position", expectedAction: 'show', expectedSymbol: 'AAPL' },
    { query: "what's my TSLA holding", expectedAction: 'show', expectedSymbol: 'TSLA' }
  ];
  
  let patternPassed = 0;
  
  for (const test of patternTests) {
    const result = QueryTriage.analyzeQuery(test.query);
    let passed = true;
    const errors: string[] = [];
    
    if (result.regexpMatch?.action !== test.expectedAction) {
      passed = false;
      errors.push(`Action: expected ${test.expectedAction}, got ${result.regexpMatch?.action}`);
    }
    
    if (result.regexpMatch?.symbol !== test.expectedSymbol) {
      passed = false;
      errors.push(`Symbol: expected ${test.expectedSymbol}, got ${result.regexpMatch?.symbol}`);
    }
    
    if (test.expectedQuantity && result.regexpMatch?.quantity !== test.expectedQuantity) {
      passed = false;
      errors.push(`Quantity: expected ${test.expectedQuantity}, got ${result.regexpMatch?.quantity}`);
    }
    
    if (test.expectedPrice && result.regexpMatch?.avgCost !== test.expectedPrice) {
      passed = false;
      errors.push(`Price: expected ${test.expectedPrice}, got ${result.regexpMatch?.avgCost}`);
    }
    
    console.log(`${passed ? '✅' : '❌'} "${test.query}"`);
    if (!passed) {
      console.log(colorize(`  Errors: ${errors.join(', ')}`, 'red'));
    }
    
    if (passed) patternPassed++;
  }
  
  console.log(`\nPattern Test Results: ${patternPassed}/${patternTests.length} passed`);
}

// Main execution
async function main() {
  try {
    await runTriageTests();
    await runPerformanceTest();
    await testRegexpPatterns();
    
    console.log('\n' + colorize('🎯 Testing Complete!', 'bright'));
    console.log(colorize('Next steps:', 'cyan'));
    console.log('1. Start your development server: npm run dev');
    console.log('2. Visit http://localhost:3000/test-dashboard to see UI components');
    console.log('3. Visit http://localhost:3000/dashboard/admin/chat-analytics for live analytics');
    console.log('4. Test queries through your chat interface');
    
  } catch (error) {
    console.error(colorize('❌ Test failed:', 'red'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}