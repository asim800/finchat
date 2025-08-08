// ============================================================================
// FILE: app/api/asset-metrics/bulk/route.ts
// API endpoints for bulk asset metrics operations
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AssetMetricsService } from '@/lib/asset-metrics-service';
import { getUserFromRequest } from '@/lib/auth';

// POST /api/asset-metrics/bulk - Get metrics for multiple symbols (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!Array.isArray(body.symbols)) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400 });
    }

    const metricsMap = await AssetMetricsService.getMetricsForSymbols(body.symbols);
    
    return NextResponse.json({ metrics: metricsMap });
  } catch (error) {
    console.error('Error in POST /api/asset-metrics/bulk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/asset-metrics/bulk - Bulk update metrics
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication for admin operations
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    if (!Array.isArray(body.metrics)) {
      return NextResponse.json({ error: 'Metrics array is required' }, { status: 400 });
    }

    const result = await AssetMetricsService.bulkUpsertMetrics(body.metrics);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in PUT /api/asset-metrics/bulk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}