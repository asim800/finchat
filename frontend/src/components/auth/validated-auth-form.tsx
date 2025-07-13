// ============================================================================
// FILE: components/auth/validated-auth-form.tsx
// Enhanced authentication forms with real-time validation
// ============================================================================

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ValidatedFormField } from '@/components/ui/validated-form-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFormValidation } from '@/hooks/use-form-validation';
import { AuthValidationSchemas } from '@/lib/validation';
import { AlertCircle } from 'lucide-react';

interface ValidatedAuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading?: boolean;
  serverError?: string | null;
  onModeChange?: (mode: 'login' | 'register') => void;
}

export const ValidatedAuthForm: React.FC<ValidatedAuthFormProps> = ({
  mode,
  onSubmit,
  loading = false,
  serverError,
  onModeChange
}) => {
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Select validation schema based on mode
  const validationSchema = mode === 'login' 
    ? AuthValidationSchemas.login 
    : AuthValidationSchemas.register;

  const formValidation = useFormValidation({
    schema: validationSchema,
    initialValues: mode === 'login' 
      ? { email: '', password: '' }
      : { email: '', password: '', firstName: '', lastName: '' },
    validateOnChange: true,
    validateOnBlur: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (formValidation.validateAll()) {
      try {
        await onSubmit(formValidation.values);
      } catch {
        // Server errors are handled by parent component
      }
    }
  };

  const isFormValid = formValidation.isValid && (!submitAttempted || Object.keys(formValidation.errors).length === 0);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Error Display */}
          {serverError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {serverError}
              </AlertDescription>
            </Alert>
          )}

          {/* Name Fields for Registration */}
          {mode === 'register' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedFormField
                label="First Name *"
                type="text"
                {...formValidation.getFieldProps('firstName')}
                placeholder="John"
                suggestions={formValidation.getFieldSuggestions('firstName')}
                required
              />
              
              <ValidatedFormField
                label="Last Name *"
                type="text"
                {...formValidation.getFieldProps('lastName')}
                placeholder="Doe"
                suggestions={formValidation.getFieldSuggestions('lastName')}
                required
              />
            </div>
          )}

          {/* Email Field */}
          <ValidatedFormField
            label="Email *"
            type="email"
            {...formValidation.getFieldProps('email')}
            placeholder="john@example.com"
            suggestions={formValidation.getFieldSuggestions('email')}
            required
          />

          {/* Password Field */}
          <ValidatedFormField
            label="Password *"
            type="password"
            {...formValidation.getFieldProps('password')}
            placeholder={mode === 'login' ? 'Enter your password' : 'Create a secure password'}
            suggestions={formValidation.getFieldSuggestions('password')}
            required
            showSuggestions={mode === 'register'} // Only show password suggestions for registration
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={loading || (submitAttempted && !isFormValid)}
          >
            {loading 
              ? (mode === 'login' ? 'Signing in...' : 'Creating account...') 
              : (mode === 'login' ? 'Sign In' : 'Create Account')
            }
          </Button>

          {/* Mode Toggle */}
          {onModeChange && (
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                  disabled={loading}
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          )}

          {/* Form Debug Info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
              <div>Valid: {formValidation.isValid.toString()}</div>
              <div>Touched fields: {Object.keys(formValidation.errors).length}</div>
              <div>Errors: {JSON.stringify(formValidation.errors)}</div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};