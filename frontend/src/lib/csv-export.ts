// ============================================================================
// FILE: lib/csv-export.ts
// CSV export utilities for portfolio data
// ============================================================================

export interface ExportableAsset {
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  assetType: string;
  totalValue?: number;
  
  // Options-specific fields
  optionType?: string | null;
  expirationDate?: Date | null;
  strikePrice?: number | null;
}

export interface CsvExportOptions {
  includeHeaders?: boolean;
  includePrice?: boolean;
  includeTotalValue?: boolean;
  includeAssetType?: boolean;
  includeOptionsFields?: boolean;
  delimiter?: string;
}

const DEFAULT_OPTIONS: CsvExportOptions = {
  includeHeaders: true,
  includePrice: true,
  includeTotalValue: true,
  includeAssetType: true,
  includeOptionsFields: true,
  delimiter: ','
};

export function exportPortfolioToCsv(
  assets: ExportableAsset[], 
  options: CsvExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { delimiter } = opts;
  
  if (!assets || assets.length === 0) {
    return opts.includeHeaders ? getHeaders(opts).join(delimiter) : '';
  }

  const rows: string[] = [];
  
  // Add headers if requested
  if (opts.includeHeaders) {
    rows.push(getHeaders(opts).join(delimiter));
  }
  
  // Add data rows
  for (const asset of assets) {
    const row: string[] = [asset.symbol, asset.quantity.toString()];
    
    if (opts.includePrice) {
      row.push(asset.avgPrice?.toString() || '');
    }
    
    if (opts.includeTotalValue) {
      const totalValue = asset.totalValue || (asset.avgPrice ? asset.quantity * asset.avgPrice : 0);
      row.push(totalValue.toString());
    }
    
    if (opts.includeAssetType) {
      row.push(asset.assetType);
    }
    
    if (opts.includeOptionsFields && asset.assetType === 'options') {
      row.push(asset.optionType || '');
      row.push(asset.strikePrice?.toString() || '');
      row.push(asset.expirationDate ? asset.expirationDate.toISOString().split('T')[0] : '');
    } else if (opts.includeOptionsFields) {
      // Add empty fields for non-options assets to maintain consistent column count
      row.push('', '', '');
    }
    
    rows.push(row.join(delimiter));
  }
  
  return rows.join('\n');
}

function getHeaders(options: CsvExportOptions): string[] {
  const headers = ['Symbol', 'Quantity'];
  
  if (options.includePrice) {
    headers.push('Price');
  }
  
  if (options.includeTotalValue) {
    headers.push('Total Value');
  }
  
  if (options.includeAssetType) {
    headers.push('Asset Type');
  }
  
  if (options.includeOptionsFields) {
    headers.push('Option Type', 'Strike Price', 'Expiration Date');
  }
  
  return headers;
}

export function downloadCsvFile(csvContent: string, filename: string = 'portfolio.csv'): void {
  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  // Append to document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
}

export function generatePortfolioFilename(portfolioName?: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const name = portfolioName ? portfolioName.replace(/[^a-zA-Z0-9]/g, '_') : 'portfolio';
  return `${name}_${timestamp}.csv`;
}