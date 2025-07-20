// ============================================================================
// FILE: lib/unified-analysis-service.ts
// Financial analysis service using FastAPI backend
// ============================================================================

import { fastAPIClient, formatRiskAnalysis as fastapiFormatRisk, formatSharpeAnalysis as fastapiFormatSharpe, formatPortfolioOptimization, formatMonteCarloSimulation, formatSentimentAnalysis } from './fastapi-client';

export interface AnalysisResult {
  success: boolean;
  data?: unknown;
  formattedData?: string;
  error?: string;
  backend: 'fastapi';
  fallbackUsed: false;
}

class UnifiedAnalysisService {
  
  /**
   * Check if FastAPI backend is available
   */
  private async checkBackendHealth(): Promise<boolean> {
    try {
      const health = await fastAPIClient.checkHealth();
      return health.available;
    } catch (error) {
      console.error('FastAPI health check failed:', error);
      return false;
    }
  }

  /**
   * Execute analysis using FastAPI backend
   */
  private async executeAnalysis<T>(
    operation: string,
    execution: () => Promise<T>,
    formatter: (data: T) => string
  ): Promise<AnalysisResult> {
    console.log(`🔍 Starting ${operation} with FastAPI backend`);

    try {
      const isHealthy = await this.checkBackendHealth();
      
      if (!isHealthy) {
        throw new Error('FastAPI backend not healthy');
      }
      
      const data = await execution();
      
      // Check if the result indicates an error
      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error(data.error as string);
      }
      
      return {
        success: true,
        data,
        formattedData: formatter(data),
        backend: 'fastapi',
        fallbackUsed: false
      };
    } catch (error) {
      console.error(`❌ FastAPI backend failed for ${operation}:`, error);
      
      return {
        success: false,
        error: `FastAPI backend failed: ${error instanceof Error ? error.message : String(error)}`,
        backend: 'fastapi',
        fallbackUsed: false
      };
    }
  }

  /**
   * Calculate portfolio risk using FastAPI backend
   */
  async calculatePortfolioRisk(userId: string, portfolioId?: string): Promise<AnalysisResult> {
    console.log('🔍 UnifiedAnalysisService calculatePortfolioRisk called with:', { userId, portfolioId });
    return await this.executeAnalysis(
      'portfolio risk analysis',
      () => fastAPIClient.calculatePortfolioRisk(userId, portfolioId),
      (data) => fastapiFormatRisk(data)
    );
  }

  /**
   * Calculate Sharpe ratio using FastAPI backend
   */
  async calculateSharpeRatio(userId: string, portfolioId?: string): Promise<AnalysisResult> {
    return await this.executeAnalysis(
      'Sharpe ratio analysis',
      () => fastAPIClient.calculateSharpeRatio(userId, portfolioId),
      (data) => fastapiFormatSharpe(data)
    );
  }

  /**
   * Get portfolio market data using FastAPI backend
   */
  async getPortfolioMarketData(userId: string, period: string = '1mo', portfolioId?: string): Promise<AnalysisResult> {
    return await this.executeAnalysis(
      'market data analysis',
      () => fastAPIClient.getPortfolioMarketData(userId, period, portfolioId),
      (data) => {
        // Market data formatting
        if (data && typeof data === 'object' && 'market_data' in data) {
          const marketDataObj = data as { period: string; market_data: Record<string, { current_price: number; period_return: number }> };
          let formatted = `📊 **Market Data Summary** (${marketDataObj.period})\n\n`;
          Object.entries(marketDataObj.market_data).forEach(([symbol, marketData]) => {
            formatted += `• **${symbol}**: $${marketData.current_price} (${marketData.period_return > 0 ? '+' : ''}${marketData.period_return}%)\n`;
          });
          return formatted + '\n';
        }
        return 'No market data available';
      }
    );
  }

  /**
   * Optimize portfolio allocation using FastAPI backend
   */
  async optimizePortfolio(
    userId: string, 
    portfolioId?: string,
    objective: string = "max_sharpe",
    riskTolerance: number = 0.5
  ): Promise<AnalysisResult> {
    console.log('🎯 UnifiedAnalysisService optimizePortfolio called with:', { userId, portfolioId, objective, riskTolerance });
    return await this.executeAnalysis(
      'portfolio optimization',
      () => fastAPIClient.optimizePortfolio(userId, portfolioId, objective, riskTolerance),
      (data) => formatPortfolioOptimization(data as any)
    );
  }

  /**
   * Run Monte Carlo simulation using FastAPI backend
   */
  async runMonteCarloSimulation(
    userId: string,
    portfolioId?: string,
    timeHorizonYears: number = 10,
    simulations: number = 10000,
    initialInvestment: number = 100000
  ): Promise<AnalysisResult> {
    console.log('🎲 UnifiedAnalysisService runMonteCarloSimulation called with:', { userId, portfolioId, timeHorizonYears, simulations });
    return await this.executeAnalysis(
      'Monte Carlo simulation',
      () => fastAPIClient.runMonteCarloSimulation(userId, portfolioId, timeHorizonYears, simulations, initialInvestment),
      (data) => formatMonteCarloSimulation(data as any)
    );
  }

  /**
   * Analyze market sentiment using FastAPI backend
   */
  async analyzeMarketSentiment(
    userId: string,
    portfolioId?: string,
    timeRange: string = '24h',
    newsSources: string[] = ['general']
  ): Promise<AnalysisResult> {
    console.log('📰 UnifiedAnalysisService analyzeMarketSentiment called with:', { userId, portfolioId, timeRange, newsSources });
    return await this.executeAnalysis(
      'market sentiment analysis',
      () => fastAPIClient.analyzeMarketSentiment(userId, portfolioId, timeRange, newsSources),
      (data) => formatSentimentAnalysis(data as any)
    );
  }

  /**
   * Analyze a query and route to appropriate backend service
   */
  async analyzeQuery(query: string, userId: string, portfolios: unknown[] = []): Promise<{ content: string; backend: 'fastapi' }> {
    console.log('🔍 UnifiedAnalysisService analyzeQuery called with:', { query, userId, portfoliosCount: portfolios.length });
    
    const lowerQuery = query.toLowerCase();
    
    // Determine which analysis type is needed
    if (lowerQuery.includes('risk') || lowerQuery.includes('volatility') || lowerQuery.includes('var') || lowerQuery.includes('drawdown')) {
      console.log('📊 Routing to portfolio risk analysis');
      const result = await this.calculatePortfolioRisk(userId, (portfolios[0] as any)?.id);
      return {
        content: result.formattedData || `Portfolio risk analysis completed. Success: ${result.success}`,
        backend: result.backend
      };
    }
    
    if (lowerQuery.includes('sharpe') || lowerQuery.includes('risk adjusted') || lowerQuery.includes('risk-adjusted')) {
      console.log('📈 Routing to Sharpe ratio analysis');
      const result = await this.calculateSharpeRatio(userId, (portfolios[0] as any)?.id);
      return {
        content: result.formattedData || `Sharpe ratio analysis completed. Success: ${result.success}`,
        backend: result.backend
      };
    }
    
    if (lowerQuery.includes('optimize') || lowerQuery.includes('optimization') || lowerQuery.includes('allocation')) {
      console.log('⚖️ Routing to portfolio optimization');
      const result = await this.optimizePortfolio(userId, (portfolios[0] as any)?.id);
      return {
        content: result.formattedData || `Portfolio optimization completed. Success: ${result.success}`,
        backend: result.backend
      };
    }
    
    if (lowerQuery.includes('monte carlo') || lowerQuery.includes('simulation') || lowerQuery.includes('scenario')) {
      console.log('🎲 Routing to Monte Carlo simulation');
      const result = await this.runMonteCarloSimulation(userId, (portfolios[0] as any)?.id);
      return {
        content: result.formattedData || `Monte Carlo simulation completed. Success: ${result.success}`,
        backend: result.backend
      };
    }
    
    if (lowerQuery.includes('sentiment') || lowerQuery.includes('news') || lowerQuery.includes('bullish') || lowerQuery.includes('bearish')) {
      console.log('📰 Routing to market sentiment analysis');
      const result = await this.analyzeMarketSentiment(userId, (portfolios[0] as any)?.id);
      return {
        content: result.formattedData || `Market sentiment analysis completed. Success: ${result.success}`,
        backend: result.backend
      };
    }
    
    // Default to portfolio risk analysis for performance-related queries
    if (lowerQuery.includes('performance') || lowerQuery.includes('analyze') || lowerQuery.includes('portfolio')) {
      console.log('📊 Routing to portfolio risk analysis (default for performance queries)');
      const result = await this.calculatePortfolioRisk(userId, (portfolios[0] as any)?.id);
      return {
        content: result.formattedData || `Portfolio analysis completed. Success: ${result.success}`,
        backend: result.backend
      };
    }
    
    // If no specific analysis type detected, return error
    throw new Error('Query does not match any supported analysis type');
  }

  /**
   * Get current backend configuration for debugging
   */
  getBackendInfo() {
    return backendConfig.getDebugInfo();
  }
}

// Export singleton instance
export const unifiedAnalysisService = new UnifiedAnalysisService();