// ============================================================================
// FILE: app/api/asset-metrics/search/route.ts
// API endpoints for searching asset metrics
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AssetMetricsService } from '@/lib/asset-metrics-service';

// GET /api/asset-metrics/search - Search metrics by symbol prefix
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!prefix) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    if (prefix.length < 1) {
      return NextResponse.json({ metrics: [] });
    }

    const metrics = await AssetMetricsService.searchBySymbol(prefix, limit);
    
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error in GET /api/asset-metrics/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}