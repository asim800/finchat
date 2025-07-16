#!/usr/bin/env node
// ============================================================================
// FILE: scripts/test-chat-triage.ts
// Development script to test chat triage system manually
// ============================================================================

import { QueryTriage } from '../lib/query-triage';
import { PortfolioCrudHandler } from '../lib/portfolio-crud-handler';
import { ChatTriageProcessor } from '../lib/chat-triage-processor';
import { TestUtilities } from '../tests/chat-triage.test';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test queries with expected outcomes
const testQueries = [
  // Simple CRUD operations (should use regexp)
  {
    query: "add 50 shares of TSLA at $200 per share",
    expectedType: 'regexp',
    description: "Simple add operation with quantity and price"
  },
  {
    query: "delete NFLX from my portfolio",
    expectedType: 'regexp',
    description: "Simple remove operation"
  },
  {
    query: "update avgCost of my SPY stock to 452",
    expectedType: 'regexp',
    description: "Simple update operation for price"
  },
  {
    query: "show my AAPL position",
    expectedType: 'regexp',
    description: "Simple show operation"
  },
  
  // Ambiguous operations (should use hybrid)
  {
    query: "add some AAPL",
    expectedType: 'hybrid',
    description: "Add operation missing quantity"
  },
  {
    query: "update my tech positions",
    expectedType: 'hybrid',
    description: "Update operation without specifics"
  },
  
  // Complex operations (should use LLM)
  {
    query: "What's the best way to diversify my portfolio?",
    expectedType: 'llm',
    description: "Complex investment analysis"
  },
  {
    query: "Analyze my portfolio risk and suggest improvements",
    expectedType: 'llm',
    description: "Complex analysis request"
  },
  {
    query: "Should I buy more tech stocks given current market conditions?",
    expectedType: 'llm',
    description: "Market analysis and recommendation"
  }
];

// Performance test queries
const performanceQueries = [
  "add 100 AAPL at 150",
  "remove TSLA from portfolio",
  "update GOOGL quantity to 75",
  "show my MSFT position",
  "add 200 SPY at 400",
  "remove AMZN from my portfolio",
  "update QQQ price to 350",
  "show my NVDA holding"
];

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(title, 'bright'));
  console.log('='.repeat(60));
}

function printSubHeader(title: string): void {
  console.log('\n' + colorize(title, 'cyan'));
  console.log('-'.repeat(40));
}

async function testTriageAnalysis(): Promise<void> {
  printHeader('QUERY TRIAGE ANALYSIS TESTS');
  
  for (const testCase of testQueries) {
    printSubHeader(`Testing: "${testCase.query}"`);
    
    const startTime = Date.now();
    const result = QueryTriage.analyzeQuery(testCase.query);
    const analysisTime = Date.now() - startTime;
    
    console.log(colorize('Description:', 'yellow'), testCase.description);
    console.log(colorize('Expected Type:', 'yellow'), testCase.expectedType);
    console.log(colorize('Actual Type:', 'yellow'), result.processingType);
    console.log(colorize('Confidence:', 'yellow'), `${(result.confidence * 100).toFixed(1)}%`);
    console.log(colorize('Analysis Time:', 'yellow'), `${analysisTime}ms`);
    
    if (result.regexpMatch) {
      console.log(colorize('Regexp Match:', 'blue'));
      console.log('  Action:', result.regexpMatch.action);
      console.log('  Symbol:', result.regexpMatch.symbol);
      if (result.regexpMatch.quantity) console.log('  Quantity:', result.regexpMatch.quantity);
      if (result.regexpMatch.avgCost) console.log('  Price:', result.regexpMatch.avgCost);
      if (result.regexpMatch.portfolioName) console.log('  Portfolio:', result.regexpMatch.portfolioName);
    }
    
    // Check if result matches expectation
    const isCorrect = result.processingType === testCase.expectedType;
    const status = isCorrect ? 
      colorize('✅ PASS', 'green') : 
      colorize('❌ FAIL', 'red');
    
    console.log(colorize('Status:', 'yellow'), status);
  }
}

async function testCrudOperations(): Promise<void> {
  printHeader('PORTFOLIO CRUD OPERATIONS TESTS');
  
  const mockGuestSessionId = 'test-guest-session';
  const crudTestCases = [
    {
      action: 'add',
      query: "add 100 shares of AAPL at $150",
      description: "Add 100 AAPL shares"
    },
    {
      action: 'show',
      query: "show my AAPL position",
      description: "Show AAPL position"
    },
    {
      action: 'update',
      query: "update AAPL quantity to 150",
      description: "Update AAPL quantity"
    },
    {
      action: 'remove',
      query: "remove AAPL from my portfolio",
      description: "Remove AAPL from portfolio"
    }
  ];
  
  for (const testCase of crudTestCases) {
    printSubHeader(`Testing: ${testCase.description}`);
    
    const triageResult = QueryTriage.analyzeQuery(testCase.query);
    
    if (triageResult.regexpMatch) {
      const startTime = Date.now();
      
      try {
        const crudResult = await PortfolioCrudHandler.processRegexpMatch(
          triageResult.regexpMatch,
          undefined,
          mockGuestSessionId,
          true
        );
        
        const executionTime = Date.now() - startTime;
        
        console.log(colorize('Query:', 'yellow'), testCase.query);
        console.log(colorize('Success:', 'yellow'), crudResult.success ? '✅' : '❌');
        console.log(colorize('Message:', 'yellow'), crudResult.message);
        console.log(colorize('Execution Time:', 'yellow'), `${executionTime}ms`);
        
        if (crudResult.data) {
          console.log(colorize('Data:', 'blue'));
          console.log('  Action:', crudResult.data.action);
          console.log('  Symbol:', crudResult.data.symbol);
          console.log('  Portfolio:', crudResult.data.portfolio);
          if (crudResult.data.changes.length > 0) {
            console.log('  Changes:', crudResult.data.changes);
          }
        }
        
        if (crudResult.error) {
          console.log(colorize('Error:', 'red'), crudResult.error);
        }
        
      } catch (error) {
        console.log(colorize('Error:', 'red'), error);
      }
    } else {
      console.log(colorize('No regexp match found', 'red'));
    }
  }
}

async function testEndToEndProcessing(): Promise<void> {
  printHeader('END-TO-END PROCESSING TESTS');
  
  const mockGuestSessionId = 'test-guest-session';
  const endToEndTests = [
    "add 50 shares of TSLA at $200 per share",
    "show my TSLA position", 
    "update TSLA quantity to 75",
    "remove TSLA from my portfolio"
  ];
  
  for (const query of endToEndTests) {
    printSubHeader(`Processing: "${query}"`);
    
    try {
      const startTime = Date.now();
      
      const result = await ChatTriageProcessor.processQuery(query, {
        guestSessionId: mockGuestSessionId,
        isGuestMode: true
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(colorize('Processing Type:', 'yellow'), result.processingType);
      console.log(colorize('Success:', 'yellow'), result.success ? '✅' : '❌');
      console.log(colorize('Confidence:', 'yellow'), `${(result.confidence * 100).toFixed(1)}%`);
      console.log(colorize('Total Time:', 'yellow'), `${totalTime}ms`);
      console.log(colorize('Execution Time:', 'yellow'), `${result.executionTimeMs}ms`);
      console.log(colorize('Response:', 'blue'), result.content);
      
      if (result.metadata) {
        console.log(colorize('Metadata:', 'magenta'));
        if (result.metadata.portfolioModified) {
          console.log('  Portfolio Modified: ✅');
        }
        if (result.metadata.assetsAffected && result.metadata.assetsAffected.length > 0) {
          console.log('  Assets Affected:', result.metadata.assetsAffected.join(', '));
        }
        if (result.metadata.dbOperations) {
          console.log('  DB Operations:', result.metadata.dbOperations);
        }
      }
      
      if (result.error) {
        console.log(colorize('Error:', 'red'), result.error);
      }
      
    } catch (error) {
      console.log(colorize('Error:', 'red'), error);
    }
  }
}

async function runPerformanceBenchmark(): Promise<void> {
  printHeader('PERFORMANCE BENCHMARK');
  
  printSubHeader('Individual Query Performance');
  
  for (const query of performanceQueries) {
    const iterations = 100;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      QueryTriage.analyzeQuery(query);
      const endTime = Date.now();
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / iterations;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    console.log(colorize('Query:', 'yellow'), `"${query}"`);
    console.log(`  Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);
  }
  
  printSubHeader('Bulk Performance Test');
  
  const benchmarkResult = await TestUtilities.runPerformanceBenchmark(1000);
  
  console.log(colorize('Results for 1000 queries:', 'green'));
  console.log(`  Average Analysis Time: ${benchmarkResult.averageTime.toFixed(2)}ms`);
  console.log(`  Regexp Queries: ${benchmarkResult.regexpQueries} (${(benchmarkResult.regexpQueries/10).toFixed(1)}%)`);
  console.log(`  LLM Queries: ${benchmarkResult.llmQueries} (${(benchmarkResult.llmQueries/10).toFixed(1)}%)`);
  console.log(`  Hybrid Queries: ${benchmarkResult.hybridQueries} (${(benchmarkResult.hybridQueries/10).toFixed(1)}%)`);
}

async function runAllTests(): Promise<void> {
  console.log(colorize('🚀 Starting Chat Triage System Tests', 'bright'));
  console.log(colorize('='.repeat(60), 'bright'));
  
  try {
    await testTriageAnalysis();
    await testCrudOperations();
    await testEndToEndProcessing();
    await runPerformanceBenchmark();
    
    printHeader('TEST SUMMARY');
    console.log(colorize('✅ All tests completed successfully!', 'green'));
    console.log(colorize('Check the output above for detailed results.', 'dim'));
    
  } catch (error) {
    console.log(colorize('❌ Test suite failed:', 'red'), error);
    process.exit(1);
  }
}

// Interactive mode for manual testing
async function interactiveMode(): Promise<void> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  printHeader('INTERACTIVE TESTING MODE');
  console.log(colorize('Enter queries to test (type "exit" to quit):', 'cyan'));
  
  const mockGuestSessionId = 'interactive-session';
  
  function askQuestion(): void {
    rl.question(colorize('\n💬 Query: ', 'yellow'), async (query: string) => {
      if (query.toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      
      if (query.trim()) {
        try {
          console.log(colorize('\n🔍 Analyzing...', 'dim'));
          
          const result = await ChatTriageProcessor.processQuery(query, {
            guestSessionId: mockGuestSessionId,
            isGuestMode: true
          });
          
          console.log(colorize('\n📊 Results:', 'bright'));
          console.log(`Type: ${colorize(result.processingType, 'cyan')}`);
          console.log(`Success: ${result.success ? colorize('✅', 'green') : colorize('❌', 'red')}`);
          console.log(`Confidence: ${colorize(`${(result.confidence * 100).toFixed(1)}%`, 'yellow')}`);
          console.log(`Time: ${colorize(`${result.executionTimeMs}ms`, 'magenta')}`);
          console.log(`Response: ${colorize(result.content, 'blue')}`);
          
        } catch (error) {
          console.log(colorize('❌ Error:', 'red'), error);
        }
      }
      
      askQuestion();
    });
  }
  
  askQuestion();
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    interactiveMode();
  } else {
    runAllTests();
  }
}