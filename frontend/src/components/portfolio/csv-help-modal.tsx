// Help modal explaining CSV format for import/export

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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                When you export your portfolio, the CSV file includes the following columns:
              </p>
              
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                <code className="text-sm">
                  Symbol,Quantity,Price,Total Value,Asset Type,Option Type,Strike Price,Expiration Date
                </code>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Required Fields:</h4>
                  <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• <strong>Symbol:</strong> Asset ticker (e.g., AAPL, SPY)</li>
                    <li>• <strong>Quantity:</strong> Number of shares/units</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Optional Fields:</h4>
                  <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• <strong>Price:</strong> Average cost per share</li>
                    <li>• <strong>Total Value:</strong> Calculated automatically</li>
                    <li>• <strong>Asset Type:</strong> stock, etf, bond, crypto, etc.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Options Fields (for options assets only):</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• <strong>Option Type:</strong> call or put</li>
                  <li>• <strong>Strike Price:</strong> Strike price for the option</li>
                  <li>• <strong>Expiration Date:</strong> Expiration date (YYYY-MM-DD or MM/DD/YYYY format)</li>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                For importing portfolios, use position-based CSV format with columns in this exact order:
              </p>
              
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                <code className="text-sm">
                  Symbol,Quantity,Price,AssetType,OptionType,StrikePrice,ExpirationDate
                </code>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Column Positions (Fixed Order):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-xs">
                    <div>
                      <strong>Column 1:</strong> Symbol (required)
                    </div>
                    <div>
                      <strong>Column 2:</strong> Quantity (required)
                    </div>
                    <div>
                      <strong>Column 3:</strong> Price (optional)
                    </div>
                    <div>
                      <strong>Column 4:</strong> Asset Type (optional, defaults to 'stock')
                    </div>
                    <div>
                      <strong>Column 5:</strong> Option Type (options) / Bond Type (bonds)
                    </div>
                    <div>
                      <strong>Column 6:</strong> Strike Price (options) / Coupon Rate (bonds)
                    </div>
                    <div>
                      <strong>Column 7:</strong> Expiration Date (options) / Maturity Date (bonds)
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Supported Asset Types:</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['stock/stocks', 'etf/etfs', 'bond/bonds', 'crypto/cryptos', 'mutual_fund', 'option/options', 'other'].map(type => (
                      <span key={type} className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Both singular and plural forms are supported (e.g., "stock" or "stocks", "option" or "options")
                  </p>
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
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Basic Stock Portfolio:</h4>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm font-mono">
                  AAPL,100,150.50,stock<br/>
                  GOOGL,50,140.34,stock<br/>
                  SPY,200,493.52,etf<br/>
                  BTC-USD,0.5,43250.75,crypto
                </div>
              </div>

              {/* Options Portfolio */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Portfolio with Options & Bonds:</h4>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm font-mono">
                  AAPL,100,150.50,stock<br/>
                  AAPL,10,5.20,option,call,160.00,12/20/2024<br/>
                  SPY,200,493.52,etf<br/>
                  SPY250910,5,12.30,option,put,560.00,09/10/2025<br/>
                  GOVT10Y,1000,98.50,bond,usd,4.5,05/15/2034<br/>
                  GTDEM10Y,500,102.25,bond,dem,3.8,03/01/2029<br/>
                  CORP5Y,300,99.75,bond,corporate,2.9,07/15/2027
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Note: For basic assets (stocks, ETFs), you can omit the last 3 columns or leave them empty
                </p>
              </div>

              {/* Minimal Format */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Minimal Format (Symbol & Quantity only):</h4>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm font-mono">
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
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• <strong>Column Order:</strong> Columns must be in the exact order specified above</li>
                <li>• <strong>Headers:</strong> Optional - can include header row or start directly with data</li>
                <li>• <strong>Symbols:</strong> Use standard ticker symbols (automatically converted to uppercase)</li>
                <li>• <strong>Decimals:</strong> Use periods (.) for decimal points, not commas</li>
                <li>• <strong>Dates:</strong> Use YYYY-MM-DD or MM/DD/YYYY format for expiration dates</li>
                <li>• <strong>Empty Cells:</strong> Leave cells blank for optional fields (but maintain comma separators)</li>
                <li>• <strong>Options:</strong> Set Column 4 to "option" and include columns 5-7 for option details</li>
                <li>• <strong>Bonds:</strong> Set Column 4 to "bond" and include columns 5-7 for bond details</li>
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
                  <ul className="mt-1 space-y-1 text-gray-600 dark:text-gray-400 ml-4">
                    <li>• "Missing symbol" - Ensure Symbol column has valid ticker symbols</li>
                    <li>• "Invalid quantity" - Quantity must be a positive number</li>
                    <li>• "Invalid date format" - Use YYYY-MM-DD or MM/DD/YYYY format for dates</li>
                    <li>• "File too large" - Keep file under 5MB or split into smaller files</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-600">Tips for Success:</strong>
                  <ul className="mt-1 space-y-1 text-gray-600 dark:text-gray-400 ml-4">
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
