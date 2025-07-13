// ============================================================================
// FILE: components/ui/validated-form-field.tsx
// Enhanced form field component with real-time validation
// ============================================================================

'use client';

import React from 'react';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidatedFormFieldProps {
  label: string;
  value: unknown;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string | null;
  valid?: boolean;
  touched?: boolean;
  suggestions?: string[];
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: string;
  className?: string;
  showValidationIcon?: boolean;
  showSuggestions?: boolean;
}

export const ValidatedFormField: React.FC<ValidatedFormFieldProps> = ({
  label,
  value,
  onChange,
  onBlur,
  error,
  valid = true,
  touched = false,
  suggestions = [],
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  step,
  className,
  showValidationIcon = true,
  showSuggestions = true,
  ...props
}) => {
  const hasError = touched && error;
  const isValid = touched && valid && !error;
  const hasSuggestions = showSuggestions && suggestions.length > 0 && hasError;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main Form Field */}
      <div className="relative">
        <FormField
          label={label}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          error={hasError ? error : undefined}
          className={cn(
            'transition-all duration-200',
            {
              'pr-10': showValidationIcon && (hasError || isValid),
              'border-red-300 focus:border-red-500 focus:ring-red-500': hasError,
              'border-green-300 focus:border-green-500 focus:ring-green-500': isValid,
            }
          )}
          {...props}
        />
        
        {/* Validation Icon */}
        {showValidationIcon && (hasError || isValid) && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <div className="flex items-center h-full">
              {hasError && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              {isValid && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Suggestions */}
      {hasSuggestions && (
        <Alert className="border-blue-200 bg-blue-50">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="font-medium mb-1">Suggestions:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {isValid && type === 'password' && (
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-sm text-green-600">Password meets all requirements</p>
        </div>
      )}
    </div>
  );
};