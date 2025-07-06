#!/usr/bin/env node
// Test partial quantity removal functionality

import { ChatTriageProcessor } from '../lib/chat-triage-processor';

async function testPartialRemoval() {
  const sessionId = 'partial-removal-test-' + Date.now();
  
  console.log('Testing partial quantity removal functionality:');
  console.log('='.repeat(50));
  
  // Add test asset with 200 shares
  const addResult = await ChatTriageProcessor.processQuery('add 200 shares of AAPL at $150', {
    guestSessionId: sessionId,
    isGuestMode: true
  });
  
  console.log(`✅ Added test position: ${addResult.content}`);
  console.log('');
  
  // Test partial removal queries
  const testQueries = [
    'delete 100 shares of AAPL',
    'remove 50 shares of AAPL', 
    'sell 25 AAPL shares',
    'delete 200 shares of AAPL', // Should remove entire position
    'remove 500 shares of AAPL'  // Should remove entire position (more than available)
  ];
  
  for (const query of testQueries) {
    console.log(`Testing: "${query}"`);
    
    const result = await ChatTriageProcessor.processQuery(query, {
      guestSessionId: sessionId,
      isGuestMode: true
    });
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Processing: ${result.processingType} (${result.executionTimeMs}ms)`);
    console.log(`   Response: ${result.content}`);
    
    // Show current portfolio after each operation
    const portfolioResult = await ChatTriageProcessor.processQuery('show all my positions', {
      guestSessionId: sessionId,
      isGuestMode: true
    });
    
    console.log(`   Portfolio: ${portfolioResult.content}`);
    console.log('');
  }
}

if (require.main === module) {
  testPartialRemoval().catch(console.error);
}