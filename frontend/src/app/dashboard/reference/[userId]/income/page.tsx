// Read-only viewer: a reference user's income/expense cash flows.
// Thin server wrapper; data via lib/reference. 404 if user isn't a reference profile.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getReferenceProfile } from '@/lib/reference';
import { IncomeReadOnly } from '../_components/IncomeReadOnly';

interface Params { params: Promise<{ userId: string }> }

export const metadata = { title: 'Reference income' };

export default async function ReferenceIncomePage({ params }: Params) {
  const { userId } = await params;
  const profile = await getReferenceProfile(userId);
  if (!profile) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}&apos;s Income &amp; Expenses</h1>
          <p className="text-sm text-muted-foreground">{profile.referenceTitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/reference/${userId}/portfolio`}><Button size="sm" variant="outline">View portfolios</Button></Link>
          <Link href="/dashboard/portfolio"><Button size="sm" variant="outline">← Templates</Button></Link>
        </div>
      </div>

      <IncomeReadOnly profile={profile} />
    </div>
  );
}
