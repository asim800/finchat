// ============================================================================
// FILE: lib/llm-service.ts
// Multi-LLM service with provider switching
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type LLMProvider = 'anthropic' | 'openai';

export interface ProviderConfig {
  model: string;
  displayName: string;
}

const PROVIDER_CONFIG: Record<LLMProvider, ProviderConfig> = {
  openai: {
    model: 'gpt-4.1-nano',
    displayName: 'GPT-4.1-nano (OpenAI)'
  },
  anthropic: {
    model: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet (Anthropic)'
  }
};

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  usage?: {
    tokens: number;
    cost?: number;
  };
}

class LLMService {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private defaultProvider: LLMProvider = 'anthropic';

  constructor() {
    // Debug logging for environment variables
    console.log('LLM Service Init - Environment Check:');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Initialize OpenAI if API key exists
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.defaultProvider = 'openai'; // Set this first
      console.log('✅ OpenAI client initialized');
    } else {
      console.log('❌ OpenAI API key not found');
    }

    // Initialize Anthropic if API key exists
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.defaultProvider = 'anthropic'; // This will override if available
      console.log('✅ Anthropic client initialized');
    } else {
      console.log('❌ Anthropic API key not found');
    }
    
    console.log('Default provider:', this.defaultProvider);
    console.log('Available providers:', this.getAvailableProviders());
  }

  // Get provider configuration
  getProviderConfig(provider: LLMProvider): ProviderConfig {
    return PROVIDER_CONFIG[provider];
  }

  // Get all provider configurations
  getAllProviderConfigs(): Record<LLMProvider, ProviderConfig> {
    return PROVIDER_CONFIG;
  }

  async generateResponse(
    messages: LLMMessage[],
    options: {
      provider?: LLMProvider;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<LLMResponse> {
    const provider = options.provider || this.defaultProvider;
    
    // Add system prompt if provided
    const fullMessages = options.systemPrompt 
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
      : messages;

    switch (provider) {
      case 'anthropic':
        return this.generateAnthropicResponse(fullMessages, options);
      case 'openai':
        return this.generateOpenAIResponse(fullMessages, options);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private async generateAnthropicResponse(
    messages: LLMMessage[],
    options: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: PROVIDER_CONFIG.anthropic.model,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content,
        })),
      });

      const content = response.content[0]?.type === 'text' 
        ? response.content[0].text 
        : '';

      return {
        content,
        provider: 'anthropic',
        usage: {
          tokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('Failed to generate response from Anthropic');
    }
  }

  private async generateOpenAIResponse(
    messages: LLMMessage[],
    options: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: PROVIDER_CONFIG.openai.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        provider: 'openai',
        usage: {
          tokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('OpenAI API error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.status,
        code: (error as any)?.code,
        type: (error as any)?.type,
        error: error
      });
      
      // More specific error messages
      if ((error as any)?.status === 401) {
        throw new Error('OpenAI API key is invalid or expired');
      }
      if ((error as any)?.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      }
      if ((error as any)?.status === 402) {
        throw new Error('OpenAI API billing issue - check your account');
      }
      
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.anthropic) providers.push('anthropic');
    if (this.openai) providers.push('openai');
    return providers;
  }

  isProviderAvailable(provider: LLMProvider): boolean {
    return this.getAvailableProviders().includes(provider);
  }
}

export const llmService = new LLMService();



