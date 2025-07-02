// ============================================================================
// FILE: components/portfolio/csv-upload.tsx
// CSV upload component for portfolio management
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';

interface ParsedAsset {
  symbol: string;
  quantity: number;
  avgPrice?: number;
  assetType?: string;
}

interface CsvUploadProps {
  onUploadComplete: () => void;
  isGuestMode?: boolean;
}

export const CsvUpload: React.FC<CsvUploadProps> = ({ 
  onUploadComplete, 
  isGuestMode = false 
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
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const assets: ParsedAsset[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length === 0 || values.every(v => !v)) continue;

      const asset: ParsedAsset = {
        symbol: '',
        quantity: 0,
        assetType: 'stock'
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        if (['symbol', 'ticker', 'stock'].includes(header)) {
          asset.symbol = value.toUpperCase();
        } else if (['quantity', 'shares', 'amount'].includes(header)) {
          asset.quantity = parseFloat(value) || 0;
        } else if (['price', 'avgprice', 'cost', 'average_price'].includes(header)) {
          asset.avgPrice = parseFloat(value) || undefined;
        } else if (['type', 'assettype', 'asset_type'].includes(header)) {
          asset.assetType = value.toLowerCase() || 'stock';
        }
      });

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
        body: JSON.stringify({ assets: parsedAssets }),
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
        <h3 className="text-lg font-semibold">Upload Portfolio CSV</h3>
        <p className="text-sm text-gray-600">
          Upload a CSV file containing your portfolio holdings to bulk import assets.
          {isGuestMode && " In demo mode, data is processed but not permanently saved."}
        </p>
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
                  <div key={index} className="text-sm text-green-700 flex justify-between">
                    <span>{asset.symbol}: {asset.quantity} shares</span>
                    <span>
                      {asset.avgPrice && `$${asset.avgPrice.toFixed(2)}`}
                    </span>
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
          <p><strong>Required CSV format:</strong></p>
          <p className="mt-1">Header row with columns: Symbol, Quantity, Price (optional), Percentage (optional)</p>
          <p className="mt-1"><strong>Example:</strong> Symbol,Quantity,Price,Percentage</p>
          <p>AAPL,100,150.50,25.5</p>
        </div>
      </CardContent>
    </Card>
  );
};