// Helpers for resolving a user's portfolio by name, with default fallback.

import { PortfolioService, Portfolio } from '../portfolio-service';

// Find a portfolio by name (exact, then partial, then default for "main").
export async function findPortfolioByName(userId: string, portfolioName: string): Promise<Portfolio | null> {
  try {
    const portfolios = await PortfolioService.getUserPortfolios(userId);

    let portfolio = portfolios.find(p =>
      p.name.toLowerCase() === portfolioName.toLowerCase()
    );

    if (!portfolio) {
      portfolio = portfolios.find(p =>
        p.name.toLowerCase().includes(portfolioName.toLowerCase())
      );
    }

    if (!portfolio && portfolioName.toLowerCase() === 'main') {
      portfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
    }

    return portfolio || null;
  } catch (error) {
    console.error('Error finding portfolio by name:', error);
    return null;
  }
}

// Resolve a portfolio, falling back to the default and reporting the fallback.
export async function findPortfolioWithFallback(
  userId: string,
  portfolioName?: string
): Promise<{ portfolio: Portfolio | null; fallbackMessage?: string }> {
  if (!portfolioName) {
    const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
    return { portfolio };
  }

  const portfolio = await findPortfolioByName(userId, portfolioName);

  if (!portfolio) {
    const defaultPortfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
    if (defaultPortfolio) {
      return {
        portfolio: defaultPortfolio,
        fallbackMessage: `I did not find '${portfolioName}' portfolio. Using ${defaultPortfolio.name} portfolio instead.`
      };
    }
  }

  return { portfolio };
}
