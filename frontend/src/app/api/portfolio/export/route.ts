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
    const includeAvgCost = searchParams.get('includeAvgCost') !== 'false';
    const includeCurrentPrice = searchParams.get('includeCurrentPrice') !== 'false';
    const includeTotalValue = searchParams.get('includeTotalValue') !== 'false';
    const includeAssetType = searchParams.get('includeAssetType') !== 'false';
    const includeOptionsFields = searchParams.get('includeOptionsFields') !== 'false';
    const format = searchParams.get('format') || 'download'; // 'download' or 'json'

    // Get portfolio with current market values
    const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
    const portfolioWithMarketValues = await PortfolioService.getPortfolioWithMarketValues(user.id, portfolio.id);
    
    // Transform assets to exportable format
    const exportableAssets: ExportableAsset[] = (portfolioWithMarketValues?.assets || portfolio.assets).map(asset => ({
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgCost: asset.avgCost,
      currentPrice: asset.price,
      assetType: asset.assetType,
      totalValue: asset.avgCost ? asset.quantity * asset.avgCost : 0,
      optionType: asset.optionType,
      expirationDate: asset.expirationDate,
      strikePrice: asset.strikePrice
    }));

    const exportOptions: CsvExportOptions = {
      includeHeaders: true,
      includeAvgCost,
      includeCurrentPrice,
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

    // Get portfolio with current market values
    const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(user.id);
    const portfolioWithMarketValues = await PortfolioService.getPortfolioWithMarketValues(user.id, portfolio.id);
    
    // Transform assets to exportable format
    const exportableAssets: ExportableAsset[] = (portfolioWithMarketValues?.assets || portfolio.assets).map(asset => ({
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgCost: asset.avgCost,
      currentPrice: asset.price,
      assetType: asset.assetType,
      totalValue: asset.avgCost ? asset.quantity * asset.avgCost : 0,
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