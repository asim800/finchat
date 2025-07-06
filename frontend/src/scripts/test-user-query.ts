#!/usr/bin/env node
// Test the exact user query: "delete 100 shares of AAPL"

import { ChatTriageProcessor } from '../lib/chat-triage-processor';
import { QueryTriage } from '../lib/query-triage';

async function testUserQuery() {
  const sessionId = 'user-query-test-' + Date.now();
  const userQuery = 'delete 100 shares of AAPL';
  
  console.log('Testing the exact user query:');
  console.log('='.repeat(40));
  console.log(`Query: "${userQuery}"`);
  console.log('');
  
  // First, test the triage analysis
  const triageResult = QueryTriage.analyzeQuery(userQuery);
  console.log('🔍 Triage Analysis:');
  console.log(`   Processing Type: ${triageResult.processingType}`);
  console.log(`   Confidence: ${(triageResult.confidence * 100).toFixed(1)}%`);
  if (triageResult.regexpMatch) {
    console.log(`   Action: ${triageResult.regexpMatch.action}`);
    console.log(`   Symbol: ${triageResult.regexpMatch.symbol}`);
    console.log(`   Quantity: ${triageResult.regexpMatch.quantity}`);
    console.log(`   Raw Match: "${triageResult.regexpMatch.rawMatch}"`);
  }
  console.log('');
  
  // Add test position first
  console.log('Setting up test position...');
  await ChatTriageProcessor.processQuery('add 200 shares of AAPL at $150', {
    guestSessionId: sessionId,
    isGuestMode: true
  });
  console.log('✅ Added 200 shares of AAPL at $150');
  console.log('');
  
  // Test the user's query
  console.log('Processing user query...');
  const result = await ChatTriageProcessor.processQuery(userQuery, {
    guestSessionId: sessionId,
    isGuestMode: true
  });
  
  const status = result.success ? '✅' : '❌';
  console.log(`${status} Result: ${result.processingType} processing (${result.executionTimeMs}ms)`);
  console.log(`   Response: "${result.content}"`);
  console.log('');
  
  // Show remaining portfolio
  const portfolioResult = await ChatTriageProcessor.processQuery('show all my positions', {
    guestSessionId: sessionId,
    isGuestMode: true
  });
  
  console.log('📊 Final Portfolio:');
  console.log(`   ${portfolioResult.content}`);
}

if (require.main === module) {
  testUserQuery().catch(console.error);
}