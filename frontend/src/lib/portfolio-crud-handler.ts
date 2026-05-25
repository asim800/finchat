// Re-export shim: portfolio CRUD logic was split into ./portfolio-crud/*.
// Existing imports from '@/lib/portfolio-crud-handler' keep working unchanged.

export { PortfolioCrudHandler } from './portfolio-crud';
export type { CrudResult, PortfolioPosition } from './portfolio-crud';
