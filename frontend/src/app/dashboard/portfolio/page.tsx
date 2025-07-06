// ============================================================================
// FILE: app/dashboard/portfolio/page.tsx  
// Admin reference portfolios page - view and manage template portfolios
// ============================================================================

import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ReferencePortfolio {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  assets: Array<{
    symbol: string;
    allocation: number;
    assetType: string;
  }>;
  expectedReturn: number;
  volatility: number;
}

// Mock data for reference portfolios (in real app, fetch from database)
const REFERENCE_PORTFOLIOS: ReferencePortfolio[] = [
  {
    id: '1',
    name: 'Conservative Growth',
    description: 'A balanced portfolio focused on steady growth with low risk',
    category: 'Conservative',
    riskLevel: 'Low',
    expectedReturn: 6.5,
    volatility: 8.2,
    assets: [
      { symbol: 'VTI', allocation: 40, assetType: 'ETF' },
      { symbol: 'BND', allocation: 30, assetType: 'Bond ETF' },
      { symbol: 'VEA', allocation: 20, assetType: 'International ETF' },
      { symbol: 'VTEB', allocation: 10, assetType: 'Municipal Bond ETF' }
    ]
  },
  {
    id: '2', 
    name: 'Aggressive Growth',
    description: 'High-growth portfolio targeting maximum returns with higher risk',
    category: 'Aggressive',
    riskLevel: 'High',
    expectedReturn: 12.3,
    volatility: 18.5,
    assets: [
      { symbol: 'QQQ', allocation: 35, assetType: 'Tech ETF' },
      { symbol: 'VUG', allocation: 25, assetType: 'Growth ETF' },
      { symbol: 'VTI', allocation: 20, assetType: 'Total Market ETF' },
      { symbol: 'ARKK', allocation: 20, assetType: 'Innovation ETF' }
    ]
  },
  {
    id: '3',
    name: 'Dividend Income',
    description: 'Income-focused portfolio emphasizing dividend-paying assets',
    category: 'Income',
    riskLevel: 'Medium',
    expectedReturn: 8.1,
    volatility: 12.4,
    assets: [
      { symbol: 'VYM', allocation: 40, assetType: 'Dividend ETF' },
      { symbol: 'SCHD', allocation: 30, assetType: 'Dividend ETF' },
      { symbol: 'REITS', allocation: 20, assetType: 'REITs' },
      { symbol: 'VNQ', allocation: 10, assetType: 'Real Estate ETF' }
    ]
  }
];

export default async function ReferencePortfoliosPage() {
  // Check user status and guest mode
  const headersList = await headers();
  const isGuestMode = headersList.get('x-guest-mode') === 'true';
  
  let user = null;
  let isAdmin = false;

  if (!isGuestMode) {
    try {
      // Extract auth token from cookies
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
            lastName: true,
            role: true
          }
        });
        
        isAdmin = user?.role === 'admin';
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reference Portfolios</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin 
              ? "Manage template portfolios for user recommendations" 
              : "Explore professionally curated portfolio templates"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm">Create New</Button>
            <Button variant="outline" size="sm">Import</Button>
          </div>
        )}
      </div>

      {/* User Notice */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              {isGuestMode ? "Demo Mode" : isAdmin ? "Administrator View" : "Reference Portfolios"}
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                {isGuestMode 
                  ? "These are professionally curated portfolio templates. Sign up for a free account to create your own portfolio and get personalized recommendations."
                  : isAdmin 
                    ? "These are template portfolios that can be recommended to users. Edit allocations, add new portfolios, or modify risk profiles to help users find suitable investment strategies."
                    : "These professionally curated portfolios can serve as templates for your investment strategy. Use them as inspiration or starting points for your own portfolio."
                }
                {!isGuestMode && !user && (
                  <Link href="/register" className="font-medium underline hover:text-blue-600 ml-1">
                    Sign up for free
                  </Link>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Portfolios Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REFERENCE_PORTFOLIOS.map((portfolio) => (
          <Card key={portfolio.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {portfolio.category}
                  </p>
                </div>
                <Badge 
                  variant={portfolio.riskLevel === 'Low' ? 'success' : 
                          portfolio.riskLevel === 'Medium' ? 'warning' : 'destructive'}
                >
                  {portfolio.riskLevel} Risk
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {portfolio.description}
              </p>
              
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Expected Return</p>
                  <p className="text-lg font-semibold text-green-600">
                    {portfolio.expectedReturn}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Volatility</p>
                  <p className="text-lg font-semibold">
                    {portfolio.volatility}%
                  </p>
                </div>
              </div>

              {/* Asset Allocation */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Asset Allocation</p>
                <div className="space-y-2">
                  {portfolio.assets.map((asset, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{asset.symbol}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{asset.assetType}</span>
                        <span className="font-semibold">{asset.allocation}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {isAdmin ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Clone
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      {isGuestMode ? "Preview" : "Use Template"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions - Admin Only */}
      {isAdmin && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Portfolio Analytics</h3>
              <p className="text-sm text-muted-foreground mb-3">
                View performance metrics and user adoption rates
              </p>
              <Button variant="outline" size="sm">View Analytics</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">User Recommendations</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Manage which portfolios are recommended to users
              </p>
              <Button variant="outline" size="sm">Configure</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Market Updates</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Update allocations based on market conditions
              </p>
              <Button variant="outline" size="sm">Update All</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Actions - For Regular Users and Guests */}
      {!isAdmin && (
        <div className="mt-8">
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-medium mb-2">Ready to Start Investing?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isGuestMode 
                  ? "Create a free account to build your own portfolio using these templates as a starting point."
                  : "Use these professionally designed portfolios as templates for your investment strategy."}
              </p>
              <div className="flex gap-2 justify-center">
                {isGuestMode ? (
                  <>
                    <Link href="/register">
                      <Button>Sign Up Free</Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline">Log In</Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/dashboard/myportfolio">
                    <Button>Go to My Portfolio</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}