// ============================================================================
// FILE: app/(auth)/login/page.tsx
// Login page
// ============================================================================

import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">RiskLens</h1>
          </Link>
          <p className="text-gray-600">Professional Portfolio Analysis, Finally Explained Clearly</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
