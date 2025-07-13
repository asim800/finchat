// ============================================================================
// FILE: app/page.tsx (UPDATED)
// Updated root page with landing page instead of immediate redirect
// ============================================================================

import { headers } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthenticatedTopBar } from '@/components/ui/authenticated-top-bar';
import { GuestTopBar } from '@/components/ui/guest-top-bar';

export default async function HomePage() {
  // Check if user is authenticated
  let user = null;
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    
    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch[1]);
      // Import JWT verification here to avoid circular imports
      const jwt = await import('jsonwebtoken');
      const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
      
      // Fetch user from database
      const { prisma } = await import('@/lib/db');
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });
    }
  } catch {
    // Not authenticated or invalid token
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Use consistent top bar components */}
      {user ? (
        <AuthenticatedTopBar user={user} />
      ) : (
        <GuestTopBar />
      )}

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground sm:text-6xl">
            {user ? (
              <>
                Welcome back, {user.firstName}!
                <span className="text-primary"> Your Financial Dashboard</span>
              </>
            ) : (
              <>
                Professional Portfolio Analysis,
                <span className="text-primary"> Finally Explained Clearly</span>
              </>
            )}
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-3xl mx-auto">
            {user ? (
              "Ready to continue managing your investments? Access your chat history, analyze your portfolio, and get personalized AI insights."
            ) : (
              "Get the same risk analysis used by Wall Street professionals, with explanations you'll actually understand. No sales calls, no product pitches - just the insights you need."
            )}
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {user ? (
              <>
                <Link href="/dashboard/chat">
                  <Button size="lg" className="text-base font-semibold px-8">
                    Open Chat
                  </Button>
                </Link>
                <Link href="/dashboard/myportfolio">
                  <Button size="lg" className="text-base font-semibold px-8">
                    Portfolio
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard/chat">
                  <Button size="lg" className="text-base font-semibold px-8">
                    Try Demo Chat
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" className="text-base font-semibold px-8">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Competitive Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Why Smart Investors Choose RiskLens
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-lg text-muted-foreground italic">
                  &ldquo;I have $500 to invest to my portfolio for growth. Show me some examples. &rdquo;
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-lg text-muted-foreground italic">
                  &ldquo;How can I withdraw $1000 and keep same risk profile? &rdquo;
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-lg text-muted-foreground italic">
                  &ldquo;Unlike robo-advisors, you understand exactly how we calculate your risk&rdquo;
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-lg text-muted-foreground italic">
                  &ldquo;Unlike financial advisors, we don&apos;t charge thousands for basic analysis&rdquo;
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-primary mb-4">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">AI Chat Assistant</h3>
              <p className="mt-2 text-muted-foreground">
                Ask questions about financial markets, get investment advice, and analyze trends with our AI assistant.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Available in Demo
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-primary mb-4">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Portfolio Management</h3>
              <p className="mt-2 text-muted-foreground">
                Track your investments, analyze performance, and get personalized insights on your financial portfolio.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Requires Account
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-primary mb-4">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Secure Bank Integration</h3>
              <p className="mt-2 text-muted-foreground">
                Safely connect your bank accounts and investment platforms for comprehensive financial tracking.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Requires Account
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-primary rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-primary-foreground mb-4">
            Ready to take control of your finances?
          </h3>
          <p className="text-primary-foreground/80 mb-6">
            Join thousands of users who trust our platform with their financial decisions.
          </p>
          <Link href="/register">
            <Button variant="outline" size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-primary-foreground">
              Start Your Free Account
            </Button>
          </Link>
        </div>


      </main>
    </div>
  );
}

