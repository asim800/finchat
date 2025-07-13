// ============================================================================
// FILE: components/portfolio/multi-portfolio-manager.tsx
// Multiple portfolio management component with collapsible sections
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortfolioTable } from './portfolio-table';
import { CsvManager } from './csv-manager';
import { PortfolioBadges } from './portfolio-badges';

interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  assets: DisplayAsset[];
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  price?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MultiPortfolioManagerProps {
  isGuestMode?: boolean;
  userId?: string;
}

export const MultiPortfolioManager: React.FC<MultiPortfolioManagerProps> = ({ 
  isGuestMode = false, 
  userId 
}) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedPortfolios, setCollapsedPortfolios] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<string | null>(null);
  const [newPortfolioName, setNewPortfolioName] = useState('Main Portfolio');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');

  // Load all portfolios
  useEffect(() => {
    if (!isGuestMode && userId) {
      loadPortfolios();
    } else {
      setLoading(false);
    }
  }, [isGuestMode, userId]);

  const loadPortfolios = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/portfolio');
      if (!response.ok) {
        throw new Error('Failed to load portfolios');
      }
      
      const data = await response.json();
      const portfoliosData = data.portfolios || [];
      
      // Transform dates
      const transformedPortfolios = portfoliosData.map((portfolio: Portfolio & { createdAt: string; updatedAt: string; assets: Array<DisplayAsset & { createdAt: string; updatedAt: string }> }) => ({
        ...portfolio,
        createdAt: new Date(portfolio.createdAt),
        updatedAt: new Date(portfolio.updatedAt),
        assets: portfolio.assets.map((asset: DisplayAsset & { createdAt: string; updatedAt: string }) => ({
          ...asset,
          createdAt: new Date(asset.createdAt),
          updatedAt: new Date(asset.updatedAt)
        }))
      }));
      
      setPortfolios(transformedPortfolios);
    } catch (err) {
      setError('Failed to load portfolios');
      console.error('Portfolio loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new portfolio
  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      setError('Portfolio name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          name: newPortfolioName.trim(),
          description: newPortfolioDescription.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portfolio');
      }

      const result = await response.json();
      if (result.success) {
        await loadPortfolios();
        setShowCreateForm(false);
        setNewPortfolioName('Main Portfolio');
        setNewPortfolioDescription('');
      } else {
        setError('Failed to create portfolio');
      }
    } catch (err) {
      setError('Failed to create portfolio: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Create portfolio error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update portfolio name/description
  const handleUpdatePortfolio = async (portfolioId: string, name: string, description?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-portfolio',
          portfolioId,
          name: name.trim(),
          description: description?.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update portfolio');
      }

      const result = await response.json();
      if (result.success) {
        await loadPortfolios();
        setEditingPortfolio(null);
      } else {
        setError('Failed to update portfolio');
      }
    } catch (err) {
      setError('Failed to update portfolio: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Update portfolio error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete portfolio
  const handleDeletePortfolio = async (portfolioId: string, portfolioName: string) => {
    if (!confirm(`Are you sure you want to delete "${portfolioName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolio?portfolioId=${encodeURIComponent(portfolioId)}&action=delete-portfolio`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete portfolio');
      }

      const result = await response.json();
      if (result.success) {
        await loadPortfolios();
      } else {
        setError('Failed to delete portfolio');
      }
    } catch (err) {
      setError('Failed to delete portfolio: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Delete portfolio error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle portfolio collapse
  const togglePortfolioCollapse = (portfolioId: string) => {
    const newCollapsed = new Set(collapsedPortfolios);
    if (newCollapsed.has(portfolioId)) {
      newCollapsed.delete(portfolioId);
    } else {
      newCollapsed.add(portfolioId);
    }
    setCollapsedPortfolios(newCollapsed);
  };


  if (isGuestMode) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Multiple Portfolios</h3>
          <p className="text-gray-500 mb-4">
            Multiple portfolio management is available for registered users only.
          </p>
          <p className="text-sm text-gray-400">
            Sign up to create and manage multiple portfolios for comparison.
          </p>
        </div>
      </div>
    );
  }

  if (loading && portfolios.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading portfolios...</p>
      </div>
    );
  }

  return (
    <div className="p-6">

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

      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Portfolios</h2>
      </div>

      {/* Portfolios List */}
      {portfolios.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            📊
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No portfolios yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first portfolio to start tracking your investments.
          </p>
          {!showCreateForm ? (
            <div className="mt-6">
              <Button onClick={() => setShowCreateForm(true)}>
                + Create Your First Portfolio
              </Button>
            </div>
          ) : (
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-md font-medium text-gray-900 mb-4">Create Your First Portfolio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Name *</label>
                    <Input
                      type="text"
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      placeholder="e.g., Main Portfolio"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <Input
                      type="text"
                      value={newPortfolioDescription}
                      onChange={(e) => setNewPortfolioDescription(e.target.value)}
                      placeholder="e.g., Main investment portfolio"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button onClick={handleCreatePortfolio} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Portfolio'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewPortfolioName('Main Portfolio');
                      setNewPortfolioDescription('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {portfolios.map((portfolio, index) => {
            const portfolioMarketValue = portfolio.assets.reduce((sum, asset) => 
              sum + (asset.price ? asset.quantity * asset.price : 0), 0
            );
            const portfolioCost = portfolio.assets.reduce((sum, asset) => 
              sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0), 0
            );
            
            return (
              <div key={portfolio.id}>
                <div className="border rounded-lg bg-white shadow-sm">
                  {/* Portfolio Header */}
                  <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => togglePortfolioCollapse(portfolio.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {collapsedPortfolios.has(portfolio.id) ? '▶' : '▼'}
                        </button>
                        {editingPortfolio === portfolio.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="text"
                              defaultValue={portfolio.name}
                              className="w-48"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdatePortfolio(portfolio.id, e.currentTarget.value, portfolio.description || undefined);
                                } else if (e.key === 'Escape') {
                                  setEditingPortfolio(null);
                                }
                              }}
                              autoFocus
                            />
                            <Button 
                              size="sm" 
                              onClick={() => setEditingPortfolio(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-medium text-gray-900">{portfolio.name}</h3>
                              <PortfolioBadges 
                                assets={portfolio.assets}
                                portfolioValue={portfolioMarketValue}
                                portfolioCost={portfolioCost}
                              />
                            </div>
                            {portfolio.description && (
                              <p className="text-sm text-gray-500">{portfolio.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {!collapsedPortfolios.has(portfolio.id) && (
                          <div className="flex space-x-1">
                            <CsvManager
                              isGuestMode={false}
                              portfolioId={portfolio.id}
                              onUploadComplete={() => loadPortfolios()}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPortfolio(portfolio.id)}
                              disabled={loading}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePortfolio(portfolio.id, portfolio.name)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Individual Portfolio Summary */}
                  {!collapsedPortfolios.has(portfolio.id) && (
                    <div className="p-4 bg-gray-25 border-b">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg border">
                          <h4 className="text-xs font-medium text-blue-800">Total Assets</h4>
                          <p className="text-lg font-bold text-blue-900">{portfolio.assets.length}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border">
                          <h4 className="text-xs font-medium text-green-800">Portfolio Value</h4>
                          <p className="text-lg font-bold text-green-900">
                            ${portfolioMarketValue.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border">
                          <h4 className="text-xs font-medium text-orange-800">Total Cost</h4>
                          <p className="text-lg font-bold text-orange-900">
                            ${portfolioCost.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg border">
                          <h4 className="text-xs font-medium text-purple-800">Gain/Loss</h4>
                          <p className={`text-lg font-bold ${
                            portfolioMarketValue - portfolioCost >= 0 
                              ? 'text-green-900' 
                              : 'text-red-900'
                          }`}>
                            ${(portfolioMarketValue - portfolioCost).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Portfolio Content */}
                  {!collapsedPortfolios.has(portfolio.id) && (
                    <div className="p-4">
                      <PortfolioTable
                        isGuestMode={false}
                        userId={userId}
                        portfolioId={portfolio.id}
                        initialAssets={portfolio.assets}
                        onAssetsChange={() => loadPortfolios()}
                        showSummary={false}
                      />
                    </div>
                  )}
                </div>
                
                {/* Add Create Portfolio button and form after the first (main) portfolio */}
                {index === 0 && (
                  <div className="my-6">
                    {!showCreateForm ? (
                      <div className="flex justify-center">
                        <Button 
                          onClick={() => setShowCreateForm(true)}
                          disabled={loading}
                          variant="outline"
                          className="px-6 py-2"
                        >
                          + Create New Portfolio
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="text-md font-medium text-gray-900 mb-4">Create New Portfolio</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Name *</label>
                            <Input
                              type="text"
                              value={newPortfolioName}
                              onChange={(e) => setNewPortfolioName(e.target.value)}
                              placeholder="e.g., Growth Portfolio"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                            <Input
                              type="text"
                              value={newPortfolioDescription}
                              onChange={(e) => setNewPortfolioDescription(e.target.value)}
                              placeholder="e.g., High-growth tech stocks"
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex space-x-2">
                          <Button onClick={handleCreatePortfolio} disabled={loading}>
                            Create Portfolio
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowCreateForm(false);
                              setNewPortfolioName('Main Portfolio');
                              setNewPortfolioDescription('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};