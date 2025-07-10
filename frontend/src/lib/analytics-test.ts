// ============================================================================
// FILE: lib/analytics-test.ts
// Test file to verify end-to-end analytics tracking
// ============================================================================

import { conversationAnalytics } from './conversation-analytics';
import { fastAPIClient } from './fastapi-client';

/**
 * Test function to verify analytics work end-to-end
 */
export async function testAnalyticsFlow() {
  console.log('🧪 Testing Analytics Flow...');
  
  // 1. Generate a test request ID
  const requestId = conversationAnalytics.generateRequestId();
  console.log('📝 Generated Request ID:', requestId);
  
  // 2. Start a conversation thread
  const testMessage = "Test analytics with portfolio analysis";
  const testSessionId = "test-session-123";
  
  conversationAnalytics.startConversationThread(
    requestId,
    testSessionId,
    testMessage,
    'test-user-123'
  );
  
  // 3. Simulate user message tracking
  conversationAnalytics.trackUserMessage(
    requestId,
    testSessionId,
    testMessage,
    'test-user-123'
  );
  
  // 4. Test FastAPI call tracking (if service is available)
  try {
    console.log('🔧 Testing FastAPI call tracking...');
    
    // This will fail gracefully if service is not available
    await fastAPIClient.calculatePortfolioRisk(
      'test-user-123',
      undefined,
      requestId
    );
    
  } catch (error) {
    console.log('⚠️ FastAPI call failed (expected in test):', error);
    
    // Manually track the failure
    conversationAnalytics.trackFastAPICall(
      requestId,
      '/portfolio/risk',
      'POST',
      1000,
      500,
      'Service unavailable (test)'
    );
  }
  
  // 5. Complete the conversation
  conversationAnalytics.completeConversationThread(
    requestId,
    'Test analytics response',
    true
  );
  
  // 6. Get analytics summary
  const analytics = conversationAnalytics.getSessionAnalytics(testSessionId);
  console.log('📊 Session Analytics:', analytics);
  
  // 7. Export analytics data
  const exportedData = conversationAnalytics.exportAnalytics(testSessionId);
  console.log('📤 Exported Analytics:', {
    eventCount: exportedData.events.length,
    threadCount: exportedData.threads.length,
    patternCount: exportedData.userPatterns.length
  });
  
  console.log('✅ Analytics test completed successfully!');
  
  return {
    requestId,
    sessionId: testSessionId,
    analytics,
    exportedData
  };
}

/**
 * Test user interaction tracking
 */
export function testUserInteractionTracking() {
  console.log('🧪 Testing User Interaction Tracking...');
  
  const testSessionId = 'interaction-test-session';
  
  // Test various user interactions
  conversationAnalytics.trackUserInteraction(
    testSessionId,
    'button_click',
    'send_button',
    { timestamp: Date.now() }
  );
  
  conversationAnalytics.trackUserInteraction(
    testSessionId,
    'scroll',
    'chat_container',
    { scrollPosition: 150 }
  );
  
  conversationAnalytics.trackUserInteraction(
    testSessionId,
    'file_upload',
    'portfolio_file',
    { fileType: 'csv', fileSize: 1024 }
  );
  
  // Get session analytics
  const analytics = conversationAnalytics.getSessionAnalytics(testSessionId);
  console.log('📊 Interaction Analytics:', analytics);
  
  console.log('✅ User interaction tracking test completed!');
  return analytics;
}

/**
 * Test LLM call tracking
 */
export function testLLMTracking() {
  console.log('🧪 Testing LLM Call Tracking...');
  
  const requestId = conversationAnalytics.generateRequestId();
  
  // Test successful LLM call
  conversationAnalytics.trackLLMCall(
    requestId,
    'openai',
    'Test prompt for analytics',
    'Test response from LLM',
    1500, // 1.5 seconds
    100   // 100 tokens
  );
  
  // Test failed LLM call
  conversationAnalytics.trackLLMCall(
    requestId,
    'anthropic',
    'Test prompt that failed',
    undefined,
    500,
    undefined,
    'Rate limit exceeded'
  );
  
  console.log('✅ LLM tracking test completed!');
  return requestId;
}

// Export test functions for use in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testAnalytics = {
    testAnalyticsFlow,
    testUserInteractionTracking,
    testLLMTracking
  };
}