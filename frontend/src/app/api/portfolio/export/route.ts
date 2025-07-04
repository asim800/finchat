// ============================================================================
// FILE: app/api/portfolio/export/route.ts
// Portfolio CSV export API endpoint
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PortfolioService } from '@/lib/portfolio-service';
import { exportPortfolioToCsv, CsvExportOptions, ExportableAsset } from '@/lib/csv-export';

// GET /api/portfolio/export - Export user's portfolio as CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for export options
    const { searchParams } = new URL(request.url);
    const includePrice = searchParams.get('includePrice') !== 'false';
    const includeTotalValue = searchParams.get('includeTotalValue') !== 'false';
    const includeAssetType = searchParams.get('includeAssetType') !== 'false';
    const includeOptionsFields = searchParams.get('includeOptionsFields') !== 'false';
    const format = searchParams.get('format') || 'download'; // 'download' or 'json'

    const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
    
    // Transform assets to exportable format
    const exportableAssets: ExportableAsset[] = portfolio.assets.map(asset => ({
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgPrice: asset.avgPrice,
      assetType: asset.assetType,
      totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0,
      optionType: asset.optionType,
      expirationDate: asset.expirationDate,
      strikePrice: asset.strikePrice
    }));

    const exportOptions: CsvExportOptions = {
      includeHeaders: true,
      includePrice,
      includeTotalValue,
      includeAssetType,
      includeOptionsFields,
      delimiter: ','
    };

    const csvContent = exportPortfolioToCsv(exportableAssets, exportOptions);

    if (format === 'json') {
      // Return JSON response with CSV content
      return NextResponse.json({
        success: true,
        csvContent,
        filename: `portfolio_${new Date().toISOString().split('T')[0]}.csv`,
        assetCount: exportableAssets.length
      });
    } else {
      // Return CSV file for direct download
      const filename = `portfolio_${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error('Portfolio export error:', error);
    return NextResponse.json(
      { error: 'Failed to export portfolio' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/export - Export with custom options
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { exportOptions }: { exportOptions?: CsvExportOptions } = await request.json();

    const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
    
    // Transform assets to exportable format
    const exportableAssets: ExportableAsset[] = portfolio.assets.map(asset => ({
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgPrice: asset.avgPrice,
      assetType: asset.assetType,
      totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0,
      optionType: asset.optionType,
      expirationDate: asset.expirationDate,
      strikePrice: asset.strikePrice
    }));

    const csvContent = exportPortfolioToCsv(exportableAssets, exportOptions);
    const filename = `portfolio_${new Date().toISOString().split('T')[0]}.csv`;

    return NextResponse.json({
      success: true,
      csvContent,
      filename,
      assetCount: exportableAssets.length
    });
  } catch (error) {
    console.error('Portfolio export error:', error);
    return NextResponse.json(
      { error: 'Failed to export portfolio' },
      { status: 500 }
    );
  }
}