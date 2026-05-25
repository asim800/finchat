// Single source of truth for portfolio and asset domain types.

import type { AssetMetrics } from '../asset-metrics-service';

// --- Server / persistence shapes (Prisma-backed) ---

export interface Asset {
  id: string;
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  price?: number | null; // Current market price from historical data
  assetType: string;
  currentValue?: number | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseDate?: Date | null;

  // Options-specific fields
  optionType?: string | null;
  expirationDate?: Date | null;
  strikePrice?: number | null;

  // Asset metrics
  metrics?: AssetMetrics | null;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  assets: Asset[];
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- UI display shapes (used by portfolio components/hooks) ---

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

export interface DisplayPortfolio {
  id: string;
  name: string;
  description?: string | null;
  assets: DisplayAsset[];
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

// Form-input shape (string-typed dates for inputs)
export interface NewAsset {
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  assetType: string;
  purchaseDate?: string;

  // Options-specific fields
  optionType?: string;
  expirationDate?: string;
  strikePrice?: number;
}

// --- Chat / parsing shapes ---

export interface ParsedAsset {
  symbol: string;
  quantity: number;
  avgCost?: number | null;
  assetType?: string;
  purchaseDate?: string;

  // Options-specific fields
  optionType?: string;
  expirationDate?: string;
  strikePrice?: number;
}

export interface PortfolioParseResult {
  success: boolean;
  assets: ParsedAsset[];
  totalAssets: number;
  errors: string[];
  message: string;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost?: number;
  currentValue?: number;
  totalValue: number;
  portfolioName: string;
}

// Loose shape used only for prompt/context building (distinct from the
// persistence Portfolio above — intentionally not merged).
export interface PromptPortfolio {
  id: string;
  name: string;
  description?: string | null;
  assets: Array<{ symbol: string; [key: string]: unknown }>;
  totalValue: number;
}
