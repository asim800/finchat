// ============================================================================
// FILE: components/chat/llm-selector.tsx
// Component to select LLM provider
// ============================================================================

'use client';

import React from 'react';
import { LLMProvider, getProviderConfig } from '@/lib/llm-config';

interface LLMSelectorProps {
  selectedProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  availableProviders: LLMProvider[];
  className?: string;
}

export const LLMSelector: React.FC<LLMSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  availableProviders,
  className = ''
}) => {
  if (availableProviders.length <= 1) {
    return null; // Don't show selector if only one provider available
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600">AI Model:</span>
      <select
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value as LLMProvider)}
        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      >
        {availableProviders.map(provider => (
          <option key={provider} value={provider}>
            {getProviderConfig(provider).displayName}
          </option>
        ))}
      </select>
    </div>
  );
};
