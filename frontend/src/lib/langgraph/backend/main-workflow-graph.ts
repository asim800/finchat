// ============================================================================
// FILE: lib/langgraph/backend/main-workflow-graph.ts
// Backend LangGraph engine for complex workflow orchestration
// ============================================================================

import { StateGraph, START, END, CompiledGraph } from '@langchain/langgraph';
import { ConversationState } from '../shared/state-schemas';
import { llmService, LLMProvider } from '../../llm-service';
import { FINANCIAL_SYSTEM_PROMPT, generateFinancialPrompt } from '../../financial-prompts';

/**
 * Node: Analyze the query and determine which agents are needed
 */
const queryAnalysisNode = async (state: ConversationState): Promise<ConversationState> => {
  const { userInput } = state;
  
  if (!userInput) {
    return {
      ...state,
      error: {
        message: 'No query to analyze',
        code: 'MISSING_QUERY',
        recoverable: true
      }
    };
  }

  console.log(`🔍 Backend analyzing complex query: "${userInput.substring(0, 100)}..."`);

  try {
    // Analyze what types of processing this query needs
    const analysis = analyzeQueryRequirements(userInput);
    
    return {
      ...state,
      backendState: {
        ...state.backendState,
        analysisResults: analysis,
        activeAgent: determineFirstAgent(analysis)
      }
    };
  } catch (error) {
    console.error('Error in query analysis:', error);
    return {
      ...state,
      error: {
        message: 'Failed to analyze query requirements',
        code: 'ANALYSIS_ERROR',
        recoverable: true
      }
    };
  }
};

/**
 * Node: Portfolio operations agent
 */
const portfolioAgentNode = async (state: ConversationState): Promise<ConversationState> => {
  console.log('💼 Portfolio agent processing...');
  
  try {
    // Import and use existing portfolio CRUD handler
    const { PortfolioCrudHandler } = await import('../../portfolio-crud-handler');
    const { QueryTriage } = await import('../../query-triage');
    
    const triageResult = QueryTriage.analyzeQuery(state.userInput || '');
    
    if (triageResult.regexpMatch) {
      const crudResult = await PortfolioCrudHandler.processRegexpMatch(
        triageResult.regexpMatch,
        state.portfolioContext?.userId,
        state.portfolioContext?.guestSessionId,
        state.portfolioContext?.isGuestMode || false
      );
      
      return {
        ...state,
        backendState: {
          ...state.backendState,
          agentResults: {
            ...state.backendState?.agentResults,
            portfolio: crudResult
          },
          activeAgent: 'coordinator'
        }
      };
    }
    
    // If no regexp match, pass to coordinator
    return {
      ...state,
      backendState: {
        ...state.backendState,
        activeAgent: 'coordinator'
      }
    };
  } catch (error) {
    console.error('Portfolio agent error:', error);
    return {
      ...state,
      backendState: {
        ...state.backendState,
        agentResults: {
          ...state.backendState?.agentResults,
          portfolio: { success: false, error: error instanceof Error ? error.message : 'Portfolio error' }
        },
        activeAgent: 'coordinator'
      }
    };
  }
};

/**
 * Node: Market data agent
 */
const marketAgentNode = async (state: ConversationState): Promise<ConversationState> => {
  console.log('📈 Market agent processing...');
  
  try {
    // Import and use existing unified analysis service
    const { unifiedAnalysisService } = await import('../../unified-analysis-service');
    
    const analysisResult = await unifiedAnalysisService.analyzeQuery(
      state.userInput || '',
      state.portfolioContext?.userId,
      state.portfolioContext?.portfolios || []
    );
    
    return {
      ...state,
      backendState: {
        ...state.backendState,
        agentResults: {
          ...state.backendState?.agentResults,
          market: analysisResult
        },
        activeAgent: 'coordinator'
      }
    };
  } catch (error) {
    console.error('Market agent error:', error);
    return {
      ...state,
      backendState: {
        ...state.backendState,
        agentResults: {
          ...state.backendState?.agentResults,
          market: { success: false, error: error instanceof Error ? error.message : 'Market analysis error' }
        },
        activeAgent: 'coordinator'
      }
    };
  }
};

/**
 * Node: Risk assessment agent
 */
const riskAgentNode = async (state: ConversationState): Promise<ConversationState> => {
  console.log('⚠️ Risk agent processing...');
  
  try {
    // Import and use existing risk analysis services
    const { unifiedAnalysisService } = await import('../../unified-analysis-service');
    
    const userId = state.portfolioContext?.userId;
    if (!userId) {
      throw new Error('User ID required for risk analysis');
    }
    
    // Try portfolio risk analysis
    const riskResult = await unifiedAnalysisService.calculatePortfolioRisk(userId);
    
    return {
      ...state,
      backendState: {
        ...state.backendState,
        agentResults: {
          ...state.backendState?.agentResults,
          risk: riskResult
        },
        activeAgent: 'coordinator'
      }
    };
  } catch (error) {
    console.error('Risk agent error:', error);
    return {
      ...state,
      backendState: {
        ...state.backendState,
        agentResults: {
          ...state.backendState?.agentResults,
          risk: { success: false, error: error instanceof Error ? error.message : 'Risk analysis error' }
        },
        activeAgent: 'coordinator'
      }
    };
  }
};

/**
 * Node: Coordinator agent - orchestrates other agents and LLM
 */
const coordinatorNode = async (state: ConversationState): Promise<ConversationState> => {
  console.log('🤝 Coordinator orchestrating response...');
  
  try {
    const agentResults = state.backendState?.agentResults || {};
    const provider = (state.portfolioContext as any)?.provider || 'openai';
    
    // Collect all agent results
    const contextData = Object.entries(agentResults)
      .filter(([_, result]) => result && (result as any).success)
      .map(([agent, result]) => `${agent}: ${JSON.stringify(result)}`)
      .join('\n');
    
    // Generate enhanced prompt with agent results
    const promptResult = generateFinancialPrompt(state.userInput || '', {
      isGuestMode: state.portfolioContext?.isGuestMode || false,
      portfolioData: state.portfolioContext,
      userPreferences: state.portfolioContext?.userPreferences,
      agentResults: contextData
    });
    
    // Call LLM with enriched context
    const llmResponse = await llmService.generateResponse(
      [{ role: 'user', content: promptResult.prompt }],
      {
        provider: provider as LLMProvider,
        systemPrompt: FINANCIAL_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 1000,
      }
    );
    
    // Check if response should include charts
    const shouldGenerateChart = await shouldIncludeChart(state.userInput || '', llmResponse.content);
    
    return {
      ...state,
      response: {
        content: llmResponse.content,
        provider: provider,
        chartData: shouldGenerateChart ? await generateChartData(state.portfolioContext) : undefined,
        metadata: {
          agentResults: Object.keys(agentResults),
          llmTokens: llmResponse.usage?.tokens
        }
      },
      backendState: {
        ...state.backendState,
        llmProvider: provider as LLMProvider,
        tokens: llmResponse.usage?.tokens
      }
    };
  } catch (error) {
    console.error('Coordinator error:', error);
    return {
      ...state,
      error: {
        message: 'Failed to coordinate response',
        code: 'COORDINATION_ERROR',
        recoverable: true
      }
    };
  }
};

/**
 * Conditional edge: Determine which agent to use next
 */
const agentRouterEdge = (state: ConversationState): string => {
  const activeAgent = state.backendState?.activeAgent;
  const analysis = state.backendState?.analysisResults;
  
  if (!analysis || !activeAgent) {
    return 'coordinator';
  }
  
  switch (activeAgent) {
    case 'portfolio':
      return 'portfolioAgent';
    case 'market':
      return 'marketAgent';
    case 'risk':
      return 'riskAgent';
    case 'coordinator':
      return 'coordinator';
    default:
      return 'coordinator';
  }
};

/**
 * Create and configure the backend workflow graph
 */
export const createBackendGraph = (): CompiledGraph => {
  const graph = new StateGraph({
    channels: {
      userInput: {
        value: (left?: string, right?: string) => right ?? left ?? '',
        default: () => ''
      },
      response: {
        value: (left?: any, right?: any) => right ?? left,
        default: () => null
      },
      portfolioContext: {
        value: (left?: any, right?: any) => ({ ...left, ...right }),
        default: () => ({})
      },
      backendState: {
        value: (left?: any, right?: any) => ({ ...left, ...right }),
        default: () => ({})
      },
      error: {
        value: (left?: any, right?: any) => right ?? left,
        default: () => null
      }
    }
  });

  // Add nodes
  graph.addNode('queryAnalysis', queryAnalysisNode);
  graph.addNode('portfolioAgent', portfolioAgentNode);
  graph.addNode('marketAgent', marketAgentNode);
  graph.addNode('riskAgent', riskAgentNode);
  graph.addNode('coordinator', coordinatorNode);

  // Add edges
  graph.addEdge(START, 'queryAnalysis');
  graph.addConditionalEdges('queryAnalysis', agentRouterEdge);
  graph.addEdge('portfolioAgent', 'coordinator');
  graph.addEdge('marketAgent', 'coordinator');
  graph.addEdge('riskAgent', 'coordinator');
  graph.addEdge('coordinator', END);

  return graph.compile();
};

// Helper functions

function analyzeQueryRequirements(query: string): {
  needsPortfolio: boolean;
  needsMarket: boolean;
  needsRisk: boolean;
  priority: 'portfolio' | 'market' | 'risk';
} {
  const lowerQuery = query.toLowerCase();
  
  const needsPortfolio = /(?:add|remove|update|portfolio|holdings?|positions?)/.test(lowerQuery);
  const needsMarket = /(?:market|price|trend|news|sentiment)/.test(lowerQuery);
  const needsRisk = /(?:risk|volatility|sharpe|var|beta)/.test(lowerQuery);
  
  // Determine priority
  let priority: 'portfolio' | 'market' | 'risk' = 'portfolio';
  if (needsRisk) priority = 'risk';
  else if (needsMarket) priority = 'market';
  
  return {
    needsPortfolio,
    needsMarket,
    needsRisk,
    priority
  };
}

function determineFirstAgent(analysis: { priority: 'portfolio' | 'market' | 'risk' }): 'portfolio' | 'market' | 'risk' | 'coordinator' {
  return analysis.priority;
}

async function shouldIncludeChart(query: string, response: string): Promise<boolean> {
  const chartKeywords = [
    'chart', 'graph', 'allocation', 'breakdown', 'distribution',
    'portfolio', 'show', 'display', 'visualize'
  ];
  
  const queryText = query.toLowerCase();
  const responseText = response.toLowerCase();
  
  return chartKeywords.some(keyword => 
    queryText.includes(keyword) || responseText.includes(keyword)
  );
}

async function generateChartData(portfolioContext?: any): Promise<any> {
  if (!portfolioContext?.portfolios || portfolioContext.portfolios.length === 0) {
    return {
      type: 'pie',
      title: 'Sample Portfolio Allocation',
      data: [{ name: 'Add your assets', value: 100 }]
    };
  }
  
  const allAssets = portfolioContext.portfolios.flatMap((p: any) => p.assets || []);
  const chartData = allAssets
    .filter((asset: any) => asset.quantity > 0)
    .map((asset: any) => ({
      name: asset.symbol,
      value: asset.avgCost && asset.avgCost > 0 
        ? asset.quantity * asset.avgCost
        : asset.quantity
    }))
    .filter((item: any) => item.value > 0);
  
  return {
    type: 'pie',
    title: 'Portfolio Allocation',
    data: chartData
  };
}