// ============================================================================
// FILE: lib/fastapi-client.ts
// FastAPI Client for Portfolio Analysis Microservice
// ============================================================================

export interface PortfolioRiskAnalysis {
  totalValue: number;
  dailyVaR: number;
  annualizedVoL: number;
  sharpeRatio: number;
  beta: number;
  riskLevel: string;
}

export interface SharpeRatioAnalysis {
  sharpeRatio: number;
  explanation: string;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async calculatePortfolioRisk(_userId: string): Promise<PortfolioRiskAnalysis> {
    // For demo purposes, use a sample portfolio
    // In a real application, this would fetch the user's actual portfolio from the database
    const demoAssets = [
      { symbol: "AAPL", shares: 10 },
      { symbol: "GOOGL", shares: 5 },
      { symbol: "MSFT", shares: 8 }
    ];
    
    return await this.makeRequest<PortfolioRiskAnalysis>('/portfolio/risk', {
      assets: demoAssets,
      timeframe: "1y"
    });
  }

  /**
   * Calculate Sharpe ratio for user's portfolios
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async calculateSharpeRatio(_userId: string, _portfolioId?: string): Promise<SharpeRatioAnalysis> {
    // For demo purposes, use a sample portfolio
    // In a real application, this would fetch the user's actual portfolio from the database
    const demoAssets = [
      { symbol: "AAPL", shares: 10 },
      { symbol: "GOOGL", shares: 5 },
      { symbol: "MSFT", shares: 8 }
    ];

    return await this.makeRequest<SharpeRatioAnalysis>('/portfolio/sharpe', {
      assets: demoAssets
    });
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
  const formatted = `📊 **Portfolio Risk Analysis** (${new Date().toLocaleDateString()})\n\n`;
  
  return formatted +
    `💼 **Portfolio Analysis**\n` +
    `• Total Value: $${analysis.totalValue.toLocaleString()}\n` +
    `• Daily VaR (95%): ${analysis.dailyVaR}%\n` +
    `• Annual Volatility: ${analysis.annualizedVoL}%\n` +
    `• Sharpe Ratio: ${analysis.sharpeRatio}\n` +
    `• Beta: ${analysis.beta}\n` +
    `• Risk Level: ${analysis.riskLevel}\n\n`;
};

export const formatSharpeAnalysis = (analysis: SharpeRatioAnalysis): string => {
  const rating = analysis.sharpeRatio > 1 ? '🟢 Excellent' : 
                analysis.sharpeRatio > 0.5 ? '🟡 Good' : 
                analysis.sharpeRatio > 0 ? '🟠 Fair' : '🔴 Poor';
  
  const formatted = `📈 **Sharpe Ratio Analysis** (${new Date().toLocaleDateString()})\n\n` +
    `💼 **Portfolio Analysis**\n` +
    `• Sharpe Ratio: ${analysis.sharpeRatio} (${rating})\n` +
    `• ${analysis.explanation}\n\n` +
    `💡 **Sharpe Ratio Guide:**\n` +
    `• > 1.0: Excellent risk-adjusted returns\n` +
    `• 0.5-1.0: Good performance\n` +
    `• 0-0.5: Fair performance\n` +
    `• < 0: Poor performance (losing money vs risk-free rate)\n`;

  return formatted;
};