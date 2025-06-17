// ============================================================================
// FILE: hooks/use-chat-api.ts
// Custom hook for chat API integration
// ============================================================================

'use client';

import { useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  timestamp: Date;
  chartData?: any;
}

interface ChatOptions {
  provider?: 'anthropic' | 'openai';
  portfolioData?: any;
  userPreferences?: any;
}

export const useChatAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (
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
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
  };
};
