// ============================================================================
// FILE: lib/langgraph/services/langgraph-unified-service.ts
// Unified LangGraph service coordinating frontend and backend processing
// ============================================================================

import { langGraphFrontendService, FrontendProcessingOptions } from './langgraph-frontend-service';
import { langGraphBackendService, BackendProcessingOptions } from './langgraph-backend-service';

export interface UnifiedProcessingResult {
  success: boolean;
  content: string;
  provider?: string;
  chartData?: any;
  processingType: 'frontend' | 'backend' | 'hybrid';
  executionTimeMs: number;
  confidence?: number;
  metadata?: {
    routingDecision?: any;
    agentResults?: string[];
    llmTokens?: number;
    backendType?: string;
    frontendCapable?: boolean;
  };
  error?: {
    message: string;
    code?: string;
    recoverable: boolean;
  };
}

export interface UnifiedProcessingOptions {
  userId?: string;
  guestSessionId?: string;
  isGuestMode?: boolean;
  portfolios?: any[];
  userPreferences?: Record<string, any>;
  sessionId?: string;
  provider?: string;
  requestId?: string;
  forceBackend?: boolean; // For testing/debugging
}

/**
 * Unified LangGraph service that intelligently routes between frontend and backend
 */
export class LangGraphUnifiedService {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Both services initialize themselves
      console.log('🔧 Initializing unified LangGraph service...');
      this.isInitialized = true;
      console.log('✅ Unified LangGraph service ready');
    } catch (error) {
      console.error('❌ Failed to initialize unified service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Process a message with intelligent routing between frontend and backend
   */
  async processMessage(
    message: string,
    options: UnifiedProcessingOptions = {}
  ): Promise<UnifiedProcessingResult> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      throw new Error('Unified LangGraph service not initialized');
    }

    try {
      console.log(`🎯 Processing message: "${message.substring(0, 50)}..."`);

      // Step 1: Frontend analysis and potential local handling
      const frontendOptions: FrontendProcessingOptions = {
        portfolioContext: {
          userId: options.userId,
          guestSessionId: options.guestSessionId,
          isGuestMode: options.isGuestMode || false,
          portfolios: options.portfolios || [],
          userPreferences: options.userPreferences || {}
        },
        sessionId: options.sessionId,
        provider: options.provider
      };

      const frontendResult = await langGraphFrontendService.processMessage(message, frontendOptions);

      // Step 2: Check if frontend handled it completely
      if (frontendResult.processingType === 'frontend' && frontendResult.response && !options.forceBackend) {
        const totalExecutionTime = Date.now() - startTime;
        
        console.log(`⚡ Completed with frontend processing in ${totalExecutionTime}ms`);
        
        return {
          success: true,
          content: frontendResult.response.content,
          provider: frontendResult.response.provider || 'cached',
          chartData: frontendResult.response.chartData,
          processingType: 'frontend',
          executionTimeMs: totalExecutionTime,
          confidence: frontendResult.routingDecision?.confidence,
          metadata: {
            routingDecision: frontendResult.routingDecision,
            frontendCapable: true
          }
        };
      }

      // Step 3: Route to backend for complex processing
      if (frontendResult.processingType === 'backend' || options.forceBackend) {
        console.log('🚀 Routing to backend for complex processing...');
        
        const backendOptions: BackendProcessingOptions = {
          portfolioContext: {
            userId: options.userId,
            guestSessionId: options.guestSessionId,
            isGuestMode: options.isGuestMode || false,
            portfolios: options.portfolios || [],
            userPreferences: options.userPreferences || {},
            provider: options.provider
          },
          sessionId: options.sessionId,
          requestId: options.requestId
        };

        const backendResult = await langGraphBackendService.processComplexQuery(message, backendOptions);
        const totalExecutionTime = Date.now() - startTime;

        console.log(`🔧 Completed with backend processing in ${totalExecutionTime}ms`);

        return {
          success: backendResult.success,
          content: backendResult.content,
          provider: backendResult.provider,
          chartData: backendResult.chartData,
          processingType: 'backend',
          executionTimeMs: totalExecutionTime,
          confidence: frontendResult.routingDecision?.confidence,
          metadata: {
            routingDecision: frontendResult.routingDecision,
            agentResults: backendResult.metadata?.agentResults,
            llmTokens: backendResult.metadata?.llmTokens,
            backendType: backendResult.metadata?.backendType,
            frontendCapable: false
          },
          error: backendResult.error
        };
      }

      // Step 4: Handle errors or unexpected states
      const totalExecutionTime = Date.now() - startTime;
      
      return {
        success: false,
        content: 'I encountered an unexpected issue processing your request.',
        processingType: 'frontend',
        executionTimeMs: totalExecutionTime,
        error: frontendResult.error || {
          message: 'Unexpected processing state',
          code: 'UNEXPECTED_STATE',
          recoverable: true
        }
      };

    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;
      console.error('❌ Unified processing error:', error);

      return {
        success: false,
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        processingType: 'frontend',
        executionTimeMs: totalExecutionTime,
        error: {
          message: error instanceof Error ? error.message : 'Unknown unified processing error',
          code: 'UNIFIED_ERROR',
          recoverable: true
        }
      };
    }
  }

  /**
   * Stream processing with intelligent routing
   */
  async *streamMessage(
    message: string,
    options: UnifiedProcessingOptions = {}
  ): AsyncGenerator<Partial<UnifiedProcessingResult>, void, unknown> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Streaming message: "${message.substring(0, 50)}..."`);

      // Step 1: Quick frontend analysis
      const complexity = await langGraphFrontendService.analyzeComplexity(message, {
        portfolioContext: {
          userId: options.userId,
          guestSessionId: options.guestSessionId,
          isGuestMode: options.isGuestMode || false,
          portfolios: options.portfolios || [],
          userPreferences: options.userPreferences || {}
        },
        provider: options.provider
      });

      // Yield initial routing decision
      yield {
        success: true,
        content: `Analyzing query... ${complexity.explanation}`,
        processingType: complexity.routeTo,
        executionTimeMs: Date.now() - startTime,
        confidence: complexity.confidence,
        metadata: {
          routingDecision: complexity
        }
      };

      // Step 2: Stream based on routing decision
      if (complexity.routeTo === 'frontend' && !options.forceBackend) {
        // Stream frontend processing
        const frontendStream = langGraphFrontendService.streamMessage(message, {
          portfolioContext: {
            userId: options.userId,
            guestSessionId: options.guestSessionId,
            isGuestMode: options.isGuestMode || false,
            portfolios: options.portfolios || [],
            userPreferences: options.userPreferences || {}
          },
          sessionId: options.sessionId,
          provider: options.provider
        });

        for await (const chunk of frontendStream) {
          const totalTime = Date.now() - startTime;
          yield {
            ...chunk,
            processingType: 'frontend',
            executionTimeMs: totalTime,
            confidence: complexity.confidence,
            metadata: {
              ...chunk.metadata,
              routingDecision: complexity,
              frontendCapable: true
            }
          };
        }
      } else {
        // Stream backend processing
        const backendStream = langGraphBackendService.streamComplexQuery(message, {
          portfolioContext: {
            userId: options.userId,
            guestSessionId: options.guestSessionId,
            isGuestMode: options.isGuestMode || false,
            portfolios: options.portfolios || [],
            userPreferences: options.userPreferences || {},
            provider: options.provider
          },
          sessionId: options.sessionId,
          requestId: options.requestId
        });

        for await (const chunk of backendStream) {
          const totalTime = Date.now() - startTime;
          yield {
            ...chunk,
            processingType: 'backend',
            executionTimeMs: totalTime,
            confidence: complexity.confidence,
            metadata: {
              ...chunk.metadata,
              routingDecision: complexity,
              frontendCapable: false
            }
          };
        }
      }

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Unified streaming error:', error);

      yield {
        success: false,
        content: 'I encountered an error while processing your request.',
        processingType: 'frontend',
        executionTimeMs: totalTime,
        error: {
          message: error instanceof Error ? error.message : 'Unknown streaming error',
          code: 'UNIFIED_STREAM_ERROR',
          recoverable: true
        }
      };
    }
  }

  /**
   * Check if a message can be handled locally (frontend only)
   */
  async canHandleLocally(
    message: string,
    options: UnifiedProcessingOptions = {}
  ): Promise<boolean> {
    try {
      return await langGraphFrontendService.canHandleLocally(message, {
        portfolioContext: {
          userId: options.userId,
          guestSessionId: options.guestSessionId,
          isGuestMode: options.isGuestMode || false,
          portfolios: options.portfolios || []
        },
        provider: options.provider
      });
    } catch (error) {
      console.error('Error checking local capability:', error);
      return false;
    }
  }

  /**
   * Get complexity analysis for a message
   */
  async analyzeMessageComplexity(
    message: string,
    options: UnifiedProcessingOptions = {}
  ) {
    return await langGraphFrontendService.analyzeComplexity(message, {
      portfolioContext: {
        userId: options.userId,
        guestSessionId: options.guestSessionId,
        isGuestMode: options.isGuestMode || false,
        portfolios: options.portfolios || []
      },
      provider: options.provider
    });
  }

  /**
   * Get overall service health
   */
  async getHealthStatus() {
    try {
      const [frontendStatus, backendStatus, backendHealth] = await Promise.all([
        Promise.resolve(langGraphFrontendService.getStatus()),
        Promise.resolve(langGraphBackendService.getStatus()),
        langGraphBackendService.checkHealth()
      ]);

      return {
        unified: {
          isInitialized: this.isInitialized,
          version: '1.0.0'
        },
        frontend: frontendStatus,
        backend: {
          ...backendStatus,
          health: backendHealth
        }
      };
    } catch (error) {
      return {
        unified: {
          isInitialized: false,
          error: error instanceof Error ? error.message : 'Health check failed'
        }
      };
    }
  }

  /**
   * Reset all services
   */
  reset(): void {
    langGraphFrontendService.reset();
    langGraphBackendService.reset();
    this.initialize();
    console.log('🔄 Unified service reset');
  }
}

// Export singleton instance
export const langGraphUnifiedService = new LangGraphUnifiedService();