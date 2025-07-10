// ============================================================================
// FILE: app/test-analytics/page.tsx
// Test page for conversation analytics
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { conversationAnalytics } from '@/lib/conversation-analytics';
import { fastAPIClient } from '@/lib/fastapi-client';

export default function TestAnalyticsPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    // Load analytics into window object for console access
    if (typeof window !== 'undefined') {
      (window as any).conversationAnalytics = conversationAnalytics;
      (window as any).fastAPIClient = fastAPIClient;
      
      // Import and load the examples
      import('@/examples/conversation-thread-example').then(module => {
        (window as any).conversationAnalytics.examples = module;
        setIsLoaded(true);
        
        console.log('✅ Analytics loaded successfully!');
        console.log('Available in console:');
        console.log('• window.conversationAnalytics');
        console.log('• window.fastAPIClient');
        console.log('• window.conversationAnalytics.examples');
      });
    }
  }, []);

  const runBasicTest = async () => {
    console.log('🧪 Running basic analytics test...');
    
    try {
      // Generate test data
      const requestId = conversationAnalytics.generateRequestId();
      const sessionId = `test-session-${Date.now()}`;
      const userId = 'test-user';
      
      console.log('Generated Request ID:', requestId);
      console.log('Session ID:', sessionId);
      
      // Start conversation thread
      conversationAnalytics.startConversationThread(
        requestId,
        sessionId,
        'Test message for analytics',
        userId
      );
      
      // Track user message
      conversationAnalytics.trackUserMessage(
        requestId,
        sessionId,
        'Test message for analytics',
        userId
      );
      
      // Simulate some processing
      conversationAnalytics.logEvent({
        id: conversationAnalytics.generateRequestId(),
        requestId,
        sessionId,
        userId,
        timestamp: new Date(),
        eventType: 'message_processed',
        severity: 'info',
        message: 'Processing test message'
      });
      
      // Simulate backend call
      conversationAnalytics.trackFastAPICall(
        requestId,
        '/portfolio/test',
        'POST',
        1000, // 1 second
        200   // success
      );
      
      // Complete conversation
      conversationAnalytics.completeConversationThread(
        requestId,
        'Test response from analytics',
        true
      );
      
      // Get results
      const sessionAnalytics = conversationAnalytics.getSessionAnalytics(sessionId);
      const exportedData = conversationAnalytics.exportAnalytics();
      const thread = exportedData.threads.find(t => t.requestId === requestId);
      
      const results = {
        requestId,
        sessionId,
        sessionAnalytics,
        thread: thread ? {
          userMessage: thread.userMessage,
          finalResponse: thread.finalResponse,
          totalDuration: thread.totalDuration,
          success: thread.success,
          backendCalls: thread.backendCalls.length,
          events: thread.events.length
        } : null
      };
      
      setTestResults(results);
      console.log('✅ Test completed successfully!');
      console.log('Results:', results);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({ error: error.message });
    }
  };

  const runUserInteractionTest = () => {
    console.log('👆 Testing user interactions...');
    
    const sessionId = `interaction-test-${Date.now()}`;
    
    // Track various interactions
    conversationAnalytics.trackUserInteraction(
      sessionId,
      'button_click',
      'test_button',
      { timestamp: Date.now() }
    );
    
    conversationAnalytics.trackUserInteraction(
      sessionId,
      'scroll',
      'test_page',
      { scrollPosition: 100 }
    );
    
    conversationAnalytics.trackUserInteraction(
      sessionId,
      'page_view',
      'test_analytics_page',
      { userAgent: navigator.userAgent }
    );
    
    const sessionAnalytics = conversationAnalytics.getSessionAnalytics(sessionId);
    console.log('Interaction test results:', sessionAnalytics);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Conversation Analytics Test Page</h1>
      
      {!isLoaded ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">Loading analytics...</p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">✅ Analytics loaded successfully!</p>
          <p className="text-sm text-green-700 mt-2">
            You can now use the browser console to test analytics functions.
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Browser Console Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">Browser Console Instructions</h2>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>1. Open browser console</strong> (F12 or right-click → Inspect → Console)</p>
            <p><strong>2. Copy and paste this script:</strong></p>
            <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`// Test basic analytics
const requestId = window.conversationAnalytics.generateRequestId();
const sessionId = 'console-test-session';
console.log('Request ID:', requestId);

// Start conversation
window.conversationAnalytics.startConversationThread(
  requestId, 
  sessionId, 
  'Console test message'
);

// Complete conversation
window.conversationAnalytics.completeConversationThread(
  requestId, 
  'Console test response', 
  true
);

// Get results
const results = window.conversationAnalytics.getSessionAnalytics(sessionId);
console.log('Results:', results);`}
            </pre>
            <p><strong>3. Press Enter to run the test</strong></p>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold mb-4">Interactive Tests</h2>
          <div className="space-x-4">
            <button
              onClick={runBasicTest}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Run Basic Test
            </button>
            <button
              onClick={runUserInteractionTest}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Test User Interactions
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Test Results</h3>
            <pre className="text-sm bg-white p-4 rounded border overflow-x-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        {/* Advanced Console Commands */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Advanced Console Commands</h3>
          <div className="text-sm space-y-2">
            <p><strong>Get all analytics data:</strong></p>
            <code className="bg-gray-100 p-1 rounded">window.conversationAnalytics.exportAnalytics()</code>
            
            <p><strong>Search conversations:</strong></p>
            <code className="bg-gray-100 p-1 rounded">window.conversationAnalytics.examples.searchConversationThreads({'{success: true}'})</code>
            
            <p><strong>Monitor active conversations:</strong></p>
            <code className="bg-gray-100 p-1 rounded">window.conversationAnalytics.examples.monitorActiveConversations()</code>
            
            <p><strong>Get dashboard data:</strong></p>
            <code className="bg-gray-100 p-1 rounded">window.conversationAnalytics.examples.getDashboardData()</code>
          </div>
        </div>
      </div>
    </div>
  );
}