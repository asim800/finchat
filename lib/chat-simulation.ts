// ============================================================================
// FILE: lib/chat-simulation.ts (UPDATED)
// Updated simulation with file upload support
// ============================================================================

// This function simulates AI responses
// Later we'll replace this with actual API calls to Claude/OpenAI
interface PortfolioHolding {
  symbol: string;
  quantity: number;
  price: number;
  [key: string]: unknown;
}

interface UploadedData {
  type: 'portfolio' | 'preferences' | 'text';
  holdings?: PortfolioHolding[];
  totalValue?: number;
  settings?: Record<string, string>;
  keywords?: string[];
  [key: string]: unknown;
}

interface ChartData {
  type: 'pie' | 'bar';
  title: string;
  data: Array<{ name: string; value: number }>;
}

export async function simulateAIResponse(message: string, isGuestMode: boolean, uploadedData?: UploadedData): Promise<{ content: string; chartData?: ChartData }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  const lowerMessage = message.toLowerCase();

  // Handle uploaded data context
  if (uploadedData) {
    if (lowerMessage.includes('analyze') || lowerMessage.includes('portfolio') || lowerMessage.includes('allocation')) {
      if (uploadedData.type === 'portfolio' && uploadedData.holdings && uploadedData.totalValue) {
        const holdings = uploadedData.holdings;
        const chartData = holdings.map((holding) => ({
          name: holding.symbol,
          value: holding.quantity * holding.price
        }));

        return {
          content: `Based on your uploaded portfolio, here's what I found:\n\n• **Total Holdings**: ${holdings.length} positions\n• **Total Value**: $${uploadedData.totalValue.toLocaleString()}\n• **Largest Position**: ${holdings[0]?.symbol} (${((holdings[0]?.quantity * holdings[0]?.price / uploadedData.totalValue) * 100).toFixed(1)}%)\n\nYour portfolio shows ${holdings.length > 10 ? 'good diversification' : 'room for more diversification'}. ${isGuestMode ? 'Sign up to get detailed risk analysis and rebalancing recommendations!' : 'Would you like me to suggest rebalancing strategies?'}`,
          chartData: {
            type: 'pie',
            title: 'Your Portfolio Allocation',
            data: chartData
          }
        };
      }
    }

    if (lowerMessage.includes('risk') && uploadedData.type === 'portfolio' && uploadedData.holdings && uploadedData.totalValue) {
      const holdings = uploadedData.holdings;
      const techStocks = holdings.filter((h) => ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META'].includes(h.symbol));
      const techWeight = techStocks.reduce((sum: number, stock) => sum + (stock.quantity * stock.price), 0) / uploadedData.totalValue;

      return {
        content: `**Risk Analysis of Your Portfolio:**\n\n• **Tech Concentration**: ${(techWeight * 100).toFixed(1)}% in technology stocks\n• **Number of Positions**: ${holdings.length} (${holdings.length > 20 ? 'well diversified' : holdings.length > 10 ? 'moderately diversified' : 'concentrated'})\n• **Risk Level**: ${techWeight > 0.4 ? 'High' : techWeight > 0.2 ? 'Moderate' : 'Conservative'}\n\n${techWeight > 0.4 ? '⚠️ Consider reducing tech exposure for better diversification.' : '✅ Your diversification looks reasonable.'}`
      };
    }

    if (lowerMessage.includes('rebalance') && uploadedData.type === 'portfolio' && uploadedData.holdings && uploadedData.totalValue) {
      const holdings = uploadedData.holdings;
      return {
        content: `**Rebalancing Recommendations:**\n\nBased on your ${holdings.length} holdings worth $${uploadedData.totalValue.toLocaleString()}:\n\n• **Target Allocation**: 60% stocks, 25% bonds, 10% REITs, 5% cash\n• **Current Status**: Analyzing your positions...\n• **Action Items**: Consider adding bond exposure for stability\n• **Timeline**: Rebalance quarterly or when allocations drift >5%\n\n${isGuestMode ? '*Sign up for automated rebalancing alerts and detailed tax-loss harvesting strategies!*' : 'Would you like me to calculate specific buy/sell recommendations?'}`
      };
    }

    if (uploadedData.type === 'preferences' && uploadedData.settings) {
      const settings = uploadedData.settings;
      const riskLevel = settings['risk level'] || settings['risk_level'] || 'moderate';
      const timeHorizon = settings['time horizon'] || settings['time_horizon'] || '10 years';
      
      return {
        content: `Based on your uploaded preferences:\n\n• **Risk Tolerance**: ${riskLevel}\n• **Time Horizon**: ${timeHorizon}\n• **Investment Goal**: ${settings['investment goal'] || settings['goal'] || 'Long-term growth'}\n\nI can now provide personalized advice that matches your profile. ${isGuestMode ? 'Create an account to save these preferences and get ongoing personalized recommendations!' : 'What specific investment guidance would you like based on these preferences?'}`
      };
    }

    if (uploadedData.type === 'text' && uploadedData.keywords) {
      return {
        content: `I've analyzed your uploaded text file and found financial keywords: ${uploadedData.keywords.join(', ')}.\n\nBased on the content, I can help you with personalized advice related to your financial goals and preferences. ${isGuestMode ? 'Sign up to save this context for future conversations!' : 'What specific questions do you have about the information in your file?'}`
      };
    }
  }

  // Chart responses
  if (lowerMessage.includes('chart') || lowerMessage.includes('portfolio allocation')) {
    return {
      content: 'Here\'s a sample portfolio allocation that shows a balanced approach for long-term growth:',
      chartData: {
        type: 'pie',
        title: 'Sample Portfolio Allocation',
        data: [
          { name: 'Stocks', value: 60 },
          { name: 'Bonds', value: 25 },
          { name: 'Real Estate', value: 10 },
          { name: 'Cash', value: 5 }
        ]
      }
    };
  }

  if (lowerMessage.includes('performance') || lowerMessage.includes('returns')) {
    return {
      content: 'Here\'s a sample view of how different asset classes have performed:',
      chartData: {
        type: 'bar',
        title: 'Sample Annual Returns (%)',
        data: [
          { name: 'Stocks', value: 12.5 },
          { name: 'Bonds', value: 4.2 },
          { name: 'REITs', value: 8.7 },
          { name: 'Cash', value: 1.5 }
        ]
      }
    };
  }

  // Text-based responses
  if (lowerMessage.includes('stocks') && lowerMessage.includes('bonds')) {
    return {
      content: `Great question! Here are the key differences:

**Stocks:**
• Represent ownership in companies
• Higher potential returns but more volatile
• Good for long-term growth

**Bonds:**
• Loans to companies or governments  
• More stable, lower returns
• Good for income and stability

${isGuestMode ? '\n*Sign up to get personalized recommendations for your situation!' : ''}`
    };
  }

  if (lowerMessage.includes('compound interest')) {
    return {
      content: `Compound interest is the "8th wonder of the world"! Here's how it works:

• You earn interest on your initial investment
• Then you earn interest on that interest
• This creates exponential growth over time

**Example:** $1,000 at 7% annual return:
• Year 10: $1,967
• Year 20: $3,870  
• Year 30: $7,612

The key is starting early and staying consistent!

${isGuestMode ? '\n*Create an account to track your own compound growth!' : ''}`
    };
  }

  if (lowerMessage.includes('invest') && isGuestMode) {
    return {
      content: `For general investment advice, consider these principles:

• **Diversify** across different asset classes
• **Start early** to benefit from compound growth
• **Stay consistent** with regular contributions
• **Keep costs low** with index funds
• **Think long-term** and avoid emotional decisions

*For personalized investment recommendations based on your goals, risk tolerance, and financial situation, please create an account!*`
    };
  }

  if (lowerMessage.includes('portfolio') && !isGuestMode) {
    return {
      content: `I'd be happy to analyze your portfolio! I can help you with:

• Asset allocation optimization
• Risk assessment
• Performance tracking
• Rebalancing recommendations
• Tax optimization strategies

To get started, please add your holdings in the Portfolio section. Once you've connected your accounts, I can provide detailed, personalized analysis.`
    };
  }

  if (lowerMessage.includes('market') || lowerMessage.includes('trends')) {
    return {
      content: `Current market considerations (general trends):

• **Technology sector** continues to show strong growth
• **Interest rates** are affecting bond and real estate markets  
• **Inflation concerns** make real assets attractive
• **Global diversification** remains important
• **ESG investing** is gaining momentum

${isGuestMode ? '\n*Sign up to get personalized market insights based on your portfolio!' : 'Would you like me to analyze how these trends might affect your specific holdings?'}`
    };
  }

  // Default responses
  const defaultResponses = isGuestMode ? [
    "That's a great financial question! In demo mode, I can provide general information. For personalized advice based on your specific situation, please create an account.",
    "I'd be happy to help with general financial concepts! For detailed analysis of your personal finances, consider signing up for full access.",
    "Good question! I can share general financial principles here. For comprehensive, personalized guidance, please create an account."
  ] : [
    "I'd be happy to help with that! Could you provide more details about your specific situation?",
    "That's an interesting question. To give you the best advice, I'd need to know more about your financial goals and current portfolio.",
    "Great question! Let me help you with that. Do you have any specific timeframes or constraints I should consider?"
  ];

  return {
    content: defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  };
}














