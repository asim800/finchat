#!/usr/bin/env node
// ============================================================================
// FILE: scripts/test-portfolio-overview.ts
// Test the new "show all my positions" functionality
// ============================================================================

import { QueryTriage } from '../lib/query-triage';
import { ChatTriageProcessor } from '../lib/chat-triage-processor';

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

async function testPortfolioOverview(): Promise<void> {
  console.log(colorize('📊 Testing Portfolio Overview Functionality', 'bright'));
  console.log('='.repeat(60));
  
  const mockGuestSessionId = 'portfolio-overview-test-' + Date.now();
  
  // First, build up a portfolio with multiple assets
  const setupQueries = [
    "add 100 shares of AAPL at $150",
    "add 50 shares of TSLA at $200", 
    "add 200 shares of SPY at $400",
    "add 75 shares of GOOGL at $2500"
  ];
  
  console.log(colorize('Setting up portfolio with multiple assets...', 'cyan'));
  
  for (const query of setupQueries) {
    try {
      const result = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });
      console.log(`✅ ${query} - ${result.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.log(`❌ ${query} - Error: ${error}`);
    }
  }
  
  console.log('\n' + colorize('Testing Portfolio Overview Queries', 'cyan'));
  console.log('='.repeat(50));
  
  // Test different variations of portfolio overview queries
  const overviewQueries = [
    "show all my positions",
    "list my portfolio", 
    "show my portfolio",
    "what are my holdings",
    "display all my stocks",
    "what's in my portfolio",
    "my portfolio overview",
    "show me all my assets"
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < overviewQueries.length; i++) {
    const query = overviewQueries[i];
    console.log(`\n${colorize(`Test ${i + 1}`, 'yellow')}: "${query}"`);
    
    try {
      // Test triage analysis
      const triageResult = QueryTriage.analyzeQuery(query);
      console.log(colorize('Triage Result:', 'blue'));
      console.log(`  Type: ${triageResult.processingType}`);
      console.log(`  Confidence: ${(triageResult.confidence * 100).toFixed(1)}%`);
      console.log(`  Symbol: ${triageResult.regexpMatch?.symbol}`);
      console.log(`  Action: ${triageResult.regexpMatch?.action}`);
      
      // Test end-to-end processing
      const processingResult = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });
      
      console.log(colorize('Processing Result:', 'blue'));
      console.log(`  Success: ${processingResult.success ? '✅' : '❌'}`);
      console.log(`  Execution Time: ${processingResult.executionTimeMs}ms`);
      console.log(`  Response Length: ${processingResult.content.length} chars`);
      
      // Show a preview of the response
      const preview = processingResult.content.substring(0, 200);
      console.log(`  Preview: "${preview}${processingResult.content.length > 200 ? '...' : ''}"`);
      
      // Check if this was correctly identified as a portfolio overview
      const isCorrectlyIdentified = triageResult.regexpMatch?.symbol === 'ALL' && 
                                   triageResult.regexpMatch?.action === 'show' &&
                                   triageResult.processingType === 'regexp';
      
      if (isCorrectlyIdentified && processingResult.success) {
        successCount++;
        console.log(colorize('✅ PASS', 'green'));
      } else {
        console.log(colorize('❌ FAIL', 'red'));
        if (!isCorrectlyIdentified) {
          console.log(colorize('  Issue: Not correctly identified as portfolio overview', 'red'));
        }
        if (!processingResult.success) {
          console.log(colorize('  Issue: Processing failed', 'red'));
        }
      }
      
    } catch (error) {
      console.log(colorize('❌ ERROR:', 'red'), error);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(colorize('PORTFOLIO OVERVIEW TEST SUMMARY', 'bright'));
  console.log('='.repeat(60));
  console.log(colorize(`Total Tests: ${overviewQueries.length}`, 'cyan'));
  console.log(colorize(`Passed: ${successCount}`, successCount === overviewQueries.length ? 'green' : 'yellow'));
  console.log(colorize(`Failed: ${overviewQueries.length - successCount}`, overviewQueries.length - successCount === 0 ? 'green' : 'red'));
  console.log(colorize(`Success Rate: ${((successCount / overviewQueries.length) * 100).toFixed(1)}%`, successCount === overviewQueries.length ? 'green' : 'yellow'));
  
  if (successCount === overviewQueries.length) {
    console.log(colorize('\n🎉 Perfect! All portfolio overview queries work correctly.', 'green'));
  } else if (successCount >= overviewQueries.length * 0.8) {
    console.log(colorize('\n👍 Good! Most portfolio overview queries work correctly.', 'yellow'));
  } else {
    console.log(colorize('\n⚠️  Portfolio overview functionality needs improvement.', 'red'));
  }
  
  // Test edge cases
  console.log('\n' + colorize('🧪 Testing Edge Cases', 'cyan'));
  console.log('='.repeat(30));
  
  const edgeCases = [
    {
      query: "show all my positions in my retirement portfolio",
      description: "Portfolio overview with specific portfolio name",
      expectedSymbol: "ALL"
    },
    {
      query: "show my AAPL and TSLA positions",
      description: "Multiple specific assets (should NOT be portfolio overview)",
      expectedSymbol: "AAPL" // Should match first symbol, not ALL
    }
  ];
  
  for (const edgeCase of edgeCases) {
    console.log(`\n${colorize('Edge Case', 'yellow')}: ${edgeCase.description}`);
    console.log(colorize('Query:', 'yellow'), `"${edgeCase.query}"`);
    
    const triageResult = QueryTriage.analyzeQuery(edgeCase.query);
    const actualSymbol = triageResult.regexpMatch?.symbol;
    
    console.log(`Expected Symbol: ${edgeCase.expectedSymbol}`);
    console.log(`Actual Symbol: ${actualSymbol}`);
    console.log(`Result: ${actualSymbol === edgeCase.expectedSymbol ? '✅ PASS' : '❌ FAIL'}`);
  }
}

// Main execution
async function main() {
  try {
    await testPortfolioOverview();
    console.log('\n' + colorize('🎯 Portfolio Overview Testing Complete!', 'bright'));
  } catch (error) {
    console.error(colorize('❌ Test failed:', 'red'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}