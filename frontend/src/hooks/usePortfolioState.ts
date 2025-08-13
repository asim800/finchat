// ============================================================================
// FILE: hooks/usePortfolioState.ts
// Simplified portfolio state management with useReducer
// ============================================================================

import { useReducer, useCallback, useEffect } from 'react';

// Types
export interface DisplayAsset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  price?: number | null;
  assetType: string;
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
  purchaseDate?: Date | null;
  
  // Options-specific fields
  optionType?: string | null;
  expirationDate?: Date | null;
  strikePrice?: number | null;
}

export interface NewAsset {
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  assetType: string;
  purchaseDate?: string; // String for form input
  
  // Options-specific fields
  optionType?: string;
  expirationDate?: string; // String for form input
  strikePrice?: number;
}

// State interface
interface PortfolioState {
  assets: DisplayAsset[];
  loading: boolean;
  error: string | null;
  
  // Edit state
  editingId: string | null;
  editValues: Partial<DisplayAsset>;
  
  // Add form state
  showAddForm: boolean;
  newAsset: NewAsset;
}

// Action types
type PortfolioAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ASSETS'; payload: DisplayAsset[] }
  | { type: 'ADD_ASSET'; payload: DisplayAsset }
  | { type: 'UPDATE_ASSET'; payload: { id: string; asset: Partial<DisplayAsset> } }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'START_EDITING'; payload: { id: string; values: Partial<DisplayAsset> } }
  | { type: 'STOP_EDITING' }
  | { type: 'UPDATE_EDIT_VALUES'; payload: Partial<DisplayAsset> }
  | { type: 'SHOW_ADD_FORM'; payload: boolean }
  | { type: 'UPDATE_NEW_ASSET'; payload: Partial<NewAsset> }
  | { type: 'RESET_NEW_ASSET' }
  | { type: 'CLEAR_ALL_ERRORS' };

// Initial state
const createInitialNewAsset = (): NewAsset => ({
  symbol: '',
  quantity: 0,
  avgCost: undefined,
  assetType: 'stock',
  purchaseDate: undefined,
  optionType: undefined,
  expirationDate: undefined,
  strikePrice: undefined
});

const createInitialState = (initialAssets?: DisplayAsset[]): PortfolioState => ({
  assets: initialAssets || [],
  loading: !initialAssets, // Only loading if no initial assets
  error: null,
  editingId: null,
  editValues: {},
  showAddForm: false,
  newAsset: createInitialNewAsset()
});

// Reducer function
const portfolioReducer = (state: PortfolioState, action: PortfolioAction): PortfolioState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
      
    case 'SET_ASSETS':
      return { ...state, assets: action.payload, loading: false, error: null };
      
    case 'ADD_ASSET':
      return { 
        ...state, 
        assets: [...state.assets, action.payload],
        showAddForm: false,
        newAsset: createInitialNewAsset(),
        error: null
      };
      
    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: state.assets.map(asset =>
          asset.id === action.payload.id 
            ? { ...asset, ...action.payload.asset }
            : asset
        ),
        editingId: null,
        editValues: {},
        error: null
      };
      
    case 'DELETE_ASSET':
      return {
        ...state,
        assets: state.assets.filter(asset => asset.id !== action.payload),
        error: null
      };
      
    case 'START_EDITING':
      return {
        ...state,
        editingId: action.payload.id,
        editValues: action.payload.values
      };
      
    case 'STOP_EDITING':
      return {
        ...state,
        editingId: null,
        editValues: {}
      };
      
    case 'UPDATE_EDIT_VALUES':
      return {
        ...state,
        editValues: { ...state.editValues, ...action.payload }
      };
      
    case 'SHOW_ADD_FORM':
      return {
        ...state,
        showAddForm: action.payload,
        newAsset: action.payload ? state.newAsset : createInitialNewAsset()
      };
      
    case 'UPDATE_NEW_ASSET':
      return {
        ...state,
        newAsset: { ...state.newAsset, ...action.payload }
      };
      
    case 'RESET_NEW_ASSET':
      return {
        ...state,
        newAsset: createInitialNewAsset()
      };
      
    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
};

// Custom hook
export const usePortfolioState = (
  initialAssets?: DisplayAsset[],
  onAssetsChange?: (assets: DisplayAsset[]) => void
) => {
  const [state, dispatch] = useReducer(portfolioReducer, createInitialState(initialAssets));

  // Update assets when initialAssets changes
  useEffect(() => {
    if (initialAssets) {
      dispatch({ type: 'SET_ASSETS', payload: initialAssets });
    }
  }, [initialAssets]);

  // Wrapper to call onAssetsChange when assets change
  const updateAssets = useCallback((assets: DisplayAsset[]) => {
    dispatch({ type: 'SET_ASSETS', payload: assets });
    if (onAssetsChange) {
      onAssetsChange(assets);
    }
  }, [onAssetsChange]);

  // Action creators
  const actions = {
    setLoading: useCallback((loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }), []),
    
    setError: useCallback((error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }), []),
    
    setAssets: updateAssets,
    
    addAsset: useCallback((asset: DisplayAsset) => {
      dispatch({ type: 'ADD_ASSET', payload: asset });
      if (onAssetsChange) {
        onAssetsChange([...state.assets, asset]);
      }
    }, [state.assets, onAssetsChange]),
    
    updateAsset: useCallback((id: string, asset: Partial<DisplayAsset>) => {
      dispatch({ type: 'UPDATE_ASSET', payload: { id, asset } });
      if (onAssetsChange) {
        const updatedAssets = state.assets.map(a =>
          a.id === id ? { ...a, ...asset } : a
        );
        onAssetsChange(updatedAssets);
      }
    }, [state.assets, onAssetsChange]),
    
    deleteAsset: useCallback((id: string) => {
      dispatch({ type: 'DELETE_ASSET', payload: id });
      if (onAssetsChange) {
        const updatedAssets = state.assets.filter(a => a.id !== id);
        onAssetsChange(updatedAssets);
      }
    }, [state.assets, onAssetsChange]),
    
    startEditing: useCallback((id: string, values: Partial<DisplayAsset>) =>
      dispatch({ type: 'START_EDITING', payload: { id, values } }), []),
    
    stopEditing: useCallback(() =>
      dispatch({ type: 'STOP_EDITING' }), []),
    
    updateEditValues: useCallback((values: Partial<DisplayAsset>) =>
      dispatch({ type: 'UPDATE_EDIT_VALUES', payload: values }), []),
    
    setShowAddForm: useCallback((show: boolean) =>
      dispatch({ type: 'SHOW_ADD_FORM', payload: show }), []),
    
    updateNewAsset: useCallback((values: Partial<NewAsset>) =>
      dispatch({ type: 'UPDATE_NEW_ASSET', payload: values }), []),
    
    resetNewAsset: useCallback(() =>
      dispatch({ type: 'RESET_NEW_ASSET' }), []),
    
    clearAllErrors: useCallback(() =>
      dispatch({ type: 'CLEAR_ALL_ERRORS' }), [])
  };

  return {
    // State
    ...state,
    
    // Actions
    ...actions,
    
    // Computed values
    totalValue: state.assets.reduce((sum, asset) => sum + asset.totalValue, 0),
    assetCount: state.assets.length,
    
    // Helper functions
    isEditing: (id: string) => state.editingId === id,
    getEditValue: (field: keyof DisplayAsset) => state.editValues[field],
    hasAssets: state.assets.length > 0
  };
};