// ============================================================================
// FILE: lib/langgraph/frontend/ui-orchestration-graph.ts
// Frontend LangGraph for UI orchestration and local processing
// ============================================================================

import { StateGraph, START, END, CompiledGraph } from '@langchain/langgraph';
import { ConversationState, createInitialState } from '../shared/state-schemas';
import { analyzeComplexity, explainRoutingDecision, AnalysisContext } from './routing-logic';
import { handleLocalQueries } from './local-processing-nodes';

/**
 * Node: Analyze user input complexity and determine routing
 */
const analyzeComplexityNode = async (state: ConversationState): Promise<ConversationState> => {
  const { userInput, portfolioContext } = state;
  
  if (!userInput) {
    return {
      ...state,
      error: {
        message: 'No user input provided',
        code: 'MISSING_INPUT',
        recoverable: true
      }
    };
  }

  try {
    const context: AnalysisContext = {
      userId: portfolioContext?.userId,
      isGuestMode: portfolioContext?.isGuestMode || false,
      hasPortfolioData: (portfolioContext?.portfolios?.length || 0) > 0,
      sessionHistory: [], // TODO: Implement session history
      currentProvider: state.uiState?.activeProvider
    };

    const routingDecision = await analyzeComplexity(userInput, context);
    
    console.log(`🎯 Routing decision: ${explainRoutingDecision(routingDecision)}`);
    
    return {
      ...state,
      routingDecision,
      processingType: routingDecision.routeTo === 'frontend' ? 'frontend' : 'backend',
      uiState: {
        ...state.uiState,
        isLoading: routingDecision.routeTo === 'backend'
      }
    };
  } catch (error) {
    console.error('Error in complexity analysis:', error);
    return {
      ...state,
      error: {
        message: 'Failed to analyze query complexity',
        code: 'ROUTING_ERROR',
        recoverable: true
      }
    };
  }
};

/**
 * Node: Handle simple queries locally on frontend
 */
const handleLocallyNode = async (state: ConversationState): Promise<ConversationState> => {
  const { userInput, portfolioContext } = state;
  
  if (!userInput) {
    return {
      ...state,
      error: {
        message: 'No input to process locally',
        code: 'MISSING_INPUT',
        recoverable: true
      }
    };
  }

  try {
    console.log('⚡ Processing query locally on frontend');
    
    const localResponse = await handleLocalQueries(userInput, portfolioContext);
    
    return {
      ...state,
      response: localResponse,
      uiState: {
        ...state.uiState,
        isLoading: false,
        showCharts: !!localResponse.chartData
      }
    };
  } catch (error) {
    console.error('Error in local processing:', error);
    return {
      ...state,
      error: {
        message: 'Failed to process query locally',
        code: 'LOCAL_PROCESSING_ERROR',
        recoverable: true
      }
    };
  }
};

/**
 * Node: Prepare request for backend processing
 */
const routeToBackendNode = async (state: ConversationState): Promise<ConversationState> => {
  console.log('🚀 Routing to backend for complex processing');
  
  return {
    ...state,
    processingType: 'backend',
    uiState: {
      ...state.uiState,
      isLoading: true
    }
  };
};

/**
 * Node: Update UI state based on processing results
 */
const updateUINode = async (state: ConversationState): Promise<ConversationState> => {
  const { response, error } = state;
  
  return {
    ...state,
    uiState: {
      ...state.uiState,
      isLoading: false,
      showCharts: !!response?.chartData
    }
  };
};

/**
 * Conditional edge: Route based on complexity analysis
 */
const routingDecisionEdge = (state: ConversationState): string => {
  const { routingDecision, error } = state;
  
  if (error) {
    return 'updateUI';
  }
  
  if (!routingDecision) {
    console.warn('No routing decision found, defaulting to backend');
    return 'routeToBackend';
  }
  
  return routingDecision.routeTo === 'frontend' ? 'handleLocally' : 'routeToBackend';
};

/**
 * Create and configure the frontend UI orchestration graph
 */
export const createFrontendGraph = (): CompiledGraph => {
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
      routingDecision: {
        value: (left?: any, right?: any) => right ?? left,
        default: () => null
      },
      processingType: {
        value: (left?: string, right?: string) => right ?? left,
        default: () => 'frontend'
      },
      uiState: {
        value: (left?: any, right?: any) => ({ ...left, ...right }),
        default: () => ({ isLoading: false, showCharts: false })
      },
      error: {
        value: (left?: any, right?: any) => right ?? left,
        default: () => null
      }
    }
  });

  // Add nodes
  graph.addNode('analyzeComplexity', analyzeComplexityNode);
  graph.addNode('handleLocally', handleLocallyNode);
  graph.addNode('routeToBackend', routeToBackendNode);
  graph.addNode('updateUI', updateUINode);

  // Add edges
  graph.addEdge(START, 'analyzeComplexity');
  graph.addConditionalEdges('analyzeComplexity', routingDecisionEdge);
  graph.addEdge('handleLocally', 'updateUI');
  graph.addEdge('routeToBackend', END); // Backend will handle the rest
  graph.addEdge('updateUI', END);

  // Set entry point
  graph.setEntryPoint('analyzeComplexity');

  return graph.compile();
};

/**
 * Utility: Create initial conversation state
 */
export const createFrontendInitialState = (
  userInput: string,
  portfolioContext?: any
): ConversationState => {
  const baseState = createInitialState();
  
  return {
    ...baseState,
    userInput,
    portfolioContext: {
      ...baseState.portfolioContext,
      ...portfolioContext
    }
  };
};

/**
 * Utility: Extract processing result from frontend graph
 */
export const extractFrontendResult = (state: ConversationState) => {
  return {
    response: state.response,
    processingType: state.processingType,
    routingDecision: state.routingDecision,
    uiState: state.uiState,
    error: state.error
  };
};