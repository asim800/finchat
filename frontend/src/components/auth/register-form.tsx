// ============================================================================
// FILE: components/auth/register-form.tsx
// Registration form component
// ============================================================================

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ButtonWithLoading as Button } from '@/components/ui/button-with-loading';
import { FormField } from '@/components/ui/form-field';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type RegisterFormData = z.infer<typeof RegisterSchema>;

export const RegisterForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
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

      // Registration successful, force a full page reload to pick up auth cookie
      window.location.href = '/dashboard/portfolio';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="First Name"
              {...register('firstName')}
              error={errors.firstName?.message}
              placeholder="John"
            />
            <FormField
              label="Last Name"
              {...register('lastName')}
              error={errors.lastName?.message}
              placeholder="Doe"
            />
          </div>

          <FormField
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="john@example.com"
          />

          <FormField
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="Minimum 8 characters"
          />

          <Button
            type="submit"
            loading={isLoading}
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


