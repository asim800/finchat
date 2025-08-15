// ============================================================================
// FILE: components/portfolio/portfolio-table.tsx
// Portfolio table with CRUD functionality
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePortfolioState } from '@/hooks/usePortfolioState';
import { usePortfolioCRUD } from '@/hooks/usePortfolioCRUD';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { generateGuestSessionId, GuestPortfolioService } from '@/lib/guest-portfolio';
import { formatPurchaseDate } from '@/lib/tax-utils';
import { GuestModeIndicator } from '@/components/ui/guest-mode-indicator';
import { AssetAdditionWizard } from './asset-addition-wizard';
import { useErrorSystem, ErrorContainer } from '@/components/ui/error-display';
import { QuantityValidationUtils } from '@/lib/validation';
import type { DisplayAsset, NewAsset } from '@/hooks/usePortfolioState';

interface PortfolioTableProps {
  isGuestMode?: boolean;
  userId?: string;
  portfolioId?: string; // For multi-portfolio support
  initialAssets?: DisplayAsset[]; // Pre-loaded assets
  onAssetsChange?: (assets?: DisplayAsset[]) => void;
  showSummary?: boolean; // Whether to show portfolio summary boxes
}


const PortfolioTableComponent: React.FC<PortfolioTableProps> = ({ 
  isGuestMode = false, 
  userId, 
  portfolioId,
  initialAssets,
  onAssetsChange,
  showSummary = true 
}) => {
  const [guestSessionId] = useState<string>(() => generateGuestSessionId());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { showAssetAddError, showNetworkError, showValidationError, clearErrors } = useErrorSystem();

  // Toggle row expansion
  const toggleRowExpansion = useCallback((assetId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  }, []);

  // Simplified state management with useReducer
  const portfolioState = usePortfolioState(initialAssets, onAssetsChange);
  const {
    assets,
    loading,
    error,
    editingId,
    editValues,
    showAddForm,
    newAsset,
    totalValue,
    assetCount,
    hasAssets,
    isEditing,
    getEditValue,
    // Actions
    setLoading,
    setError,
    setAssets,
    addAsset: addAssetToState,
    updateAsset: updateAssetInState,
    deleteAsset: deleteAssetFromState,
    startEditing,
    stopEditing,
    updateEditValues,
    setShowAddForm,
    updateNewAsset,
    resetNewAsset,
    clearAllErrors
  } = portfolioState;

  // CRUD operations
  const crudOperations = usePortfolioCRUD({
    isGuestMode,
    userId,
    portfolioId,
    guestSessionId,
    onError: setError
  });

  // Load portfolio data
  useEffect(() => {
    if (!initialAssets) {
      loadPortfolio();
    }
  }, [isGuestMode, userId, portfolioId, guestSessionId, initialAssets]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    clearAllErrors();
    
    try {
      const loadedAssets = await crudOperations.loadAssets();
      setAssets(loadedAssets);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      showNetworkError(() => loadPortfolio());
    } finally {
      setLoading(false);
    }
  }, [crudOperations, setLoading, setAssets, clearAllErrors, showNetworkError]);

  // Handle wizard submission
  const handleWizardSubmit = useCallback(async (wizardAsset: NewAsset) => {
    // Convert wizard asset to the format expected by handleAddAsset
    updateNewAsset(wizardAsset);
    await handleAddAssetInternal(wizardAsset);
  }, []);

  // Add new asset (internal function)
  const handleAddAssetInternal = useCallback(async (assetData: NewAsset) => {
    if (!assetData.symbol || assetData.quantity <= 0) {
      showValidationError('Please enter a valid symbol and quantity greater than 0', 'symbol');
      return;
    }

    // Validate options-specific fields
    if (assetData.assetType === 'option') {
      if (!assetData.optionType) {
        showValidationError('Please select an option type (Call or Put)', 'optionType');
        return;
      }
      if (!assetData.strikePrice || assetData.strikePrice <= 0) {
        showValidationError('Please enter a valid strike price greater than 0', 'strikePrice');
        return;
      }
      if (!assetData.expirationDate) {
        showValidationError('Please select an expiration date', 'expirationDate');
        return;
      }
    }

    // Validate bond-specific fields
    if (assetData.assetType === 'bond') {
      if (!assetData.optionType) {
        showValidationError('Please select a bond type', 'bondType');
        return;
      }
      if (!assetData.strikePrice || assetData.strikePrice <= 0) {
        showValidationError('Please enter a valid coupon rate greater than 0', 'couponRate');
        return;
      }
      if (!assetData.expirationDate) {
        showValidationError('Please select a maturity date', 'maturityDate');
        return;
      }
    }

    if (!isGuestMode && !userId) {
      showValidationError('Unable to add asset: Please sign in or use guest mode', 'authentication');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isGuestMode) {
        // Add to guest portfolio
        const assetToAdd = {
          symbol: assetData.symbol.toUpperCase(),
          quantity: assetData.quantity,
          avgCost: assetData.avgCost,
          assetType: assetData.assetType,
          ...((assetData.assetType === 'option' || assetData.assetType === 'bond') && {
            optionType: assetData.optionType,
            strikePrice: assetData.strikePrice,
            expirationDate: assetData.expirationDate
          })
        };
        const result = GuestPortfolioService.addAssetsToGuestPortfolio(guestSessionId, [assetToAdd]);

        if (result.success) {
          await loadPortfolio();
          setShowAddForm(false);
          resetNewAsset();
        } else {
          showAssetAddError(assetData, () => handleAddAssetInternal(assetData));
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
              symbol: assetData.symbol.toUpperCase(),
              quantity: assetData.quantity,
              avgCost: assetData.avgCost,
              assetType: assetData.assetType,
              purchaseDate: assetData.purchaseDate,
              ...((assetData.assetType === 'option' || assetData.assetType === 'bond') && {
                optionType: assetData.optionType,
                strikePrice: assetData.strikePrice,
                expirationDate: assetData.expirationDate
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
          resetNewAsset();
        } else {
          showAssetAddError(assetData, () => handleAddAssetInternal(assetData));
        }
      }
    } catch (err) {
      console.error('Add asset error:', err);
      showAssetAddError(assetData, () => handleAddAssetInternal(assetData));
    } finally {
      setLoading(false);
    }
  }, [isGuestMode, userId, portfolioId, guestSessionId, loadPortfolio]);

  // Add asset from wizard
  const handleAddAsset = () => {
    handleAddAssetInternal(newAsset);
  };

  // Handle wizard cancel
  const handleWizardCancel = () => {
    setShowAddForm(false);
    resetNewAsset();
  };

  // Start editing an asset
  const startEdit = useCallback((asset: DisplayAsset) => {
    startEditing(asset.id, {
      symbol: asset.symbol,
      quantity: asset.quantity,
      avgCost: asset.avgCost,
      assetType: asset.assetType,
      optionType: asset.optionType,
      expirationDate: asset.expirationDate,
      strikePrice: asset.strikePrice
    });
  }, [startEditing]);

  // Save edit
  const saveEdit = useCallback(async () => {
    console.log('🟡 saveEdit called with:', { editingId, editValues });
    if (!editingId || !editValues.quantity || editValues.quantity <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }

    if (!isGuestMode && !userId) {
      showValidationError('Unable to update asset: Please sign in or use guest mode', 'authentication');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const asset = assets.find(a => a.id === editingId);
      if (!asset) return;

      if (isGuestMode) {
        // For guests, we need to rebuild the portfolio with updated asset
        try {
          const guestPortfolio = GuestPortfolioService.getGuestPortfolio(guestSessionId);
          const assetIndex = parseInt(editingId.replace('guest_', ''));
          
          if (guestPortfolio.assets[assetIndex]) {
            // Create updated asset with new values
            const updatedAsset = {
              ...guestPortfolio.assets[assetIndex],
              symbol: (editValues.symbol || asset.symbol).toUpperCase(),
              quantity: editValues.quantity || asset.quantity,
              avgCost: editValues.avgCost !== undefined ? editValues.avgCost : guestPortfolio.assets[assetIndex].avgCost,
              assetType: editValues.assetType || asset.assetType,
              addedAt: new Date() // Update the timestamp
            };
            
            // Update the asset in the portfolio
            guestPortfolio.assets[assetIndex] = updatedAsset;
            
            // Update portfolio metadata
            guestPortfolio.lastUpdated = new Date();
            guestPortfolio.totalValue = guestPortfolio.assets.reduce((sum, asset) => {
              return sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0);
            }, 0);
            
            // Save the updated portfolio back to storage
            // Note: The GuestPortfolioService automatically manages this via the Map reference
            
            // If onAssetsChange is provided, let the parent handle the reload
            if (onAssetsChange) {
              onAssetsChange(); // Notify parent to reload
            } else {
              await loadPortfolio(); // Only reload internally if no parent callback
            }
          } else {
            throw new Error(`Asset at index ${assetIndex} not found in guest portfolio`);
          }
        } catch (guestError) {
          console.error('Guest portfolio update error:', guestError);
          throw guestError; // Re-throw to be caught by outer catch block
        }
      } else if (userId) {
        // For authenticated users, use API
        // Check if any editable field changed
        if (editValues.quantity !== asset.quantity || 
            editValues.avgCost !== asset.avgCost || 
            editValues.symbol !== asset.symbol || 
            editValues.assetType !== asset.assetType) {
          const response = await fetch('/api/portfolio', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              portfolioId: portfolioId, // Include portfolio ID for multi-portfolio support
              symbol: asset.symbol, // Original symbol to identify the asset
              newSymbol: editValues.symbol || asset.symbol, // New symbol if changed
              quantity: editValues.quantity !== undefined ? editValues.quantity : asset.quantity,
              avgCost: editValues.avgCost !== undefined ? editValues.avgCost : asset.avgCost,
              assetType: editValues.assetType || asset.assetType
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Asset update failed:', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              requestBody: {
                portfolioId,
                symbol: asset.symbol,
                newSymbol: editValues.symbol || asset.symbol,
                quantity: editValues.quantity !== undefined ? editValues.quantity : asset.quantity,
                avgCost: editValues.avgCost !== undefined ? editValues.avgCost : asset.avgCost,
                assetType: editValues.assetType || asset.assetType
              }
            });
            throw new Error(errorData.error || 'Failed to update asset');
          }
        }
        // Only reload portfolio if the API call was successful
        // If onAssetsChange is provided, let the parent handle the reload
        if (onAssetsChange) {
          console.log('🔄 Calling onAssetsChange callback');
          onAssetsChange(); // Notify parent to reload
        } else {
          console.log('🔄 No onAssetsChange callback, calling loadPortfolio');
          await loadPortfolio(); // Only reload internally if no parent callback
        }
      }

      stopEditing();
    } catch (err) {
      console.error('Update asset error:', err);
      showAssetAddError(editValues, () => saveEdit());
      // Don't call stopEditing() on error to preserve the editing state
      setLoading(false);
      return; // Exit early on error
    }
    
    // Only set loading to false if we reach here (success)
    setLoading(false);
  }, [editingId, editValues, isGuestMode, userId, portfolioId, guestSessionId, assets, loadPortfolio]);

  // Delete asset
  const deleteAsset = useCallback(async (asset: DisplayAsset) => {
    if (!confirm(`Are you sure you want to delete ${asset.symbol} from your portfolio?`)) {
      return;
    }

    if (!isGuestMode && !userId) {
      showValidationError('Unable to delete asset: Please sign in or use guest mode', 'authentication');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isGuestMode) {
        // Remove from guest portfolio
        const success = GuestPortfolioService.removeAssetFromGuestPortfolio(guestSessionId, asset.symbol);
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
      showAssetAddError(asset, () => deleteAsset(asset));
      console.error('Delete asset error:', err);
    } finally {
      setLoading(false);
    }
  }, [isGuestMode, userId, portfolioId, guestSessionId, loadPortfolio]);

  // Calculate portfolio totals (simple calculations, no memoization needed)
  const totalPortfolioValue = assets.reduce((sum, asset) => sum + (asset.price ? asset.quantity * asset.price : 0), 0);
  const totalCost = assets.reduce((sum, asset) => sum + (asset.avgCost ? asset.quantity * asset.avgCost : 0), 0);
  const totalAssets = assets.length;

  if (loading && assets.length === 0) {
    return (
      <div className={showSummary ? "p-6" : ""}>
        {/* Portfolio Summary Skeleton */}
        {showSummary && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-lg border animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}
        
        {/* Assets Loading Skeleton */}
        <div className="mb-4 flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        
        {/* Mobile Card Skeletons */}
        <div className="block md:hidden space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow border p-4 animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="text-right">
                  <div className="h-6 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-12 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-8"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-14 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-10"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-18 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="flex space-x-2">
                <div className="h-10 bg-gray-200 rounded flex-1"></div>
                <div className="h-10 bg-gray-200 rounded flex-1"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Desktop Table Skeleton */}
        <div className="hidden md:block rounded-md border">
          <div className="space-y-4 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Helper functions for cleaner conditional rendering
  const isEditingAsset = (assetId: string) => editingId === assetId;
  
  const renderEditableSymbolCell = (asset: DisplayAsset) => {
    if (isEditingAsset(asset.id)) {
      return (
        <Input
          type="text"
          value={getEditValue('symbol') || ''}
          onChange={(e) => updateEditValues({ symbol: e.target.value.toUpperCase() })}
          className="w-full min-w-16 max-w-20"
        />
      );
    }
    return <div className="text-sm font-medium text-gray-900">{asset.symbol}</div>;
  };

  const renderEditableQuantityCell = (asset: DisplayAsset) => {
    if (isEditingAsset(asset.id)) {
      return (
        <Input
          type="text"
          inputMode="decimal"
          value={getEditValue('quantity') || ''}
          onChange={(e) => {
            const parseResult = QuantityValidationUtils.parseQuantity(e.target.value);
            updateEditValues({ quantity: parseResult.value });
          }}
          className="w-full min-w-20 max-w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="0"
          step="0.01"
        />
      );
    }
    return <div className="text-sm text-gray-900">{QuantityValidationUtils.formatQuantity(asset.quantity)}</div>;
  };

  const renderEditableAvgCostCell = (asset: DisplayAsset) => {
    if (isEditingAsset(asset.id)) {
      return (
        <Input
          type="text"
          inputMode="decimal"
          value={getEditValue('avgCost') || ''}
          onChange={(e) => updateEditValues({ avgCost: parseFloat(e.target.value) || undefined })}
          className="w-full min-w-20 max-w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="Optional"
        />
      );
    }
    return (
      <div className="text-sm text-gray-900">
        {asset.avgCost ? `$${asset.avgCost.toFixed(2)}` : '-'}
      </div>
    );
  };

  const renderEditableAssetTypeCell = (asset: DisplayAsset) => {
    if (isEditingAsset(asset.id)) {
      return (
        <Select
          value={getEditValue('assetType') || ''}
          onValueChange={(value) => updateEditValues({ assetType: value })}
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
      );
    }
    return (
      <Badge variant="secondary">
        {asset.assetType}
      </Badge>
    );
  };

  const renderActionButtons = (asset: DisplayAsset) => {
    const isLoading = Boolean(loading);
    
    if (isEditingAsset(asset.id)) {
      return (
        <div className="flex space-x-3 sm:space-x-2">
          <Button
            onClick={() => {
              console.log('🔴 Save button clicked!');
              saveEdit();
            }}
            disabled={isLoading}
            size="sm"
            className="text-xs px-2 py-1 h-7"
          >
            Save
          </Button>
          <Button
            onClick={stopEditing}
            variant="outline"
            size="sm"
            className="text-xs px-2 py-1 h-7"
          >
            Cancel
          </Button>
        </div>
      );
    }
    return (
      <div className="flex space-x-3 sm:space-x-2">
        <Button
          onClick={() => startEdit(asset)}
          variant="outline"
          size="sm"
          className="text-xs px-2 py-1 h-7"
        >
          Edit
        </Button>
        <Button
          onClick={() => deleteAsset(asset)}
          variant="destructive"
          size="sm"
          className="text-xs px-2 py-1 h-7"
        >
          Delete
        </Button>
      </div>
    );
  };

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

      {/* Guest Mode Indicator */}
      {isGuestMode && (
        <div className="mb-6">
          <GuestModeIndicator 
            variant="compact"
          />
        </div>
      )}

      {/* Comprehensive Error System */}
      <ErrorContainer className="mb-4" />

      {/* Legacy Error Display (for backward compatibility) */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            {error}
            <Button
              variant="ghost"
              onClick={() => setError(null)}
              className="h-auto p-1 hover:bg-transparent min-h-[44px] min-w-[44px]"
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
          disabled={Boolean(loading) || Boolean(showAddForm)}
        >
          + Add Asset
        </Button>
      </div>

      {/* Add Asset Wizard */}
      {showAddForm && (
        <div className="mb-6">
          <AssetAdditionWizard
            onSubmit={handleWizardSubmit}
            onCancel={handleWizardCancel}
            loading={loading}
          />
        </div>
      )}

      {/* Assets Display */}
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
        <>
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-lg shadow border p-4">
                {editingId === asset.id ? (
                  // Editing card
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Edit Asset</h3>
                      <Badge variant="secondary">{asset.assetType}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                        <Input
                          type="text"
                          value={editValues.symbol || ''}
                          onChange={(e) => updateEditValues({ symbol: e.target.value.toUpperCase() })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editValues.quantity || ''}
                          onChange={(e) => {
                            const parseResult = QuantityValidationUtils.parseQuantity(e.target.value);
                            updateEditValues({ quantity: parseResult.value });
                          }}
                          className="w-full"
                          placeholder="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Average Cost</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editValues.avgCost || ''}
                          onChange={(e) => updateEditValues({ avgCost: parseFloat(e.target.value) || undefined })}
                          className="w-full"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button
                        onClick={saveEdit}
                        disabled={Boolean(loading)}
                        className="flex-1 text-green-600 hover:text-green-900 border-green-200 hover:border-green-300 min-h-[44px]"
                        variant="outline"
                      >
                        Save Changes
                      </Button>
                      <Button
                        onClick={stopEditing}
                        variant="outline"
                        className="flex-1 text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300 min-h-[44px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display card
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{asset.symbol}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {asset.assetType}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${asset.totalValue.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Total Value</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Quantity</div>
                        <div className="font-medium text-gray-900">{QuantityValidationUtils.formatQuantity(asset.quantity)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Current Price</div>
                        <div className="font-medium text-gray-900">
                          {asset.price ? `$${asset.price.toFixed(2)}` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Avg Cost</div>
                        <div className="font-medium text-gray-900">
                          {asset.avgCost ? `$${asset.avgCost.toFixed(2)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Purchase Date</div>
                        <div className="font-medium text-gray-900">
                          {formatPurchaseDate(asset.purchaseDate)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Asset Details for Options/Bonds */}
                    {asset.assetType === 'option' && (
                      <div className="bg-blue-50 rounded-lg p-3 text-sm">
                        <div className="font-medium text-blue-800 mb-1">Option Details</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-blue-600">Type:</span> {asset.optionType ? asset.optionType.toUpperCase() : 'N/A'}
                          </div>
                          <div>
                            <span className="text-blue-600">Strike:</span> ${asset.strikePrice ? asset.strikePrice.toFixed(2) : 'N/A'}
                          </div>
                          <div className="col-span-2">
                            <span className="text-blue-600">Expiration:</span> {asset.expirationDate ? 
                              new Date(asset.expirationDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {asset.assetType === 'bond' && (
                      <div className="bg-green-50 rounded-lg p-3 text-sm">
                        <div className="font-medium text-green-800 mb-1">Bond Details</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-green-600">Type:</span> {asset.optionType ? asset.optionType.toUpperCase() : 'N/A'}
                          </div>
                          <div>
                            <span className="text-green-600">Coupon:</span> {asset.strikePrice ? `${asset.strikePrice}%` : 'N/A'}
                          </div>
                          <div className="col-span-2">
                            <span className="text-green-600">Maturity:</span> {asset.expirationDate ? 
                              new Date(asset.expirationDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}

                    
                    {/* Expand metrics button (mobile) */}
                    {asset.metrics && (
                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(asset.id)}
                          className="w-full justify-between text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <span className="text-sm">View Financial Metrics</span>
                          {expandedRows.has(asset.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Expanded metrics (mobile) */}
                    {expandedRows.has(asset.id) && asset.metrics && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-blue-900">Financial Metrics</h5>
                          {asset.metrics.sector && (
                            <Badge variant="secondary" className="text-xs">
                              {asset.metrics.sector}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {asset.metrics.beta !== null && (
                            <div className="bg-white rounded-md p-3 text-center">
                              <div className="text-xs text-gray-500 mb-1">Beta</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {asset.metrics.beta.toFixed(2)}
                              </div>
                            </div>
                          )}
                          
                          {asset.metrics.peRatio !== null && (
                            <div className="bg-white rounded-md p-3 text-center">
                              <div className="text-xs text-gray-500 mb-1">P/E Ratio</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {asset.metrics.peRatio.toFixed(1)}
                              </div>
                            </div>
                          )}
                          
                          {asset.metrics.dividendYield !== null && (
                            <div className="bg-white rounded-md p-3 text-center">
                              <div className="text-xs text-gray-500 mb-1">Dividend</div>
                              <div className="text-lg font-semibold text-green-600">
                                {asset.metrics.dividendYield.toFixed(1)}%
                              </div>
                            </div>
                          )}
                          
                          {asset.metrics.eps !== null && (
                            <div className="bg-white rounded-md p-3 text-center">
                              <div className="text-xs text-gray-500 mb-1">EPS</div>
                              <div className="text-lg font-semibold text-gray-900">
                                ${asset.metrics.eps.toFixed(2)}
                              </div>
                            </div>
                          )}
                          
                          {asset.metrics.volatility !== null && (
                            <div className="bg-white rounded-md p-3 text-center col-span-2">
                              <div className="text-xs text-gray-500 mb-1">Volatility</div>
                              <div className="text-lg font-semibold text-orange-600">
                                {asset.metrics.volatility.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {(asset.metrics.industry || asset.metrics.marketCap) && (
                          <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
                            {asset.metrics.industry && (
                              <div className="mb-1"><span className="font-medium">Industry:</span> {asset.metrics.industry}</div>
                            )}
                            {asset.metrics.marketCap !== null && (
                              <div className="mb-1"><span className="font-medium">Market Cap:</span> ${(asset.metrics.marketCap / 1000000000).toFixed(1)}B</div>
                            )}
                            <div><span className="font-medium">Updated:</span> {new Date(asset.metrics.lastUpdated).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex space-x-2 pt-2">
                      <Button
                        onClick={() => startEdit(asset)}
                        variant="outline"
                        disabled={Boolean(loading)}
                        className="flex-1 text-indigo-600 hover:text-indigo-900 border-indigo-200 hover:border-indigo-300 min-h-[44px]"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteAsset(asset)}
                        variant="outline"
                        disabled={Boolean(loading)}
                        className="flex-1 text-red-600 hover:text-red-900 border-red-200 hover:border-red-300 min-h-[44px]"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block">
            <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Avg Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Asset Details</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <React.Fragment key={asset.id}>
                  <TableRow className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(asset.id)}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        disabled={!asset.metrics}
                        title={asset.metrics ? 'Click to view financial metrics' : 'No financial metrics available'}
                      >
                        {expandedRows.has(asset.id) && asset.metrics ? (
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronRight className={`h-4 w-4 ${asset.metrics ? 'text-gray-600' : 'text-gray-300'}`} />
                        )}
                      </Button>
                    </TableCell>
                  <TableCell>
                    {renderEditableSymbolCell(asset)}
                  </TableCell>
                  <TableCell>
                    {renderEditableQuantityCell(asset)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {asset.price ? `$${asset.price.toFixed(2)}` : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderEditableAvgCostCell(asset)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">
                      ${asset.totalValue.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderEditableAssetTypeCell(asset)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {formatPurchaseDate(asset.purchaseDate)}
                    </div>
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
                    {renderActionButtons(asset)}
                  </TableCell>
                </TableRow>
                
                {/* Expanded Metrics Row */}
                {expandedRows.has(asset.id) && asset.metrics && (
                  <TableRow className="bg-gray-50/50">
                    <TableCell></TableCell>
                    <TableCell colSpan={9} className="p-0">
                      <div className="px-6 py-4 border-l-4 border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">Financial Metrics - {asset.symbol}</h4>
                          {asset.metrics.sector && (
                            <Badge variant="secondary" className="text-xs">
                              {asset.metrics.sector}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {asset.metrics.beta !== null && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs font-medium text-gray-500 mb-1">Beta</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {asset.metrics.beta.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Market risk</div>
                            </div>
                          )}
                          
                          {asset.metrics.peRatio !== null && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs font-medium text-gray-500 mb-1">P/E Ratio</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {asset.metrics.peRatio.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Price to earnings</div>
                            </div>
                          )}
                          
                          {asset.metrics.dividendYield !== null && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs font-medium text-gray-500 mb-1">Dividend Yield</div>
                              <div className="text-lg font-semibold text-green-600">
                                {asset.metrics.dividendYield.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Annual dividend</div>
                            </div>
                          )}
                          
                          {asset.metrics.eps !== null && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs font-medium text-gray-500 mb-1">EPS</div>
                              <div className="text-lg font-semibold text-gray-900">
                                ${asset.metrics.eps.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Earnings per share</div>
                            </div>
                          )}
                          
                          {asset.metrics.volatility !== null && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs font-medium text-gray-500 mb-1">Volatility</div>
                              <div className="text-lg font-semibold text-orange-600">
                                {asset.metrics.volatility.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Price volatility</div>
                            </div>
                          )}
                        </div>
                        
                        {(asset.metrics.industry || asset.metrics.marketCap) && (
                          <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                            {asset.metrics.industry && (
                              <div><span className="font-medium">Industry:</span> {asset.metrics.industry}</div>
                            )}
                            {asset.metrics.marketCap !== null && (
                              <div><span className="font-medium">Market Cap:</span> ${(asset.metrics.marketCap / 1000000000).toFixed(1)}B</div>
                            )}
                            <div><span className="font-medium">Last Updated:</span> {new Date(asset.metrics.lastUpdated).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const PortfolioTable = React.memo(PortfolioTableComponent);