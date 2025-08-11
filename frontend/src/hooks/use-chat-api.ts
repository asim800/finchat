// ============================================================================
// FILE: hooks/use-chat-api.ts
// Custom hook for chat API integration
// ============================================================================

'use client';

import { useState, useCallback } from 'react';

interface ChartData {
  type: 'pie' | 'bar' | 'figure';
  title: string;
  data?: Array<{ name: string; value: number }>; // Optional for backward compatibility
  figureData?: {
    type: 'svg' | 'interactive';
    content: string;
    width?: number;
    height?: number;
  };
}

interface PortfolioData {
  holdings?: Array<{ symbol: string; [key: string]: unknown }>;
  totalValue?: number;
  [key: string]: unknown;
}

interface UserPreferences {
  riskLevel?: string;
  timeHorizon?: string;
  goals?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  timestamp: Date;
  chartData?: ChartData;
  sessionId?: string;
}

interface ChatOptions {
  provider?: 'anthropic' | 'openai';
  portfolioData?: PortfolioData;
  userPreferences?: UserPreferences;
  sessionId?: string;
  guestSessionId?: string;
  requestId?: string;
}

export const useChatAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (
    sessionId: string,
    guestSessionId?: string,
    messageLimit?: number
  ): Promise<ChatMessage[] | null> => {
    try {
      const url = new URL(`/api/chat/sessions/${sessionId}`, window.location.origin);
      if (guestSessionId) {
        url.searchParams.set('guestSessionId', guestSessionId);
      }
      if (messageLimit) {
        url.searchParams.set('messageLimit', messageLimit.toString());
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      
      // Convert messages to the format expected by the chat interface
      return data.session.messages.map((msg: { id: string; role: string; content: string; provider?: string; createdAt: string; metadata?: Record<string, unknown> }) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        provider: msg.provider || 'unknown',
        timestamp: new Date(msg.createdAt),
        chartData: msg.metadata?.chartData || undefined,
      }));
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
      return null;
    }
  }, []);

  const loadMoreMessages = useCallback(async (
    sessionId: string,
    beforeMessageId: string,
    limit: number = 10,
    guestSessionId?: string
  ): Promise<ChatMessage[] | null> => {
    try {
      const url = new URL(`/api/chat/sessions/${sessionId}/messages`, window.location.origin);
      url.searchParams.set('before', beforeMessageId);
      url.searchParams.set('limit', limit.toString());
      if (guestSessionId) {
        url.searchParams.set('guestSessionId', guestSessionId);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to load more messages');
      }

      const data = await response.json();
      
      // Convert messages to the format expected by the chat interface
      return data.messages.map((msg: { id: string; role: string; content: string; provider?: string; createdAt: string; metadata?: Record<string, unknown> }) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        provider: msg.provider || 'unknown',
        timestamp: new Date(msg.createdAt),
        chartData: msg.metadata?.chartData || undefined,
      }));
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
      return null;
    }
  }, []);

  const loadLatestSession = useCallback(async (
    isGuestMode: boolean,
    guestSessionId?: string
  ): Promise<{ sessionId: string; messages: ChatMessage[] } | null> => {
    try {
      const url = new URL('/api/chat/sessions', window.location.origin);
      if (isGuestMode && guestSessionId) {
        url.searchParams.set('guestSessionId', guestSessionId);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        return null; // No sessions exist yet
      }

      const data = await response.json();
      
      if (!data.sessions || data.sessions.length === 0) {
        return null; // No sessions exist
      }

      // Get the most recent session
      const latestSession = data.sessions[0];
      
      // Load the full session with messages
      const messages = await loadSession(latestSession.id, guestSessionId);
      
      if (messages) {
        return {
          sessionId: latestSession.id,
          messages
        };
      }
      
      return null;
    } catch (err) {
      console.error('Error loading latest session:', err);
      return null;
    }
  }, [loadSession]);

  const sendMessage = useCallback(async (
    message: string,
    options: ChatOptions = {}
  ): Promise<ChatMessage | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          provider: options.provider,
          portfolioData: options.portfolioData,
          userPreferences: options.userPreferences,
          sessionId: options.sessionId,
          guestSessionId: options.guestSessionId,
          requestId: options.requestId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();

      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        provider: data.provider,
        timestamp: new Date(),
        chartData: data.chartData,
        sessionId: data.sessionId,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendMessage,
    loadSession,
    loadLatestSession,
    loadMoreMessages,
    isLoading,
    error,
  };
};
