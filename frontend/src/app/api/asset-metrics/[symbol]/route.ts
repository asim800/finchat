// ============================================================================
// FILE: app/api/asset-metrics/[symbol]/route.ts
// API endpoints for specific symbol asset metrics
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AssetMetricsService } from '@/lib/asset-metrics-service';
import { getUserFromRequest } from '@/lib/auth';

interface Params {
  symbol: string;
}

// GET /api/asset-metrics/[symbol] - Get metrics for specific symbol (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { symbol } = params;
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const metrics = await AssetMetricsService.getMetricsBySymbol(symbol);
    
    if (!metrics) {
      return NextResponse.json({ error: 'Metrics not found' }, { status: 404 });
    }

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error(`Error in GET /api/asset-metrics/${params.symbol}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/asset-metrics/[symbol] - Delete metrics for specific symbol
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Verify authentication for admin operations
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = params;
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const success = await AssetMetricsService.deleteMetrics(symbol);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete metrics' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Metrics for ${symbol} deleted successfully` });
  } catch (error) {
    console.error(`Error in DELETE /api/asset-metrics/${params.symbol}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}