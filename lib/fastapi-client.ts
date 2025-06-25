// ============================================================================
// FILE: lib/fastapi-client.ts
// FastAPI Client for Portfolio Analysis Microservice
// ============================================================================

export interface PortfolioRiskAnalysis {
  user_id: string;
  analysis_date: string;
  results: {
    [portfolio_id: string]: {
      portfolio_name: string;
      total_value: number;
      annual_return: number;
      annual_volatility: number;
      sharpe_ratio: number;
      var_95_daily: number;
      var_95_annual: number;
      max_drawdown: number;
      num_assets: number;
      risk_free_rate: number;
    } | { error: string };
  };
}

export interface SharpeRatioAnalysis {
  user_id: string;
  analysis_date: string;
  sharpe_analysis: {
    [portfolio_id: string]: {
      portfolio_name: string;
      sharpe_ratio: number;
      annual_return: number;
      annual_volatility: number;
      risk_free_rate: number;
    } | { error: string };
  };
}

export interface MarketDataSummary {
  user_id: string;
  period: string;
  symbols_analyzed: number;
  market_data: {
    [symbol: string]: {
      current_price: number;
      period_return: number;
      volatility: number;
      data_points: number;
    };
  };
  analysis_date: string;
}

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
  private async makeRequest<T>(endpoint: string, data: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        } else if (error.message.includes('fetch')) {
          throw new Error('FastAPI service unavailable');
        }
      }
      
      throw error;
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
  async calculatePortfolioRisk(userId: string): Promise<PortfolioRiskAnalysis> {
    return await this.makeRequest<PortfolioRiskAnalysis>('/portfolio/risk', {
      user_id: userId
    });
  }

  /**
   * Calculate Sharpe ratio for user's portfolios
   */
  async calculateSharpeRatio(userId: string, portfolioId?: string): Promise<SharpeRatioAnalysis> {
    const requestData: { user_id: string; portfolio_id?: string } = {
      user_id: userId
    };

    if (portfolioId) {
      requestData.portfolio_id = portfolioId;
    }

    return await this.makeRequest<SharpeRatioAnalysis>('/portfolio/sharpe', requestData);
  }

  /**
   * Get market data summary for portfolio symbols
   */
  async getPortfolioMarketData(userId: string, period: string = '1mo'): Promise<MarketDataSummary> {
    return await this.makeRequest<MarketDataSummary>('/portfolio/market-data', {
      user_id: userId,
      period: period
    });
  }
}

// Export singleton instance
export const fastAPIClient = new FastAPIClient();

// Utility functions for formatting results (compatible with MCP format)
export const formatRiskAnalysis = (analysis: PortfolioRiskAnalysis): string => {
  if (!analysis.results) return 'No portfolio data available';

  let formatted = `📊 **Portfolio Risk Analysis** (${new Date(analysis.analysis_date).toLocaleDateString()})\n\n`;

  Object.entries(analysis.results).forEach(([portfolioId, result]) => {
    if ('error' in result) {
      formatted += `❌ **${portfolioId}**: ${result.error}\n\n`;
    } else {
      formatted += `💼 **${result.portfolio_name}**\n`;
      formatted += `• Total Value: $${result.total_value.toLocaleString()}\n`;
      formatted += `• Annual Return: ${result.annual_return}%\n`;
      formatted += `• Volatility: ${result.annual_volatility}%\n`;
      formatted += `• Sharpe Ratio: ${result.sharpe_ratio}\n`;
      formatted += `• VaR (95%): ${result.var_95_daily}% daily, ${result.var_95_annual}% annual\n`;
      formatted += `• Max Drawdown: ${result.max_drawdown}%\n`;
      formatted += `• Assets: ${result.num_assets}\n\n`;
    }
  });

  return formatted;
};

export const formatSharpeAnalysis = (analysis: SharpeRatioAnalysis): string => {
  if (!analysis.sharpe_analysis) return 'No Sharpe ratio data available';

  let formatted = `📈 **Sharpe Ratio Analysis** (${new Date(analysis.analysis_date).toLocaleDateString()})\n\n`;

  Object.entries(analysis.sharpe_analysis).forEach(([portfolioId, result]) => {
    if ('error' in result) {
      formatted += `❌ **${portfolioId}**: ${result.error}\n\n`;
    } else {
      const rating = result.sharpe_ratio > 1 ? '🟢 Excellent' : 
                    result.sharpe_ratio > 0.5 ? '🟡 Good' : 
                    result.sharpe_ratio > 0 ? '🟠 Fair' : '🔴 Poor';
      
      formatted += `💼 **${result.portfolio_name}**\n`;
      formatted += `• Sharpe Ratio: ${result.sharpe_ratio} (${rating})\n`;
      formatted += `• Annual Return: ${result.annual_return}%\n`;
      formatted += `• Volatility: ${result.annual_volatility}%\n`;
      formatted += `• Risk-Free Rate: ${result.risk_free_rate}%\n\n`;
    }
  });

  formatted += `💡 **Sharpe Ratio Guide:**\n`;
  formatted += `• > 1.0: Excellent risk-adjusted returns\n`;
  formatted += `• 0.5-1.0: Good performance\n`;
  formatted += `• 0-0.5: Fair performance\n`;
  formatted += `• < 0: Poor performance (losing money vs risk-free rate)\n`;

  return formatted;
};