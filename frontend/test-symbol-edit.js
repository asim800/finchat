// Test script to verify symbol editing functionality
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSymbolEditing() {
  try {
    console.log('🔍 Testing Symbol Editing Functionality...\n');
    
    // 1. Get a user with portfolio
    console.log('1. Finding a user with a portfolio...');
    const user = await prisma.user.findFirst({
      include: {
        portfolio: {
          include: {
            assets: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    
    if (!user.portfolio || user.portfolio.length === 0) {
      console.log('❌ User has no portfolios');
      return;
    }
    
    const portfolio = user.portfolio[0];
    console.log(`✅ Found portfolio: ${portfolio.name} (ID: ${portfolio.id})`);
    
    if (!portfolio.assets || portfolio.assets.length === 0) {
      console.log('❌ Portfolio has no assets');
      return;
    }
    
    // 2. Show current assets
    console.log(`\n2. Current assets in portfolio:`);
    portfolio.assets.forEach((asset, index) => {
      console.log(`   ${index + 1}. ${asset.symbol} - Qty: ${asset.quantity} - Avg Cost: $${asset.avgCost || 'N/A'}`);
    });
    
    // 3. Test editing the first asset's symbol
    const testAsset = portfolio.assets[0];
    const originalSymbol = testAsset.symbol;
    const newSymbol = `TEST_${originalSymbol}`;
    
    console.log(`\n3. Testing symbol edit:`);
    console.log(`   Original: ${originalSymbol}`);
    console.log(`   New:      ${newSymbol}`);
    
    // Simulate the API call that would be made
    const updateData = {
      quantity: testAsset.quantity,
      avgCost: testAsset.avgCost,
      symbol: newSymbol, // This is the new symbol
      assetType: testAsset.assetType,
      updatedAt: new Date()
    };
    
    console.log(`\n4. Updating asset in database...`);
    
    const updateResult = await prisma.asset.updateMany({
      where: {
        portfolioId: portfolio.id,
        symbol: originalSymbol
      },
      data: updateData
    });
    
    console.log(`   Update result: ${updateResult.count} assets updated`);
    
    if (updateResult.count === 0) {
      console.log('❌ No assets were updated! This indicates the symbol matching failed.');
      
      // Debug: Check if the asset exists with exact symbol
      const existingAsset = await prisma.asset.findFirst({
        where: {
          portfolioId: portfolio.id,
          symbol: originalSymbol
        }
      });
      
      console.log(`   Debug: Asset exists with symbol "${originalSymbol}":`, existingAsset ? 'YES' : 'NO');
      
      // Also check without case sensitivity
      const allAssets = await prisma.asset.findMany({
        where: {
          portfolioId: portfolio.id
        }
      });
      
      console.log(`   Debug: All symbols in portfolio: ${allAssets.map(a => `"${a.symbol}"`).join(', ')}`);
      
    } else {
      console.log('✅ Asset updated successfully!');
      
      // 5. Verify the change
      console.log(`\n5. Verifying the change...`);
      
      const updatedAsset = await prisma.asset.findFirst({
        where: {
          portfolioId: portfolio.id,
          symbol: newSymbol
        }
      });
      
      if (updatedAsset) {
        console.log(`✅ Found updated asset with new symbol: ${updatedAsset.symbol}`);
        
        // Revert the change for cleanliness
        console.log(`\n6. Reverting change back to original symbol...`);
        await prisma.asset.updateMany({
          where: {
            portfolioId: portfolio.id,
            symbol: newSymbol
          },
          data: {
            symbol: originalSymbol,
            updatedAt: new Date()
          }
        });
        console.log(`✅ Reverted back to: ${originalSymbol}`);
        
      } else {
        console.log(`❌ Could not find asset with new symbol: ${newSymbol}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSymbolEditing();