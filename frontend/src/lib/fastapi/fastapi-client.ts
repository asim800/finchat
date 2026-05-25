// FastAPI Client for Portfolio Analysis Microservice

import { PortfolioService } from '../portfolio-service';
import { conversationAnalytics } from '../conversation-analytics';
import { httpRequest, HttpError } from '../http';
import type {
  PortfolioRiskAnalysis,
  SharpeRatioAnalysis,
  MarketDataSummary,
  PortfolioOptimizationResponse,
  MonteCarloResponse,
  MarketSentimentResponse,
} from './types';

class FastAPIClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.FASTAPI_SERVICE_URL || 'http://localhost:8000';
    this.timeout = 30000; // 30 second timeout

    // Debug logging
    console.log('FastAPI Client initialized:');
    console.log('FASTAPI_SERVICE_URL:', process.env.FASTAPI_SERVICE_URL);
    console.log('Base URL:', this.baseUrl);
  }

  /**
   * Make HTTP request to FastAPI service with timeout and error handling
   */
  private async makeRequest<T>(endpoint: string, data: unknown, requestId?: string): Promise<T> {
    const startTime = Date.now();
    let status = 0;

    try {
      const result = await httpRequest<T>(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: data,
        timeoutMs: this.timeout,
        networkErrorLabel: 'FastAPI service unavailable',
        onResponse: (s) => { status = s; },
      });

      if (requestId) {
        conversationAnalytics.trackFastAPICall(
          requestId, endpoint, 'POST', Date.now() - startTime, status
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStatus = error instanceof HttpError ? (error.status ?? 0) : 0;

      if (requestId) {
        conversationAnalytics.trackFastAPICall(
          requestId, endpoint, 'POST', Date.now() - startTime, errorStatus, errorMessage
        );
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Fetch user's portfolio from database
   */
  private async fetchUserPortfolio(userId: string, portfolioId?: string): Promise<Array<{ symbol: string; shares: number }>> {
    try {
      // Use PortfolioService directly since we're on the server
      let portfolio;

      if (portfolioId) {
        // Get specific portfolio with market values
        portfolio = await PortfolioService.getPortfolioWithMarketValues(userId, portfolioId);
      } else {
        // Get default portfolio
        portfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
      }

      // Convert portfolio assets to the format expected by FastAPI
      if (portfolio && portfolio.assets && Array.isArray(portfolio.assets) && portfolio.assets.length > 0) {
        // Filter out options and bonds - FastAPI only supports stocks/ETFs
        const filteredAssets = portfolio.assets.filter((asset: any) => {
          const assetType = asset.assetType?.toLowerCase() || 'stock';

          // Filter out options, bonds, and symbols that look like options
          const isOption = assetType === 'option' || /\d{6}$/.test(asset.symbol);
          const isBond = assetType === 'bond' || asset.symbol.includes('GOVT') || asset.symbol.includes('BOND');

          return !isOption && !isBond && asset.quantity > 0;
        });

        const assets = filteredAssets.map((asset: { symbol: string; quantity: number }) => ({
          symbol: asset.symbol,
          shares: asset.quantity
        }));

        return assets;
      } else {
        console.warn('Portfolio is empty - no assets found');
        return []; // Return empty array instead of demo data
      }
    } catch (error) {
      console.error('Error fetching user portfolio:', error);
      console.warn('Returning empty portfolio due to error');
      return []; // Return empty array instead of demo data
    }
  }

  /**
   * Check if FastAPI service is available
   */
  async checkHealth(): Promise<{ available: boolean; error?: string }> {
    // Skip health check for now due to Vercel auth issues - assume available if URL is configured
    if (this.baseUrl && !this.baseUrl.includes('localhost')) {
      console.log('🔧 FastAPI service configured, skipping health check due to auth requirements');
      return { available: true };
    }

    // For localhost, still do health check
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      if (response.ok) {
        return { available: true };
      } else {
        return { available: false, error: `Service returned ${response.status}` };
      }
    } catch (error) {
      return {
        available: false,
        error: `FastAPI service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Calculate comprehensive portfolio risk metrics
   */
  async calculatePortfolioRisk(userId: string, portfolioId?: string, requestId?: string): Promise<PortfolioRiskAnalysis> {
    // Fetch user's actual portfolio from database
    const userAssets = await this.fetchUserPortfolio(userId, portfolioId);

    // Check if portfolio is empty
    if (!userAssets || userAssets.length === 0) {
      throw new Error('Portfolio is empty - please add some assets to analyze risk metrics');
    }

    const requestData = {
      assets: userAssets,
      timeframe: "1y"
    };

    return await this.makeRequest<PortfolioRiskAnalysis>('/portfolio/risk', requestData, requestId);
  }

  /**
   * Calculate Sharpe ratio for user's portfolios
   */
  async calculateSharpeRatio(userId: string, portfolioId?: string, requestId?: string): Promise<SharpeRatioAnalysis> {
    // Fetch user's actual portfolio from database
    const userAssets = await this.fetchUserPortfolio(userId, portfolioId);

    // Check if portfolio is empty
    if (!userAssets || userAssets.length === 0) {
      throw new Error('Portfolio is empty - please add some assets to calculate Sharpe ratio');
    }

    return await this.makeRequest<SharpeRatioAnalysis>('/portfolio/sharpe', {
      assets: userAssets
    }, requestId);
  }

  /**
   * Get market data summary for portfolio symbols
   */
  async getPortfolioMarketData(userId: string, period: string = '1mo', _portfolioId?: string, requestId?: string): Promise<MarketDataSummary> {
    return await this.makeRequest<MarketDataSummary>('/portfolio/market-data', {
      user_id: userId,
      period: period
    }, requestId);
  }

  /**
   * Optimize portfolio allocation using Modern Portfolio Theory
   */
  async optimizePortfolio(
    userId: string,
    portfolioId?: string,
    objective: string = "max_sharpe",
    riskTolerance: number = 0.5,
    requestId?: string
  ): Promise<PortfolioOptimizationResponse> {
    // Fetch user's actual portfolio from database
    const userAssets = await this.fetchUserPortfolio(userId, portfolioId);

    // Check if portfolio is empty
    if (!userAssets || userAssets.length === 0) {
      throw new Error('Portfolio is empty - please add some assets to optimize allocation');
    }

    // Check minimum assets for optimization
    if (userAssets.length < 2) {
      throw new Error('Need at least 2 assets for portfolio optimization');
    }

    const requestData = {
      assets: userAssets,
      objective,
      risk_tolerance: riskTolerance,
      constraints: null
    };

    return await this.makeRequest<PortfolioOptimizationResponse>('/portfolio/optimize', requestData, requestId);
  }

  /**
   * Run Monte Carlo simulation for portfolio projections
   */
  async runMonteCarloSimulation(
    userId: string,
    portfolioId?: string,
    timeHorizonYears: number = 10,
    simulations: number = 10000,
    initialInvestment: number = 100000,
    requestId?: string
  ): Promise<MonteCarloResponse> {
    // Fetch user's actual portfolio from database
    const userAssets = await this.fetchUserPortfolio(userId, portfolioId);

    // Check if portfolio is empty
    if (!userAssets || userAssets.length === 0) {
      throw new Error('Portfolio is empty - please add some assets to run Monte Carlo simulation');
    }

    const requestData = {
      assets: userAssets,
      time_horizon_years: timeHorizonYears,
      simulations,
      initial_investment: initialInvestment
    };

    return await this.makeRequest<MonteCarloResponse>('/portfolio/monte-carlo', requestData, requestId);
  }

  /**
   * Analyze market sentiment for user's portfolio symbols
   */
  async analyzeMarketSentiment(
    userId: string,
    portfolioId?: string,
    timeRange: string = '24h',
    newsSources: string[] = ['general'],
    requestId?: string
  ): Promise<MarketSentimentResponse> {
    // Fetch user's actual portfolio symbols from database
    const userAssets = await this.fetchUserPortfolio(userId, portfolioId);

    // Check if portfolio is empty
    if (!userAssets || userAssets.length === 0) {
      throw new Error('Portfolio is empty - please add some assets to analyze sentiment');
    }

    const symbols = userAssets.map(asset => asset.symbol);

    const requestData = {
      symbols,
      news_sources: newsSources,
      time_range: timeRange
    };

    return await this.makeRequest<MarketSentimentResponse>('/market/sentiment', requestData, requestId);
  }
}

// Export singleton instance
export const fastAPIClient = new FastAPIClient();
export { FastAPIClient };
