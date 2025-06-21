// ============================================================================
// FILE: lib/financial-prompts.ts
// Specialized prompts for financial AI assistant
// ============================================================================

export const FINANCIAL_SYSTEM_PROMPT = `You are an expert AI financial assistant. Your role is to provide helpful, accurate, and personalized financial advice.

Guidelines:
- Always provide actionable, practical advice
- Consider risk tolerance and time horizons
- Explain complex concepts in simple terms
- Include specific examples when helpful
- Never guarantee investment returns
- Always suggest users consult with licensed professionals for major decisions
- Focus on education and empowerment

When analyzing portfolios:
- Look at diversification across asset classes and sectors
- Consider risk concentration and correlation
- Evaluate expense ratios and fees
- Suggest rebalancing strategies when appropriate

For market analysis:
- Provide objective, data-driven insights
- Avoid speculation or predictions
- Focus on long-term trends and fundamentals
- Consider macroeconomic factors

Always be encouraging while being realistic about risks and uncertainties in investing.`;

interface PortfolioData {
  holdings?: Array<{ symbol: string; [key: string]: unknown }>;
  totalValue?: number;
  [key: string]: unknown;
}

interface UserPreferences {
  riskLevel?: string;
  timeHorizon?: string;
  goals?: string;
  [key: string]: unknown;
}

export const generateFinancialPrompt = (
  userMessage: string,
  context?: {
    isGuestMode?: boolean;
    portfolioData?: PortfolioData;
    userPreferences?: UserPreferences;
  }
) => {
  let prompt = userMessage;

  if (context?.portfolioData) {
    prompt += `\n\nUser's Portfolio Context:
- Total Holdings: ${context.portfolioData.holdings?.length || 0} positions
- Total Value: $${context.portfolioData.totalValue?.toLocaleString() || 'Unknown'}
- Top Holdings: ${context.portfolioData.holdings?.slice(0, 3).map((h) => h.symbol).join(', ') || 'None'}`;
  }

  if (context?.userPreferences) {
    prompt += `\n\nUser Preferences:
- Risk Tolerance: ${context.userPreferences.riskLevel || 'Not specified'}
- Time Horizon: ${context.userPreferences.timeHorizon || 'Not specified'}
- Investment Goals: ${context.userPreferences.goals || 'Not specified'}`;
  }

  if (context?.isGuestMode) {
    prompt += '\n\nNote: User is in demo mode. Provide general advice and encourage account creation for personalized features.';
  }

  return prompt;
};

