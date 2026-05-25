// Response shapes returned by the FastAPI portfolio analysis service.

export interface PortfolioRiskAnalysis {
  totalValue: number;
  dailyVaR: number;
  annualizedVoL: number;
  sharpeRatio: number;
  beta: number;
  riskLevel: string;
  figure_data?: {
    type: string;
    content: string;
    width?: number;
    height?: number;
  };
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
  figure_data?: {
    type: string;
    content: string;
    width?: number;
    height?: number;
  };
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
  figure_data?: {
    type: string;
    content: string;
    width?: number;
    height?: number;
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
