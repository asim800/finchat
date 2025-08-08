// ============================================================================
// FILE: app/api/asset-metrics/sectors/route.ts
// API endpoints for getting sectors and industries
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AssetMetricsService } from '@/lib/asset-metrics-service';

// GET /api/asset-metrics/sectors - Get all sectors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const getIndustries = searchParams.get('industries') === 'true';
    const sector = searchParams.get('sector');

    if (getIndustries) {
      const industries = await AssetMetricsService.getIndustries(sector || undefined);
      return NextResponse.json({ industries });
    } else {
      const sectors = await AssetMetricsService.getSectors();
      return NextResponse.json({ sectors });
    }
  } catch (error) {
    console.error('Error in GET /api/asset-metrics/sectors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}