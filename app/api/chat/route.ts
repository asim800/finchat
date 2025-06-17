// ============================================================================
// FILE: app/api/chat/route.ts
// Chat API endpoint with LLM integration
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { llmService, LLMProvider } from '@/lib/llm-service';
import { FINANCIAL_SYSTEM_PROMPT, generateFinancialPrompt } from '@/lib/financial-prompts';
import { getUserFromRequest } from '@/lib/auth';



export async function POST(request: NextRequest) {
  // Add this at the top of your POST function in route.ts
  console.log('Available providers:', llmService.getAvailableProviders());
  console.log('Anthropic key exists:', !!process.env.ANTHROPIC_API_KEY);
  console.log('OpenAI key exists:', !!process.env.OPENAI_API_KEY);
    
  try {
    
    const body = await request.json();
    const { message, provider, portfolioData, userPreferences } = body;


    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const user = await getUserFromRequest(request);
    const isGuestMode = !user;

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

    // Generate contextual prompt
    const financialPrompt = generateFinancialPrompt(message, {
      isGuestMode,
      portfolioData,
      userPreferences,
    });

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
    const shouldGenerateChart = await checkForChartGeneration(message, response.content);

    return NextResponse.json({
      content: response.content,
      provider: response.provider,
      usage: response.usage,
      chartData: shouldGenerateChart,
      isGuestMode,
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

// Helper function to determine if we should generate charts
async function checkForChartGeneration(userMessage: string, aiResponse: string): Promise<any> {
  const chartKeywords = ['allocation', 'portfolio', 'distribution', 'breakdown', 'chart', 'graph'];
  const messageContainsChart = chartKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword) || aiResponse.toLowerCase().includes(keyword)
  );

  if (messageContainsChart) {
    // Return sample chart data - in production, this would be more sophisticated
    if (userMessage.toLowerCase().includes('allocation') || userMessage.toLowerCase().includes('portfolio')) {
      return {
        type: 'pie',
        title: 'Portfolio Allocation',
        data: [
          { name: 'Stocks', value: 60 },
          { name: 'Bonds', value: 25 },
          { name: 'REITs', value: 10 },
          { name: 'Cash', value: 5 }
        ]
      };
    }
  }

  return null;
}


