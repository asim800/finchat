// ============================================================================
// FILE: examples/real-chat-tracking.js
// Track real FastAPI calls from chat queries
// Copy and paste this into browser console
// ============================================================================

// Enhanced tracking for real FastAPI calls
function trackRealFastAPICalls() {
  console.log('🔍 Setting up real FastAPI call tracking...');
  
  // Override fetch to intercept all HTTP requests
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    // Check if this is a FastAPI call
    if (typeof url === 'string' && url.includes('8000')) {
      console.log('🚨 FastAPI call detected!');
      console.log('URL:', url);
      console.log('Method:', options.method || 'GET');
      console.log('Headers:', options.headers);
      
      // Try to parse the body
      if (options.body) {
        try {
          const body = JSON.parse(options.body);
          console.log('Request Body:', body);
          console.log('Request ID in body:', body.requestId || 'none');
        } catch (e) {
          console.log('Request Body (raw):', options.body);
        }
      }
      
      // Track the call start time
      const startTime = Date.now();
      
      // Call the original fetch and track response
      return originalFetch.apply(this, args).then(response => {
        const duration = Date.now() - startTime;
        console.log('🔧 FastAPI Response:');
        console.log('Status:', response.status);
        console.log('Duration:', duration + 'ms');
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        clonedResponse.json().then(data => {
          console.log('Response Data:', data);
        }).catch(e => {
          console.log('Response not JSON:', e);
        });
        
        return response;
      }).catch(error => {
        const duration = Date.now() - startTime;
        console.log('❌ FastAPI Error:');
        console.log('Error:', error);
        console.log('Duration:', duration + 'ms');
        throw error;
      });
    }
    
    // For non-FastAPI calls, just pass through
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ FastAPI call tracking enabled');
  console.log('Now send a chat message and watch for FastAPI calls...');
}

// Function to check what triggers FastAPI calls
function checkChatToFastAPIFlow() {
  console.log('🔍 Checking Chat → FastAPI Flow');
  console.log('================================');
  
  // Check if analytics are loaded
  if (typeof window.conversationAnalytics === 'undefined') {
    console.log('⚠️ Analytics not loaded - loading simple version...');
    
    // Load simple analytics
    window.conversationAnalytics = {
      events: [],
      generateRequestId: () => 'req-' + Date.now(),
      logEvent: (event) => {
        console.log('📊 Analytics Event:', event);
        window.conversationAnalytics.events.push(event);
      }
    };
  }
  
  // Override the FastAPI client if it exists
  if (typeof window.fastAPIClient !== 'undefined') {
    console.log('✅ FastAPI client found');
    
    // Check what methods are available
    const client = window.fastAPIClient;
    console.log('Available methods:', Object.getOwnPropertyNames(client.__proto__));
    
  } else {
    console.log('⚠️ FastAPI client not found in window');
  }
  
  // Check for chat interface
  if (document.querySelector('[data-testid="chat-interface"]') || 
      document.querySelector('.chat-interface') ||
      document.querySelector('input[placeholder*="Ask"]')) {
    console.log('✅ Chat interface detected');
  } else {
    console.log('⚠️ Chat interface not found');
  }
  
  console.log('\n💡 To track real calls:');
  console.log('1. Run: trackRealFastAPICalls()');
  console.log('2. Send a message in chat');
  console.log('3. Watch console for FastAPI calls');
}

// Function to analyze current chat keywords
function analyzeForFastAPIKeywords() {
  console.log('🔍 Analyzing for FastAPI trigger keywords...');
  
  // Keywords that should trigger FastAPI calls
  const fastapiKeywords = [
    'portfolio', 'risk', 'analyze', 'sharpe', 'optimize', 'monte carlo',
    'sentiment', 'performance', 'allocation', 'volatility', 'return'
  ];
  
  console.log('FastAPI trigger keywords:', fastapiKeywords);
  
  // Check if any chat inputs exist
  const chatInputs = document.querySelectorAll('input[type="text"], textarea');
  console.log('Found chat inputs:', chatInputs.length);
  
  if (chatInputs.length > 0) {
    console.log('\n💡 Try these messages to trigger FastAPI calls:');
    console.log('• "Analyze my portfolio risk"');
    console.log('• "Calculate my Sharpe ratio"');
    console.log('• "Optimize my portfolio allocation"');
    console.log('• "Run Monte Carlo simulation"');
    console.log('• "Analyze market sentiment"');
  }
}

// Function to check backend configuration
function checkBackendConfig() {
  console.log('🔍 Checking Backend Configuration...');
  
  // Check if backend config exists
  if (typeof window.backendConfig !== 'undefined') {
    console.log('✅ Backend config found');
    console.log('Primary backend:', window.backendConfig.getPrimaryBackend());
    console.log('Fallback enabled:', window.backendConfig.isFallbackEnabled());
  } else {
    console.log('⚠️ Backend config not found');
  }
  
  // Check environment variables that might affect FastAPI calls
  console.log('\n🔧 Environment check:');
  console.log('Location:', window.location.origin);
  console.log('User agent:', navigator.userAgent);
  
  // Check for FastAPI service URL
  const possibleFastAPIUrls = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    window.location.origin.replace('3000', '8000')
  ];
  
  console.log('Possible FastAPI URLs:', possibleFastAPIUrls);
}

// Function to manually trigger FastAPI call
function testFastAPICall() {
  console.log('🧪 Testing FastAPI call manually...');
  
  // Test if FastAPI service is running
  fetch('http://localhost:8000/health')
    .then(response => {
      console.log('✅ FastAPI service is running!');
      console.log('Status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Health check response:', data);
    })
    .catch(error => {
      console.log('❌ FastAPI service not accessible:', error);
      console.log('Make sure FastAPI is running on port 8000');
    });
}

// Function to correlate chat messages with FastAPI calls
function correlateChatToFastAPI() {
  console.log('🔗 Setting up Chat → FastAPI Correlation...');
  
  const chatFastAPIMap = new Map();
  
  // Track chat messages being sent
  const originalSendMessage = window.sendMessage;
  if (originalSendMessage) {
    window.sendMessage = function(message, ...args) {
      const timestamp = Date.now();
      const correlationId = `chat-${timestamp}`;
      
      console.log('📤 Chat message sent:', message);
      console.log('📋 Correlation ID:', correlationId);
      
      chatFastAPIMap.set(correlationId, {
        message,
        timestamp,
        fastAPICalls: []
      });
      
      // Call original function
      return originalSendMessage.apply(this, [message, ...args]);
    };
  }
  
  // Override fetch to track FastAPI calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    // Check if this is a FastAPI call (port 8000)
    if (typeof url === 'string' && url.includes('8000')) {
      const startTime = Date.now();
      
      // Find most recent chat message (within last 10 seconds)
      const recentChatEntries = Array.from(chatFastAPIMap.entries())
        .filter(([id, data]) => startTime - data.timestamp < 10000)
        .sort(([,a], [,b]) => b.timestamp - a.timestamp);
      
      const correlationId = recentChatEntries[0]?.[0];
      
      console.log('🚨 FastAPI call detected!');
      console.log('📋 Correlated with chat:', correlationId);
      console.log('📍 Endpoint:', url);
      console.log('📊 Method:', options.method || 'GET');
      
      // Try to get request body
      let requestBody = null;
      if (options.body) {
        try {
          requestBody = JSON.parse(options.body);
        } catch (e) {
          requestBody = options.body;
        }
      }
      
      console.log('📦 Request body:', requestBody);
      
      // Track the call
      if (correlationId && chatFastAPIMap.has(correlationId)) {
        chatFastAPIMap.get(correlationId).fastAPICalls.push({
          url,
          method: options.method || 'GET',
          requestBody,
          startTime
        });
      }
      
      // Call original fetch and track response
      return originalFetch.apply(this, args).then(response => {
        const duration = Date.now() - startTime;
        
        console.log('✅ FastAPI Response received:');
        console.log('📊 Status:', response.status);
        console.log('⏱️ Duration:', duration + 'ms');
        
        // Update the tracked call with response info
        if (correlationId && chatFastAPIMap.has(correlationId)) {
          const calls = chatFastAPIMap.get(correlationId).fastAPICalls;
          const lastCall = calls[calls.length - 1];
          if (lastCall) {
            lastCall.status = response.status;
            lastCall.duration = duration;
            lastCall.success = response.ok;
          }
        }
        
        // Try to read response body
        const clonedResponse = response.clone();
        clonedResponse.json().then(data => {
          console.log('📄 Response data:', data);
          
          // Update tracked call with response data
          if (correlationId && chatFastAPIMap.has(correlationId)) {
            const calls = chatFastAPIMap.get(correlationId).fastAPICalls;
            const lastCall = calls[calls.length - 1];
            if (lastCall) {
              lastCall.responseData = data;
            }
          }
        }).catch(e => {
          console.log('⚠️ Response not JSON or error reading:', e);
        });
        
        return response;
      }).catch(error => {
        const duration = Date.now() - startTime;
        console.log('❌ FastAPI Error:', error);
        console.log('⏱️ Duration:', duration + 'ms');
        
        // Update tracked call with error
        if (correlationId && chatFastAPIMap.has(correlationId)) {
          const calls = chatFastAPIMap.get(correlationId).fastAPICalls;
          const lastCall = calls[calls.length - 1];
          if (lastCall) {
            lastCall.error = error.message;
            lastCall.duration = duration;
            lastCall.success = false;
          }
        }
        
        throw error;
      });
    }
    
    // For non-FastAPI calls, just pass through
    return originalFetch.apply(this, args);
  };
  
  // Store reference to correlation map
  window.chatFastAPIMap = chatFastAPIMap;
  
  console.log('✅ Chat → FastAPI correlation enabled');
  console.log('💡 Now send a chat message and watch the correlation!');
}

// Function to show correlation results
function showCorrelationResults() {
  console.log('📊 Chat → FastAPI Correlation Results');
  console.log('===================================');
  
  if (!window.chatFastAPIMap) {
    console.log('⚠️ No correlation data available. Run correlateChatToFastAPI() first.');
    return;
  }
  
  const correlationData = Array.from(window.chatFastAPIMap.entries());
  
  if (correlationData.length === 0) {
    console.log('📭 No chat messages tracked yet');
    return;
  }
  
  correlationData.forEach(([correlationId, data]) => {
    console.log(`\n📝 ${correlationId}:`);
    console.log(`  Message: "${data.message}"`);
    console.log(`  Time: ${new Date(data.timestamp).toLocaleTimeString()}`);
    console.log(`  FastAPI Calls: ${data.fastAPICalls.length}`);
    
    data.fastAPICalls.forEach((call, index) => {
      console.log(`    ${index + 1}. ${call.method} ${call.url}`);
      console.log(`       Status: ${call.status || 'pending'}`);
      console.log(`       Duration: ${call.duration || 'pending'}ms`);
      console.log(`       Success: ${call.success || 'pending'}`);
      if (call.error) {
        console.log(`       Error: ${call.error}`);
      }
    });
  });
  
  return correlationData;
}

// Function to clear correlation data
function clearCorrelationData() {
  if (window.chatFastAPIMap) {
    window.chatFastAPIMap.clear();
    console.log('🧹 Correlation data cleared');
  }
}

// Function to show current analytics events
function showFastAPIEvents() {
  console.log('📊 Current FastAPI Events');
  console.log('========================');
  
  if (window.conversationAnalytics && window.conversationAnalytics.events) {
    const fastapiEvents = window.conversationAnalytics.events.filter(e => 
      e.backend === 'fastapi' || 
      e.endpoint || 
      e.eventType === 'fastapi_request_sent' ||
      e.eventType === 'fastapi_response_received'
    );
    
    console.log('FastAPI events found:', fastapiEvents.length);
    
    fastapiEvents.forEach(event => {
      console.log(`• ${event.eventType} | ${event.endpoint || 'unknown'} | ${event.httpStatus || 'unknown'}`);
    });
    
    if (fastapiEvents.length === 0) {
      console.log('⚠️ No FastAPI events found');
      console.log('This means FastAPI is not being called from chat');
    }
  } else {
    console.log('⚠️ No analytics events available');
  }
}

// Make functions available globally
window.trackRealFastAPICalls = trackRealFastAPICalls;
window.checkChatToFastAPIFlow = checkChatToFastAPIFlow;
window.analyzeForFastAPIKeywords = analyzeForFastAPIKeywords;
window.checkBackendConfig = checkBackendConfig;
window.testFastAPICall = testFastAPICall;
window.showFastAPIEvents = showFastAPIEvents;
window.correlateChatToFastAPI = correlateChatToFastAPI;
window.showCorrelationResults = showCorrelationResults;
window.clearCorrelationData = clearCorrelationData;

// Auto-run basic checks
console.log('🔍 Real FastAPI Call Tracking Loaded');
console.log('====================================');
console.log('Available commands:');
console.log('• trackRealFastAPICalls() - Monitor all FastAPI calls');
console.log('• checkChatToFastAPIFlow() - Check if chat → FastAPI works');
console.log('• analyzeForFastAPIKeywords() - See what messages trigger FastAPI');
console.log('• checkBackendConfig() - Check backend configuration');
console.log('• testFastAPICall() - Test if FastAPI service is running');
console.log('• showFastAPIEvents() - Show FastAPI events from analytics');
console.log('• correlateChatToFastAPI() - Link chat messages to FastAPI calls');
console.log('• showCorrelationResults() - Show chat → FastAPI correlations');
console.log('• clearCorrelationData() - Clear correlation tracking data');
console.log('');
console.log('🚀 Quick start: Run correlateChatToFastAPI() then send a chat message');
console.log('🎯 Best approach: Use correlateChatToFastAPI() to see which FastAPI endpoints are triggered by specific chat messages');