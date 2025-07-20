// ============================================================================
// FILE: components/auth/login-form.tsx
// Login form component
// ============================================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ButtonWithLoading as Button } from '@/components/ui/button-with-loading';
import { ValidatedFormField } from '@/components/ui/validated-form-field';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useStandardForm } from '@/hooks/use-standard-form';
import { FormError } from '@/components/ui/form-error';
import { AuthValidationSchemas } from '@/lib/validation';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const router = useRouter();

  const form = useStandardForm<LoginFormData>({
    schema: AuthValidationSchemas.login,
    initialValues: {
      email: '',
      password: ''
    },
    onSubmit: async (data) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Login successful, force page reload to ensure cookie is set
      window.location.href = '/dashboard/myportfolio';
    }
  });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <FormError error={form.error} />

          <ValidatedFormField
            label="Email"
            type="email"
            {...form.getFieldProps('email')}
            placeholder="john@example.com"
            suggestions={form.getFieldSuggestions('email')}
            required
          />

          <ValidatedFormField
            label="Password"
            type="password"
            {...form.getFieldProps('password')}
            placeholder="Enter your password"
            suggestions={form.getFieldSuggestions('password')}
            required
          />

          <Button
            type="submit"
            loading={form.loading}
            disabled={!form.canSubmit}
            className="w-full"
          >
            Sign In
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <a
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up
              </a>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};


