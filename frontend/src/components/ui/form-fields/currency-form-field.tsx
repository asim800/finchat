// ============================================================================
// FILE: components/ui/form-fields/currency-form-field.tsx
// Specialized currency input with formatting and validation
// ============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import { NumberFormField } from './number-form-field';
import { ValidationFieldProps } from './index';

interface CurrencyFormFieldProps extends Omit<ValidationFieldProps, 'onChange'> {
  currency?: string;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  onChange: (value: number | undefined) => void;
}

export const CurrencyFormField: React.FC<CurrencyFormFieldProps> = ({
  value,
  onChange,
  currency = 'USD',
  min = 0,
  max,
  allowNegative = false,
  label,
  helpText,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  // Format currency for display
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currency]);

  // Parse currency input
  const parseCurrency = useCallback((input: string): number | undefined => {
    // Remove currency symbols and formatting
    const cleaned = input.replace(/[^0-9.-]/g, '');
    if (cleaned === '') return undefined;
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }, []);

  const handleValueChange = useCallback((newValue: number | undefined, formattedValue: string) => {
    onChange(newValue);
    
    // Update display value with currency formatting on blur
    if (newValue !== undefined) {
      setDisplayValue(formatCurrency(newValue));
    } else {
      setDisplayValue('');
    }
  }, [onChange, formatCurrency]);

  const enhancedHelpText = React.useMemo(() => {
    const currencyInfo = `Enter amount in ${currency}`;
    return helpText ? `${helpText}. ${currencyInfo}` : currencyInfo;
  }, [helpText, currency]);

  return (
    <NumberFormField
      {...props}
      label={label}
      value={typeof value === 'number' ? value : undefined}
      onChange={onChange}
      onValueChange={handleValueChange}
      min={min}
      max={max}
      step={0.01}
      precision={2}
      allowNegative={allowNegative}
      formatOnBlur={true}
      helpText={enhancedHelpText}
      placeholder={`$0.00`}
    />
  );
};