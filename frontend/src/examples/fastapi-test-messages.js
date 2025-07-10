// ============================================================================
// FILE: examples/fastapi-test-messages.js
// Test messages specifically designed to trigger FastAPI calls
// ============================================================================

// Messages that will trigger FastAPI calls
const fastapiTriggerMessages = [
  "Calculate my portfolio risk",
  "Analyze my portfolio volatility",
  "Calculate my Sharpe ratio",
  "Run Monte Carlo simulation",
  "Analyze market sentiment",
  "Optimize my portfolio",
  "What's my portfolio's value at risk?",
  "Calculate portfolio risk metrics",
  "Analyze my portfolio performance with risk metrics",
  "Show me portfolio optimization results",
  "Calculate risk-adjusted returns",
  "Run portfolio risk analysis",
  "Analyze market sentiment for my holdings",
  "Calculate portfolio volatility metrics",
  "Show me Monte Carlo simulation results"
];

// Function to test FastAPI trigger messages
function testFastAPITriggerMessages() {
  console.log('🎯 FastAPI Trigger Messages Test');
  console.log('================================');
  
  console.log('The following messages are designed to trigger FastAPI calls:');
  console.log('');
  
  fastapiTriggerMessages.forEach((message, index) => {
    console.log(`${index + 1}. "${message}"`);
  });
  
  console.log('');
  console.log('💡 Instructions:');
  console.log('1. Make sure correlateChatToFastAPI() is running');
  console.log('2. Copy and paste one of these messages into your chat');
  console.log('3. Watch the console for FastAPI call detection');
  console.log('4. Run showCorrelationResults() to see the correlation');
  
  return fastapiTriggerMessages;
}

// Function to check backend configuration
function checkCurrentBackendConfig() {
  console.log('🔧 Checking Backend Configuration');
  console.log('=================================');
  
  // Check if backend config is available
  if (window.backendConfig) {
    console.log('✅ Backend config found');
    console.log('Primary backend:', window.backendConfig.getPrimaryBackend());
    console.log('Fallback enabled:', window.backendConfig.isFallbackEnabled());
  } else {
    console.log('⚠️ Backend config not found in window');
  }
  
  // Check environment variables (these would be set on the server)
  console.log('');
  console.log('🌍 Environment Variables (server-side):');
  console.log('• PRIMARY_ANALYSIS_BACKEND: Controls which backend is used first');
  console.log('• ENABLE_BACKEND_FALLBACK: Controls if fallback is enabled');
  console.log('• FASTAPI_SERVICE_URL: URL of the FastAPI service');
  
  console.log('');
  console.log('💡 Current Configuration:');
  console.log('• Your system is likely using MCP as primary backend');
  console.log('• FastAPI is only called for specific financial analysis keywords');
  console.log('• Regular chat goes to OpenAI, not FastAPI');
}

// Function to monitor for FastAPI-specific requests
function monitorFastAPIRequests() {
  console.log('👀 Monitoring for FastAPI Requests');
  console.log('==================================');
  
  // Override fetch to specifically watch for FastAPI calls
  const originalFetch = window.fetch;
  let fastApiCallCount = 0;
  
  window.fetch = function(...args) {
    const url = args[0];
    
    // Check for FastAPI calls (port 8000 or contains 'fastapi')
    if (typeof url === 'string' && (url.includes('8000') || url.includes('fastapi'))) {
      fastApiCallCount++;
      console.log(`🚨 FastAPI Call #${fastApiCallCount} Detected!`);
      console.log('URL:', url);
      console.log('Timestamp:', new Date().toLocaleTimeString());
      console.log('Method:', args[1]?.method || 'GET');
      
      // Track the request
      const startTime = Date.now();
      
      return originalFetch.apply(this, args).then(response => {
        const duration = Date.now() - startTime;
        console.log(`✅ FastAPI Call #${fastApiCallCount} Response:`);
        console.log('Status:', response.status);
        console.log('Duration:', duration + 'ms');
        
        return response;
      }).catch(error => {
        console.log(`❌ FastAPI Call #${fastApiCallCount} Error:`, error);
        throw error;
      });
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ FastAPI monitoring enabled');
  console.log('Send a message with financial keywords to trigger FastAPI calls');
  
  // Set up a counter display
  const checkInterval = setInterval(() => {
    if (fastApiCallCount === 0) {
      console.log('📊 No FastAPI calls detected yet. Try these messages:');
      console.log('• "Calculate my portfolio risk"');
      console.log('• "Run Monte Carlo simulation"');
      console.log('• "Analyze market sentiment"');
      clearInterval(checkInterval);
    }
  }, 10000); // Check every 10 seconds
}

// Make functions available globally
window.testFastAPITriggerMessages = testFastAPITriggerMessages;
window.checkCurrentBackendConfig = checkCurrentBackendConfig;
window.monitorFastAPIRequests = monitorFastAPIRequests;
window.fastapiTriggerMessages = fastapiTriggerMessages;

// Auto-run instructions
console.log('🎯 FastAPI Test Messages Loaded');
console.log('===============================');
console.log('Available functions:');
console.log('• testFastAPITriggerMessages() - Show messages that trigger FastAPI');
console.log('• checkCurrentBackendConfig() - Check backend configuration');
console.log('• monitorFastAPIRequests() - Monitor for FastAPI calls');
console.log('');
console.log('🚀 Quick start: Run testFastAPITriggerMessages() to see trigger messages');