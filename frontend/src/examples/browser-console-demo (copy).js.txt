// ============================================================================
// FILE: examples/browser-console-demo.js
// Browser console demo for conversation analytics
// Copy and paste this into your browser console to test analytics
// ============================================================================

// Demo: Complete conversation analytics flow
async function demoConversationAnalytics() {
  console.log('🚀 Starting Conversation Analytics Demo');
  console.log('=====================================');
  
  // Check if analytics are available
  if (typeof window.conversationAnalytics === 'undefined') {
    console.error('❌ Conversation analytics not available. Make sure you\'re on a page with the analytics loaded.');
    return;
  }
  
  const analytics = window.conversationAnalytics;
  
  // Demo 1: Create a conversation thread
  console.log('\n📝 Demo 1: Creating Conversation Thread');
  const requestId = analytics.generateRequestId();
  const sessionId = `demo-session-${Date.now()}`;
  const userId = 'demo-user-123';
  
  console.log('Generated Request ID:', requestId);
  console.log('Session ID:', sessionId);
  
  // Start conversation thread
  analytics.startConversationThread(
    requestId,
    sessionId,
    'Show me my portfolio performance analytics',
    userId
  );
  
  // Track user message
  analytics.trackUserMessage(
    requestId,
    sessionId,
    'Show me my portfolio performance analytics',
    userId
  );
  
  // Simulate some processing events
  analytics.logEvent({
    id: analytics.generateRequestId(),
    requestId,
    sessionId,
    userId,
    timestamp: new Date(),
    eventType: 'message_processed',
    severity: 'info',
    message: 'Processing user request'
  });
  
  // Simulate backend call
  analytics.trackFastAPICall(
    requestId,
    '/portfolio/analyze',
    'POST',
    1500, // 1.5 second duration
    200   // success status
  );
  
  // Complete the conversation
  analytics.completeConversationThread(
    requestId,
    'Here is your portfolio performance analysis...',
    true
  );
  
  console.log('✅ Conversation thread created and completed');
  
  // Demo 2: Retrieve the conversation thread
  console.log('\n📊 Demo 2: Retrieving Conversation Thread');
  const exportedData = analytics.exportAnalytics();
  const thread = exportedData.threads.find(t => t.requestId === requestId);
  
  if (thread) {
    console.log('Found thread:', {
      requestId: thread.requestId,
      userMessage: thread.userMessage,
      finalResponse: thread.finalResponse,
      totalDuration: thread.totalDuration,
      success: thread.success,
      backendCalls: thread.backendCalls.length,
      events: thread.events.length
    });
  }
  
  // Demo 3: Session analytics
  console.log('\n📈 Demo 3: Session Analytics');
  const sessionAnalytics = analytics.getSessionAnalytics(sessionId);
  console.log('Session Analytics:', sessionAnalytics);
  
  // Demo 4: User interactions
  console.log('\n👆 Demo 4: User Interactions');
  
  // Track some user interactions
  analytics.trackUserInteraction(sessionId, 'button_click', 'portfolio_button');
  analytics.trackUserInteraction(sessionId, 'scroll', 'main_content');
  analytics.trackUserInteraction(sessionId, 'file_upload', 'portfolio_csv');
  
  // Demo 5: Error tracking
  console.log('\n❌ Demo 5: Error Tracking');
  const errorRequestId = analytics.generateRequestId();
  
  analytics.startConversationThread(
    errorRequestId,
    sessionId,
    'This request will fail',
    userId
  );
  
  // Track an error
  analytics.logEvent({
    id: analytics.generateRequestId(),
    requestId: errorRequestId,
    sessionId,
    userId,
    timestamp: new Date(),
    eventType: 'error_occurred',
    severity: 'error',
    error: 'API service unavailable',
    metadata: { errorCode: 503 }
  });
  
  analytics.completeConversationThread(
    errorRequestId,
    'Sorry, I encountered an error',
    false
  );
  
  // Demo 6: Search and filter
  console.log('\n🔍 Demo 6: Search and Filter');
  if (analytics.examples && analytics.examples.searchConversationThreads) {
    const recentThreads = analytics.examples.searchConversationThreads({
      sessionId: sessionId,
      success: true
    });
    console.log('Successful threads in session:', recentThreads.length);
  }
  
  // Demo 7: Export data
  console.log('\n📤 Demo 7: Export Data');
  if (analytics.examples && analytics.examples.exportConversationData) {
    const jsonData = analytics.examples.exportConversationData('json');
    console.log('JSON export size:', jsonData.length, 'characters');
    
    const csvData = analytics.examples.exportConversationData('csv');
    console.log('CSV export size:', csvData.length, 'characters');
  }
  
  // Demo 8: Dashboard data
  console.log('\n📊 Demo 8: Dashboard Data');
  if (analytics.examples && analytics.examples.getDashboardData) {
    const dashboardData = analytics.examples.getDashboardData();
    console.log('Dashboard Data:', dashboardData);
  }
  
  console.log('\n🎉 Demo Complete! Check the logs above for analytics data.');
  console.log('=====================================');
  
  return {
    requestId,
    sessionId,
    thread,
    sessionAnalytics,
    exportedData
  };
}

// Quick test function
function quickAnalyticsTest() {
  console.log('⚡ Quick Analytics Test');
  
  if (typeof window.conversationAnalytics === 'undefined') {
    console.error('❌ Analytics not available');
    return;
  }
  
  const analytics = window.conversationAnalytics;
  
  // Generate test data
  const requestId = analytics.generateRequestId();
  const sessionId = 'quick-test-session';
  
  // Track a simple conversation
  analytics.startConversationThread(requestId, sessionId, 'Quick test message');
  analytics.completeConversationThread(requestId, 'Quick test response', true);
  
  // Get results
  const results = analytics.getSessionAnalytics(sessionId);
  console.log('Quick test results:', results);
  
  return results;
}

// Monitor function
function monitorAnalytics() {
  console.log('👀 Monitoring Analytics...');
  
  if (typeof window.conversationAnalytics === 'undefined') {
    console.error('❌ Analytics not available');
    return;
  }
  
  const analytics = window.conversationAnalytics;
  
  // Monitor active conversations
  if (analytics.examples && analytics.examples.monitorActiveConversations) {
    const activeThreads = analytics.examples.monitorActiveConversations();
    console.log('Active conversations:', activeThreads.length);
  }
  
  // Get all analytics data
  const exportedData = analytics.exportAnalytics();
  console.log('Total analytics data:', {
    events: exportedData.events.length,
    threads: exportedData.threads.length,
    patterns: exportedData.userPatterns.length
  });
  
  return exportedData;
}

// Make functions available globally
window.demoConversationAnalytics = demoConversationAnalytics;
window.quickAnalyticsTest = quickAnalyticsTest;
window.monitorAnalytics = monitorAnalytics;

// Auto-run instructions
console.log('🎯 Conversation Analytics Demo Loaded!');
console.log('');
console.log('Available functions:');
console.log('• demoConversationAnalytics() - Full demo');
console.log('• quickAnalyticsTest() - Quick test');
console.log('• monitorAnalytics() - Monitor current state');
console.log('');
console.log('To run the full demo, type: demoConversationAnalytics()');