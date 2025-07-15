// ============================================================================
// FILE: app/(auth)/login/page.tsx
// Login page
// ============================================================================

import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { FinancialDisclaimerFooter } from '@/components/ui/financial-disclaimer-footer';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/">
              <h1 className="text-3xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer">MyStocks.ai</h1>
            </Link>
            <p className="text-gray-600">Professional Portfolio Analysis, Finally Explained Clearly</p>
          </div>
          <LoginForm />
        </div>
      </div>
      <FinancialDisclaimerFooter />
    </div>
  );
}
