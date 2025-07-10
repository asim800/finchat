// ============================================================================
// FILE: examples/analytics-usage-example.tsx
// Example showing how to use conversation analytics in a React component
// ============================================================================

import React, { useState, useEffect } from 'react';
import { conversationAnalytics, trackChatMessage, trackChatResponse } from '@/lib/conversation-analytics';

const AnalyticsUsageExample: React.FC = () => {
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [userId] = useState('user-123');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Example 1: Starting a conversation with analytics
  const handleSendMessage = async (message: string) => {
    console.log('📝 Starting conversation tracking...');
    
    // Step 1: Generate unique request ID
    const newRequestId = conversationAnalytics.generateRequestId();
    setRequestId(newRequestId);
    
    // Step 2: Track conversation start
    trackChatMessage(
      newRequestId,
      sessionId,
      message,
      userId
    );
    
    // Step 3: Simulate API call with tracking
    try {
      console.log('🔧 Making API call with request ID:', newRequestId);
      
      // This would be your actual API call
      const response = await simulateApiCall(message, newRequestId);
      
      // Step 4: Track successful response
      trackChatResponse(newRequestId, response, true);
      
      console.log('✅ Conversation tracked successfully!');
      
    } catch (error) {
      console.error('❌ API call failed:', error);
      
      // Track failed response
      trackChatResponse(newRequestId, 'Error occurred', false);
    }
  };

  // Example 2: Retrieving conversation analytics
  const getAnalytics = () => {
    console.log('📊 Retrieving analytics...');
    
    // Get session analytics
    const sessionAnalytics = conversationAnalytics.getSessionAnalytics(sessionId);
    console.log('Session Analytics:', sessionAnalytics);
    
    // Get exported data
    const exportedData = conversationAnalytics.exportAnalytics(sessionId);
    console.log('Exported Data:', exportedData);
    
    setAnalytics(sessionAnalytics);
    return sessionAnalytics;
  };

  // Example 3: Track user interactions
  const handleUserInteraction = (action: string, target: string) => {
    console.log('👆 Tracking user interaction:', action, target);
    
    conversationAnalytics.trackUserInteraction(
      sessionId,
      action,
      target,
      {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    );
  };

  // Simulate an API call for demonstration
  const simulateApiCall = async (message: string, requestId: string): Promise<string> => {
    // Track the start of backend processing
    conversationAnalytics.logEvent({
      id: conversationAnalytics.generateRequestId(),
      requestId,
      sessionId,
      userId,
      timestamp: new Date(),
      eventType: 'backend_analysis_start',
      severity: 'info',
      message: `Processing: ${message}`,
      metadata: { messageLength: message.length }
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Track completion
    conversationAnalytics.logEvent({
      id: conversationAnalytics.generateRequestId(),
      requestId,
      sessionId,
      userId,
      timestamp: new Date(),
      eventType: 'backend_analysis_complete',
      severity: 'info',
      duration: 1000,
      backend: 'simulation',
      metadata: { processed: true }
    });

    return `Response to: ${message}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Conversation Analytics Example</h2>
      
      <div className="space-y-4">
        {/* Example 1: Send Message with Tracking */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">1. Send Message with Tracking</h3>
          <button
            onClick={() => handleSendMessage("Analyze my portfolio performance")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send Test Message
          </button>
          {requestId && (
            <p className="text-sm text-gray-600 mt-2">
              Request ID: {requestId}
            </p>
          )}
        </div>

        {/* Example 2: User Interactions */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">2. Track User Interactions</h3>
          <div className="space-x-2">
            <button
              onClick={() => handleUserInteraction('button_click', 'portfolio_button')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Track Button Click
            </button>
            <button
              onClick={() => handleUserInteraction('scroll', 'main_content')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Track Scroll Event
            </button>
          </div>
        </div>

        {/* Example 3: Retrieve Analytics */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">3. Retrieve Analytics</h3>
          <button
            onClick={getAnalytics}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Get Session Analytics
          </button>
          
          {analytics && (
            <div className="mt-4 bg-white p-4 rounded border">
              <h4 className="font-semibold mb-2">Session Analytics:</h4>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(analytics, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsUsageExample;