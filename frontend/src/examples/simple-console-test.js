// ============================================================================
// FILE: examples/simple-console-test.js
// Simple console test that loads analytics dynamically
// Copy and paste this entire script into browser console
// ============================================================================

// Step 1: Load analytics module dynamically
console.log('🚀 Loading Conversation Analytics...');

// Check if we're in a Next.js app
if (typeof window !== 'undefined' && window.location.pathname.includes('/')) {
  
  // Simple analytics implementation for console testing
  const simpleAnalytics = {
    events: [],
    threads: [],
    
    generateRequestId() {
      return 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },
    
    startConversationThread(requestId, sessionId, userMessage, userId) {
      const thread = {
        requestId,
        sessionId,
        userId,
        userMessage,
        startTime: new Date(),
        events: [],
        success: false,
        errorCount: 0,
        backendCalls: []
      };
      
      this.threads.push(thread);
      
      this.logEvent({
        id: this.generateRequestId(),
        requestId,
        sessionId,
        userId,
        timestamp: new Date(),
        eventType: 'conversation_start',
        severity: 'info',
        userMessage
      });
      
      console.log('📝 Started conversation thread:', requestId);
    },
    
    completeConversationThread(requestId, finalResponse, success) {
      const thread = this.threads.find(t => t.requestId === requestId);
      if (thread) {
        thread.endTime = new Date();
        thread.totalDuration = thread.endTime.getTime() - thread.startTime.getTime();
        thread.finalResponse = finalResponse;
        thread.success = success;
        
        this.logEvent({
          id: this.generateRequestId(),
          requestId,
          sessionId: thread.sessionId,
          userId: thread.userId,
          timestamp: new Date(),
          eventType: 'chat_response_displayed',
          severity: 'info',
          responseContent: finalResponse,
          duration: thread.totalDuration
        });
        
        console.log('✅ Completed conversation thread:', requestId);
      }
    },
    
    logEvent(event) {
      this.events.push(event);
      
      // Add to thread if exists
      const thread = this.threads.find(t => t.requestId === event.requestId);
      if (thread) {
        thread.events.push(event);
      }
    },
    
    trackFastAPICall(requestId, endpoint, method, duration, httpStatus, error) {
      const thread = this.threads.find(t => t.requestId === requestId);
      if (thread) {
        thread.backendCalls.push({
          endpoint,
          method,
          duration,
          httpStatus,
          error,
          success: !error && httpStatus < 400
        });
      }
      
      this.logEvent({
        id: this.generateRequestId(),
        requestId,
        sessionId: thread?.sessionId || '',
        timestamp: new Date(),
        eventType: error ? 'error_occurred' : 'fastapi_response_received',
        severity: error ? 'error' : 'info',
        backend: 'fastapi',
        endpoint,
        httpStatus,
        duration,
        error
      });
      
      console.log('🔧 FastAPI call tracked:', endpoint, httpStatus);
    },
    
    trackUserInteraction(sessionId, action, target, metadata) {
      this.logEvent({
        id: this.generateRequestId(),
        requestId: 'interaction',
        sessionId,
        timestamp: new Date(),
        eventType: 'user_interaction',
        severity: 'info',
        userAction: action,
        clickTarget: target,
        metadata
      });
      
      console.log('👆 User interaction tracked:', action, target);
    },
    
    getSessionAnalytics(sessionId) {
      const sessionEvents = this.events.filter(e => e.sessionId === sessionId);
      const sessionThreads = this.threads.filter(t => t.sessionId === sessionId);
      
      const messageCount = sessionEvents.filter(e => e.eventType === 'conversation_start').length;
      const errors = sessionEvents.filter(e => e.severity === 'error').length;
      const totalLatency = sessionThreads.reduce((sum, t) => sum + (t.totalDuration || 0), 0);
      
      return {
        sessionId,
        messageCount,
        averageLatency: messageCount > 0 ? totalLatency / messageCount : 0,
        errorRate: messageCount > 0 ? (errors / messageCount) * 100 : 0,
        successfulThreads: sessionThreads.filter(t => t.success).length,
        totalThreads: sessionThreads.length,
        events: sessionEvents.length,
        backendCalls: sessionThreads.reduce((sum, t) => sum + t.backendCalls.length, 0)
      };
    },
    
    exportAnalytics() {
      return {
        events: this.events,
        threads: this.threads,
        userPatterns: []
      };
    }
  };
  
  // Make analytics available globally
  window.conversationAnalytics = simpleAnalytics;
  
  console.log('✅ Analytics loaded successfully!');
  console.log('Available functions:');
  console.log('• window.conversationAnalytics.generateRequestId()');
  console.log('• window.conversationAnalytics.startConversationThread()');
  console.log('• window.conversationAnalytics.completeConversationThread()');
  console.log('• window.conversationAnalytics.getSessionAnalytics()');
  console.log('• window.conversationAnalytics.exportAnalytics()');
  
} else {
  console.error('❌ Not in a web environment');
}

// Step 2: Test functions
function runQuickTest() {
  console.log('🧪 Running Quick Analytics Test');
  console.log('================================');
  
  const analytics = window.conversationAnalytics;
  
  // Test 1: Basic conversation
  console.log('\n📝 Test 1: Basic Conversation');
  const requestId = analytics.generateRequestId();
  const sessionId = 'quick-test-session';
  
  analytics.startConversationThread(
    requestId,
    sessionId,
    'What is my portfolio performance?',
    'test-user'
  );
  
  // Simulate backend call
  analytics.trackFastAPICall(
    requestId,
    '/portfolio/analyze',
    'POST',
    1200,
    200
  );
  
  analytics.completeConversationThread(
    requestId,
    'Your portfolio is performing well with 8% returns',
    true
  );
  
  // Test 2: User interactions
  console.log('\n👆 Test 2: User Interactions');
  analytics.trackUserInteraction(sessionId, 'button_click', 'portfolio_button');
  analytics.trackUserInteraction(sessionId, 'scroll', 'dashboard');
  
  // Test 3: Error scenario
  console.log('\n❌ Test 3: Error Scenario');
  const errorRequestId = analytics.generateRequestId();
  
  analytics.startConversationThread(
    errorRequestId,
    sessionId,
    'This will fail',
    'test-user'
  );
  
  analytics.trackFastAPICall(
    errorRequestId,
    '/portfolio/broken',
    'POST',
    500,
    500,
    'Service unavailable'
  );
  
  analytics.completeConversationThread(
    errorRequestId,
    'Sorry, I encountered an error',
    false
  );
  
  // Get results
  console.log('\n📊 Test Results');
  const sessionAnalytics = analytics.getSessionAnalytics(sessionId);
  console.log('Session Analytics:', sessionAnalytics);
  
  const exportedData = analytics.exportAnalytics();
  console.log('Total Events:', exportedData.events.length);
  console.log('Total Threads:', exportedData.threads.length);
  
  console.log('\n✅ Quick test completed!');
  console.log('================================');
  
  return { sessionAnalytics, exportedData };
}

function showAnalyticsData() {
  console.log('📊 Current Analytics Data');
  console.log('========================');
  
  const analytics = window.conversationAnalytics;
  const data = analytics.exportAnalytics();
  
  console.log('Events:', data.events.length);
  console.log('Threads:', data.threads.length);
  
  // Show recent events
  console.log('\nRecent Events:');
  data.events.slice(-5).forEach(event => {
    console.log(`• ${event.eventType} | ${event.timestamp.toLocaleTimeString()}`);
  });
  
  // Show threads
  console.log('\nConversation Threads:');
  data.threads.forEach(thread => {
    console.log(`• ${thread.requestId} | "${thread.userMessage}" | ${thread.success ? '✅' : '❌'}`);
  });
  
  return data;
}

// Make test functions available
window.runQuickTest = runQuickTest;
window.showAnalyticsData = showAnalyticsData;

// Instructions
console.log('\n🎯 Test Commands Available:');
console.log('• runQuickTest() - Run complete analytics test');
console.log('• showAnalyticsData() - Show current analytics data');
console.log('• window.conversationAnalytics - Access analytics directly');
console.log('\nTo run the test, type: runQuickTest()');