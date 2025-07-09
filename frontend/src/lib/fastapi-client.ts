// ============================================================================
// FILE: lib/fastapi-client.ts
// FastAPI Client for Portfolio Analysis Microservice
// ============================================================================

import { PortfolioService } from './portfolio-service';
import { conversationAnalytics } from './conversation-analytics';

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

export interface OptimizedAllocation {
  symbol: string;
  current_weight: number;
  optimized_weight: number;
  recommended_action: string;
  shares_to_trade: number;
  value_to_trade: number;
}

export interface PortfolioOptimizationResponse {
  current_portfolio: { [symbol: string]: number };
  optimized_portfolio: { [symbol: string]: number };
  allocations: OptimizedAllocation[];
  expected_return: number;
  expected_volatility: number;
  sharpe_ratio: number;
  improvement_metrics: {
    return_improvement: number;
    volatility_change: number;
    sharpe_improvement: number;
  };
  rebalancing_cost_estimate: number;
  implementation_notes: string[];
}

export interface MonteCarloResponse {
  simulations_run: number;
  time_horizon_years: number;
  percentile_outcomes: {
    "5th": number;
    "25th": number;
    "50th": number;
    "75th": number;
    "95th": number;
  };
  probability_of_loss: number;
  expected_final_value: number;
  worst_case_scenario: number;
  best_case_scenario: number;
  chart_data: {
    simulation_results: number[];
    percentile_bands: number[];
  };
}

export interface StockSentiment {
  symbol: string;
  sentiment_score: number;
  confidence: number;
  news_count: number;
  key_themes: string[];
  sentiment_label: string;
}

export interface MarketSentimentResponse {
  overall_sentiment: number;
  overall_confidence: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  stock_sentiments: StockSentiment[];
  market_fear_greed_index: number | null;
  analysis_timestamp: string;
  recommendations: string[];
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
  private async makeRequest<T>(endpoint: string, data: unknown, requestId?: string): Promise<T> {
    const startTime = Date.now();
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
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
        
        // Track failed request
        if (requestId) {
          conversationAnalytics.trackFastAPICall(
            requestId,
            endpoint,
            'POST',
            duration,
            response.status,
            error
          );
        }
        
        throw new Error(error);
      }

      // Track successful request
      if (requestId) {
        conversationAnalytics.trackFastAPICall(
          requestId,
          endpoint,
          'POST',
          duration,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'FastAPI service unavailable';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Track failed request
      if (requestId) {
        conversationAnalytics.trackFastAPICall(
          requestId,
          endpoint,
          'POST',
          duration,
          0, // Unknown status for network errors
          errorMessage
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
  async calculatePortfolioRisk(userId: string, portfolioId?: string): Promise<PortfolioRiskAnalysis> {
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
    
    return await this.makeRequest<PortfolioRiskAnalysis>('/portfolio/risk', requestData);
  }

  /**
   * Calculate Sharpe ratio for user's portfolios
   */
  async calculateSharpeRatio(userId: string, portfolioId?: string): Promise<SharpeRatioAnalysis> {
    // Fetch user's actual portfolio from database
    const userAssets = await this.fetchUserPortfolio(userId, portfolioId);

    // Check if portfolio is empty
    if (!userAssets || userAssets.length === 0) {
      throw new Error('Portfolio is empty - please add some assets to calculate Sharpe ratio');
    }

    return await this.makeRequest<SharpeRatioAnalysis>('/portfolio/sharpe', {
      assets: userAssets
    });
  }

  /**
   * Get market data summary for portfolio symbols
   */
  async getPortfolioMarketData(userId: string, period: string = '1mo', _portfolioId?: string): Promise<MarketDataSummary> {
    return await this.makeRequest<MarketDataSummary>('/portfolio/market-data', {
      user_id: userId,
      period: period
    });
  }

  /**
   * Optimize portfolio allocation using Modern Portfolio Theory
   */
  async optimizePortfolio(
    userId: string, 
    portfolioId?: string,
    objective: string = "max_sharpe",
    riskTolerance: number = 0.5
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
    
    return await this.makeRequest<PortfolioOptimizationResponse>('/portfolio/optimize', requestData);
  }

  /**
   * Run Monte Carlo simulation for portfolio projections
   */
  async runMonteCarloSimulation(
    userId: string,
    portfolioId?: string,
    timeHorizonYears: number = 10,
    simulations: number = 10000,
    initialInvestment: number = 100000
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
    
    return await this.makeRequest<MonteCarloResponse>('/portfolio/monte-carlo', requestData);
  }

  /**
   * Analyze market sentiment for user's portfolio symbols
   */
  async analyzeMarketSentiment(
    userId: string,
    portfolioId?: string,
    timeRange: string = '24h',
    newsSources: string[] = ['general']
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
    
    return await this.makeRequest<MarketSentimentResponse>('/market/sentiment', requestData);
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

export const formatPortfolioOptimization = (optimization: PortfolioOptimizationResponse): string => {
  const { improvement_metrics, expected_return, expected_volatility, sharpe_ratio } = optimization;
  
  let formatted = `🎯 **Portfolio Optimization Results** (${new Date().toLocaleDateString()})\n\n`;
  
  // Performance improvements
  formatted += `📈 **Performance Improvements**\n`;
  formatted += `• Expected Return: ${expected_return}% annually\n`;
  formatted += `• Expected Volatility: ${expected_volatility}% annually\n`;
  formatted += `• Sharpe Ratio: ${sharpe_ratio}\n`;
  if (improvement_metrics.return_improvement !== 0) {
    formatted += `• Return Improvement: ${improvement_metrics.return_improvement > 0 ? '+' : ''}${improvement_metrics.return_improvement}%\n`;
  }
  if (improvement_metrics.sharpe_improvement !== 0) {
    formatted += `• Sharpe Improvement: ${improvement_metrics.sharpe_improvement > 0 ? '+' : ''}${improvement_metrics.sharpe_improvement}\n`;
  }
  formatted += '\n';
  
  // Allocation recommendations
  formatted += `🔄 **Rebalancing Recommendations**\n`;
  optimization.allocations.forEach(allocation => {
    if (allocation.recommended_action !== 'hold') {
      const action = allocation.recommended_action === 'buy' ? '🟢 BUY' : '🔴 SELL';
      formatted += `• ${action} ${allocation.symbol}: ${Math.abs(allocation.shares_to_trade)} shares (${allocation.current_weight}% → ${allocation.optimized_weight}%)\n`;
    }
  });
  
  // Cost estimate
  if (optimization.rebalancing_cost_estimate > 0) {
    formatted += `\n💰 **Estimated Trading Costs: $${optimization.rebalancing_cost_estimate}**\n`;
  }
  
  // Implementation notes
  if (optimization.implementation_notes.length > 0) {
    formatted += '\n💡 **Implementation Notes:**\n';
    optimization.implementation_notes.forEach(note => {
      formatted += `• ${note}\n`;
    });
  }
  
  return formatted;
};

export const formatMonteCarloSimulation = (simulation: MonteCarloResponse): string => {
  const { percentile_outcomes, probability_of_loss, expected_final_value, time_horizon_years } = simulation;
  
  let formatted = `🎲 **Monte Carlo Simulation Results** (${new Date().toLocaleDateString()})\n\n`;
  
  // Simulation details
  formatted += `📊 **Simulation Parameters**\n`;
  formatted += `• Simulations Run: ${simulation.simulations_run.toLocaleString()}\n`;
  formatted += `• Time Horizon: ${time_horizon_years} years\n`;
  formatted += `• Expected Final Value: $${expected_final_value.toLocaleString()}\n\n`;
  
  // Outcome percentiles
  formatted += `📈 **Projected Outcomes**\n`;
  formatted += `• 95th Percentile (Best 5%): $${percentile_outcomes['95th'].toLocaleString()}\n`;
  formatted += `• 75th Percentile: $${percentile_outcomes['75th'].toLocaleString()}\n`;
  formatted += `• 50th Percentile (Median): $${percentile_outcomes['50th'].toLocaleString()}\n`;
  formatted += `• 25th Percentile: $${percentile_outcomes['25th'].toLocaleString()}\n`;
  formatted += `• 5th Percentile (Worst 5%): $${percentile_outcomes['5th'].toLocaleString()}\n\n`;
  
  // Risk assessment
  const lossPercentage = (probability_of_loss * 100).toFixed(1);
  const riskLevel = probability_of_loss < 0.1 ? '🟢 Low' : 
                   probability_of_loss < 0.25 ? '🟡 Medium' : '🔴 High';
  
  formatted += `⚠️ **Risk Assessment**\n`;
  formatted += `• Probability of Loss: ${lossPercentage}% (${riskLevel} Risk)\n`;
  formatted += `• Worst Case Scenario: $${simulation.worst_case_scenario.toLocaleString()}\n`;
  formatted += `• Best Case Scenario: $${simulation.best_case_scenario.toLocaleString()}\n\n`;
  
  formatted += `💡 **Interpretation:**\n`;
  formatted += `• There's a ${lossPercentage}% chance of losing money over ${time_horizon_years} years\n`;
  formatted += `• 50% of outcomes fall between $${percentile_outcomes['25th'].toLocaleString()} and $${percentile_outcomes['75th'].toLocaleString()}\n`;
  
  return formatted;
};

export const formatSentimentAnalysis = (sentiment: MarketSentimentResponse): string => {
  const { overall_sentiment, overall_confidence, sentiment_distribution, stock_sentiments, market_fear_greed_index, recommendations } = sentiment;
  
  let formatted = `📰 **Market Sentiment Analysis** (${new Date().toLocaleDateString()})\n\n`;
  
  // Overall sentiment
  const sentimentEmoji = overall_sentiment > 0.3 ? '🟢' : overall_sentiment > 0.1 ? '🟡' : overall_sentiment > -0.1 ? '⚪' : overall_sentiment > -0.3 ? '🟠' : '🔴';
  const sentimentLabel = overall_sentiment > 0.3 ? 'Very Positive' : overall_sentiment > 0.1 ? 'Positive' : overall_sentiment > -0.1 ? 'Neutral' : overall_sentiment > -0.3 ? 'Negative' : 'Very Negative';
  
  formatted += `📊 **Overall Market Sentiment**\n`;
  formatted += `• Sentiment Score: ${overall_sentiment.toFixed(3)} ${sentimentEmoji} (${sentimentLabel})\n`;
  formatted += `• Confidence Level: ${(overall_confidence * 100).toFixed(1)}%\n`;
  
  if (market_fear_greed_index !== null) {
    const fearGreedEmoji = market_fear_greed_index > 75 ? '🔥' : market_fear_greed_index > 50 ? '🟢' : market_fear_greed_index > 25 ? '🟡' : '😨';
    const fearGreedLabel = market_fear_greed_index > 75 ? 'Extreme Greed' : market_fear_greed_index > 50 ? 'Greed' : market_fear_greed_index > 25 ? 'Fear' : 'Extreme Fear';
    formatted += `• Fear & Greed Index: ${market_fear_greed_index}/100 ${fearGreedEmoji} (${fearGreedLabel})\n`;
  }
  
  formatted += `\n`;
  
  // Sentiment distribution
  const total = sentiment_distribution.positive + sentiment_distribution.negative + sentiment_distribution.neutral;
  formatted += `📈 **Sentiment Distribution**\n`;
  formatted += `• Positive: ${sentiment_distribution.positive}/${total} (${((sentiment_distribution.positive / total) * 100).toFixed(1)}%)\n`;
  formatted += `• Neutral: ${sentiment_distribution.neutral}/${total} (${((sentiment_distribution.neutral / total) * 100).toFixed(1)}%)\n`;
  formatted += `• Negative: ${sentiment_distribution.negative}/${total} (${((sentiment_distribution.negative / total) * 100).toFixed(1)}%)\n\n`;
  
  // Individual stock sentiments
  formatted += `💹 **Individual Stock Sentiments**\n`;
  stock_sentiments.forEach(stock => {
    const stockEmoji = stock.sentiment_score > 0.1 ? '🟢' : stock.sentiment_score > -0.1 ? '🟡' : '🔴';
    formatted += `• ${stock.symbol}: ${stock.sentiment_score.toFixed(3)} ${stockEmoji} (${stock.sentiment_label})\n`;
    formatted += `  Confidence: ${(stock.confidence * 100).toFixed(1)}% | News: ${stock.news_count} articles\n`;
    if (stock.key_themes.length > 0) {
      formatted += `  Themes: ${stock.key_themes.join(', ')}\n`;
    }
  });
  
  // Recommendations
  if (recommendations.length > 0) {
    formatted += `\n💡 **Recommendations**\n`;
    recommendations.forEach(rec => {
      formatted += `• ${rec}\n`;
    });
  }
  
  formatted += `\n📅 Analysis timestamp: ${new Date(sentiment.analysis_timestamp).toLocaleString()}`;
  
  return formatted;
};