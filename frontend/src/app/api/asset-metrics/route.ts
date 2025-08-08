// ============================================================================
// FILE: app/api/asset-metrics/route.ts
// API endpoints for asset metrics management
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AssetMetricsService } from '@/lib/asset-metrics-service';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/asset-metrics - Get all metrics with pagination (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication for admin operations
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sector = searchParams.get('sector') || undefined;

    const result = await AssetMetricsService.getAllMetrics(page, limit, sector);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/asset-metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/asset-metrics - Create or update metrics
export async function POST(request: NextRequest) {
  try {
    // Verify authentication for admin operations
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (for now, any authenticated user can update metrics)
    // In production, you might want to restrict this to admin users only
    
    const body = await request.json();
    
    // Handle single metrics update
    if (body.symbol && typeof body.symbol === 'string') {
      const result = await AssetMetricsService.upsertMetrics(body.symbol, {
        beta: body.beta,
        volatility: body.volatility,
        peRatio: body.peRatio,
        dividendYield: body.dividendYield,
        eps: body.eps,
        marketCap: body.marketCap,
        sector: body.sector,
        industry: body.industry
      });

      if (!result) {
        return NextResponse.json({ error: 'Failed to update metrics' }, { status: 500 });
      }

      return NextResponse.json({ success: true, metrics: result });
    }

    // Handle bulk metrics update
    if (Array.isArray(body.metrics)) {
      const result = await AssetMetricsService.bulkUpsertMetrics(body.metrics);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/asset-metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}