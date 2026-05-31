// Single source of truth for portfolio and asset domain types.

import type { AssetMetrics } from '../asset-metrics-service';
import type { Account as PrismaAccount, RealEstateDetails as PrismaRealEstateDetails } from '@prisma/client';

// Convenience: an Account plus its (optional) RealEstateDetails — mirrors lib/accounts/types
// but lives here so portfolio types remain self-contained.
export type PortfolioAccount = PrismaAccount & { realEstate: PrismaRealEstateDetails | null };

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
  // Phase 2 declutter: accounts inside this portfolio (loaded by getPortfolioWithMarketValues
  // so the UI can render account-type chips on the header without a second round-trip).
  accounts?: PortfolioAccount[];
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

  // Phase 2: which Account inside the Portfolio this asset belongs to (nullable until backfilled).
  accountId?: string | null;

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
  // Phase 2 declutter: accounts may be present on the wire so the header can render
  // type chips inline. Optional so older callers stay compatible.
  accounts?: PortfolioAccount[];
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
