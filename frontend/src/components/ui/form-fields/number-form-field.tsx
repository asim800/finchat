// ============================================================================
// FILE: components/ui/form-fields/number-form-field.tsx
// Specialized number input with validation and formatting
// ============================================================================

'use client';

import React from 'react';
import { StandardFormField } from './standard-form-field';
import { ValidationFieldProps } from './index';
import { QuantityValidationUtils } from '@/lib/validation';

interface NumberFormFieldProps extends Omit<ValidationFieldProps, 'onChange'> {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  allowNegative?: boolean;
  formatOnBlur?: boolean;
  onChange: (value: number | undefined) => void;
  onValueChange?: (value: number | undefined, formattedValue: string) => void;
}

export const NumberFormField: React.FC<NumberFormFieldProps> = ({
  value,
  onChange,
  onValueChange,
  min,
  max,
  step = 0.01,
  precision = 2,
  allowNegative = false,
  formatOnBlur = true,
  helpText,
  ...props
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty value
    if (inputValue === '') {
      onChange(undefined);
      onValueChange?.(undefined, '');
      return;
    }

    // Parse and validate number
    const numValue = parseFloat(inputValue);
    
    if (!isNaN(numValue)) {
      // Apply constraints
      let constrainedValue = numValue;
      
      if (!allowNegative && constrainedValue < 0) {
        constrainedValue = 0;
      }
      
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min;
      }
      
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max;
      }

      onChange(constrainedValue);
      onValueChange?.(constrainedValue, constrainedValue.toString());
    }
  };

  const handleBlur = () => {
    if (formatOnBlur && typeof value === 'number') {
      // Format the value on blur for better UX
      const formattedValue = precision > 0 
        ? QuantityValidationUtils.formatQuantity(value)
        : value.toString();
      
      onValueChange?.(value, formattedValue);
    }
    
    props.onBlur?.();
  };

  // Format display value
  const displayValue = value !== undefined ? value.toString() : '';

  // Enhanced help text with constraints
  const enhancedHelpText = React.useMemo(() => {
    const constraints = [];
    if (min !== undefined) constraints.push(`Min: ${min}`);
    if (max !== undefined) constraints.push(`Max: ${max}`);
    if (!allowNegative) constraints.push('Must be positive');
    if (precision > 0) constraints.push(`Up to ${precision} decimal places`);
    
    const constraintsText = constraints.length > 0 ? `(${constraints.join(', ')})` : '';
    return helpText ? `${helpText} ${constraintsText}` : constraintsText || undefined;
  }, [helpText, min, max, allowNegative, precision]);

  return (
    <StandardFormField
      {...props}
      type="number"
      value={displayValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      min={min?.toString()}
      max={max?.toString()}
      step={step.toString()}
      helpText={enhancedHelpText}
    />
  );
};