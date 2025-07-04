// ============================================================================
// FILE: components/portfolio/csv-help-modal.tsx
// Help modal explaining CSV format for import/export
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const CsvHelpModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          📄 CSV Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV Import/Export Format Guide</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📤 CSV Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                When you export your portfolio, the CSV file includes the following columns:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <code className="text-sm">
                  Symbol,Quantity,Price,Total Value,Asset Type,Option Type,Strike Price,Expiration Date
                </code>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-800">Required Fields:</h4>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    <li>• <strong>Symbol:</strong> Asset ticker (e.g., AAPL, SPY)</li>
                    <li>• <strong>Quantity:</strong> Number of shares/units</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Optional Fields:</h4>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    <li>• <strong>Price:</strong> Average cost per share</li>
                    <li>• <strong>Total Value:</strong> Calculated automatically</li>
                    <li>• <strong>Asset Type:</strong> stock, etf, bond, crypto, etc.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Options Fields (for options assets only):</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Option Type:</strong> call or put</li>
                  <li>• <strong>Strike Price:</strong> Strike price for the option</li>
                  <li>• <strong>Expiration Date:</strong> Expiration date (YYYY-MM-DD format)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Import Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📥 CSV Import Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                For importing portfolios, your CSV should have a header row with these column names:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <code className="text-sm">
                  Symbol,Quantity,Price,AssetType,OptionType,StrikePrice,ExpirationDate
                </code>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800">Supported Column Names:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-xs">
                    <div>
                      <strong>Symbol:</strong> symbol, ticker, stock
                    </div>
                    <div>
                      <strong>Quantity:</strong> quantity, shares, amount
                    </div>
                    <div>
                      <strong>Price:</strong> price, avgprice, cost, average_price
                    </div>
                    <div>
                      <strong>Asset Type:</strong> type, assettype, asset_type
                    </div>
                    <div>
                      <strong>Option Type:</strong> optiontype, option_type
                    </div>
                    <div>
                      <strong>Strike Price:</strong> strike, strikeprice, strike_price
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800">Supported Asset Types:</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['stock', 'etf', 'bond', 'crypto', 'mutual_fund', 'options', 'other'].map(type => (
                      <span key={type} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📋 Example CSV Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Stock Portfolio */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Basic Stock Portfolio:</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono">
                  Symbol,Quantity,Price,AssetType<br/>
                  AAPL,100,150.50,stock<br/>
                  GOOGL,50,140.34,stock<br/>
                  SPY,200,493.52,etf<br/>
                  BTC-USD,0.5,43250.75,crypto
                </div>
              </div>

              {/* Options Portfolio */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Portfolio with Options:</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono">
                  Symbol,Quantity,Price,AssetType,OptionType,StrikePrice,ExpirationDate<br/>
                  AAPL,100,150.50,stock,,,<br/>
                  AAPL,10,5.20,options,call,160.00,2024-12-20<br/>
                  SPY,200,493.52,etf,,,<br/>
                  SPY,5,12.30,options,put,480.00,2024-11-15
                </div>
              </div>

              {/* Minimal Format */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Minimal Format (Symbol & Quantity only):</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono">
                  Symbol,Quantity<br/>
                  AAPL,100<br/>
                  GOOGL,50<br/>
                  SPY,200
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Tips & Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Headers:</strong> First row must contain column headers (case-insensitive)</li>
                <li>• <strong>Symbols:</strong> Use standard ticker symbols (automatically converted to uppercase)</li>
                <li>• <strong>Decimals:</strong> Use periods (.) for decimal points, not commas</li>
                <li>• <strong>Dates:</strong> Use YYYY-MM-DD format for expiration dates</li>
                <li>• <strong>Empty Cells:</strong> Leave cells blank for optional fields</li>
                <li>• <strong>Options:</strong> Set AssetType to "options" and include option-specific fields</li>
                <li>• <strong>File Size:</strong> Maximum file size is 5MB</li>
                <li>• <strong>Encoding:</strong> Save as UTF-8 encoded CSV for best compatibility</li>
              </ul>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔧 Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-red-600">Common Issues:</strong>
                  <ul className="mt-1 space-y-1 text-gray-600 ml-4">
                    <li>• "Missing symbol" - Ensure Symbol column has valid ticker symbols</li>
                    <li>• "Invalid quantity" - Quantity must be a positive number</li>
                    <li>• "Invalid date format" - Use YYYY-MM-DD format for dates</li>
                    <li>• "File too large" - Keep file under 5MB or split into smaller files</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-600">Tips for Success:</strong>
                  <ul className="mt-1 space-y-1 text-gray-600 ml-4">
                    <li>• Test with a small file first (2-3 rows)</li>
                    <li>• Check symbol validity before importing</li>
                    <li>• Remove any special characters from numbers</li>
                    <li>• Ensure consistent column ordering</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};