#!/usr/bin/env node
/**
 * Test script for FastAPI proxy integration
 * Run this after deploying both FastAPI and Next.js with proxy routes
 */

const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
const fastApiPath = '/api/fastapi/agentic';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    console.log(`\n🧪 Testing ${method} ${endpoint}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.text();
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
    
    return response.ok;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 FastAPI Proxy Integration Tests');
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`🔗 FastAPI Path: ${fastApiPath}`);
  console.log('=' * 50);
  
  const tests = [
    // Test basic endpoints
    { name: 'Root Chat Interface', endpoint: `${fastApiPath}/` },
    { name: 'API Documentation', endpoint: `${fastApiPath}/docs` },
    { name: 'Available Prompts', endpoint: `${fastApiPath}/api/prompts` },
    
    // Test chat functionality
    {
      name: 'Chat Message',
      endpoint: `${fastApiPath}/api/chat`,
      method: 'POST',
      body: {
        message: 'Hello! Test message.',
        user_id: 'test_user',
        prompt_name: 'finchat_prompt'
      }
    },
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    const success = await testEndpoint(
      test.endpoint,
      test.method || 'GET',
      test.body || null
    );
    
    if (success) {
      console.log(`   ✅ ${test.name} - PASSED`);
      passedTests++;
    } else {
      console.log(`   ❌ ${test.name} - FAILED`);
    }
  }
  
  console.log('\n' + '=' * 50);
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! FastAPI proxy integration is working correctly.');
    console.log(`\n🌐 Access your FastAPI chat at: ${baseUrl}${fastApiPath}/`);
  } else {
    console.log('⚠️  Some tests failed. Check the deployment and configuration.');
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure FastAPI is deployed to Vercel and accessible');
    console.log('2. Check FASTAPI_CHAT_URL in your .env.local');
    console.log('3. Verify CORS settings in FastAPI allow your domain');
    console.log('4. Check Vercel deployment logs for errors');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };