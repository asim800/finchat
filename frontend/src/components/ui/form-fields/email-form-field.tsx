// ============================================================================
// FILE: components/ui/form-fields/email-form-field.tsx
// Specialized email input with enhanced validation
// ============================================================================

'use client';

import React from 'react';
import { StandardFormField } from './standard-form-field';
import { ValidationFieldProps } from './index';

interface EmailFormFieldProps extends ValidationFieldProps {
  allowMultiple?: boolean;
  domains?: string[];
}

export const EmailFormField: React.FC<EmailFormFieldProps> = ({
  value,
  onChange,
  suggestions = [],
  allowMultiple = false,
  domains = [],
  helpText,
  ...props
}) => {
  // Enhanced suggestions for email validation
  const enhancedSuggestions = React.useMemo(() => {
    const baseSuggestions = [...suggestions];
    
    if (typeof value === 'string' && value.length > 0) {
      // Common email domain suggestions
      if (!value.includes('@') && !baseSuggestions.some(s => s.includes('@'))) {
        baseSuggestions.push('Email addresses need an @ symbol');
      }
      
      if (value.includes('@') && !value.includes('.') && !baseSuggestions.some(s => s.includes('domain'))) {
        baseSuggestions.push('Email addresses need a domain (e.g., .com, .org)');
      }
      
      if (value.includes(' ') && !baseSuggestions.some(s => s.includes('spaces'))) {
        baseSuggestions.push('Email addresses cannot contain spaces');
      }

      // Suggest common domains if specified
      if (domains.length > 0 && value.includes('@') && !domains.some(domain => value.includes(domain))) {
        baseSuggestions.push(`Try using one of these domains: ${domains.join(', ')}`);
      }
    }
    
    return baseSuggestions;
  }, [suggestions, value, domains]);

  const enhancedHelpText = React.useMemo(() => {
    let text = helpText || '';
    
    if (allowMultiple) {
      text += text ? ' ' : '';
      text += 'You can enter multiple emails separated by commas.';
    }
    
    if (domains.length > 0) {
      text += text ? ' ' : '';
      text += `Accepted domains: ${domains.join(', ')}`;
    }
    
    return text || undefined;
  }, [helpText, allowMultiple, domains]);

  return (
    <StandardFormField
      {...props}
      type="email"
      value={value}
      onChange={onChange}
      suggestions={enhancedSuggestions}
      helpText={enhancedHelpText}
      placeholder="user@example.com"
      autoComplete="email"
    />
  );
};