// ============================================================================
// FILE: components/ui/form-fields/index.ts
// Centralized exports for reusable form field components
// ============================================================================

export { StandardFormField } from './standard-form-field';
export { NumberFormField } from './number-form-field';
export { SelectFormField } from './select-form-field';
export { TextareaFormField } from './textarea-form-field';
export { DateFormField } from './date-form-field';
export { CurrencyFormField } from './currency-form-field';
export { PhoneFormField } from './phone-form-field';
export { EmailFormField } from './email-form-field';
export { PasswordFormField } from './password-form-field';

// Field configuration types
export interface BaseFieldProps {
  label: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  helpText?: string;
}

export interface ValidationFieldProps extends BaseFieldProps {
  value: unknown;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  error?: string | null;
  valid?: boolean;
  touched?: boolean;
  suggestions?: string[];
  showValidationIcon?: boolean;
}

// Common validation states
export interface ValidationState {
  hasError: boolean;
  isValid: boolean;
  showIcon: boolean;
  iconType: 'error' | 'success' | 'none';
}

// Helper function to determine validation state
export const getValidationState = (
  error?: string | null,
  valid?: boolean,
  touched?: boolean,
  showValidationIcon?: boolean
): ValidationState => {
  const hasError = touched && !!error;
  const isValid = touched && valid && !error;
  const showIcon = showValidationIcon !== false && (hasError || isValid);
  
  return {
    hasError,
    isValid,
    showIcon,
    iconType: hasError ? 'error' : isValid ? 'success' : 'none'
  };
};

// Common CSS classes
export const fieldStyles = {
  container: 'space-y-2',
  label: 'block text-sm font-medium text-foreground',
  requiredIndicator: 'text-red-500 ml-1',
  input: {
    base: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-300 focus:border-green-500 focus:ring-green-500',
    withIcon: 'pr-10'
  },
  icon: {
    container: 'absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none',
    error: 'h-4 w-4 text-red-500',
    success: 'h-4 w-4 text-green-500'
  },
  error: 'flex items-start space-x-2 text-sm text-red-600',
  suggestions: 'border-blue-200 bg-blue-50',
  helpText: 'text-xs text-muted-foreground'
};