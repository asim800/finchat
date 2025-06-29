// ============================================================================
// FILE: components/portfolio/csv-export.tsx
// CSV export component for portfolio data
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { downloadCsvFile } from '@/lib/csv-export';

interface CsvExportProps {
  isGuestMode?: boolean;
  guestAssets?: Array<{
    symbol: string;
    quantity: number;
    avgPrice?: number | null;
    percentage?: number | null;
    assetType: string;
  }>;
}

export const CsvExport: React.FC<CsvExportProps> = ({ 
  isGuestMode = false,
  guestAssets = []
}) => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      if (isGuestMode) {
        // Handle guest mode export (client-side only)
        await handleGuestExport();
      } else {
        // Handle authenticated user export (via API)
        await handleAuthenticatedExport();
      }
    } catch (err) {
      setError('Failed to export portfolio: ' + (err as Error).message);
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleGuestExport = async () => {
    if (!guestAssets || guestAssets.length === 0) {
      throw new Error('No assets to export');
    }

    // Import the export utility dynamically to avoid SSR issues
    const { exportPortfolioToCsv, generatePortfolioFilename } = await import('@/lib/csv-export');
    
    const exportableAssets = guestAssets.map(asset => ({
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgPrice: asset.avgPrice,
      percentage: asset.percentage,
      assetType: asset.assetType,
      totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0
    }));

    const csvContent = exportPortfolioToCsv(exportableAssets);
    const filename = generatePortfolioFilename('demo_portfolio');
    
    downloadCsvFile(csvContent, filename);
  };

  const handleAuthenticatedExport = async () => {
    // Try to download directly first
    try {
      const response = await fetch('/api/portfolio/export?format=download');
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `portfolio_${new Date().toISOString().split('T')[0]}.csv`;

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (directDownloadError) {
      // Fallback to JSON response method
      console.warn('Direct download failed, trying JSON method:', directDownloadError);
      
      const response = await fetch('/api/portfolio/export?format=json');
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      downloadCsvFile(result.csvContent, result.filename);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Button 
        onClick={handleExport} 
        disabled={exporting || (isGuestMode && guestAssets.length === 0)}
        variant="outline"
        className="flex items-center space-x-2"
      >
        {exporting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>📄 Export CSV</span>
          </>
        )}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {isGuestMode && guestAssets.length === 0 && (
        <div className="text-xs text-gray-500">
          Add some assets to your portfolio to enable export.
        </div>
      )}
    </div>
  );
};