// ============================================================================
// FILE: hooks/use-form-validation.ts
// React hook for real-time form validation
// ============================================================================

'use client';

import { useState, useCallback, useMemo } from 'react';
import { ValidationSystem, ValidationSchema, ValidationState, FieldValidation } from '@/lib/validation';

interface UseFormValidationOptions {
  schema: ValidationSchema;
  initialValues?: Record<string, unknown>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export const useFormValidation = ({
  schema,
  initialValues = {},
  validateOnChange = true,
  validateOnBlur = true
}: UseFormValidationOptions) => {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationState, setValidationState] = useState<ValidationState>(() => 
    ValidationSystem.validateForm(initialValues, schema)
  );

  // Update validation state whenever values change
  const updateValidation = useCallback((newValues: Record<string, unknown>) => {
    const newValidationState = ValidationSystem.validateForm(newValues, schema);
    
    // Mark touched fields in validation state
    Object.keys(newValidationState).forEach(fieldName => {
      if (touched[fieldName]) {
        newValidationState[fieldName].touched = true;
      }
    });
    
    setValidationState(newValidationState);
  }, [schema, touched]);

  // Set field value with optional validation
  const setFieldValue = useCallback((fieldName: string, value: unknown, shouldValidate: boolean = validateOnChange) => {
    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);
    
    if (shouldValidate) {
      updateValidation(newValues);
    }
  }, [values, validateOnChange, updateValidation]);

  // Mark field as touched
  const setFieldTouched = useCallback((fieldName: string, isTouched: boolean = true, shouldValidate: boolean = validateOnBlur) => {
    const newTouched = { ...touched, [fieldName]: isTouched };
    setTouched(newTouched);
    
    if (shouldValidate && isTouched) {
      const newValidationState = { ...validationState };
      if (newValidationState[fieldName]) {
        newValidationState[fieldName].touched = true;
      }
      setValidationState(newValidationState);
    }
  }, [touched, validateOnBlur, validationState]);

  // Handle field change (combines setValue and touch)
  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setFieldValue(fieldName, value, validateOnChange);
    if (!touched[fieldName]) {
      setFieldTouched(fieldName, false, false); // Mark as touched but don't validate yet
    }
  }, [setFieldValue, setFieldTouched, touched, validateOnChange]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setFieldTouched(fieldName, true, validateOnBlur);
  }, [setFieldTouched, validateOnBlur]);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((fieldName: string) => {
    const fieldValidation = validationState[fieldName];
    const fieldValue = values[fieldName] ?? '';
    
    return {
      value: fieldValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        handleFieldChange(fieldName, e.target.value);
      },
      onBlur: () => {
        handleFieldBlur(fieldName);
      },
      error: fieldValidation?.touched ? fieldValidation.error : null,
      valid: fieldValidation?.valid ?? true,
      touched: fieldValidation?.touched ?? false
    };
  }, [values, validationState, handleFieldChange, handleFieldBlur]);

  // Get suggestions for a specific field
  const getFieldSuggestions = useCallback((fieldName: string) => {
    const fieldValidation = validationState[fieldName];
    if (!fieldValidation || !fieldValidation.error) return [];
    
    return ValidationSystem.getFieldSuggestions(
      fieldName, 
      fieldValidation.value, 
      fieldValidation.error
    );
  }, [validationState]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return ValidationSystem.isFormValid(validationState);
  }, [validationState]);

  // Check if form has been touched
  const isDirty = useMemo(() => {
    return Object.values(touched).some(Boolean);
  }, [touched]);

  // Get all errors for touched fields
  const errors = useMemo(() => {
    return ValidationSystem.getFormErrors(validationState);
  }, [validationState]);

  // Reset form to initial state
  const reset = useCallback(() => {
    setValues(initialValues);
    setTouched({});
    setValidationState(ValidationSystem.validateForm(initialValues, schema));
  }, [initialValues, schema]);

  // Validate entire form (mark all fields as touched)
  const validateAll = useCallback(() => {
    const newTouched: Record<string, boolean> = {};
    Object.keys(schema).forEach(fieldName => {
      newTouched[fieldName] = true;
    });
    setTouched(newTouched);
    
    const newValidationState = ValidationSystem.validateForm(values, schema);
    Object.keys(newValidationState).forEach(fieldName => {
      newValidationState[fieldName].touched = true;
    });
    setValidationState(newValidationState);
    
    return ValidationSystem.isFormValid(newValidationState);
  }, [schema, values]);

  return {
    // Values and state
    values,
    validationState,
    errors,
    isValid,
    isDirty,
    
    // Field operations
    setFieldValue,
    setFieldTouched,
    handleFieldChange,
    handleFieldBlur,
    getFieldProps,
    getFieldSuggestions,
    
    // Form operations
    reset,
    validateAll,
    
    // Utilities
    setValues,
    updateValidation
  };
};