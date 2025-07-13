// ============================================================================
// FILE: lib/langgraph/services/langgraph-backend-service.ts
// Backend LangGraph service for complex workflow orchestration
// ============================================================================

import { CompiledGraph } from '@langchain/langgraph';
import { createBackendGraph } from '../backend/main-workflow-graph';
import { ConversationState, createInitialState } from '../shared/state-schemas';

export interface BackendProcessingResult {
  success: boolean;
  content: string;
  provider?: string;
  chartData?: any;
  metadata?: {
    agentResults: string[];
    llmTokens?: number;
    executionTimeMs: number;
    backendType: 'langgraph';
  };
  error?: {
    message: string;
    code?: string;
    recoverable: boolean;
  };
}

export interface BackendProcessingOptions {
  portfolioContext?: {
    userId?: string;
    guestSessionId?: string;
    isGuestMode?: boolean;
    portfolios?: any[];
    userPreferences?: Record<string, any>;
    provider?: string;
  };
  sessionId?: string;
  requestId?: string;
}

/**
 * Backend LangGraph service for complex workflow orchestration
 */
export class LangGraphBackendService {
  private graph: CompiledGraph;
  private isInitialized = false;

  constructor() {
    this.initializeGraph();
  }

  private initializeGraph() {
    try {
      this.graph = createBackendGraph();
      this.isInitialized = true;
      console.log('🚀 LangGraph backend service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize backend graph:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Process a complex query through the backend graph
   */
  async processComplexQuery(
    query: string,
    options: BackendProcessingOptions = {}
  ): Promise<BackendProcessingResult> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      throw new Error('LangGraph backend service not initialized');
    }

    try {
      console.log(`🔧 Backend processing complex query: "${query.substring(0, 50)}..."`);

      // Create initial state for backend processing
      const initialState = this.createBackendInitialState(query, options);

      // Execute the backend graph
      const result = await this.graph.invoke(initialState);
      const executionTimeMs = Date.now() - startTime;

      // Extract and format result
      if (result.error) {
        return {
          success: false,
          content: 'I apologize, but I encountered an error processing your request.',
          error: result.error,
          metadata: {
            agentResults: [],
            executionTimeMs,
            backendType: 'langgraph'
          }
        };
      }

      const response = result.response;
      if (!response) {
        return {
          success: false,
          content: 'I was unable to generate a response to your query.',
          error: {
            message: 'No response generated',
            code: 'NO_RESPONSE',
            recoverable: true
          },
          metadata: {
            agentResults: [],
            executionTimeMs,
            backendType: 'langgraph'
          }
        };
      }

      console.log(`✅ Backend processing completed in ${executionTimeMs}ms`);

      return {
        success: true,
        content: response.content,
        provider: response.provider,
        chartData: response.chartData,
        metadata: {
          agentResults: response.metadata?.agentResults || [],
          llmTokens: response.metadata?.llmTokens,
          executionTimeMs,
          backendType: 'langgraph'
        }
      };

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      console.error('❌ Backend processing error:', error);

      return {
        success: false,
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        error: {
          message: error instanceof Error ? error.message : 'Unknown backend processing error',
          code: 'BACKEND_ERROR',
          recoverable: true
        },
        metadata: {
          agentResults: [],
          executionTimeMs,
          backendType: 'langgraph'
        }
      };
    }
  }

  /**
   * Stream processing results for real-time updates
   */
  async *streamComplexQuery(
    query: string,
    options: BackendProcessingOptions = {}
  ): AsyncGenerator<Partial<BackendProcessingResult>, void, unknown> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Backend streaming: "${query.substring(0, 50)}..."`);

      const initialState = this.createBackendInitialState(query, options);

      // Stream through the backend graph
      const stream = await this.graph.stream(initialState);
      
      for await (const chunk of stream) {
        const executionTimeMs = Date.now() - startTime;

        // Extract current state and yield partial result
        if (chunk.backendState?.activeAgent) {
          yield {
            success: true,
            content: `Processing with ${chunk.backendState.activeAgent} agent...`,
            metadata: {
              agentResults: [chunk.backendState.activeAgent],
              executionTimeMs,
              backendType: 'langgraph'
            }
          };
        }

        // If we have a final response, yield it
        if (chunk.response) {
          yield {
            success: true,
            content: chunk.response.content,
            provider: chunk.response.provider,
            chartData: chunk.response.chartData,
            metadata: {
              agentResults: chunk.response.metadata?.agentResults || [],
              llmTokens: chunk.response.metadata?.llmTokens,
              executionTimeMs,
              backendType: 'langgraph'
            }
          };
        }

        // If there's an error, yield it
        if (chunk.error) {
          yield {
            success: false,
            content: 'I encountered an error processing your request.',
            error: chunk.error,
            metadata: {
              agentResults: [],
              executionTimeMs,
              backendType: 'langgraph'
            }
          };
        }
      }

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      console.error('❌ Backend streaming error:', error);

      yield {
        success: false,
        content: 'I encountered an error while processing your request.',
        error: {
          message: error instanceof Error ? error.message : 'Unknown streaming error',
          code: 'BACKEND_STREAM_ERROR',
          recoverable: true
        },
        metadata: {
          agentResults: [],
          executionTimeMs,
          backendType: 'langgraph'
        }
      };
    }
  }

  /**
   * Create initial state for backend processing
   */
  private createBackendInitialState(
    query: string,
    options: BackendProcessingOptions
  ): ConversationState {
    const baseState = createInitialState();
    
    return {
      ...baseState,
      userInput: query,
      portfolioContext: {
        ...baseState.portfolioContext,
        ...options.portfolioContext,
        sessionId: options.sessionId
      },
      backendState: {
        ...baseState.backendState,
        agentResults: {},
        toolResults: []
      }
    };
  }

  /**
   * Check service health and dependencies
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    components: Record<string, 'up' | 'down'>;
    details?: string;
  }> {
    try {
      const components: Record<string, 'up' | 'down'> = {
        graph: this.isInitialized ? 'up' : 'down',
        llmService: 'unknown',
        portfolioCrud: 'unknown',
        unifiedAnalysis: 'unknown'
      };

      // Test core dependencies
      try {
        const { llmService } = await import('../../llm-service');
        components.llmService = llmService.getAvailableProviders().length > 0 ? 'up' : 'down';
      } catch {
        components.llmService = 'down';
      }

      try {
        await import('../../portfolio-crud-handler');
        components.portfolioCrud = 'up';
      } catch {
        components.portfolioCrud = 'down';
      }

      try {
        await import('../../unified-analysis-service');
        components.unifiedAnalysis = 'up';
      } catch {
        components.unifiedAnalysis = 'down';
      }

      const allUp = Object.values(components).every(status => status === 'up');
      
      return {
        status: allUp ? 'healthy' : 'unhealthy',
        components
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        components: { graph: 'down' },
        details: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Get service status and configuration
   */
  getStatus(): {
    isInitialized: boolean;
    version: string;
    capabilities: string[];
    graphNodes: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      version: '1.0.0',
      capabilities: [
        'complex_workflow_orchestration',
        'multi_agent_coordination',
        'portfolio_operations',
        'market_analysis',
        'risk_assessment',
        'llm_integration',
        'streaming_support'
      ],
      graphNodes: [
        'queryAnalysis',
        'portfolioAgent',
        'marketAgent',
        'riskAgent',
        'coordinator'
      ]
    };
  }

  /**
   * Reset the service (reinitialize graph)
   */
  reset(): void {
    this.isInitialized = false;
    this.initializeGraph();
    console.log('🔄 Backend service reset');
  }
}

// Export singleton instance
export const langGraphBackendService = new LangGraphBackendService();