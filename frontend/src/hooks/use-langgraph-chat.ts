// ============================================================================
// FILE: hooks/use-langgraph-chat.ts
// Enhanced chat hook with LangGraph integration
// ============================================================================

'use client';

import { useState, useCallback, useRef } from 'react';
import { langGraphUnifiedService, UnifiedProcessingOptions } from '@/lib/langgraph/services/langgraph-unified-service';

interface ChartData {
  type: 'pie' | 'bar';
  title: string;
  data: Array<{ name: string; value: number }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  timestamp: Date;
  chartData?: ChartData;
  sessionId?: string;
  metadata?: {
    processingType?: 'frontend' | 'backend' | 'hybrid';
    executionTimeMs?: number;
    confidence?: number;
    agentResults?: string[];
  };
}

interface ChatOptions {
  provider?: 'anthropic' | 'openai';
  portfolioData?: any;
  userPreferences?: any;
  sessionId?: string;
  guestSessionId?: string;
  requestId?: string;
  enableStreaming?: boolean;
  forceBackend?: boolean; // For testing/debugging
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  currentStreamingMessage?: Partial<ChatMessage>;
}

export const useLangGraphChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message with LangGraph processing
   */
  const sendMessage = useCallback(async (
    message: string,
    options: ChatOptions = {}
  ): Promise<ChatMessage | null> => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      currentStreamingMessage: undefined
    }));

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      console.log(`📤 Sending message via LangGraph: "${message.substring(0, 50)}..."`);

      const processingOptions: UnifiedProcessingOptions = {
        userId: undefined, // Will be set by API
        guestSessionId: options.guestSessionId,
        isGuestMode: !options.portfolioData?.userId,
        portfolios: options.portfolioData?.portfolios || [],
        userPreferences: options.userPreferences || {},
        sessionId: options.sessionId,
        provider: options.provider,
        requestId: options.requestId,
        forceBackend: options.forceBackend
      };

      let result;
      
      if (options.enableStreaming) {
        // Use streaming for real-time updates
        result = await handleStreamingMessage(message, processingOptions);
      } else {
        // Use direct processing
        result = await langGraphUnifiedService.processMessage(message, processingOptions);
      }

      if (!result.success) {
        throw new Error(result.error?.message || 'Processing failed');
      }

      const responseMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.content,
        provider: result.provider || 'langgraph',
        timestamp: new Date(),
        chartData: result.chartData,
        sessionId: options.sessionId,
        metadata: {
          processingType: result.processingType,
          executionTimeMs: result.executionTimeMs,
          confidence: result.confidence,
          agentResults: result.metadata?.agentResults
        }
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        currentStreamingMessage: undefined
      }));

      console.log(`✅ Message processed successfully in ${result.executionTimeMs}ms`);
      return responseMessage;

    } catch (error) {
      console.error('❌ Error sending message:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        currentStreamingMessage: undefined
      }));
      return null;
    }
  }, []);

  /**
   * Handle streaming message processing
   */
  const handleStreamingMessage = async (
    message: string,
    options: UnifiedProcessingOptions
  ) => {
    setState(prev => ({ ...prev, isStreaming: true }));

    let finalResult: any = null;

    try {
      const stream = langGraphUnifiedService.streamMessage(message, options);

      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Request cancelled');
        }

        // Update streaming message state
        setState(prev => ({
          ...prev,
          currentStreamingMessage: {
            id: 'streaming',
            role: 'assistant',
            content: chunk.content || 'Processing...',
            provider: chunk.provider || 'langgraph',
            timestamp: new Date(),
            chartData: chunk.chartData,
            metadata: {
              processingType: chunk.processingType,
              executionTimeMs: chunk.executionTimeMs,
              confidence: chunk.confidence,
              agentResults: chunk.metadata?.agentResults
            }
          }
        }));

        // Keep track of the final result
        if (chunk.content && chunk.content !== 'Processing...') {
          finalResult = chunk;
        }
      }

      return finalResult || { success: false, error: { message: 'No result from stream' } };

    } catch (error) {
      console.error('❌ Streaming error:', error);
      throw error;
    }
  };

  /**
   * Check if a message can be handled locally (for UI optimization)
   */
  const canHandleLocally = useCallback(async (
    message: string,
    options: ChatOptions = {}
  ): Promise<boolean> => {
    try {
      return await langGraphUnifiedService.canHandleLocally(message, {
        userId: options.portfolioData?.userId,
        guestSessionId: options.guestSessionId,
        isGuestMode: !options.portfolioData?.userId,
        portfolios: options.portfolioData?.portfolios || [],
        provider: options.provider
      });
    } catch (error) {
      console.error('Error checking local capability:', error);
      return false;
    }
  }, []);

  /**
   * Analyze message complexity
   */
  const analyzeComplexity = useCallback(async (
    message: string,
    options: ChatOptions = {}
  ) => {
    try {
      return await langGraphUnifiedService.analyzeMessageComplexity(message, {
        userId: options.portfolioData?.userId,
        guestSessionId: options.guestSessionId,
        isGuestMode: !options.portfolioData?.userId,
        portfolios: options.portfolioData?.portfolios || [],
        provider: options.provider
      });
    } catch (error) {
      console.error('Error analyzing complexity:', error);
      return null;
    }
  }, []);

  /**
   * Cancel ongoing processing
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        currentStreamingMessage: undefined,
        error: 'Request cancelled'
      }));
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset chat state
   */
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null
    });
  }, []);

  /**
   * Get service health status
   */
  const getServiceStatus = useCallback(async () => {
    try {
      return await langGraphUnifiedService.getHealthStatus();
    } catch (error) {
      console.error('Error getting service status:', error);
      return null;
    }
  }, []);

  /**
   * Legacy compatibility: Load session (delegates to existing API)
   */
  const loadSession = useCallback(async (
    sessionId: string,
    guestSessionId?: string,
    messageLimit?: number
  ) => {
    // This delegates to the existing API for backward compatibility
    try {
      const { useChatAPI } = await import('./use-chat-api');
      const legacyAPI = useChatAPI();
      return await legacyAPI.loadSession(sessionId, guestSessionId, messageLimit);
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }, []);

  /**
   * Legacy compatibility: Load more messages
   */
  const loadMoreMessages = useCallback(async (
    sessionId: string,
    beforeMessageId: string,
    limit: number = 10,
    guestSessionId?: string
  ) => {
    try {
      const { useChatAPI } = await import('./use-chat-api');
      const legacyAPI = useChatAPI();
      return await legacyAPI.loadMoreMessages(sessionId, beforeMessageId, limit, guestSessionId);
    } catch (error) {
      console.error('Error loading more messages:', error);
      return null;
    }
  }, []);

  /**
   * Legacy compatibility: Load latest session
   */
  const loadLatestSession = useCallback(async (
    isGuestMode: boolean,
    guestSessionId?: string
  ) => {
    try {
      const { useChatAPI } = await import('./use-chat-api');
      const legacyAPI = useChatAPI();
      return await legacyAPI.loadLatestSession(isGuestMode, guestSessionId);
    } catch (error) {
      console.error('Error loading latest session:', error);
      return null;
    }
  }, []);

  return {
    // Core LangGraph functionality
    sendMessage,
    canHandleLocally,
    analyzeComplexity,
    cancelRequest,
    clearError,
    reset,
    getServiceStatus,

    // Legacy compatibility
    loadSession,
    loadMoreMessages,
    loadLatestSession,

    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,
    currentStreamingMessage: state.currentStreamingMessage,

    // Utilities
    isLangGraphEnabled: true,
    version: '1.0.0'
  };
};