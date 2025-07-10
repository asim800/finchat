// ============================================================================
// FILE: examples/test-backend-fix.js
// Test script to verify FastAPI backend is being called after the fix
// ============================================================================

// Test function to verify backend routing fix
function testBackendRouting() {
  console.log('🔧 Testing Backend Routing Fix');
  console.log('===============================');
  
  // Clear any existing correlation data
  if (window.chatFastAPIMap) {
    window.chatFastAPIMap.clear();
  }
  
  // Set up monitoring
  console.log('1. Setting up monitoring...');
  
  // Enhanced fetch override to catch FastAPI calls
  const originalFetch = window.fetch;
  let fastAPICallCount = 0;
  
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    // Check for FastAPI calls
    if (typeof url === 'string' && (url.includes('8000') || url.includes('fastapi'))) {
      fastAPICallCount++;
      console.log(`🚨 FastAPI Call #${fastAPICallCount} Detected!`);
      console.log('  URL:', url);
      console.log('  Method:', options.method || 'GET');
      console.log('  Timestamp:', new Date().toLocaleTimeString());
      
      // Try to read request body
      if (options.body) {
        try {
          const body = JSON.parse(options.body);
          console.log('  Request Body:', body);
        } catch (e) {
          console.log('  Request Body (raw):', options.body);
        }
      }
      
      const startTime = Date.now();
      
      return originalFetch.apply(this, args).then(response => {
        const duration = Date.now() - startTime;
        console.log(`✅ FastAPI Call #${fastAPICallCount} Response:`);
        console.log('  Status:', response.status);
        console.log('  Duration:', duration + 'ms');
        console.log('  Success:', response.ok);
        
        // Try to read response
        const clonedResponse = response.clone();
        clonedResponse.text().then(text => {
          console.log('  Response Preview:', text.substring(0, 200) + '...');
        }).catch(() => {
          console.log('  Response: (could not read)');
        });
        
        return response;
      }).catch(error => {
        console.log(`❌ FastAPI Call #${fastAPICallCount} Error:`, error);
        throw error;
      });
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('2. Monitoring enabled! Now try these messages:');
  console.log('');
  
  // Test messages that should trigger FastAPI
  const testMessages = [
    'Calculate my portfolio risk',
    'Analyze my portfolio performance',
    'What is my Sharpe ratio?',
    'Run Monte Carlo simulation',
    'Analyze market sentiment',
    'Optimize my portfolio',
    'Calculate portfolio volatility',
    'Show me risk analysis'
  ];
  
  testMessages.forEach((message, index) => {
    console.log(`   ${index + 1}. "${message}"`);
  });
  
  console.log('');
  console.log('3. Expected behavior:');
  console.log('   - You should see FastAPI calls detected in the console');
  console.log('   - Chat response should show "Response from: fastapi" (not "openai")');
  console.log('   - Analytics should show backend field populated');
  
  console.log('');
  console.log('4. If you don\'t see FastAPI calls, check:');
  console.log('   - Is FastAPI service running on port 8000?');
  console.log('   - Is PRIMARY_ANALYSIS_BACKEND=fastapi in your .env?');
  console.log('   - Are you logged in? (Guest mode might not trigger FastAPI)');
  
  // Set up a timer to check results
  setTimeout(() => {
    console.log('');
    console.log('📊 Test Results After 30 seconds:');
    console.log('  FastAPI calls detected:', fastAPICallCount);
    
    if (fastAPICallCount === 0) {
      console.log('  ⚠️ No FastAPI calls detected - backend routing may still be broken');
      console.log('  Try sending a message with financial keywords like "portfolio risk"');
    } else {
      console.log('  ✅ FastAPI calls detected - backend routing is working!');
    }
  }, 30000);
  
  return {
    testMessages,
    checkResults: () => ({ fastAPICallCount })
  };
}

// Function to check environment configuration
function checkEnvironmentConfig() {
  console.log('🌍 Checking Environment Configuration');
  console.log('====================================');
  
  // Check if we can determine backend config
  console.log('Note: Environment variables are server-side only');
  console.log('Expected configuration:');
  console.log('  PRIMARY_ANALYSIS_BACKEND=fastapi');
  console.log('  ENABLE_BACKEND_FALLBACK=false');
  console.log('');
  
  // Check for FastAPI service availability
  console.log('Testing FastAPI service availability...');
  
  fetch('http://localhost:8000/health')
    .then(response => {
      console.log('✅ FastAPI service is available');
      console.log('  Status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('  Health check response:', data);
    })
    .catch(error => {
      console.log('❌ FastAPI service is not available');
      console.log('  Error:', error.message);
      console.log('  Make sure FastAPI is running on port 8000');
    });
}

// Function to test specific query types
function testQueryTypes() {
  console.log('🔍 Testing Query Types');
  console.log('======================');
  
  const queryTests = [
    {
      type: 'Risk Analysis',
      query: 'Calculate my portfolio risk',
      shouldTriggerFastAPI: true
    },
    {
      type: 'General Chat',
      query: 'Hello, how are you?',
      shouldTriggerFastAPI: false
    },
    {
      type: 'Portfolio Performance',
      query: 'Analyze my portfolio performance',
      shouldTriggerFastAPI: true
    },
    {
      type: 'Sharpe Ratio',
      query: 'What is my Sharpe ratio?',
      shouldTriggerFastAPI: true
    },
    {
      type: 'Asset Addition',
      query: 'Add 100 shares of AAPL',
      shouldTriggerFastAPI: false
    }
  ];
  
  console.log('Query Type Analysis:');
  queryTests.forEach(test => {
    console.log(`  ${test.type}: "${test.query}"`);
    console.log(`    Should trigger FastAPI: ${test.shouldTriggerFastAPI ? 'Yes' : 'No'}`);
  });
  
  console.log('');
  console.log('💡 Use these queries to test the backend routing:');
  console.log('   - Financial queries should go to FastAPI');
  console.log('   - General chat should go to OpenAI');
  console.log('   - Portfolio CRUD should use regexp processing');
  
  return queryTests;
}

// Make functions available globally
window.testBackendRouting = testBackendRouting;
window.checkEnvironmentConfig = checkEnvironmentConfig;
window.testQueryTypes = testQueryTypes;

// Auto-run instructions
console.log('🧪 Backend Routing Test Script Loaded');
console.log('=====================================');
console.log('Available functions:');
console.log('• testBackendRouting() - Test if FastAPI backend is being called');
console.log('• checkEnvironmentConfig() - Check environment configuration');
console.log('• testQueryTypes() - Show which queries should trigger FastAPI');
console.log('');
console.log('🚀 Quick start: Run testBackendRouting() then send a financial query');
console.log('');
console.log('Expected fix: Queries with financial keywords should now route to FastAPI');
console.log('instead of going directly to OpenAI, respecting your PRIMARY_ANALYSIS_BACKEND=fastapi setting');