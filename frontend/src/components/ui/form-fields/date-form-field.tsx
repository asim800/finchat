// ============================================================================
// FILE: components/ui/form-fields/date-form-field.tsx
// Specialized date input with validation
// ============================================================================

'use client';

import React from 'react';
import { StandardFormField } from './standard-form-field';
import { ValidationFieldProps } from './index';

interface DateFormFieldProps extends ValidationFieldProps {
  min?: string;
  max?: string;
  futureOnly?: boolean;
  pastOnly?: boolean;
  showAge?: boolean; // For birth dates
}

export const DateFormField: React.FC<DateFormFieldProps> = ({
  value,
  onChange,
  min,
  max,
  futureOnly = false,
  pastOnly = false,
  showAge = false,
  helpText,
  suggestions = [],
  ...props
}) => {
  // Calculate age if showing age and value exists
  const age = React.useMemo(() => {
    if (!showAge || !value || typeof value !== 'string') return null;
    
    const birthDate = new Date(value);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    
    return calculatedAge >= 0 ? calculatedAge : null;
  }, [value, showAge]);

  // Auto-calculate min/max based on futureOnly/pastOnly
  const computedMin = React.useMemo(() => {
    if (min) return min;
    if (futureOnly) return new Date().toISOString().split('T')[0];
    return undefined;
  }, [min, futureOnly]);

  const computedMax = React.useMemo(() => {
    if (max) return max;
    if (pastOnly) return new Date().toISOString().split('T')[0];
    return undefined;
  }, [max, pastOnly]);

  // Enhanced help text with constraints
  const enhancedHelpText = React.useMemo(() => {
    let text = helpText || '';
    
    if (futureOnly && !text.includes('future')) {
      text += text ? ' ' : '';
      text += 'Must be a future date.';
    }
    
    if (pastOnly && !text.includes('past')) {
      text += text ? ' ' : '';
      text += 'Must be a past date.';
    }
    
    if (age !== null) {
      text += text ? ' ' : '';
      text += `Age: ${age} years old.`;
    }
    
    return text || undefined;
  }, [helpText, futureOnly, pastOnly, age]);

  // Enhanced suggestions for date validation
  const enhancedSuggestions = React.useMemo(() => {
    const baseSuggestions = [...suggestions];
    
    if (typeof value === 'string' && value.length > 0) {
      const dateValue = new Date(value);
      const today = new Date();
      
      if (futureOnly && dateValue <= today) {
        baseSuggestions.push('Date must be in the future');
      }
      
      if (pastOnly && dateValue >= today) {
        baseSuggestions.push('Date must be in the past');
      }
      
      if (showAge && age !== null && age > 150) {
        baseSuggestions.push('Please check the birth date - age seems unusually high');
      }
      
      if (showAge && age !== null && age < 0) {
        baseSuggestions.push('Birth date cannot be in the future');
      }
    }
    
    return baseSuggestions;
  }, [suggestions, value, futureOnly, pastOnly, showAge, age]);

  return (
    <StandardFormField
      {...props}
      type="date"
      value={value}
      onChange={onChange}
      min={computedMin}
      max={computedMax}
      helpText={enhancedHelpText}
      suggestions={enhancedSuggestions}
    />
  );
};