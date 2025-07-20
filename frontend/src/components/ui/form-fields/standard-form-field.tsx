// ============================================================================
// FILE: components/ui/form-fields/standard-form-field.tsx
// Base standardized form field with validation support
// ============================================================================

'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationFieldProps, getValidationState, fieldStyles } from './index';

interface StandardFormFieldProps extends ValidationFieldProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  min?: string;
  max?: string;
  step?: string;
  pattern?: string;
  autoComplete?: string;
}

export const StandardFormField: React.FC<StandardFormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  valid = true,
  touched = false,
  suggestions = [],
  required = false,
  disabled = false,
  placeholder,
  className,
  containerClassName,
  helpText,
  showValidationIcon = true,
  min,
  max,
  step,
  pattern,
  autoComplete,
  ...props
}) => {
  const validation = getValidationState(error, valid, touched, showValidationIcon);
  const hasSuggestions = suggestions.length > 0 && validation.hasError;

  return (
    <div className={cn(fieldStyles.container, containerClassName)}>
      {/* Label */}
      <Label htmlFor={name} className={fieldStyles.label}>
        {label}
        {required && <span className={fieldStyles.requiredIndicator}>*</span>}
      </Label>

      {/* Input Container */}
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={type}
          value={value as string}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          autoComplete={autoComplete}
          className={cn(
            fieldStyles.input.base,
            validation.hasError && fieldStyles.input.error,
            validation.isValid && fieldStyles.input.success,
            validation.showIcon && fieldStyles.input.withIcon,
            className
          )}
          {...props}
        />
        
        {/* Validation Icon */}
        {validation.showIcon && (
          <div className={fieldStyles.icon.container}>
            {validation.iconType === 'error' && (
              <AlertCircle className={fieldStyles.icon.error} />
            )}
            {validation.iconType === 'success' && (
              <CheckCircle className={fieldStyles.icon.success} />
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {validation.hasError && (
        <div className={fieldStyles.error}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Suggestions */}
      {hasSuggestions && (
        <Alert className={fieldStyles.suggestions}>
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

      {/* Help Text */}
      {helpText && !validation.hasError && (
        <p className={fieldStyles.helpText}>{helpText}</p>
      )}

      {/* Success Message for Passwords */}
      {validation.isValid && type === 'password' && (
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-sm text-green-600">Password meets all requirements</p>
        </div>
      )}
    </div>
  );
};