// ============================================================================
// FILE: components/portfolio/portfolio-table.tsx
// Portfolio table with CRUD functionality
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, X } from 'lucide-react';
import { GuestPortfolioService, generateGuestSessionId } from '@/lib/guest-portfolio';

interface PortfolioTableProps {
  isGuestMode?: boolean;
  userId?: string;
  portfolioId?: string; // For multi-portfolio support
  initialAssets?: DisplayAsset[]; // Pre-loaded assets
  onAssetsChange?: (assets: DisplayAsset[]) => void;
  showSummary?: boolean; // Whether to show portfolio summary boxes
}

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  price?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Options-specific fields
  optionType?: string | null;
  expirationDate?: Date | null;
  strikePrice?: number | null;
}

interface NewAsset {
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  assetType: string;
  
  // Options-specific fields
  optionType?: string;
  expirationDate?: string; // String for form input
  strikePrice?: number;
}

interface ApiAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  assetType: string;
  createdAt: string;
  updatedAt: string;
  
  // Options-specific fields
  optionType?: string | null;
  expirationDate?: string | null;
  strikePrice?: number | null;
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ 
  isGuestMode = false, 
  userId, 
  portfolioId,
  initialAssets,
  onAssetsChange,
  showSummary = true 
}) => {
  const [assets, setAssets] = useState<DisplayAsset[]>(initialAssets || []);
  const [loading, setLoading] = useState(!initialAssets); // Only loading if no initial assets

  // Custom setAssets that also calls the callback
  const updateAssets = (newAssets: DisplayAsset[]) => {
    setAssets(newAssets);
    if (onAssetsChange) {
      onAssetsChange(newAssets);
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DisplayAsset>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState<NewAsset>({
    symbol: '',
    quantity: 0,
    avgPrice: undefined,
    assetType: 'stock',
    optionType: undefined,
    expirationDate: undefined,
    strikePrice: undefined
  });
  const [guestSessionId] = useState<string>(() => generateGuestSessionId());
  const [error, setError] = useState<string | null>(null);

  // Load portfolio data
  useEffect(() => {
    if (!initialAssets) {
      loadPortfolio();
    }
  }, [isGuestMode, userId, portfolioId, guestSessionId, initialAssets]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPortfolio = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (isGuestMode) {
        // Load guest portfolio
        const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        const displayAssets: DisplayAsset[] = guestPortfolio.assets.map((asset, index) => ({
          id: `guest_${index}`,
          symbol: asset.symbol,
          quantity: asset.quantity,
          avgPrice: asset.avgPrice,
          assetType: asset.assetType,
          totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0,
          createdAt: asset.addedAt,
          updatedAt: asset.addedAt,
          optionType: asset.optionType || null,
          expirationDate: asset.expirationDate ? new Date(asset.expirationDate) : null,
          strikePrice: asset.strikePrice || null
        }));
        updateAssets(displayAssets);
      } else if (userId) {
        // Load authenticated user portfolio via API
        const url = portfolioId ? `/api/portfolio?portfolioId=${encodeURIComponent(portfolioId)}` : '/api/portfolio';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load portfolio from server');
        }
        
        const data = await response.json();
        
        let portfolioData;
        if (portfolioId) {
          // Single portfolio response
          portfolioData = data.portfolio;
        } else {
          // Multiple portfolios response - use the first (default) portfolio
          portfolioData = data.portfolios && data.portfolios.length > 0 ? data.portfolios[0] : { assets: [] };
        }
        
        const displayAssets: DisplayAsset[] = portfolioData.assets.map((asset: ApiAsset) => ({
          ...asset,
          createdAt: new Date(asset.createdAt),
          updatedAt: new Date(asset.updatedAt),
          totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0,
          expirationDate: asset.expirationDate ? new Date(asset.expirationDate) : null
        }));
        updateAssets(displayAssets);
      } else {
        // No userId provided - set empty portfolio
        updateAssets([]);
      }
    } catch (err) {
      setError('Failed to load portfolio');
      console.error('Portfolio loading error:', err);
      // Set empty assets on error to avoid showing stale data
      updateAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new asset
  const handleAddAsset = async () => {
    if (!newAsset.symbol || newAsset.quantity <= 0) {
      setError('Please enter a valid symbol and quantity greater than 0');
      return;
    }

    // Validate options-specific fields
    if (newAsset.assetType === 'option') {
      if (!newAsset.optionType) {
        setError('Please select an option type (Call or Put)');
        return;
      }
      if (!newAsset.strikePrice || newAsset.strikePrice <= 0) {
        setError('Please enter a valid strike price greater than 0');
        return;
      }
      if (!newAsset.expirationDate) {
        setError('Please select an expiration date');
        return;
      }
    }

    // Validate bond-specific fields
    if (newAsset.assetType === 'bond') {
      if (!newAsset.optionType) {
        setError('Please select a bond type');
        return;
      }
      if (!newAsset.strikePrice || newAsset.strikePrice <= 0) {
        setError('Please enter a valid coupon rate greater than 0');
        return;
      }
      if (!newAsset.expirationDate) {
        setError('Please select a maturity date');
        return;
      }
    }

    if (!isGuestMode && !userId) {
      setError('Unable to add asset: Please sign in or use guest mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isGuestMode) {
        // Add to guest portfolio
        const assetToAdd = {
          symbol: newAsset.symbol.toUpperCase(),
          quantity: newAsset.quantity,
          avgPrice: newAsset.avgPrice,
          assetType: newAsset.assetType,
          ...((newAsset.assetType === 'option' || newAsset.assetType === 'bond') && {
            optionType: newAsset.optionType,
            strikePrice: newAsset.strikePrice,
            expirationDate: newAsset.expirationDate
          })
        };
        const result = GuestPortfolioService.addAssetsToGuestPortfolio(guestSessionId, [assetToAdd]);

        if (result.success) {
          await loadPortfolio();
          setShowAddForm(false);
          setNewAsset({
            symbol: '',
            quantity: 0,
            avgPrice: undefined,
            assetType: 'stock',
            optionType: undefined,
            expirationDate: undefined,
            strikePrice: undefined
          });
        } else {
          setError('Failed to add asset to guest portfolio: ' + (result.errors.length > 0 ? result.errors.join(', ') : 'Unknown error'));
        }
      } else if (userId) {
        // Add to authenticated user portfolio via API
        const response = await fetch('/api/portfolio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            portfolioId: portfolioId, // Include portfolio ID for multi-portfolio support
            assets: [{
              symbol: newAsset.symbol.toUpperCase(),
              quantity: newAsset.quantity,
              avgPrice: newAsset.avgPrice,
              assetType: newAsset.assetType,
              ...((newAsset.assetType === 'option' || newAsset.assetType === 'bond') && {
                optionType: newAsset.optionType,
                strikePrice: newAsset.strikePrice,
                expirationDate: newAsset.expirationDate
              })
            }]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add asset');
        }

        const result = await response.json();
        if (result.success) {
          await loadPortfolio();
          setShowAddForm(false);
          setNewAsset({
            symbol: '',
            quantity: 0,
            avgPrice: undefined,
            assetType: 'stock',
            optionType: undefined,
            expirationDate: undefined,
            strikePrice: undefined
          });
        } else {
          setError('Failed to add asset to portfolio: ' + (result.errors.length > 0 ? result.errors.join(', ') : 'Unknown error'));
        }
      }
    } catch (err) {
      setError('Failed to add asset: ' + (err instanceof Error ? err.message : 'Unexpected error occurred'));
      console.error('Add asset error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start editing an asset
  const startEdit = (asset: DisplayAsset) => {
    setEditingId(asset.id);
    setEditValues({
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgPrice: asset.avgPrice,
      assetType: asset.assetType,
      optionType: asset.optionType,
      expirationDate: asset.expirationDate,
      strikePrice: asset.strikePrice
    });
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingId || !editValues.quantity || editValues.quantity <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }

    if (!isGuestMode && !userId) {
      setError('Unable to update asset: Please sign in or use guest mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const asset = assets.find(a => a.id === editingId);
      if (!asset) return;

      if (isGuestMode) {
        // For guests, we need to rebuild the portfolio with updated asset
        const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
        const assetIndex = parseInt(editingId.replace('guest_', ''));
        
        if (guestPortfolio.assets[assetIndex]) {
          guestPortfolio.assets[assetIndex] = {
            ...guestPortfolio.assets[assetIndex],
            symbol: editValues.symbol || asset.symbol,
            quantity: editValues.quantity || asset.quantity,
            avgPrice: editValues.avgPrice !== undefined ? editValues.avgPrice : guestPortfolio.assets[assetIndex].avgPrice,
            assetType: editValues.assetType || asset.assetType
          };
          
          // Update the portfolio in storage
          guestPortfolio.lastUpdated = new Date();
          await loadPortfolio();
        }
      } else if (userId) {
        // For authenticated users, use API
        // Check if quantity or avgPrice changed
        if (editValues.quantity !== asset.quantity || editValues.avgPrice !== asset.avgPrice) {
          const response = await fetch('/api/portfolio', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              portfolioId: portfolioId, // Include portfolio ID for multi-portfolio support
              symbol: asset.symbol,
              quantity: editValues.quantity,
              avgPrice: editValues.avgPrice
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update asset');
          }
        }
        await loadPortfolio();
      }

      setEditingId(null);
      setEditValues({});
    } catch (err) {
      setError('Failed to update asset: ' + (err instanceof Error ? err.message : 'Unexpected error occurred'));
      console.error('Update asset error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete asset
  const deleteAsset = async (asset: DisplayAsset) => {
    if (!confirm(`Are you sure you want to delete ${asset.symbol} from your portfolio?`)) {
      return;
    }

    if (!isGuestMode && !userId) {
      setError('Unable to delete asset: Please sign in or use guest mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isGuestMode) {
        // Remove from guest portfolio
        const success = GuestPortfolioService.removeAssetFromGuest(guestSessionId, asset.symbol);
        if (success) {
          await loadPortfolio();
        } else {
          setError('Failed to remove asset from guest portfolio');
        }
      } else if (userId) {
        // Remove from authenticated user portfolio via API
        const url = `/api/portfolio?symbol=${encodeURIComponent(asset.symbol)}${portfolioId ? `&portfolioId=${encodeURIComponent(portfolioId)}` : ''}`;
        const response = await fetch(url, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove asset');
        }

        const result = await response.json();
        if (result.success) {
          await loadPortfolio();
        } else {
          setError('Failed to remove asset from portfolio');
        }
      }
    } catch (err) {
      setError('Failed to delete asset: ' + (err instanceof Error ? err.message : 'Unexpected error occurred'));
      console.error('Delete asset error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio totals
  const totalPortfolioValue = assets.reduce((sum, asset) => sum + (asset.price ? asset.quantity * asset.price : 0), 0);
  const totalCost = assets.reduce((sum, asset) => sum + (asset.avgPrice ? asset.quantity * asset.avgPrice : 0), 0);
  const totalAssets = assets.length;

  if (loading && assets.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className={showSummary ? "p-6" : ""}>
      {/* Portfolio Summary */}
      {showSummary && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-blue-800">Total Assets</h3>
            <p className="text-2xl font-bold text-blue-900">{totalAssets}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-green-800">Portfolio Value</h3>
            <p className="text-2xl font-bold text-green-900">
              ${totalPortfolioValue.toLocaleString()}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-purple-800">Total Cost</h3>
            <p className="text-2xl font-bold text-purple-900">
              ${totalCost.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-auto p-1 hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Add Asset Button */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Assets</h2>
        <Button 
          onClick={() => setShowAddForm(true)}
          disabled={loading || showAddForm}
        >
          + Add Asset
        </Button>
      </div>

      {/* Add Asset Form */}
      {showAddForm && (
        <div className="mb-6 bg-muted/50 p-4 rounded-lg border">
          <h3 className="text-md font-medium mb-4">Add New Asset</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              label="Symbol *"
              type="text"
              value={newAsset.symbol}
              onChange={(e) => setNewAsset({...newAsset, symbol: e.target.value.toUpperCase()})}
              placeholder="AAPL"
            />
            <FormField
              label="Quantity *"
              type="number"
              value={newAsset.quantity || ''}
              onChange={(e) => setNewAsset({...newAsset, quantity: parseFloat(e.target.value) || 0})}
              placeholder="100"
              min="0"
              step="0.01"
            />
            <FormField
              label="Avg Cost"
              type="number"
              value={newAsset.avgPrice || ''}
              onChange={(e) => setNewAsset({...newAsset, avgPrice: parseFloat(e.target.value) || undefined})}
              placeholder="150.00"
              min="0"
              step="0.01"
            />
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <Select
                value={newAsset.assetType}
                onValueChange={(value) => setNewAsset({...newAsset, assetType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                  <SelectItem value="option">Option</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Options-specific fields */}
          {newAsset.assetType === 'option' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
              <h4 className="text-sm font-medium text-blue-800 mb-3">Options Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Option Type *</label>
                  <Select
                    value={newAsset.optionType || ''}
                    onValueChange={(value) => setNewAsset({...newAsset, optionType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="put">Put</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FormField
                  label="Strike Price *"
                  type="number"
                  value={newAsset.strikePrice || ''}
                  onChange={(e) => setNewAsset({...newAsset, strikePrice: parseFloat(e.target.value) || undefined})}
                  placeholder="100.00"
                  min="0"
                  step="0.01"
                />
                <FormField
                  label="Expiration Date *"
                  type="date"
                  value={newAsset.expirationDate || ''}
                  onChange={(e) => setNewAsset({...newAsset, expirationDate: e.target.value})}
                />
              </div>
            </div>
          )}

          {/* Bond-specific fields */}
          {newAsset.assetType === 'bond' && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border">
              <h4 className="text-sm font-medium text-green-800 mb-3">Bond Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bond Type *</label>
                  <Select
                    value={newAsset.optionType || ''}
                    onValueChange={(value) => setNewAsset({...newAsset, optionType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD - US Treasury</SelectItem>
                      <SelectItem value="ii">II - US TIPS</SelectItem>
                      <SelectItem value="dem">DEM - Germany (Bundesanleihe)</SelectItem>
                      <SelectItem value="gbp">GBP - United Kingdom (Gilt)</SelectItem>
                      <SelectItem value="jpy">JPY - Japan Government</SelectItem>
                      <SelectItem value="cad">CAD - Canada Government</SelectItem>
                      <SelectItem value="mexn">MEXN - Mexico Government</SelectItem>
                      <SelectItem value="brl">BRL - Brazil Government</SelectItem>
                      <SelectItem value="frf">FRF - France (OAT)</SelectItem>
                      <SelectItem value="inr">INR - India Government</SelectItem>
                      <SelectItem value="aud">AUD - Australia Government</SelectItem>
                      <SelectItem value="nzd">NZD - New Zealand Government</SelectItem>
                      <SelectItem value="itl">ITL - Italy Government</SelectItem>
                      <SelectItem value="esp">ESP - Spain Government</SelectItem>
                      <SelectItem value="sek">SEK - Sweden Government</SelectItem>
                      <SelectItem value="pte">PTE - Portugal Government</SelectItem>
                      <SelectItem value="nlg">NLG - Netherlands Government</SelectItem>
                      <SelectItem value="chf">CHF - Switzerland Government</SelectItem>
                      <SelectItem value="tr">TR - Turkey Government</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="municipal">Municipal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FormField
                  label="Coupon Rate (%) *"
                  type="number"
                  value={newAsset.strikePrice || ''}
                  onChange={(e) => setNewAsset({...newAsset, strikePrice: parseFloat(e.target.value) || undefined})}
                  placeholder="4.5"
                  min="0"
                  step="0.01"
                />
                <FormField
                  label="Maturity Date *"
                  type="date"
                  value={newAsset.expirationDate || ''}
                  onChange={(e) => setNewAsset({...newAsset, expirationDate: e.target.value})}
                />
              </div>
            </div>
          )}
          
          <div className="mt-4 flex space-x-2">
            <Button onClick={handleAddAsset} disabled={loading}>
              Add Asset
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddForm(false);
                setNewAsset({
                  symbol: '',
                  quantity: 0,
                  avgPrice: undefined,
                  assetType: 'stock',
                  optionType: undefined,
                  expirationDate: undefined,
                  strikePrice: undefined
                });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Assets Table */}
      {assets.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            📊
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assets yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first asset to get started with portfolio tracking.
          </p>
          {!showAddForm && (
            <div className="mt-6">
              <Button onClick={() => setShowAddForm(true)}>
                + Add Your First Asset
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Avg Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset Details</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    {editingId === asset.id ? (
                      <Input
                        type="text"
                        value={editValues.symbol || ''}
                        onChange={(e) => setEditValues({...editValues, symbol: e.target.value.toUpperCase()})}
                        className="w-full min-w-16 max-w-20"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{asset.symbol}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === asset.id ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editValues.quantity || ''}
                        onChange={(e) => setEditValues({...editValues, quantity: parseFloat(e.target.value) || 0})}
                        className="w-full min-w-20 max-w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{asset.quantity}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {asset.price ? `$${asset.price.toFixed(2)}` : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === asset.id ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editValues.avgPrice || ''}
                        onChange={(e) => setEditValues({...editValues, avgPrice: parseFloat(e.target.value) || undefined})}
                        className="w-full min-w-20 max-w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Optional"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">
                        {asset.avgPrice ? `$${asset.avgPrice.toFixed(2)}` : '-'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">
                      ${asset.totalValue.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === asset.id ? (
                      <Select
                        value={editValues.assetType || ''}
                        onValueChange={(value) => setEditValues({...editValues, assetType: value})}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stock">Stock</SelectItem>
                          <SelectItem value="etf">ETF</SelectItem>
                          <SelectItem value="bond">Bond</SelectItem>
                          <SelectItem value="crypto">Crypto</SelectItem>
                          <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                          <SelectItem value="option">Option</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">
                        {asset.assetType}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {asset.assetType === 'option' ? (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-gray-900">
                          {asset.optionType ? asset.optionType.toUpperCase() : 'N/A'}
                        </div>
                        <div className="text-gray-600">
                          Strike: ${asset.strikePrice ? asset.strikePrice.toFixed(2) : 'N/A'}
                        </div>
                        <div className="text-gray-600">
                          Exp: {asset.expirationDate ? 
                            new Date(asset.expirationDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    ) : asset.assetType === 'bond' ? (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-gray-900">
                          {asset.optionType ? asset.optionType.toUpperCase() : 'N/A'}
                        </div>
                        <div className="text-gray-600">
                          Coupon: {asset.strikePrice ? `${asset.strikePrice}%` : 'N/A'}
                        </div>
                        <div className="text-gray-600">
                          Maturity: {asset.expirationDate ? 
                            new Date(asset.expirationDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">-</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === asset.id ? (
                      <div className="flex space-x-3 sm:space-x-2">
                        <Button
                          onClick={saveEdit}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          className="text-green-600 hover:text-green-900 border-green-200 hover:border-green-300"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingId(null);
                            setEditValues({});
                          }}
                          variant="outline"
                          size="sm"
                          className="text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-3 sm:space-x-2">
                        <Button
                          onClick={() => startEdit(asset)}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          className="text-indigo-600 hover:text-indigo-900 border-indigo-200 hover:border-indigo-300"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => deleteAsset(asset)}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 border-red-200 hover:border-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};