// Shared result type for portfolio CRUD operations.

export interface CrudResult {
  success: boolean;
  message: string;
  data?: {
    action: string;
    symbol: string;
    portfolio: string;
    changes: Array<{
      symbol: string;
      operation: 'added' | 'removed' | 'updated' | 'queried';
      quantity?: number;
      price?: number;
      previousValue?: number;
      newValue?: number;
    }>;
  };
  error?: string;
  executionTimeMs: number;
}

export type { PortfolioPosition } from '../types/portfolio';
