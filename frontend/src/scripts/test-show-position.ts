#!/usr/bin/env node
// Test show position functionality

import { ChatTriageProcessor } from '../lib/chat-triage-processor';

async function testVariations() {
  const sessionId = 'variations-test-' + Date.now();
  
  // Add test asset
  await ChatTriageProcessor.processQuery('add 100 shares of AAPL at $150', {
    guestSessionId: sessionId,
    isGuestMode: true
  });
  
  const queries = [
    'show my AAPL position',
    'show my AAPL positions', 
    'display my AAPL position',
    'what is my AAPL position',
    'show AAPL position',
    'show my aapl position'  // lowercase test
  ];
  
  console.log('Testing query variations:');
  console.log('='.repeat(40));
  
  for (const query of queries) {
    const result = await ChatTriageProcessor.processQuery(query, {
      guestSessionId: sessionId,
      isGuestMode: true
    });
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} "${query}" -> ${result.processingType} (${result.executionTimeMs}ms)`);
    if (!result.success) {
      console.log(`    Error: ${result.content}`);
    }
  }
}

if (require.main === module) {
  testVariations().catch(console.error);
}