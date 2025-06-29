// ============================================================================
// FILE: lib/llm-config.ts
// Client-safe LLM configuration (no heavy SDK imports)
// ============================================================================

export type LLMProvider = 'anthropic' | 'openai';

export interface ProviderConfig {
  model: string;
  displayName: string;
}

export const PROVIDER_CONFIG: Record<LLMProvider, ProviderConfig> = {
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
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// Client-safe function to get provider config
export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  return PROVIDER_CONFIG[provider];
}

// Client-safe function to get available providers
export function getAvailableProviders(): LLMProvider[] {
  return Object.keys(PROVIDER_CONFIG) as LLMProvider[];
}

// Client-safe function to get default provider
export function getDefaultProvider(): LLMProvider {
  return 'anthropic';
}