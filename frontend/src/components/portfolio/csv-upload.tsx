// ============================================================================
// FILE: components/portfolio/csv-upload.tsx
// CSV upload component for portfolio management
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { CsvHelpModal } from './csv-help-modal';
import { parsePurchaseDate } from '@/lib/tax-utils';
import { QuantityValidationUtils } from '@/lib/validation';

interface ParsedAsset {
  symbol: string;
  quantity: number;
  avgCost?: number;
  assetType?: string;
  optionType?: string;
  strikePrice?: number;
  expirationDate?: string;
  purchaseDate?: string;
}

interface CsvUploadProps {
  onUploadComplete: () => void;
  isGuestMode?: boolean;
  portfolioId?: string; // For multi-portfolio support
}

export const CsvUpload: React.FC<CsvUploadProps> = ({ 
  onUploadComplete, 
  isGuestMode = false,
  portfolioId
}) => {
  const [, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setProcessing(true);
    setErrors([]);
    
    try {
      const content = await readFileContent(file);
      const { assets, errors: parseErrors } = parseCsvContent(content);
      
      setParsedAssets(assets);
      setErrors(parseErrors);
      setShowPreview(true);
    } catch (error) {
      setErrors(['Failed to read file: ' + (error as Error).message]);
    } finally {
      setProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseCsvContent = (content: string): { assets: ParsedAsset[]; errors: string[] } => {
    const lines = content.trim().split('\n');
    const assets: ParsedAsset[] = [];
    const errors: string[] = [];
    
    // Skip header row if it looks like headers (contains non-numeric values in quantity column)
    const startIndex = lines.length > 1 && isNaN(parseFloat(lines[0].split(',')[1]?.trim())) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      if (values.length === 0 || values.every(v => !v)) continue;

      const asset: ParsedAsset = {
        symbol: '',
        quantity: 0,
        assetType: 'stock'
      };

      // Position-based parsing:
      // 0: Symbol (required)
      // 1: Quantity (required) 
      // 2: Price (optional)
      // 3: AssetType (optional, defaults to 'stock')
      // 4: PurchaseDate (optional, for tax calculations)
      // 5: OptionType (for options/bonds only)
      // 6: StrikePrice (for options/bonds only)
      // 7: ExpirationDate (for options/bonds only)

      // Column 0: Symbol
      if (values[0]) {
        asset.symbol = values[0].toUpperCase();
      }

      // Column 1: Quantity
      if (values[1]) {
        const quantityValidation = QuantityValidationUtils.parseQuantity(values[1]);
        if (quantityValidation.isValid) {
          asset.quantity = quantityValidation.value;
        } else {
          asset.quantity = 0;
          console.warn(`Invalid quantity in CSV row ${index + 1}: ${quantityValidation.error}`);
        }
      }

      // Column 2: Price
      if (values[2]) {
        asset.avgCost = parseFloat(values[2]) || undefined;
      }

      // Column 3: AssetType
      if (values[3]) {
        const cleanValue = values[3].trim().toLowerCase();
        // Normalize asset types to handle both singular and plural forms
        let normalizedType = cleanValue;
        if (cleanValue === 'stocks' || cleanValue === 'stock') {
          normalizedType = 'stock';
        } else if (cleanValue === 'bonds' || cleanValue === 'bond') {
          normalizedType = 'bond';
        } else if (cleanValue === 'options' || cleanValue === 'option') {
          normalizedType = 'option';
        } else if (cleanValue === 'etfs' || cleanValue === 'etf') {
          normalizedType = 'etf';
        } else if (cleanValue === 'cryptos' || cleanValue === 'crypto') {
          normalizedType = 'crypto';
        }
        asset.assetType = normalizedType || 'stock';
      }

      // Column 4: PurchaseDate (optional, for tax calculations)
      if (values[4] && values[4].trim()) {
        const purchaseDate = parsePurchaseDate(values[4].trim());
        if (purchaseDate) {
          asset.purchaseDate = purchaseDate.toISOString().split('T')[0];
        }
      }

      // Column 5: OptionType (for options) / BondType (for bonds)
      if (values[5] && (asset.assetType === 'option' || asset.assetType === 'bond')) {
        asset.optionType = values[5].trim().toLowerCase();
      }

      // Column 6: StrikePrice (for options) / CouponRate (for bonds)
      if (values[6] && (asset.assetType === 'option' || asset.assetType === 'bond')) {
        asset.strikePrice = parseFloat(values[6]) || undefined;
      }

      // Column 7: ExpirationDate (for options) / MaturityDate (for bonds)
      if (values[7] && (asset.assetType === 'option' || asset.assetType === 'bond')) {
        const value = values[7];
        // Parse different date formats: MM/DD/YYYY or YYYY-MM-DD
        if (value.trim()) {
          let parsedDate: string | undefined;
          
          // Check if it's MM/DD/YYYY format
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim())) {
            const [month, day, year] = value.trim().split('/');
            parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } 
          // Check if it's already YYYY-MM-DD format
          else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value.trim())) {
            parsedDate = value.trim();
          }
          // Try to parse other formats
          else {
            const date = new Date(value.trim());
            if (!isNaN(date.getTime())) {
              parsedDate = date.toISOString().split('T')[0];
            }
          }
          
          asset.expirationDate = parsedDate;
        }
      }

      if (!asset.symbol) {
        errors.push(`Row ${i + 1}: Missing symbol`);
        continue;
      }

      if (asset.quantity <= 0) {
        errors.push(`Row ${i + 1}: Invalid quantity for ${asset.symbol}`);
        continue;
      }

      assets.push(asset);
    }

    return { assets, errors };
  };

  const handleUpload = async () => {
    if (!parsedAssets.length) return;

    setProcessing(true);
    
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ 
          assets: parsedAssets,
          portfolioId: portfolioId // Include portfolio ID if specified
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `Failed to upload portfolio (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        onUploadComplete();
        setSelectedFile(null);
        setParsedAssets([]);
        setShowPreview(false);
      } else {
        setErrors(result.errors || ['Upload failed']);
      }
    } catch (error) {
      setErrors(['Upload failed: ' + (error as Error).message]);
    } finally {
      setProcessing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setParsedAssets([]);
    setErrors([]);
    setShowPreview(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Upload Portfolio CSV</CardTitle>
            <CardDescription>
              Upload a CSV file containing your portfolio holdings to bulk import assets.
              {isGuestMode && " In demo mode, data is processed but not permanently saved."}
            </CardDescription>
          </div>
          <CsvHelpModal />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {!showPreview ? (
          <>
            <FileUpload
              onFileSelect={handleFileSelect}
              acceptedTypes={['.csv']}
              maxSize={5}
              disabled={processing}
            />
            
            {processing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing CSV...</span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-green-800 mb-2">
                Found {parsedAssets.length} assets to import
              </h4>
              
              <div className="max-h-40 overflow-y-auto space-y-1">
                {parsedAssets.map((asset, index) => (
                  <div key={index} className="text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>{asset.symbol}: {asset.quantity} shares ({asset.assetType})</span>
                      <span>
                        {asset.avgCost && `$${asset.avgCost.toFixed(2)}`}
                      </span>
                    </div>
                    {asset.purchaseDate && (
                      <div className="text-xs text-green-600 ml-2">
                        Purchase Date: {asset.purchaseDate}
                      </div>
                    )}
                    {asset.assetType === 'option' && (
                      <div className="text-xs text-green-600 ml-2">
                        Options: {asset.optionType || 'N/A'} | Strike: ${asset.strikePrice || 'N/A'} | Exp: {asset.expirationDate || 'N/A'}
                      </div>
                    )}
                    {asset.assetType === 'bond' && (
                      <div className="text-xs text-green-600 ml-2">
                        Bond: {asset.optionType || 'N/A'} | Coupon: {asset.strikePrice ? `${asset.strikePrice}%` : 'N/A'} | Maturity: {asset.expirationDate || 'N/A'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h4 className="font-medium text-red-800 mb-2">Errors found:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex space-x-3">
              <Button 
                onClick={handleUpload} 
                disabled={processing || parsedAssets.length === 0}
                className="flex-1"
              >
                {processing ? 'Uploading...' : `Import ${parsedAssets.length} Assets`}
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p><strong>CSV Format (Position-Based):</strong></p>
          <p className="mt-1">Column 1: Symbol (required) | Column 2: Quantity (required) | Column 3: Price (optional) | Column 4: AssetType (optional) | Column 5: PurchaseDate (optional)</p>
          <p className="mt-1"><strong>Basic Example:</strong></p>
          <p>AAPL,100,150.50,stock,2023-01-15</p>
          <p>SPY,50,493.52,etf,12/01/2022</p>
          <p className="mt-1"><strong>Options Example (8 columns):</strong></p>
          <p>SPY250910,5,12.50,option,2024-08-01,put,560.00,09/10/2025</p>
          <p className="text-xs mt-1">Columns 6-8 for options: OptionType, StrikePrice, ExpirationDate</p>
          <p className="mt-1"><strong>Bond Example (8 columns):</strong></p>
          <p>GOVT10Y,1000,98.50,bond,2023-05-10,usd,4.5,05/15/2034</p>
          <p>GTDEM10Y,500,102.25,bond,2023-03-20,dem,3.8,03/01/2029</p>
          <p className="text-xs mt-1">Columns 6-8 for bonds: BondType (usd,dem,gbp,jpy,etc.), CouponRate, MaturityDate</p>
          <p className="mt-2"><strong>Supported Asset Types:</strong> stock, etf, bond, crypto, mutual_fund, option, other</p>
          <p className="mt-1"><strong>Date Formats:</strong> YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY</p>
          <p className="mt-1"><strong>Purchase Date:</strong> Optional field for tracking acquisition date (useful for tax planning)</p>
        </div>
      </CardContent>
    </Card>
  );
};