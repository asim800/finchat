// ============================================================================
// FILE: components/auth/register-form.tsx
// Registration form component
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

interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const RegisterForm: React.FC = () => {
  const router = useRouter();

  const form = useStandardForm<RegisterFormData>({
    schema: AuthValidationSchemas.register,
    initialValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: ''
    },
    onSubmit: async (data) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Registration successful, navigate smoothly without page reload
      router.push('/dashboard/myportfolio');
    }
  });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          Create Account
        </CardTitle>
        <CardDescription className="text-center">
          Join our finance platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <FormError error={form.error} />

          <div className="grid grid-cols-2 gap-4">
            <ValidatedFormField
              label="First Name"
              {...form.getFieldProps('firstName')}
              placeholder="John"
              suggestions={form.getFieldSuggestions('firstName')}
              required
            />
            <ValidatedFormField
              label="Last Name"
              {...form.getFieldProps('lastName')}
              placeholder="Doe"
              suggestions={form.getFieldSuggestions('lastName')}
              required
            />
          </div>

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
            placeholder="Minimum 8 characters"
            suggestions={form.getFieldSuggestions('password')}
            required
          />

          <Button
            type="submit"
            loading={form.loading}
            disabled={!form.canSubmit}
            className="w-full"
          >
            Create Account
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </a>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};


