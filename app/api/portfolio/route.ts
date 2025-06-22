// ============================================================================
// FILE: app/api/portfolio/route.ts
// Portfolio API routes for authenticated users
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PortfolioService } from '@/lib/portfolio-service';
import { ParsedAsset } from '@/lib/portfolio-parser';

// GET /api/portfolio - Get user's portfolio
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
    
    // Transform assets to include totalValue
    const portfolioWithTotals = {
      ...portfolio,
      assets: portfolio.assets.map(asset => ({
        ...asset,
        totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0
      }))
    };

    return NextResponse.json({ portfolio: portfolioWithTotals });
  } catch (error) {
    console.error('Portfolio GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load portfolio' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio - Add assets to portfolio
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assets }: { assets: ParsedAsset[] } = await request.json();
    
    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json(
        { error: 'Invalid assets data' },
        { status: 400 }
      );
    }

    const result = await PortfolioService.addAssetsToPortfolio(user.id, assets);
    
    // Transform portfolio assets to include totalValue
    const portfolioWithTotals = {
      ...result.portfolio,
      assets: result.portfolio.assets.map(asset => ({
        ...asset,
        totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0
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
      { error: 'Failed to add assets to portfolio' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolio - Update asset quantity
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol, quantity }: { symbol: string; quantity: number } = await request.json();
    
    if (!symbol || quantity == null || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid symbol or quantity' },
        { status: 400 }
      );
    }

    const success = await PortfolioService.updateAssetQuantity(user.id, symbol, quantity);
    
    if (success) {
      // Return updated portfolio
      const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
      const portfolioWithTotals = {
        ...portfolio,
        assets: portfolio.assets.map(asset => ({
          ...asset,
          totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0
        }))
      };
      
      return NextResponse.json({ success: true, portfolio: portfolioWithTotals });
    } else {
      return NextResponse.json(
        { error: 'Failed to update asset quantity' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Portfolio PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio - Remove asset
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const success = await PortfolioService.removeAsset(user.id, symbol);
    
    if (success) {
      // Return updated portfolio
      const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
      const portfolioWithTotals = {
        ...portfolio,
        assets: portfolio.assets.map(asset => ({
          ...asset,
          totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0
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
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}