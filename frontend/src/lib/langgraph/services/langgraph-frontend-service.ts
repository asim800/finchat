// ============================================================================
// FILE: lib/langgraph/services/langgraph-frontend-service.ts
// Frontend LangGraph service for UI orchestration and local processing
// ============================================================================

import { CompiledGraph } from '@langchain/langgraph';
import { 
  createFrontendGraph, 
  createFrontendInitialState, 
  extractFrontendResult 
} from '../frontend/ui-orchestration-graph';
import { ConversationState } from '../shared/state-schemas';

export interface FrontendProcessingResult {
  response?: {
    content: string;
    provider: string;
    chartData?: any;
    metadata?: Record<string, any>;
  };
  processingType: 'frontend' | 'backend' | 'hybrid';
  routingDecision?: {
    routeTo: 'frontend' | 'backend';
    confidence: number;
    reasoning: Record<string, boolean>;
    complexityScore: number;
  };
  uiState?: {
    isLoading: boolean;
    showCharts: boolean;
    activeProvider?: string;
    sessionId?: string;
  };
  error?: {
    message: string;
    code?: string;
    recoverable: boolean;
  };
  executionTimeMs: number;
}

export interface FrontendProcessingOptions {
  portfolioContext?: {
    userId?: string;
    guestSessionId?: string;
    isGuestMode?: boolean;
    portfolios?: any[];
    userPreferences?: Record<string, any>;
  };
  sessionId?: string;
  provider?: string;
}

/**
 * Frontend LangGraph service for handling UI orchestration and local processing
 */
export class LangGraphFrontendService {
  private graph: CompiledGraph;
  private isInitialized = false;

  constructor() {
    this.graph = createFrontendGraph();
    this.isInitialized = true;
  }

  /**
   * Process a user message through the frontend graph
   */
  async processMessage(
    message: string,
    options: FrontendProcessingOptions = {}
  ): Promise<FrontendProcessingResult> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      throw new Error('LangGraph frontend service not initialized');
    }

    try {
      console.log(`🎯 Frontend processing: "${message.substring(0, 50)}..."`);

      // Create initial state
      const initialState = createFrontendInitialState(message, {
        ...options.portfolioContext,
        sessionId: options.sessionId,
        activeProvider: options.provider
      });

      // Execute the frontend graph
      const result = await this.graph.invoke(initialState);
      
      // Extract and format result
      const processedResult = extractFrontendResult(result);
      const executionTimeMs = Date.now() - startTime;

      console.log(`✅ Frontend processing completed in ${executionTimeMs}ms`);

      return {
        ...processedResult,
        executionTimeMs
      };

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      console.error('❌ Frontend processing error:', error);

      return {
        processingType: 'frontend',
        error: {
          message: error instanceof Error ? error.message : 'Unknown frontend processing error',
          code: 'FRONTEND_ERROR',
          recoverable: true
        },
        executionTimeMs
      };
    }
  }

  /**
   * Stream processing results (for real-time UI updates)
   */
  async *streamMessage(
    message: string,
    options: FrontendProcessingOptions = {}
  ): AsyncGenerator<Partial<FrontendProcessingResult>, void, unknown> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Frontend streaming: "${message.substring(0, 50)}..."`);

      const initialState = createFrontendInitialState(message, {
        ...options.portfolioContext,
        sessionId: options.sessionId,
        activeProvider: options.provider
      });

      // Stream through the graph
      const stream = await this.graph.stream(initialState);
      
      for await (const chunk of stream) {
        const partialResult = extractFrontendResult(chunk);
        const executionTimeMs = Date.now() - startTime;

        yield {
          ...partialResult,
          executionTimeMs
        };
      }

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      console.error('❌ Frontend streaming error:', error);

      yield {
        processingType: 'frontend',
        error: {
          message: error instanceof Error ? error.message : 'Unknown streaming error',
          code: 'FRONTEND_STREAM_ERROR',
          recoverable: true
        },
        executionTimeMs
      };
    }
  }

  /**
   * Analyze message complexity without full processing
   */
  async analyzeComplexity(
    message: string,
    options: FrontendProcessingOptions = {}
  ): Promise<{
    routeTo: 'frontend' | 'backend';
    confidence: number;
    reasoning: Record<string, boolean>;
    complexityScore: number;
    explanation: string;
  }> {
    try {
      const { analyzeComplexity, explainRoutingDecision } = await import('../frontend/routing-logic');
      
      const context = {
        userId: options.portfolioContext?.userId,
        isGuestMode: options.portfolioContext?.isGuestMode || false,
        hasPortfolioData: (options.portfolioContext?.portfolios?.length || 0) > 0,
        sessionHistory: [], // TODO: Implement
        currentProvider: options.provider
      };

      const decision = await analyzeComplexity(message, context);
      const explanation = explainRoutingDecision(decision);

      return {
        ...decision,
        explanation
      };

    } catch (error) {
      console.error('Error analyzing complexity:', error);
      
      // Default to backend for safety
      return {
        routeTo: 'backend',
        confidence: 0.5,
        reasoning: {
          hasPortfolioOperations: false,
          requiresLLM: true,
          needsExternalData: false,
          requiresCalculation: false,
          isMultiStep: false,
          hasFileUpload: false,
          isSimpleQuery: false
        },
        complexityScore: 0.6,
        explanation: 'Unable to analyze complexity, routing to backend for safety'
      };
    }
  }

  /**
   * Check if a message can be handled locally
   */
  async canHandleLocally(
    message: string,
    options: FrontendProcessingOptions = {}
  ): Promise<boolean> {
    const analysis = await this.analyzeComplexity(message, options);
    return analysis.routeTo === 'frontend' && analysis.confidence > 0.7;
  }

  /**
   * Get service status and statistics
   */
  getStatus(): {
    isInitialized: boolean;
    version: string;
    capabilities: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      version: '1.0.0',
      capabilities: [
        'ui_orchestration',
        'complexity_analysis',
        'local_processing',
        'smart_routing',
        'streaming_support'
      ]
    };
  }

  /**
   * Reset the service (clear any cached state)
   */
  reset(): void {
    // Frontend service is stateless, so just reinitialize
    this.graph = createFrontendGraph();
    console.log('🔄 Frontend service reset');
  }
}

// Export singleton instance
export const langGraphFrontendService = new LangGraphFrontendService();