// ============================================================================
// FILE: hooks/use-standard-form.ts
// Standardized form management hook with consistent validation patterns
// ============================================================================

'use client';

import { useState, useCallback } from 'react';
import { useFormValidation } from './use-form-validation';
import { ValidationSchema } from '@/lib/validation';

interface UseStandardFormOptions<T = Record<string, unknown>> {
  schema: ValidationSchema;
  initialValues?: T;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: T) => Promise<void> | void;
  onError?: (error: string) => void;
}

interface StandardFormActions {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setError: (error: string | null) => void;
  clearErrors: () => void;
  resetForm: () => void;
}

interface StandardFormState {
  loading: boolean;
  error: string | null;
  submitted: boolean;
}

export const useStandardForm = <T = Record<string, unknown>>({
  schema,
  initialValues = {} as T,
  validateOnChange = true,
  validateOnBlur = true,
  onSubmit,
  onError
}: UseStandardFormOptions<T>) => {
  const [formState, setFormState] = useState<StandardFormState>({
    loading: false,
    error: null,
    submitted: false
  });

  const formValidation = useFormValidation({
    schema,
    initialValues: initialValues as Record<string, unknown>,
    validateOnChange,
    validateOnBlur
  });

  const setError = useCallback((error: string | null) => {
    setFormState(prev => ({ ...prev, error }));
  }, []);

  const clearErrors = useCallback(() => {
    setFormState(prev => ({ ...prev, error: null }));
  }, []);

  const resetForm = useCallback(() => {
    formValidation.reset();
    setFormState({
      loading: false,
      error: null,
      submitted: false
    });
  }, [formValidation]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!onSubmit) return;

    // Validate all fields
    const isValid = formValidation.validateAll();
    
    if (!isValid) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    setFormState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await onSubmit(formValidation.values as T);
      setFormState(prev => ({ ...prev, loading: false, submitted: true }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
      setFormState(prev => ({ ...prev, loading: false }));
    }
  }, [formValidation, onSubmit, onError]);

  const actions: StandardFormActions = {
    handleSubmit,
    setError,
    clearErrors,
    resetForm
  };

  return {
    // Form validation (from useFormValidation)
    ...formValidation,
    
    // Form state
    ...formState,
    
    // Form actions
    ...actions,
    
    // Computed properties
    canSubmit: formValidation.isValid && !formState.loading,
    hasErrors: !!formState.error || Object.keys(formValidation.errors).length > 0
  };
};

// Helper function to get error display props
export const getFormErrorProps = (error: string | null) => {
  if (!error) return null;
  
  return {
    error,
    className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
  };
};

// Helper function to create consistent form layouts
export const getFormSectionClasses = () => ({
  form: 'space-y-6',
  section: 'space-y-4',
  fieldGroup: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  field: 'space-y-2',
  submitSection: 'flex justify-end space-x-2 pt-4 border-t'
});