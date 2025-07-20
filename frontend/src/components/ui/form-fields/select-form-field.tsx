// ============================================================================
// FILE: components/ui/form-fields/select-form-field.tsx
// Standardized select field with validation
// ============================================================================

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationFieldProps, getValidationState, fieldStyles } from './index';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFormFieldProps extends Omit<ValidationFieldProps, 'onChange'> {
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export const SelectFormField: React.FC<SelectFormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  options,
  error,
  valid = true,
  touched = false,
  suggestions = [],
  required = false,
  disabled = false,
  placeholder = 'Select an option...',
  className,
  containerClassName,
  helpText,
  allowEmpty = false,
  emptyLabel = 'None',
  showValidationIcon = true
}) => {
  const validation = getValidationState(error, valid, touched, showValidationIcon);
  const hasSuggestions = suggestions.length > 0 && validation.hasError;

  const handleValueChange = (selectedValue: string) => {
    onChange(selectedValue);
  };

  return (
    <div className={cn(fieldStyles.container, containerClassName)}>
      {/* Label */}
      <Label htmlFor={name} className={fieldStyles.label}>
        {label}
        {required && <span className={fieldStyles.requiredIndicator}>*</span>}
      </Label>

      {/* Select Container */}
      <div className="relative">
        <Select
          value={value as string}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={name}
            className={cn(
              'w-full',
              validation.hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
              validation.isValid && 'border-green-300 focus:border-green-500 focus:ring-green-500',
              validation.showIcon && 'pr-10',
              className
            )}
            onBlur={onBlur}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty && (
              <SelectItem value="">{emptyLabel}</SelectItem>
            )}
            {options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
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
        <p className={fieldStyles.helpText}>
          {helpText}
          {options.length > 0 && (
            <span className="block mt-1">
              {options.length} option{options.length !== 1 ? 's' : ''} available
            </span>
          )}
        </p>
      )}
    </div>
  );
};