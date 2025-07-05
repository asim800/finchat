// ============================================================================
// FILE: app/api/portfolio/route.ts
// Portfolio API routes for authenticated users
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PortfolioService } from '@/lib/portfolio-service';

// GET /api/portfolio - Get user's portfolios (all or specific)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    if (portfolioId) {
      // Get specific portfolio with market values
      const portfolio = await PortfolioService.getPortfolioWithMarketValues(user.id, portfolioId);
      
      if (!portfolio) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      
      // Transform assets to include totalValue (for backward compatibility)
      const portfolioWithTotals = {
        ...portfolio,
        assets: portfolio.assets.map(asset => ({
          ...asset,
          totalValue: asset.currentValue || (asset.avgCost ? asset.quantity * asset.avgCost : 0)
        }))
      };

      return NextResponse.json({ portfolio: portfolioWithTotals });
    } else {
      // Get all portfolios with market values
      const portfolios = await PortfolioService.getAllPortfoliosWithMarketValues(user.id);
      
      // Transform portfolios to include totalValue for assets
      const portfoliosWithTotals = portfolios.map(portfolio => ({
        ...portfolio,
        assets: portfolio.assets.map(asset => ({
          ...asset,
          totalValue: asset.currentValue || (asset.avgCost ? asset.quantity * asset.avgCost : 0)
        }))
      }));

      return NextResponse.json({ portfolios: portfoliosWithTotals });
    }
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load portfolio(s)' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio - Add assets to portfolio or create new portfolio
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assets, portfolioId, name, description, action, userId } = body;
    
    // Handle portfolio fetch for FastAPI client
    if (action === 'fetch' || userId) {
      console.log('🔍 Portfolio fetch request from FastAPI client:', { userId: userId || user.id, portfolioId });
      
      const targetUserId = userId || user.id;
      
      if (portfolioId) {
        // Get specific portfolio with market values
        const portfolio = await PortfolioService.getPortfolioWithMarketValues(targetUserId, portfolioId);
        
        if (!portfolio) {
          console.warn('❌ Portfolio not found:', { userId: targetUserId, portfolioId });
          return NextResponse.json({ error: 'Portfolio not found', assets: [] }, { status: 404 });
        }
        
        console.log('✅ Portfolio found with assets:', portfolio.assets?.length || 0);
        return NextResponse.json({ 
          portfolio,
          assets: portfolio.assets || []
        });
      } else {
        // Get default portfolio or first available portfolio
        const portfolios = await PortfolioService.getUserPortfolios(targetUserId);
        
        if (!portfolios || portfolios.length === 0) {
          console.warn('❌ No portfolios found for user:', targetUserId);
          return NextResponse.json({ error: 'No portfolios found', assets: [] });
        }
        
        // Use the first portfolio as default
        const defaultPortfolio = portfolios[0];
        const portfolioWithAssets = await PortfolioService.getPortfolioWithMarketValues(targetUserId, defaultPortfolio.id);
        
        console.log('✅ Default portfolio found with assets:', portfolioWithAssets?.assets?.length || 0);
        return NextResponse.json({ 
          portfolio: portfolioWithAssets,
          assets: portfolioWithAssets?.assets || []
        });
      }
    }

    // Handle different actions
    if (action === 'create') {
      // Create a new portfolio
      if (!name) {
        return NextResponse.json(
          { error: 'Portfolio name is required' },
          { status: 400 }
        );
      }

      const portfolio = await PortfolioService.createPortfolio(user.id, name, description);
      return NextResponse.json({ success: true, portfolio });
    }
    
    if (action === 'update') {
      // Update portfolio name/description
      if (!portfolioId) {
        return NextResponse.json(
          { error: 'Portfolio ID is required' },
          { status: 400 }
        );
      }

      const portfolio = await PortfolioService.updatePortfolio(portfolioId, user.id, name, description);
      if (!portfolio) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, portfolio });
    }

    // Default action: add assets to portfolio
    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json(
        { error: 'Invalid assets data' },
        { status: 400 }
      );
    }

    let targetPortfolioId = portfolioId;
    if (!targetPortfolioId) {
      // Use default portfolio if none specified
      const defaultPortfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
      targetPortfolioId = defaultPortfolio.id;
    }

    const result = await PortfolioService.addAssetsToPortfolio(user.id, targetPortfolioId, assets);
    
    // Transform portfolio assets to include totalValue
    const portfolioWithTotals = {
      ...result.portfolio,
      assets: result.portfolio.assets.map(asset => ({
        ...asset,
        totalValue: asset.avgCost ? asset.quantity * asset.avgCost : 0
      }))
    };

    return NextResponse.json({
      success: result.success,
      portfolio: portfolioWithTotals,
      addedAssets: result.addedAssets,
      errors: result.errors
    });
  } catch (error) {
    console.error('Portfolio POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process portfolio request' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolio - Update asset quantity or portfolio details
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, quantity, avgCost, portfolioId, name, description, action } = body;

    if (action === 'update-portfolio') {
      // Update portfolio details
      if (!portfolioId) {
        return NextResponse.json(
          { error: 'Portfolio ID is required' },
          { status: 400 }
        );
      }

      const portfolio = await PortfolioService.updatePortfolio(portfolioId, user.id, name, description);
      if (!portfolio) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, portfolio });
    }

    // Default action: update asset
    if (!symbol || !portfolioId || quantity == null || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid symbol, portfolio ID, or quantity' },
        { status: 400 }
      );
    }

    const success = await PortfolioService.updateAsset(user.id, portfolioId, symbol, quantity, avgCost);
    
    if (success) {
      // Return updated portfolio
      const portfolio = await PortfolioService.getPortfolioWithMarketValues(user.id, portfolioId);
      if (!portfolio) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      
      const portfolioWithTotals = {
        ...portfolio,
        assets: portfolio.assets.map(asset => ({
          ...asset,
          totalValue: asset.avgCost ? asset.quantity * asset.avgCost : 0
        }))
      };
      
      return NextResponse.json({ success: true, portfolio: portfolioWithTotals });
    } else {
      return NextResponse.json(
        { error: 'Failed to update asset' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Portfolio PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update asset or portfolio' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio - Remove asset or delete portfolio
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const portfolioId = searchParams.get('portfolioId');
    const action = searchParams.get('action');
    
    if (action === 'delete-portfolio') {
      // Delete entire portfolio
      if (!portfolioId) {
        return NextResponse.json(
          { error: 'Portfolio ID is required' },
          { status: 400 }
        );
      }

      const success = await PortfolioService.deletePortfolio(portfolioId, user.id);
      
      if (success) {
        return NextResponse.json({ success: true, message: 'Portfolio deleted successfully' });
      } else {
        return NextResponse.json(
          { error: 'Failed to delete portfolio' },
          { status: 400 }
        );
      }
    }

    // Default action: remove asset
    if (!symbol || !portfolioId) {
      return NextResponse.json(
        { error: 'Symbol and portfolio ID are required' },
        { status: 400 }
      );
    }

    const success = await PortfolioService.removeAsset(user.id, portfolioId, symbol);
    
    if (success) {
      // Return updated portfolio
      const portfolio = await PortfolioService.getPortfolioWithMarketValues(user.id, portfolioId);
      if (!portfolio) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }
      
      const portfolioWithTotals = {
        ...portfolio,
        assets: portfolio.assets.map(asset => ({
          ...asset,
          totalValue: asset.avgCost ? asset.quantity * asset.avgCost : 0
        }))
      };
      
      return NextResponse.json({ success: true, portfolio: portfolioWithTotals });
    } else {
      return NextResponse.json(
        { error: 'Failed to remove asset' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Portfolio DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset or portfolio' },
      { status: 500 }
    );
  }
}