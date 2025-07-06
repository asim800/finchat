#!/usr/bin/env node
// Test edge cases for singular/plural patterns

import { QueryTriage } from '../lib/query-triage';

function testFixedEdgeCases() {
  const edgeCases = [
    // Should be regexp (individual assets)
    'what are my AAPL positions',
    'what\'s my TSLA holdings', 
    'show my GOOGL allocations',
    
    // Should be portfolio overview (all assets) - SYMBOL should be ALL
    'what are my holdings',
    'what are my positions',
    'show all my positions',
    'list my portfolio',
    
    // Should be LLM (complex queries)
    'what should I do with my positions',
    'how are my positions performing',
    'should I sell my positions'
  ];
  
  console.log('Testing FIXED edge cases:');
  console.log('='.repeat(60));
  
  for (const query of edgeCases) {
    const result = QueryTriage.analyzeQuery(query);
    const symbol = result.regexpMatch?.symbol;
    const action = result.regexpMatch?.action;
    
    let status = '✅';
    let comment = '';
    
    // Check expected results
    if (query.includes('AAPL') || query.includes('TSLA') || query.includes('GOOGL')) {
      if (result.processingType !== 'regexp' || !symbol || symbol === 'MY') {
        status = '❌';
        comment = ' (Expected regexp with asset symbol)';
      }
    } else if (query === 'what are my holdings' || query === 'what are my positions' || query === 'show all my positions' || query === 'list my portfolio') {
      if (result.processingType !== 'regexp' || symbol !== 'ALL') {
        status = '❌';
        comment = ' (Expected regexp with ALL symbol)';
      }
    } else {
      if (result.processingType !== 'llm') {
        status = '❌';
        comment = ' (Expected LLM)';
      }
    }
    
    console.log(`${status} "${query}"${comment}`);
    console.log(`    Type: ${result.processingType} | Symbol: ${symbol || 'N/A'} | Action: ${action || 'N/A'} | Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('');
  }
}

if (require.main === module) {
  testFixedEdgeCases();
}