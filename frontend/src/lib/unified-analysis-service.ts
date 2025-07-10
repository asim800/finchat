// ============================================================================
// FILE: lib/unified-analysis-service.ts
// Unified service that can switch between MCP and FastAPI backends
// ============================================================================

import { financeMCPClient, formatRiskAnalysis as mcpFormatRisk, formatSharpeAnalysis as mcpFormatSharpe } from './mcp-client';
import { fastAPIClient, formatRiskAnalysis as fastapiFormatRisk, formatSharpeAnalysis as fastapiFormatSharpe, formatPortfolioOptimization, formatMonteCarloSimulation, formatSentimentAnalysis } from './fastapi-client';
import { backendConfig, logBackendSelection, type BackendType } from './backend-config';

export interface AnalysisResult {
  success: boolean;
  data?: unknown;
  formattedData?: string;
  error?: string;
  backend: BackendType;
  fallbackUsed: boolean;
}

class UnifiedAnalysisService {
  
  /**
   * Check if a backend is available
   */
  private async checkBackendHealth(backend: BackendType): Promise<boolean> {
    try {
      if (backend === 'fastapi') {
        const health = await fastAPIClient.checkHealth();
        return health.available;
      } else {
        // For MCP, check dependencies
        const health = await financeMCPClient.checkDependencies();
        return health.available;
      }
    } catch (error) {
      console.error(`${backend.toUpperCase()} health check failed:`, error);
      return false;
    }
  }

  /**
   * Execute analysis with automatic fallback
   */
  private async executeWithFallback<T>(
    operation: string,
    primaryExecution: () => Promise<T>,
    fallbackExecution: () => Promise<T>,
    formatter: (data: T) => string
  ): Promise<AnalysisResult> {
    const primaryBackend = backendConfig.getPrimaryBackend();
    const fallbackBackend = backendConfig.getFallbackBackend();
    
    console.log(`🔍 Starting ${operation} with primary backend: ${primaryBackend.type.toUpperCase()}`);

    // Try primary backend first
    try {
      const isHealthy = await this.checkBackendHealth(primaryBackend.type);
      
      if (isHealthy) {
        logBackendSelection(primaryBackend.type, `Primary backend healthy for ${operation}`);
        const data = await primaryExecution();
        
        // Check if the result indicates an error
        if (data && typeof data === 'object' && 'error' in data) {
          throw new Error(data.error as string);
        }
        
        return {
          success: true,
          data,
          formattedData: formatter(data),
          backend: primaryBackend.type,
          fallbackUsed: false
        };
      } else {
        throw new Error(`${primaryBackend.type.toUpperCase()} backend not healthy`);
      }
    } catch (primaryError) {
      console.warn(`⚠️ Primary backend (${primaryBackend.type.toUpperCase()}) failed:`, primaryError);
      
      // Try fallback if enabled
      if (backendConfig.isFallbackEnabled()) {
        try {
          const fallbackHealthy = await this.checkBackendHealth(fallbackBackend.type);
          
          if (fallbackHealthy) {
            logBackendSelection(fallbackBackend.type, `Fallback after ${primaryBackend.type} failure`);
            const data = await fallbackExecution();
            
            // Check if the result indicates an error
            if (data && typeof data === 'object' && 'error' in data) {
              throw new Error(data.error as string);
            }
            
            return {
              success: true,
              data,
              formattedData: formatter(data),
              backend: fallbackBackend.type,
              fallbackUsed: true
            };
          } else {
            throw new Error(`${fallbackBackend.type.toUpperCase()} fallback backend not healthy`);
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback backend (${fallbackBackend.type.toUpperCase()}) also failed:`, fallbackError);
          
          return {
            success: false,
            error: `Both backends failed. Primary (${primaryBackend.type}): ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Fallback (${fallbackBackend.type}): ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
            backend: primaryBackend.type,
            fallbackUsed: false
          };
        }
      } else {
        return {
          success: false,
          error: `${primaryBackend.type.toUpperCase()} backend failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
          backend: primaryBackend.type,
          fallbackUsed: false
        };
      }
    }
  }

  /**
   * Calculate portfolio risk using configured backend with fallback
   */
  async calculatePortfolioRisk(userId: string, portfolioId?: string): Promise<AnalysisResult> {
    console.log('🔍 UnifiedAnalysisService calculatePortfolioRisk called with:', { userId, portfolioId });
    return await this.executeWithFallback(
      'portfolio risk analysis',
      () => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastAPIClient.calculatePortfolioRisk(userId, portfolioId);
        } else {
          return financeMCPClient.calculatePortfolioRisk(userId, portfolioId);
        }
      },
      () => {
        const fallback = backendConfig.getFallbackBackend();
        if (fallback.type === 'fastapi') {
          return fastAPIClient.calculatePortfolioRisk(userId, portfolioId);
        } else {
          return financeMCPClient.calculatePortfolioRisk(userId, portfolioId);
        }
      },
      (data) => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastapiFormatRisk(data);
        } else {
          return mcpFormatRisk(data);
        }
      }
    );
  }

  /**
   * Calculate Sharpe ratio using configured backend with fallback
   */
  async calculateSharpeRatio(userId: string, portfolioId?: string): Promise<AnalysisResult> {
    return await this.executeWithFallback(
      'Sharpe ratio analysis',
      () => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastAPIClient.calculateSharpeRatio(userId, portfolioId);
        } else {
          return financeMCPClient.calculateSharpeRatio(userId, portfolioId);
        }
      },
      () => {
        const fallback = backendConfig.getFallbackBackend();
        if (fallback.type === 'fastapi') {
          return fastAPIClient.calculateSharpeRatio(userId, portfolioId);
        } else {
          return financeMCPClient.calculateSharpeRatio(userId, portfolioId);
        }
      },
      (data) => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastapiFormatSharpe(data);
        } else {
          return mcpFormatSharpe(data);
        }
      }
    );
  }

  /**
   * Get portfolio market data using configured backend with fallback
   */
  async getPortfolioMarketData(userId: string, period: string = '1mo', portfolioId?: string): Promise<AnalysisResult> {
    return await this.executeWithFallback(
      'market data analysis',
      () => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastAPIClient.getPortfolioMarketData(userId, period, portfolioId);
        } else {
          return financeMCPClient.getPortfolioMarketData(userId, period, portfolioId);
        }
      },
      () => {
        const fallback = backendConfig.getFallbackBackend();
        if (fallback.type === 'fastapi') {
          return fastAPIClient.getPortfolioMarketData(userId, period, portfolioId);
        } else {
          return financeMCPClient.getPortfolioMarketData(userId, period, portfolioId);
        }
      },
      (data) => {
        // Market data formatting is the same for both backends
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
   * Optimize portfolio allocation using configured backend
   */
  async optimizePortfolio(
    userId: string, 
    portfolioId?: string,
    objective: string = "max_sharpe",
    riskTolerance: number = 0.5
  ): Promise<AnalysisResult> {
    console.log('🎯 UnifiedAnalysisService optimizePortfolio called with:', { userId, portfolioId, objective, riskTolerance });
    return await this.executeWithFallback(
      'portfolio optimization',
      () => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastAPIClient.optimizePortfolio(userId, portfolioId, objective, riskTolerance);
        } else {
          // MCP doesn't have optimization yet, use FastAPI as fallback
          throw new Error('MCP backend does not support portfolio optimization yet');
        }
      },
      () => {
        // Always use FastAPI for optimization
        return fastAPIClient.optimizePortfolio(userId, portfolioId, objective, riskTolerance);
      },
      (data) => {
        return formatPortfolioOptimization(data as any);
      }
    );
  }

  /**
   * Run Monte Carlo simulation using configured backend
   */
  async runMonteCarloSimulation(
    userId: string,
    portfolioId?: string,
    timeHorizonYears: number = 10,
    simulations: number = 10000,
    initialInvestment: number = 100000
  ): Promise<AnalysisResult> {
    console.log('🎲 UnifiedAnalysisService runMonteCarloSimulation called with:', { userId, portfolioId, timeHorizonYears, simulations });
    return await this.executeWithFallback(
      'Monte Carlo simulation',
      () => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastAPIClient.runMonteCarloSimulation(userId, portfolioId, timeHorizonYears, simulations, initialInvestment);
        } else {
          // MCP doesn't have Monte Carlo yet, use FastAPI as fallback
          throw new Error('MCP backend does not support Monte Carlo simulation yet');
        }
      },
      () => {
        // Always use FastAPI for Monte Carlo
        return fastAPIClient.runMonteCarloSimulation(userId, portfolioId, timeHorizonYears, simulations, initialInvestment);
      },
      (data) => {
        return formatMonteCarloSimulation(data as any);
      }
    );
  }

  /**
   * Analyze market sentiment using configured backend
   */
  async analyzeMarketSentiment(
    userId: string,
    portfolioId?: string,
    timeRange: string = '24h',
    newsSources: string[] = ['general']
  ): Promise<AnalysisResult> {
    console.log('📰 UnifiedAnalysisService analyzeMarketSentiment called with:', { userId, portfolioId, timeRange, newsSources });
    return await this.executeWithFallback(
      'market sentiment analysis',
      () => {
        const primary = backendConfig.getPrimaryBackend();
        if (primary.type === 'fastapi') {
          return fastAPIClient.analyzeMarketSentiment(userId, portfolioId, timeRange, newsSources);
        } else {
          // MCP doesn't have sentiment analysis yet, use FastAPI as fallback
          throw new Error('MCP backend does not support sentiment analysis yet');
        }
      },
      () => {
        // Always use FastAPI for sentiment analysis
        return fastAPIClient.analyzeMarketSentiment(userId, portfolioId, timeRange, newsSources);
      },
      (data) => {
        return formatSentimentAnalysis(data as any);
      }
    );
  }

  /**
   * Analyze a query and route to appropriate backend service
   */
  async analyzeQuery(query: string, userId: string, portfolios: unknown[] = []): Promise<{ content: string; backend: BackendType }> {
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