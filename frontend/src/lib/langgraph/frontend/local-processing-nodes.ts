// ============================================================================
// FILE: lib/langgraph/frontend/local-processing-nodes.ts
// Local processing nodes for simple queries that can be handled on frontend
// ============================================================================

interface LocalResponse {
  content: string;
  provider: 'simulation' | 'cached' | 'regexp';
  chartData?: {
    type: 'pie' | 'bar';
    title: string;
    data: Array<{ name: string; value: number }>;
  };
  metadata?: Record<string, any>;
}

/**
 * Handle queries that can be processed locally without backend calls
 */
export const handleLocalQueries = async (
  input: string,
  portfolioContext?: any
): Promise<LocalResponse> => {
  const lowerInput = input.toLowerCase().trim();
  
  // Try different local handlers in order of specificity
  const handlers = [
    handleGreetings,
    handleSimplePortfolioQueries,
    handleBasicDefinitions,
    handleUICommands,
    handleSamplePortfolioChart,
    handleFallback
  ];
  
  for (const handler of handlers) {
    const result = await handler(lowerInput, input, portfolioContext);
    if (result) {
      console.log(`📱 Handled locally by: ${handler.name}`);
      return result;
    }
  }
  
  // This shouldn't happen, but fallback just in case
  return {
    content: "I'll help you with that. Let me process your request...",
    provider: 'simulation'
  };
};

/**
 * Handle greeting messages
 */
async function handleGreetings(
  lowerInput: string,
  _originalInput: string,
  portfolioContext?: any
): Promise<LocalResponse | null> {
  const greetingPatterns = [
    /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))\.?$/,
    /^(?:how\s+are\s+you|what'?s\s+up)[\?\.]?$/
  ];
  
  if (!greetingPatterns.some(pattern => pattern.test(lowerInput))) {
    return null;
  }
  
  const isGuestMode = portfolioContext?.isGuestMode || false;
  const hasPortfolio = (portfolioContext?.portfolios?.length || 0) > 0;
  
  let greeting = "Hello! I'm your AI financial assistant. ";
  
  if (isGuestMode) {
    greeting += "You're in demo mode - I can help with general financial questions and analyze uploaded files. ";
    greeting += "Try asking about investment basics or upload a portfolio CSV!";
  } else if (hasPortfolio) {
    greeting += "I can help you with portfolio analysis, market insights, and investment advice. ";
    greeting += "What would you like to know about your investments?";
  } else {
    greeting += "I'm ready to help with your investment questions. ";
    greeting += "You can add assets to your portfolio or ask about market trends!";
  }
  
  return {
    content: greeting,
    provider: 'cached',
    metadata: {
      type: 'greeting',
      showWelcome: true
    }
  };
}

/**
 * Handle simple portfolio display queries
 */
async function handleSimplePortfolioQueries(
  lowerInput: string,
  _originalInput: string,
  portfolioContext?: any
): Promise<LocalResponse | null> {
  const portfolioPatterns = [
    /^(?:show|display|list)\s+(?:my\s+)?portfolio$/,
    /^(?:my\s+)?portfolio(?:\s+overview)?$/,
    /^(?:what\s+are\s+my\s+holdings?|holdings?)$/
  ];
  
  if (!portfolioPatterns.some(pattern => pattern.test(lowerInput))) {
    return null;
  }
  
  const isGuestMode = portfolioContext?.isGuestMode || false;
  const portfolios = portfolioContext?.portfolios || [];
  
  if (isGuestMode || portfolios.length === 0) {
    const chartData = {
      type: 'pie' as const,
      title: 'Sample Portfolio Allocation',
      data: [
        { name: 'Add your assets', value: 100 }
      ]
    };
    
    return {
      content: isGuestMode 
        ? "Here's a sample portfolio view. Upload a CSV file or add assets to see your actual allocation!"
        : "Your portfolio is empty. Add some assets to get started with portfolio analysis!",
      provider: 'cached',
      chartData,
      metadata: {
        type: 'portfolio_overview',
        isEmpty: true
      }
    };
  }
  
  // Create chart data from actual portfolio
  const allAssets = portfolios.flatMap((p: any) => p.assets || []);
  const chartData = createPortfolioChartData(allAssets);
  
  const totalValue = allAssets.reduce((sum: number, asset: any) => {
    return sum + (asset.quantity * (asset.avgCost || 0));
  }, 0);
  
  return {
    content: `Here's your portfolio overview with ${allAssets.length} assets${
      totalValue > 0 ? ` worth $${totalValue.toLocaleString()}` : ''
    }.`,
    provider: 'cached',
    chartData,
    metadata: {
      type: 'portfolio_overview',
      assetCount: allAssets.length,
      totalValue
    }
  };
}

/**
 * Handle basic financial definitions
 */
async function handleBasicDefinitions(
  lowerInput: string,
  _originalInput: string,
  _portfolioContext?: any
): Promise<LocalResponse | null> {
  const definitions: Record<string, string> = {
    'stock': 'A stock represents ownership in a company. When you buy stock, you become a shareholder and own a piece of that business.',
    'bond': 'A bond is a loan you give to a company or government. They pay you interest over time and return your principal when it matures.',
    'etf': 'An ETF (Exchange-Traded Fund) is a collection of stocks or bonds that trades like a single stock. It provides instant diversification.',
    'mutual fund': 'A mutual fund pools money from many investors to buy a diversified portfolio of stocks, bonds, or other securities.',
    'dividend': 'A dividend is a payment made by companies to shareholders, typically from profits. It\'s like getting paid for owning stock.',
    'portfolio': 'A portfolio is your collection of investments - stocks, bonds, ETFs, and other assets you own.',
    'diversification': 'Diversification means spreading your investments across different assets to reduce risk.'
  };
  
  // Look for definition requests
  const definitionPattern = /^what\s+is\s+(?:a\s+|an\s+)?(\w+)(?:\?)?$/;
  const match = lowerInput.match(definitionPattern);
  
  if (match) {
    const term = match[1];
    const definition = definitions[term];
    
    if (definition) {
      return {
        content: definition,
        provider: 'cached',
        metadata: {
          type: 'definition',
          term
        }
      };
    }
  }
  
  return null;
}

/**
 * Handle UI command queries
 */
async function handleUICommands(
  lowerInput: string,
  _originalInput: string,
  _portfolioContext?: any
): Promise<LocalResponse | null> {
  const commands: Record<string, string> = {
    'help': 'I can help you with:\n• Portfolio analysis and risk assessment\n• Market trends and insights\n• Investment advice and strategies\n• Adding/removing assets from your portfolio\n• Financial education and definitions',
    'clear': 'Chat cleared! How can I help you today?',
    'reset': 'Session reset. What would you like to know about your investments?',
    'refresh': 'Data refreshed. Your portfolio information is up to date.'
  };
  
  const command = commands[lowerInput];
  if (command) {
    return {
      content: command,
      provider: 'cached',
      metadata: {
        type: 'ui_command',
        command: lowerInput
      }
    };
  }
  
  return null;
}

/**
 * Handle requests for sample portfolio charts
 */
async function handleSamplePortfolioChart(
  lowerInput: string,
  _originalInput: string,
  portfolioContext?: any
): Promise<LocalResponse | null> {
  const chartPatterns = [
    /show.*sample.*(?:portfolio|chart|allocation)/,
    /(?:sample|example).*(?:portfolio|chart)/,
    /portfolio.*chart/
  ];
  
  if (!chartPatterns.some(pattern => pattern.test(lowerInput))) {
    return null;
  }
  
  const sampleData = [
    { name: 'AAPL', value: 35 },
    { name: 'GOOGL', value: 25 },
    { name: 'MSFT', value: 20 },
    { name: 'TSLA', value: 15 },
    { name: 'Cash', value: 5 }
  ];
  
  const chartData = {
    type: 'pie' as const,
    title: 'Sample Portfolio Allocation',
    data: sampleData
  };
  
  return {
    content: "Here's a sample portfolio allocation chart showing how investments might be distributed across different assets.",
    provider: 'simulation',
    chartData,
    metadata: {
      type: 'sample_chart'
    }
  };
}

/**
 * Fallback handler for unmatched queries
 */
async function handleFallback(
  _lowerInput: string,
  originalInput: string,
  _portfolioContext?: any
): Promise<LocalResponse> {
  // This is a catch-all that should always return something
  const responses = [
    "I'm analyzing your question and will provide insights shortly.",
    "Let me process that request for you.",
    "I'll help you with that financial question.",
    "Processing your investment query..."
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    content: randomResponse,
    provider: 'simulation',
    metadata: {
      type: 'fallback',
      originalQuery: originalInput
    }
  };
}

/**
 * Create chart data from portfolio assets
 */
function createPortfolioChartData(assets: any[]): {
  type: 'pie';
  title: string;
  data: Array<{ name: string; value: number }>;
} | undefined {
  if (!assets || assets.length === 0) {
    return undefined;
  }
  
  const chartData = assets
    .filter(asset => asset.quantity > 0)
    .map(asset => ({
      name: asset.symbol,
      value: asset.avgCost && asset.avgCost > 0 
        ? asset.quantity * asset.avgCost
        : asset.quantity
    }))
    .filter(item => item.value > 0);
  
  if (chartData.length === 0) {
    return undefined;
  }
  
  return {
    type: 'pie',
    title: 'Portfolio Allocation',
    data: chartData
  };
}