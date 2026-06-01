// Templates page — surfaces "reference profiles" (logged-in users only).
//
// Phase 3.5 rewrite: the previous hardcoded REFERENCE_PORTFOLIOS array is gone.
// Logged-in users see DB-backed reference profiles via lib/reference.
// Guests see a sign-in CTA (no data leakage).

import { headers } from 'next/headers';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listReferenceProfiles } from '@/lib/reference';

const STATUS_LABEL = {
  on_track: { text: 'On track', variant: 'success' as const },
  tight: { text: 'Tight', variant: 'warning' as const },
  falling_behind: { text: 'Falling behind', variant: 'destructive' as const },
  unknown: { text: '—', variant: 'outline' as const },
} as const;

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const metadata = {
  title: 'Templates',
};

export default async function TemplatesPage() {
  const headersList = await headers();
  const isGuestMode = headersList.get('x-guest-mode') === 'true';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reference profiles you can browse and pull into your own account as a starting point.
        </p>
      </div>

      {isGuestMode ? <GuestCTA /> : <ReferenceProfilesGrid />}
    </div>
  );
}

function GuestCTA() {
  return (
    <Card>
      <CardContent className="p-6 text-sm">
        <p className="mb-3">
          Sign in to explore reference profiles — example retirement scenarios with full portfolios,
          income, and projection data. You can pull any of them into your own account as a starting
          point.
        </p>
        <div className="flex gap-2">
          <Link href="/login"><Button>Sign in</Button></Link>
          <Link href="/register"><Button variant="outline">Create account</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

async function ReferenceProfilesGrid() {
  const profiles = await listReferenceProfiles();

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No reference profiles available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {profiles.map((p) => {
        const status = STATUS_LABEL[p.stats.readinessStatus];
        return (
          <Card key={p.userId}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{p.firstName} {p.lastName}</CardTitle>
                <Badge variant={status.variant}>{status.text}</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{p.referenceTitle}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">{p.referenceDescription}</p>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Portfolios</dt>
                  <dd className="font-medium tabular-nums">{p.stats.portfolioCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Accounts</dt>
                  <dd className="font-medium tabular-nums">{p.stats.accountCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Investable</dt>
                  <dd className="font-medium tabular-nums">{fmt.format(p.stats.investableBalance)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Income / mo</dt>
                  <dd className="font-medium tabular-nums">{fmt.format(p.stats.monthlyIncome)}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={`/dashboard/reference/${p.userId}/portfolio`}>
                  <Button size="sm" variant="outline">View portfolios</Button>
                </Link>
                <Link href={`/dashboard/reference/${p.userId}/income`}>
                  <Button size="sm" variant="outline">View income</Button>
                </Link>
                <Link href={`/dashboard/reference/${p.userId}/copy`}>
                  <Button size="sm">Use as starting point</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
