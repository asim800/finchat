// Test the actual API endpoint that the frontend calls
async function testAPICall() {
  try {
    console.log('🧪 Testing the PUT /api/portfolio endpoint...\n');
    
    // Simulate the exact call the frontend makes
    const testPayload = {
      portfolioId: 'cmclabvls0002av2rj4rn6gpo', // From our test above
      symbol: 'GOOGL', // Original symbol to identify the asset
      newSymbol: 'GOOGL_TEST', // New symbol if changed
      quantity: 30,
      avgCost: 130,
      assetType: 'stock'
    };
    
    console.log('📤 Sending PUT request with payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('http://localhost:3003/api/portfolio', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Note: We'd need proper auth headers in a real test
        // For now, this will test the endpoint structure
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    console.log('📥 Response Data:');
    console.log(JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ API call succeeded!');
      
      // Check if the response contains the updated portfolio
      if (responseData.portfolio && responseData.portfolio.assets) {
        console.log(`\n🔍 Updated assets in response:`);
        responseData.portfolio.assets.forEach((asset, index) => {
          console.log(`   ${index + 1}. ${asset.symbol} - Qty: ${asset.quantity}`);
        });
      }
    } else {
      console.log('❌ API call failed!');
      console.log('Error:', responseData.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testAPICall();