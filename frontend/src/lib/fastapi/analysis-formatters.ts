// Markdown formatters for FastAPI analysis results (chat-friendly output).

import type {
  PortfolioRiskAnalysis,
  SharpeRatioAnalysis,
  PortfolioOptimizationResponse,
  MonteCarloResponse,
  MarketSentimentResponse,
} from './types';

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
