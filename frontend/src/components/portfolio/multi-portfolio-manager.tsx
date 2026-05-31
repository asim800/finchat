// Multiple portfolio management component with collapsible sections

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// PortfolioTable import dropped (declutter #2): per-account tables now render inside
// AccountsSection. The standalone flat table at the portfolio level is gone.
import { CsvManager } from './csv-manager';
import { PortfolioBadges } from './portfolio-badges';
import { PortfolioDashboard } from './portfolio-dashboard';
import { AccountsSection } from '@/app/dashboard/myportfolio/_components/AccountsSection';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import type { DisplayPortfolio as Portfolio, DisplayAsset } from '@/lib/types/portfolio';

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
  const [showDashboard, setShowDashboard] = useState<Set<string>>(new Set());
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
      console.log('📥 Loaded portfolios data:', portfoliosData.map(p => ({ 
        id: p.id, 
        name: p.name, 
        assets: p.assets.map(a => ({ symbol: a.symbol, quantity: a.quantity }))
      })));
      
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
      
      setPortfolios([...transformedPortfolios]); // Force new array reference

      // Phase 2 declutter: Analytics is collapsed by default (was: all-expanded). Users
      // toggle per-portfolio via the collapsible row beneath each table.
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

  // Toggle dashboard visibility
  const toggleDashboard = (portfolioId: string) => {
    const newShowDashboard = new Set(showDashboard);
    if (newShowDashboard.has(portfolioId)) {
      newShowDashboard.delete(portfolioId);
    } else {
      newShowDashboard.add(portfolioId);
    }
    setShowDashboard(newShowDashboard);
  };

  // Portfolio Dashboard Wrapper Component
  const PortfolioDashboardWrapper: React.FC<{
    portfolioId: string;
    portfolioName: string;
    assets: DisplayAsset[];
    portfolioValue: number;
    portfolioCost: number;
    userId?: string;
  }> = ({ portfolioId, portfolioName, assets, portfolioValue, portfolioCost, userId }) => {
    const { metrics, loading, error, refreshMetrics } = usePortfolioMetrics({
      portfolioId,
      userId: userId || '',
      assets,
      portfolioValue,
      portfolioCost,
      autoRefresh: false
    });

    return (
      <div className="p-4 border-b">
        <PortfolioDashboard
          portfolioId={portfolioId}
          portfolioName={portfolioName}
          assets={assets}
          portfolioValue={portfolioValue}
          portfolioCost={portfolioCost}
          metrics={metrics}
          loading={loading}
          onRefresh={refreshMetrics}
        />
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            Error loading analytics: {error}
          </div>
        )}
      </div>
    );
  };

  if (isGuestMode) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Multiple Portfolios</h3>
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

      {/* Phase 2 declutter #3: removed redundant <h2>My Portfolios</h2> — the page-level
          <h1>My Portfolio</h1> in app/dashboard/myportfolio/page.tsx already labels the page. */}

      {/* Portfolios List */}
      {portfolios.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            📊
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No portfolios yet</h3>
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
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">Create Your First Portfolio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portfolio Name *</label>
                    <Input
                      type="text"
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      placeholder="e.g., Main Portfolio"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
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

            // --- Phase 2 declutter: build the inline header summary ---
            // (Account-type chips removed from the header per refinement — type lives on
            // each account row, not at the portfolio level. Portfolio = bank/grouping.)
            const accounts = portfolio.accounts ?? [];
            const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            // Real-estate portfolios summarize property + loan instead of asset count.
            const reAccounts = accounts.filter(a => a.accountType === 'RealEstate' && a.realEstate);
            const reValueSum = reAccounts.reduce((s, a) => s + (a.realEstate!.currentValue || 0), 0);
            const reLoanSum = reAccounts.reduce((s, a) => s + (a.realEstate!.outstandingLoan || 0), 0);
            let summaryText: string;
            if (portfolio.assets.length > 0) {
              const gain = portfolioMarketValue - portfolioCost;
              const gainStr = `${gain >= 0 ? '+' : '-'}${fmt.format(Math.abs(gain))}`;
              summaryText = `${portfolio.assets.length} ${portfolio.assets.length === 1 ? 'asset' : 'assets'} · ${fmt.format(portfolioMarketValue)} · ${gainStr}`;
            } else if (reValueSum > 0) {
              summaryText = reLoanSum > 0
                ? `Property ${fmt.format(reValueSum)} · Loan ${fmt.format(reLoanSum)}`
                : `Property ${fmt.format(reValueSum)}`;
            } else {
              summaryText = 'Empty';
            }

            return (
              <div key={portfolio.id}>
                <div className="border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                  {/* Portfolio Header */}
                  <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 rounded-t-lg">
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
                          <div className="min-w-0">
                            {/* Phase 2 declutter: name (click to rename) + inline summary on ONE line.
                                Account-type chips moved DOWN to each account row (Portfolio is
                                a bank/grouping; types belong to accounts). */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3
                                className="text-lg font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:underline"
                                title="Click to rename"
                                onClick={() => setEditingPortfolio(portfolio.id)}
                              >
                                {portfolio.name}
                              </h3>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {summaryText}
                              </span>
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
                            {/* Edit button removed (Phase 2 declutter): click the portfolio
                                name to rename. Analytics toggle lives BELOW the table. */}
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

                  {/* Phase 2 declutter: the 4-card summary grid was removed; the same
                      info now appears inline on the portfolio header line above. */}

                  {/* Phase 2 + declutter #2: Accounts inside this portfolio, each
                      with its OWN nested PortfolioTable (assets-under-accounts). The
                      standalone flat PortfolioTable that used to sit here is gone. */}
                  {!collapsedPortfolios.has(portfolio.id) && (
                    <AccountsSection
                      portfolioId={portfolio.id}
                      portfolioAssets={portfolio.assets}
                      userId={userId}
                      onChange={loadPortfolios}
                    />
                  )}

                  {/* Phase 2 declutter: Analytics moved below the table, collapsed by default.
                      The collapsible row IS the toggle (no separate header button needed). */}
                  {!collapsedPortfolios.has(portfolio.id) && (
                    <div className="border-t dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => toggleDashboard(portfolio.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
                      >
                        <span>{showDashboard.has(portfolio.id) ? '▼' : '▶'}</span>
                        <span>Analytics</span>
                      </button>
                      {showDashboard.has(portfolio.id) && (
                        <PortfolioDashboardWrapper
                          portfolioId={portfolio.id}
                          portfolioName={portfolio.name}
                          assets={portfolio.assets}
                          portfolioValue={portfolioMarketValue}
                          portfolioCost={portfolioCost}
                          userId={userId}
                        />
                      )}
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
                      <div className="bg-gray-50 dark:bg-slate-800/40 p-4 rounded-lg border dark:border-slate-700">
                        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">Create New Portfolio</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Portfolio Name *</label>
                            <Input
                              type="text"
                              value={newPortfolioName}
                              onChange={(e) => setNewPortfolioName(e.target.value)}
                              placeholder="e.g., Growth Portfolio"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
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
