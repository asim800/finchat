// ============================================================================
// FILE: app/api/chat/route.ts
// Chat API endpoint with LLM integration
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { llmService, LLMProvider } from '@/lib/llm-service';
import { FINANCIAL_SYSTEM_PROMPT, generateFinancialPrompt } from '@/lib/financial-prompts';
import { getUserFromRequest } from '@/lib/auth';
import { ChatService } from '@/lib/chat-service';
import { financeMCPClient } from '@/lib/mcp-client';
import { unifiedAnalysisService } from '@/lib/unified-analysis-service';
import { backendConfig } from '@/lib/backend-config';
import { PortfolioService } from '@/lib/portfolio-service';
import { GuestPortfolioService } from '@/lib/guest-portfolio';



export async function POST(request: NextRequest) {
  // Add this at the top of your POST function in route.ts
  console.log('Available providers:', llmService.getAvailableProviders());
  console.log('Anthropic key exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('OpenAI key exists:', !!process.env.OPENAI_API_KEY);
    
  try {
    
    const body = await request.json();
    const { message, provider, portfolioData, userPreferences, sessionId, guestSessionId } = body;


    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const user = await getUserFromRequest(request);
    const isGuestMode = !user;

    // Get or create chat session
    let chatSession;
    try {
      if (sessionId) {
        // Load existing session messages for context
        const existingMessages = await ChatService.getSessionMessages(sessionId);
        chatSession = { id: sessionId, existingMessages };
      } else {
        // Create new session
        const sessionTitle = ChatService.generateSessionTitle(message);
        chatSession = await ChatService.getOrCreateSession(
          user?.id,
          guestSessionId,
          sessionTitle
        );
      }
    } catch (sessionError) {
      console.error('Session management error:', sessionError);
      // Continue without session saving if there's an error
      chatSession = null;
    }

    // Validate provider if specified
    // const selectedProvider: LLMProvider = provider || 'anthropic';
    // In your route.ts, change this line:
    const selectedProvider: LLMProvider = provider || 'openai'; // Force OpenAI
    if (!llmService.isProviderAvailable(selectedProvider)) {
      return NextResponse.json(
        { error: `LLM provider '${selectedProvider}' is not available` },
        { status: 400 }
      );
    }

    // Check if message requires MCP tools
    const toolAnalysis = await analyzeMCPToolNeeds(message, user?.id, isGuestMode);
    
    // Generate contextual prompt
    let financialPrompt = generateFinancialPrompt(message, {
      isGuestMode,
      portfolioData,
      userPreferences,
    });

    // Add MCP tool results or fallback message to prompt
    if (toolAnalysis.toolResults) {
      financialPrompt += `\n\nRelevant Analysis Results:\n${toolAnalysis.toolResults}`;
    } else if (toolAnalysis.fallbackMessage) {
      financialPrompt += `\n\nNote: ${toolAnalysis.fallbackMessage}`;
    }

    // Inform LLM about MCP status for better response handling
    if (toolAnalysis.mcpStatus === 'partial') {
      financialPrompt += `\n\nNote: Some advanced analysis tools are temporarily unavailable. Please provide general financial guidance where specific calculations are missing.`;
    } else if (toolAnalysis.mcpStatus === 'failed') {
      financialPrompt += `\n\nNote: Advanced analysis tools are currently unavailable. Please provide helpful general financial guidance and mention that detailed analysis will be available later.`;
    }

    // Save user message to session
    if (chatSession) {
      try {
        await ChatService.saveMessage(
          chatSession.id,
          'user',
          message,
          'user'
        );
      } catch (saveError) {
        console.error('Failed to save user message:', saveError);
      }
    }

    // Generate response using selected LLM
    const response = await llmService.generateResponse(
      [{ role: 'user', content: financialPrompt }],
      {
        provider: selectedProvider,
        systemPrompt: FINANCIAL_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 1000,
      }
    );

    // Check if response suggests creating charts/visualizations
    const shouldGenerateChart = await checkForChartGeneration(
      message, 
      response.content, 
      user?.id, 
      guestSessionId, 
      chatSession,
      isGuestMode
    );

    // Save assistant message to session
    if (chatSession) {
      try {
        await ChatService.saveMessage(
          chatSession.id,
          'assistant',
          response.content,
          response.provider,
          shouldGenerateChart && shouldGenerateChart !== null ? { chartData: shouldGenerateChart } : undefined
        );
      } catch (saveError) {
        console.error('Failed to save assistant message:', saveError);
      }
    }

    return NextResponse.json({
      content: response.content,
      provider: response.provider,
      usage: response.usage,
      chartData: shouldGenerateChart,
      isGuestMode,
      sessionId: chatSession?.id,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        fallback: 'I apologize, but I\'m having trouble processing your request right now. Please try again.'
      },
      { status: 500 }
    );
  }
}

// Enhanced chart generation function with real portfolio data
async function checkForChartGeneration(
  userMessage: string, 
  aiResponse: string, 
  userId?: string,
  guestSessionId?: string,
  chatSession?: { id: string; existingMessages?: unknown[] } | null,
  isGuestMode: boolean = false
): Promise<{
  type: string;
  title: string;
  data: Array<{ name: string; value: number }>;
} | null> {
  
  // Explicit chart request keywords
  const explicitChartKeywords = [
    'show chart', 'create chart', 'generate chart', 'display chart',
    'show pie chart', 'show graph', 'visualize', 'show allocation',
    'portfolio chart', 'allocation chart', 'breakdown chart'
  ];
  
  // Portfolio-related keywords that might suggest charts
  const portfolioKeywords = ['allocation', 'portfolio', 'distribution', 'breakdown'];
  
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();
  
  // Check for explicit chart requests
  const explicitRequest = explicitChartKeywords.some(keyword => 
    lowerMessage.includes(keyword) || lowerResponse.includes(keyword)
  );
  
  // Check if this is the first message in a session (show welcome portfolio chart)
  const isFirstMessage = await isSessionFirstMessage(chatSession || null);
  
  // Generate chart if:
  // 1. Explicit request for charts
  // 2. First message in session (welcome portfolio overview)
  // 3. User specifically asks about portfolio/allocation
  const shouldShowChart = explicitRequest || 
    (isFirstMessage && (lowerMessage.includes('portfolio') || lowerMessage.includes('hello') || lowerMessage.includes('hi'))) ||
    (portfolioKeywords.some(keyword => lowerMessage.includes(keyword)) && 
     (lowerMessage.includes('show') || lowerMessage.includes('what') || lowerMessage.includes('my')));

  if (shouldShowChart) {
    try {
      // Get real portfolio data
      const portfolioData = await getRealPortfolioData(userId, guestSessionId, isGuestMode);
      
      if (portfolioData && portfolioData.length > 0) {
        return {
          type: 'pie',
          title: isFirstMessage ? 'Welcome! Your Portfolio Overview' : 'Portfolio Allocation',
          data: portfolioData
        };
      } else {
        // Return sample data if no real portfolio data exists
        return {
          type: 'pie',
          title: 'Sample Portfolio Allocation',
          data: [
            { name: 'Add your assets', value: 100 }
          ]
        };
      }
    } catch (error) {
      console.error('Error generating portfolio chart:', error);
      return null;
    }
  }

  return null;
}

// Helper function to check if this is the first message in a session
async function isSessionFirstMessage(chatSession: { id: string; existingMessages?: unknown[] } | null): Promise<boolean> {
  if (!chatSession || !chatSession.id) return true;
  
  try {
    const messageCount = await ChatService.getSessionMessageCount(chatSession.id);
    return messageCount <= 1; // 0 or 1 messages (the current user message)
  } catch (error) {
    console.error('Error checking session message count:', error);
    return false;
  }
}

// Helper function to get real portfolio data for charts
async function getRealPortfolioData(
  userId?: string, 
  guestSessionId?: string, 
  isGuestMode: boolean = false
): Promise<Array<{ name: string; value: number }> | null> {
  
  try {
    if (isGuestMode && guestSessionId) {
      // Get guest portfolio data
      const guestData = GuestPortfolioService.getGuestPortfolio(guestSessionId);
      if (guestData && guestData.assets.length > 0) {
        return guestData.assets
          .filter(asset => asset.quantity > 0) // Only filter by quantity, not avgPrice
          .map(asset => ({
            name: asset.symbol,
            value: asset.avgPrice && asset.avgPrice > 0 
              ? asset.quantity * asset.avgPrice  // Use dollar value if avgPrice available
              : asset.quantity // Use quantity as weight if no avgPrice
          }))
          .filter(item => item.value > 0);
      }
    } else if (userId) {
      // Get authenticated user's portfolio data
      const portfolio = await PortfolioService.getOrCreateDefaultPortfolio(userId);
      console.log('📊 Portfolio assets from DB:', portfolio.assets.map(a => ({
        symbol: a.symbol,
        quantity: a.quantity,
        avgPrice: a.avgPrice
      })));
      
      if (portfolio.assets.length > 0) {
        const chartData = portfolio.assets
          .filter(asset => asset.quantity > 0) // Only filter by quantity, not avgPrice
          .map(asset => ({
            name: asset.symbol,
            value: asset.avgPrice && asset.avgPrice > 0 
              ? asset.quantity * asset.avgPrice  // Use dollar value if avgPrice available
              : asset.quantity // Use quantity as weight if no avgPrice
          }))
          .filter(item => item.value > 0);
        
        console.log('📊 Chart data generated:', chartData);
        return chartData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching portfolio data for chart:', error);
    return null;
  }
}

// MCP Tool Analysis Function with graceful fallback
async function analyzeMCPToolNeeds(
  message: string, 
  userId?: string, 
  isGuestMode: boolean = false
): Promise<{ toolResults?: string; fallbackMessage?: string; mcpStatus: 'success' | 'partial' | 'failed' }> {
  // Skip MCP tools for guest mode (no user data available)
  if (isGuestMode || !userId) {
    return { mcpStatus: 'success' };
  }

  const lowerMessage = message.toLowerCase();
  
  // Keywords that trigger portfolio risk analysis
  const riskKeywords = [
    'risk', 'volatility', 'var', 'value at risk', 'drawdown', 
    'portfolio risk', 'analyze my portfolio', 'portfolio analysis'
  ];
  
  // Keywords that trigger Sharpe ratio calculation
  const sharpeKeywords = [
    'sharpe', 'sharpe ratio', 'risk adjusted', 'risk-adjusted', 
    'performance ratio', 'return per risk'
  ];
  
  // Keywords that trigger market data
  const marketKeywords = [
    'market data', 'current price', 'stock price', 'market performance',
    'price change', 'market trend'
  ];

  let toolResults = '';
  const failedTools: string[] = [];
  let successfulTools = 0;
  let totalAttemptedTools = 0;

  // Check if any MCP tools are needed
  const needsRisk = riskKeywords.some(keyword => lowerMessage.includes(keyword));
  const needsSharpe = sharpeKeywords.some(keyword => lowerMessage.includes(keyword));
  const needsMarket = marketKeywords.some(keyword => lowerMessage.includes(keyword));

  if (!needsRisk && !needsSharpe && !needsMarket) {
    return { mcpStatus: 'success' };
  }

  try {
    // Check which backend we're using - skip MCP checks if FastAPI is primary and no fallback
    const primaryBackend = backendConfig.getPrimaryBackend();
    const fallbackEnabled = backendConfig.isFallbackEnabled();
    
    console.log(`🔍 Using ${primaryBackend.type.toUpperCase()} as primary backend, fallback: ${fallbackEnabled}`);
    
    // Only check MCP dependencies if MCP is primary OR fallback is enabled
    if (primaryBackend.type === 'mcp' || fallbackEnabled) {
      console.log('🔍 Checking MCP server availability...');
      const dependencyCheck = await financeMCPClient.checkDependencies();
      
      if (!dependencyCheck.available && primaryBackend.type === 'mcp' && !fallbackEnabled) {
        console.warn('⚠️ MCP server dependencies not available:', dependencyCheck.error);
        return {
          fallbackMessage: createMCPFallbackMessage(lowerMessage, needsRisk, needsSharpe, needsMarket),
          mcpStatus: 'failed'
        };
      }
    }

    // Execute tools with individual error handling
    if (needsRisk) {
      totalAttemptedTools++;
      try {
        console.log('🔧 Executing portfolio risk analysis tool...');
        const result = await unifiedAnalysisService.calculatePortfolioRisk(userId);
        
        if (result.success && result.formattedData) {
          toolResults += result.formattedData + '\n\n';
          successfulTools++;
          
          if (result.fallbackUsed) {
            toolResults += `*Note: Analysis completed using ${result.backend.toUpperCase()} backend*\n\n`;
          }
        } else {
          console.error('Risk analysis error:', result.error);
          failedTools.push('Portfolio Risk Analysis');
        }
      } catch (error) {
        console.error('Risk analysis execution error:', error);
        failedTools.push('Portfolio Risk Analysis');
      }
    }
    
    if (needsSharpe) {
      totalAttemptedTools++;
      try {
        console.log('🔧 Executing Sharpe ratio calculation tool...');
        const result = await unifiedAnalysisService.calculateSharpeRatio(userId);
        
        if (result.success && result.formattedData) {
          toolResults += result.formattedData + '\n\n';
          successfulTools++;
          
          if (result.fallbackUsed) {
            toolResults += `*Note: Analysis completed using ${result.backend.toUpperCase()} backend*\n\n`;
          }
        } else {
          console.error('Sharpe analysis error:', result.error);
          failedTools.push('Sharpe Ratio Analysis');
        }
      } catch (error) {
        console.error('Sharpe analysis execution error:', error);
        failedTools.push('Sharpe Ratio Analysis');
      }
    }
    
    if (needsMarket) {
      totalAttemptedTools++;
      try {
        console.log('🔧 Executing market data analysis tool...');
        const result = await unifiedAnalysisService.getPortfolioMarketData(userId, '1mo');
        
        if (result.success && result.formattedData) {
          toolResults += result.formattedData;
          successfulTools++;
          
          if (result.fallbackUsed) {
            toolResults += `*Note: Analysis completed using ${result.backend.toUpperCase()} backend*\n\n`;
          }
        } else {
          console.error('Market data error:', result.error);
          failedTools.push('Market Data Analysis');
        }
      } catch (error) {
        console.error('Market data execution error:', error);
        failedTools.push('Market Data Analysis');
      }
    }

  } catch (error) {
    console.error('MCP Tool execution error:', error);
    return {
      fallbackMessage: createMCPFallbackMessage(lowerMessage, needsRisk, needsSharpe, needsMarket),
      mcpStatus: 'failed'
    };
  }

  // Determine status and prepare response
  const mcpStatus = successfulTools === 0 ? 'failed' : 
                   successfulTools < totalAttemptedTools ? 'partial' : 'success';

  let fallbackMessage = '';
  if (failedTools.length > 0) {
    fallbackMessage = `⚠️ Some analysis tools are temporarily unavailable (${failedTools.join(', ')}). ` +
                     `I'll provide general guidance based on portfolio fundamentals instead.\n\n`;
  }

  return {
    toolResults: toolResults || undefined,
    fallbackMessage: fallbackMessage || undefined,
    mcpStatus
  };
}

// Helper function to create fallback messages when MCP tools fail
function createMCPFallbackMessage(
  _lowerMessage: string, 
  needsRisk: boolean, 
  needsSharpe: boolean, 
  needsMarket: boolean
): string {
  let fallback = '🤖 **Analysis temporarily unavailable** - I\'ll provide general guidance instead:\n\n';

  if (needsRisk) {
    fallback += '📊 **Portfolio Risk Guidelines:**\n' +
               '• Diversification across asset classes reduces risk\n' +
               '• Higher volatility assets require smaller position sizes\n' +
               '• Consider your risk tolerance and investment timeline\n' +
               '• Regular rebalancing helps maintain target allocations\n\n';
  }

  if (needsSharpe) {
    fallback += '📈 **Risk-Adjusted Performance Tips:**\n' +
               '• Sharpe ratio measures return per unit of risk\n' +
               '• Values > 1.0 are generally considered good\n' +
               '• Focus on consistent returns rather than high volatility gains\n' +
               '• Consider low-cost index funds for better risk-adjusted returns\n\n';
  }

  if (needsMarket) {
    fallback += '💹 **Market Analysis Approach:**\n' +
               '• Check financial news sites for current market data\n' +
               '• Focus on long-term trends rather than daily fluctuations\n' +
               '• Consider dollar-cost averaging for volatile markets\n' +
               '• Review fundamentals of your holdings regularly\n\n';
  }

  fallback += '💡 For detailed analysis, please try again later when our advanced tools are available.';
  
  return fallback;
}


