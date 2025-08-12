// ============================================================================
// FILE: api/supported-assets/route.ts
// API endpoint to fetch all supported assets from historical_prices table
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get distinct symbols and asset types from historical_prices
    const supportedAssets = await prisma.historicalPrice.findMany({
      select: {
        symbol: true,
        assetType: true,
      },
      distinct: ['symbol'],
      orderBy: {
        symbol: 'asc',
      },
    });

    // Format the response
    const formattedAssets = supportedAssets.map(asset => ({
      symbol: asset.symbol,
      assetType: asset.assetType || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data: formattedAssets,
      count: formattedAssets.length,
    });
  } catch (error) {
    console.error('Error fetching supported assets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supported assets' },
      { status: 500 }
    );
  }
}