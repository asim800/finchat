// ============================================================================
// FILE: components/ui/form-fields/phone-form-field.tsx
// Specialized phone input with formatting and validation
// ============================================================================

'use client';

import React, { useState } from 'react';
import { StandardFormField } from './standard-form-field';
import { ValidationFieldProps } from './index';

interface PhoneFormFieldProps extends ValidationFieldProps {
  country?: 'US' | 'international';
  format?: 'auto' | 'none';
}

export const PhoneFormField: React.FC<PhoneFormFieldProps> = ({
  value,
  onChange,
  country = 'US',
  format = 'auto',
  suggestions = [],
  helpText,
  ...props
}) => {
  const [rawValue, setRawValue] = useState<string>('');

  // Format phone number based on country
  const formatPhone = React.useCallback((input: string): string => {
    if (format === 'none') return input;
    
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    if (country === 'US') {
      // US phone number formatting: (123) 456-7890
      if (digits.length <= 3) {
        return digits;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length <= 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else {
        // Handle country code
        return `+${digits.slice(0, -10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
      }
    }
    
    // International formatting (basic)
    if (digits.length > 10) {
      return `+${digits.slice(0, -10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`;
    }
    
    return digits;
  }, [country, format]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setRawValue(inputValue);
    
    if (format === 'auto') {
      const formattedValue = formatPhone(inputValue);
      // Create a new event with formatted value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: formattedValue
        }
      };
      onChange(syntheticEvent);
    } else {
      onChange(e);
    }
  };

  // Enhanced suggestions for phone validation
  const enhancedSuggestions = React.useMemo(() => {
    const baseSuggestions = [...suggestions];
    
    if (typeof value === 'string' && value.length > 0) {
      const digits = value.replace(/\D/g, '');
      
      if (country === 'US' && digits.length > 0 && digits.length < 10) {
        baseSuggestions.push('US phone numbers need 10 digits');
      }
      
      if (country === 'US' && digits.length === 11 && !digits.startsWith('1')) {
        baseSuggestions.push('US phone numbers with country code should start with 1');
      }
      
      if (value.includes('(') && !value.includes(')')) {
        baseSuggestions.push('Incomplete parentheses in phone number');
      }
    }
    
    return baseSuggestions;
  }, [suggestions, value, country]);

  const enhancedHelpText = React.useMemo(() => {
    let text = helpText || '';
    
    if (country === 'US') {
      text += text ? ' ' : '';
      text += 'Format: (123) 456-7890 or +1 (123) 456-7890';
    } else {
      text += text ? ' ' : '';
      text += 'International format with country code';
    }
    
    return text;
  }, [helpText, country]);

  return (
    <StandardFormField
      {...props}
      type="tel"
      value={value}
      onChange={handleInputChange}
      suggestions={enhancedSuggestions}
      helpText={enhancedHelpText}
      placeholder={country === 'US' ? '(123) 456-7890' : '+1 234 567 8900'}
      autoComplete="tel"
    />
  );
};