// ============================================================================
// FILE: app/(auth)/login/page.tsx
// Login page
// ============================================================================

import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finance App</h1>
          <p className="text-gray-600">Your AI-powered financial assistant</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
