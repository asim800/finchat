// ============================================================================
// FILE: lib/unified-analysis-service.ts
// Unified service that can switch between MCP and FastAPI backends
// ============================================================================

import { financeMCPClient, formatRiskAnalysis as mcpFormatRisk, formatSharpeAnalysis as mcpFormatSharpe } from './mcp-client';
import { fastAPIClient, formatRiskAnalysis as fastapiFormatRisk, formatSharpeAnalysis as fastapiFormatSharpe } from './fastapi-client';
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
   * Get current backend configuration for debugging
   */
  getBackendInfo() {
    return backendConfig.getDebugInfo();
  }
}

// Export singleton instance
export const unifiedAnalysisService = new UnifiedAnalysisService();