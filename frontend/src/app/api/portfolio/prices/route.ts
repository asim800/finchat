// ============================================================================
// FILE: app/api/portfolio/prices/route.ts
// API endpoint for managing historical prices
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { HistoricalPriceService } from '@/lib/historical-price-service';
import { PortfolioService } from '@/lib/portfolio-service';

// GET /api/portfolio/prices - Get historical prices for portfolio symbols
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const days = parseInt(searchParams.get('days') || '30');

    if (symbol) {
      // Get price history for specific symbol
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const prices = await HistoricalPriceService.getPriceHistory(symbol, startDate, endDate);
      return NextResponse.json({ symbol, prices });
    } else {
      // Get latest prices for all portfolio symbols
      const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
      const symbols = portfolio.assets.map(asset => asset.symbol);
      const priceMap = await HistoricalPriceService.getLatestPricesForSymbols(symbols);
      
      return NextResponse.json({ prices: priceMap });
    }
  } catch (error) {
    console.error('Portfolio prices GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/prices - Add historical prices (for testing/manual entry)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prices, symbol, price, date } = body;

    if (prices && Array.isArray(prices)) {
      // Bulk add prices
      const result = await HistoricalPriceService.addPricesBulk(prices);
      return NextResponse.json({
        message: `Added ${result.success} prices, ${result.errors} errors`,
        success: result.success,
        errors: result.errors
      });
    } else if (symbol && price && date) {
      // Add single price
      const priceData = {
        symbol,
        price: parseFloat(price),
        date: new Date(date),
        source: 'manual'
      };

      const result = await HistoricalPriceService.addPrice(priceData);
      if (result) {
        return NextResponse.json({ 
          message: 'Price added successfully', 
          price: result 
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to add price (may already exist)' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Portfolio prices POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add prices' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolio/prices - Refresh asset prices from historical data
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await PortfolioService.refreshAssetPrices(user.id);
    
    return NextResponse.json({
      message: `Updated ${result.updated} assets, ${result.notFound} assets have no price data`,
      updated: result.updated,
      notFound: result.notFound
    });
  } catch (error) {
    console.error('Portfolio prices PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh prices' },
      { status: 500 }
    );
  }
}