// ============================================================================
// FILE: lib/financial-prompts.ts
// Specialized prompts for financial AI assistant
// ============================================================================

import { formatCurrency } from './number-utils';

export const FINANCIAL_SYSTEM_PROMPT = `You are an expert AI financial assistant with access to advanced portfolio analysis tools. Your role is to provide helpful, accurate, and personalized financial advice using both your knowledge and real-time portfolio calculations.

Guidelines:
- Always provide actionable, practical advice
- Consider risk tolerance and time horizons
- Explain complex concepts in simple terms
- Include specific examples when helpful
- Never guarantee investment returns
- Always suggest users consult with licensed professionals for major decisions
- Focus on education and empowerment

Available Tools:
- Portfolio Risk Analysis: Calculate comprehensive risk metrics including volatility, VaR, and drawdown
- Sharpe Ratio Calculation: Measure risk-adjusted returns for portfolios
- Market Data Analysis: Get current market data and performance metrics

When analyzing portfolios:
- Use the portfolio risk analysis tool to get accurate metrics
- Calculate Sharpe ratios to assess risk-adjusted performance
- Look at diversification across asset classes and sectors
- Consider risk concentration and correlation
- Evaluate expense ratios and fees
- Suggest rebalancing strategies when appropriate

For market analysis:
- Use market data tools to get current information
- Provide objective, data-driven insights
- Avoid speculation or predictions
- Focus on long-term trends and fundamentals
- Consider macroeconomic factors

When users ask about portfolio performance, risk, or Sharpe ratios, use the appropriate tools to provide accurate, real-time analysis rather than general advice.

Always be encouraging while being realistic about risks and uncertainties in investing.`;

interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  assets: Array<{ symbol: string; [key: string]: unknown }>;
  totalValue: number;
}

interface PortfolioData {
  holdings?: Array<{ symbol: string; [key: string]: unknown }>;
  totalValue?: number;
  portfolios?: Portfolio[];
  selectedPortfolio?: Portfolio;
  [key: string]: unknown;
}

interface UserPreferences {
  riskLevel?: string;
  timeHorizon?: string;
  goals?: string;
  [key: string]: unknown;
}

interface PortfolioSelectionResult {
  selectedPortfolio: Portfolio | null;
  portfolioId: string | null;
  feedbackMessage: string;
  wasExplicitlyMentioned: boolean;
}

/**
 * Detects portfolio name mentions in user message and selects appropriate portfolio
 */
export const detectPortfolioSelection = (
  userMessage: string,
  portfolios: Portfolio[]
): PortfolioSelectionResult => {
  if (!portfolios || portfolios.length === 0) {
    return {
      selectedPortfolio: null,
      portfolioId: null,
      feedbackMessage: "No portfolios available",
      wasExplicitlyMentioned: false
    };
  }

  // Get main portfolio (first in list)
  const mainPortfolio = portfolios[0];
  
  // Create search patterns for portfolio names
  const portfolioPatterns = portfolios.map(portfolio => ({
    portfolio,
    patterns: [
      // Exact name match (case insensitive)
      new RegExp(`\\b${portfolio.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
      // Remove "portfolio" suffix and match base name
      new RegExp(`\\b${portfolio.name.replace(/['s]*\s*portfolio$/i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
      // Match just the first word if it's a name (e.g., "John" from "John's Portfolio")
      portfolio.name.includes("'s Portfolio") ? 
        new RegExp(`\\b${portfolio.name.split("'s")[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') : null
    ].filter(Boolean)
  }));

  // Check for explicit portfolio mentions
  for (const { portfolio, patterns } of portfolioPatterns) {
    for (const pattern of patterns) {
      if (pattern && pattern.test(userMessage)) {
        return {
          selectedPortfolio: portfolio,
          portfolioId: portfolio.id,
          feedbackMessage: `Analyzing ${portfolio.name}`,
          wasExplicitlyMentioned: true
        };
      }
    }
  }

  // Check for generic portfolio references
  const genericPortfolioPatterns = [
    /\bmain\s+portfolio\b/i,
    /\bprimary\s+portfolio\b/i,
    /\bdefault\s+portfolio\b/i,
    /\bmy\s+main\s+portfolio\b/i
  ];

  for (const pattern of genericPortfolioPatterns) {
    if (pattern.test(userMessage)) {
      return {
        selectedPortfolio: mainPortfolio,
        portfolioId: mainPortfolio.id,
        feedbackMessage: `Analyzing your main portfolio (${mainPortfolio.name})`,
        wasExplicitlyMentioned: true
      };
    }
  }

  // No explicit mention - default to main portfolio
  return {
    selectedPortfolio: mainPortfolio,
    portfolioId: mainPortfolio.id,
    feedbackMessage: `No specific portfolio mentioned. Analyzing your main portfolio (${mainPortfolio.name})`,
    wasExplicitlyMentioned: false
  };
};

export const generateFinancialPrompt = (
  userMessage: string,
  context?: {
    isGuestMode?: boolean;
    portfolioData?: PortfolioData;
    userPreferences?: UserPreferences;
    selectedPortfolioId?: string;
  }
) => {
  let prompt = userMessage;
  let portfolioSelection: PortfolioSelectionResult | null = null;

  // Handle portfolio selection if we have multiple portfolios
  if (context?.portfolioData?.portfolios && context.portfolioData.portfolios.length > 0) {
    portfolioSelection = detectPortfolioSelection(userMessage, context.portfolioData.portfolios);
    
    // Override with explicitly provided portfolio ID if available
    if (context.selectedPortfolioId) {
      const explicitPortfolio = context.portfolioData.portfolios.find(p => p.id === context.selectedPortfolioId);
      if (explicitPortfolio) {
        portfolioSelection = {
          selectedPortfolio: explicitPortfolio,
          portfolioId: explicitPortfolio.id,
          feedbackMessage: `Analyzing ${explicitPortfolio.name}`,
          wasExplicitlyMentioned: true
        };
      }
    }
  }

  // Add portfolio context
  const selectedPortfolio = portfolioSelection?.selectedPortfolio || context?.portfolioData?.selectedPortfolio;
  if (selectedPortfolio) {
    // Use FastAPI market value if available, otherwise fall back to cost basis
    const totalValue = (selectedPortfolio as any).marketTotalValue || selectedPortfolio.totalValue;
    const valueLabel = (selectedPortfolio as any).marketTotalValue ? 'Total Value (current market)' : 'Total Value (cost basis)';
    
    prompt += `\n\nSelected Portfolio Context:
- Portfolio Name: ${selectedPortfolio.name}
- Portfolio ID: ${selectedPortfolio.id}
- Holdings: ${selectedPortfolio.assets?.length || 0} positions
- ${valueLabel}: ${totalValue ? formatCurrency(totalValue) : 'Unknown'}
- Top Holdings: ${selectedPortfolio.assets?.slice(0, 3).map((h) => h.symbol).join(', ') || 'None'}`;

    if (selectedPortfolio.description) {
      prompt += `\n- Description: ${selectedPortfolio.description}`;
    }
  } else if (context?.portfolioData) {
    // Fallback to legacy portfolio data structure
    const totalValue = (context.portfolioData as any).marketTotalValue || context.portfolioData.totalValue;
    const valueLabel = (context.portfolioData as any).marketTotalValue ? 'Total Value (current market)' : 'Total Value (cost basis)';
    
    prompt += `\n\nUser's Portfolio Context:
- Total Holdings: ${context.portfolioData.holdings?.length || 0} positions
- ${valueLabel}: ${totalValue ? formatCurrency(totalValue) : 'Unknown'}
- Top Holdings: ${context.portfolioData.holdings?.slice(0, 3).map((h) => h.symbol).join(', ') || 'None'}`;
  }

  // Add user preferences
  if (context?.userPreferences) {
    prompt += `\n\nUser Preferences:
- Risk Tolerance: ${context.userPreferences.riskLevel || 'Not specified'}
- Time Horizon: ${context.userPreferences.timeHorizon || 'Not specified'}
- Investment Goals: ${context.userPreferences.goals || 'Not specified'}`;
  }

  // Add guest mode note
  if (context?.isGuestMode) {
    prompt += '\n\nNote: User is in demo mode. Provide general advice and encourage account creation for personalized features.';
  }

  return {
    prompt,
    portfolioSelection
  };
};

