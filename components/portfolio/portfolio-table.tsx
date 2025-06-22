// ============================================================================
// FILE: components/portfolio/portfolio-table.tsx
// Portfolio table with CRUD functionality
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GuestPortfolioService, generateGuestSessionId } from '@/lib/guest-portfolio';

interface PortfolioTableProps {
  isGuestMode?: boolean;
  userId?: string;
}

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

interface NewAsset {
  symbol: string;
  quantity: number;
  avgPrice?: number;
  assetType: string;
}

interface ApiAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice?: number | null;
  assetType: string;
  createdAt: string;
  updatedAt: string;
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ isGuestMode = false, userId }) => {
  const [assets, setAssets] = useState<DisplayAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DisplayAsset>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState<NewAsset>({
    symbol: '',
    quantity: 0,
    avgPrice: undefined,
    assetType: 'stock'
  });
  const [guestSessionId] = useState<string>(() => generateGuestSessionId());
  const [error, setError] = useState<string | null>(null);

  // Load portfolio data
  useEffect(() => {
    loadPortfolio();
  }, [isGuestMode, userId, guestSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          updatedAt: asset.addedAt
        }));
        setAssets(displayAssets);
      } else if (userId) {
        // Load authenticated user portfolio via API
        const response = await fetch('/api/portfolio');
        if (!response.ok) {
          throw new Error('Failed to load portfolio from server');
        }
        
        const data = await response.json();
        const displayAssets: DisplayAsset[] = data.portfolio.assets.map((asset: ApiAsset) => ({
          ...asset,
          createdAt: new Date(asset.createdAt),
          updatedAt: new Date(asset.updatedAt),
          totalValue: asset.avgPrice ? asset.quantity * asset.avgPrice : 0
        }));
        setAssets(displayAssets);
      } else {
        // No userId provided - set empty portfolio
        setAssets([]);
      }
    } catch (err) {
      setError('Failed to load portfolio');
      console.error('Portfolio loading error:', err);
      // Set empty assets on error to avoid showing stale data
      setAssets([]);
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

    if (!isGuestMode && !userId) {
      setError('Unable to add asset: Please sign in or use guest mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isGuestMode) {
        // Add to guest portfolio
        const result = GuestPortfolioService.addAssetsToGuestPortfolio(guestSessionId, [{
          symbol: newAsset.symbol.toUpperCase(),
          quantity: newAsset.quantity,
          avgPrice: newAsset.avgPrice,
          assetType: newAsset.assetType
        }]);

        if (result.success) {
          await loadPortfolio();
          setShowAddForm(false);
          setNewAsset({
            symbol: '',
            quantity: 0,
            avgPrice: undefined,
            assetType: 'stock'
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
            assets: [{
              symbol: newAsset.symbol.toUpperCase(),
              quantity: newAsset.quantity,
              avgPrice: newAsset.avgPrice,
              assetType: newAsset.assetType
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
            assetType: 'stock'
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
      assetType: asset.assetType
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
            avgPrice: editValues.avgPrice ?? undefined,
            assetType: editValues.assetType || asset.assetType
          };
          
          // Update the portfolio in storage
          guestPortfolio.lastUpdated = new Date();
          await loadPortfolio();
        }
      } else if (userId) {
        // For authenticated users, use API
        if (editValues.quantity !== asset.quantity) {
          const response = await fetch('/api/portfolio', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol: asset.symbol,
              quantity: editValues.quantity
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
        const response = await fetch(`/api/portfolio?symbol=${encodeURIComponent(asset.symbol)}`, {
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
  const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
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
    <div className="p-6">
      {/* Portfolio Summary */}
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
          <h3 className="text-sm font-medium text-purple-800">Average Value per Asset</h3>
          <p className="text-2xl font-bold text-purple-900">
            ${totalAssets > 0 ? (totalPortfolioValue / totalAssets).toLocaleString() : '0'}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              className="ml-auto text-red-500 hover:text-red-700"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        </div>
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
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-md font-medium text-gray-900 mb-4">Add New Asset</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol *</label>
              <Input
                type="text"
                value={newAsset.symbol}
                onChange={(e) => setNewAsset({...newAsset, symbol: e.target.value.toUpperCase()})}
                placeholder="AAPL"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <Input
                type="number"
                value={newAsset.quantity || ''}
                onChange={(e) => setNewAsset({...newAsset, quantity: parseFloat(e.target.value) || 0})}
                placeholder="100"
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avg Price</label>
              <Input
                type="number"
                value={newAsset.avgPrice || ''}
                onChange={(e) => setNewAsset({...newAsset, avgPrice: parseFloat(e.target.value) || undefined})}
                placeholder="150.00"
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newAsset.assetType}
                onChange={(e) => setNewAsset({...newAsset, assetType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="stock">Stock</option>
                <option value="etf">ETF</option>
                <option value="bond">Bond</option>
                <option value="crypto">Crypto</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
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
                  assetType: 'stock'
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === asset.id ? (
                      <Input
                        type="text"
                        value={editValues.symbol || ''}
                        onChange={(e) => setEditValues({...editValues, symbol: e.target.value.toUpperCase()})}
                        className="w-20"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{asset.symbol}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === asset.id ? (
                      <Input
                        type="number"
                        value={editValues.quantity || ''}
                        onChange={(e) => setEditValues({...editValues, quantity: parseFloat(e.target.value) || 0})}
                        className="w-24"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{asset.quantity}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === asset.id ? (
                      <Input
                        type="number"
                        value={editValues.avgPrice || ''}
                        onChange={(e) => setEditValues({...editValues, avgPrice: parseFloat(e.target.value) || undefined})}
                        className="w-24"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">
                        {asset.avgPrice ? `$${asset.avgPrice.toFixed(2)}` : '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${asset.totalValue.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === asset.id ? (
                      <select
                        value={editValues.assetType || ''}
                        onChange={(e) => setEditValues({...editValues, assetType: e.target.value})}
                        className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white"
                      >
                        <option value="stock">Stock</option>
                        <option value="etf">ETF</option>
                        <option value="bond">Bond</option>
                        <option value="crypto">Crypto</option>
                        <option value="mutual_fund">Mutual Fund</option>
                        <option value="other">Other</option>
                      </select>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {asset.assetType}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === asset.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={saveEdit}
                          className="text-green-600 hover:text-green-900"
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditValues({});
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(asset)}
                          className="text-indigo-600 hover:text-indigo-900"
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAsset(asset)}
                          className="text-red-600 hover:text-red-900"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};