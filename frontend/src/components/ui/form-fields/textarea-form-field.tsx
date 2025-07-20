// ============================================================================
// FILE: components/ui/form-fields/textarea-form-field.tsx
// Standardized textarea field with validation and character counting
// ============================================================================

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationFieldProps, getValidationState, fieldStyles } from './index';

interface TextareaFormFieldProps extends Omit<ValidationFieldProps, 'onChange'> {
  rows?: number;
  maxLength?: number;
  showCharacterCount?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const TextareaFormField: React.FC<TextareaFormFieldProps> = ({
  label,
  name,
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
  rows = 3,
  maxLength,
  showCharacterCount = true,
  resize = 'vertical',
  ...props
}) => {
  const validation = getValidationState(error, valid, touched, showValidationIcon);
  const hasSuggestions = suggestions.length > 0 && validation.hasError;
  
  const characterCount = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxLength && characterCount > maxLength * 0.8;
  const isOverLimit = maxLength && characterCount > maxLength;

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  };

  return (
    <div className={cn(fieldStyles.container, containerClassName)}>
      {/* Label */}
      <Label htmlFor={name} className={fieldStyles.label}>
        {label}
        {required && <span className={fieldStyles.requiredIndicator}>*</span>}
      </Label>

      {/* Textarea Container */}
      <div className="relative">
        <Textarea
          id={name}
          name={name}
          value={value as string}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            fieldStyles.input.base,
            resizeClasses[resize],
            validation.hasError && fieldStyles.input.error,
            validation.isValid && fieldStyles.input.success,
            validation.showIcon && 'pr-10',
            className
          )}
          {...props}
        />
        
        {/* Validation Icon */}
        {validation.showIcon && (
          <div className="absolute top-3 right-3 pointer-events-none">
            {validation.iconType === 'error' && (
              <AlertCircle className={fieldStyles.icon.error} />
            )}
            {validation.iconType === 'success' && (
              <CheckCircle className={fieldStyles.icon.success} />
            )}
          </div>
        )}
      </div>

      {/* Character Count */}
      {showCharacterCount && maxLength && (
        <div className="flex justify-end">
          <span className={cn(
            'text-xs',
            isOverLimit ? 'text-red-600' : 
            isNearLimit ? 'text-yellow-600' : 
            'text-gray-500'
          )}>
            {characterCount}/{maxLength}
          </span>
        </div>
      )}

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
        <p className={fieldStyles.helpText}>
          {helpText}
          {maxLength && (
            <span className="block mt-1">
              Maximum {maxLength} characters allowed
            </span>
          )}
        </p>
      )}
    </div>
  );
};