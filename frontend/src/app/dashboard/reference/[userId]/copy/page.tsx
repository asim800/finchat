// "Use as starting point" page — pulls a reference profile into the user's account.
// Thin server wrapper that loads the source profile summary for context, then renders
// the client form that drives the copy via POST /api/reference/copy.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getReferenceProfile } from '@/lib/reference';
import { CopyReferenceClient } from '../_components/CopyReferenceClient';

interface Params { params: Promise<{ userId: string }> }

export const metadata = { title: 'Use as starting point' };

export default async function CopyReferencePage({ params }: Params) {
  const { userId } = await params;
  const profile = await getReferenceProfile(userId);
  if (!profile) notFound();

  // Build a preview so the user knows exactly what they'd add.
  const preview = {
    portfolioCount: profile.portfolios.length,
    accountCount: profile.portfolios.reduce((s, p) => s + p.accounts.length, 0),
    assetCount: profile.portfolios.reduce((s, p) => s + p.assets.length, 0),
    cashFlowCount: profile.cashFlows.length,
    profileFieldsPresent: Object.entries(profile.profile)
      .filter(([, v]) => v != null && v !== '').length,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Use {profile.firstName} {profile.lastName} as a starting point</h1>
          <p className="text-sm text-muted-foreground">{profile.referenceTitle}</p>
        </div>
        <Link href="/dashboard/portfolio"><Button size="sm" variant="outline">← Templates</Button></Link>
      </div>

      <p className="text-sm">{profile.referenceDescription}</p>

      <CopyReferenceClient
        sourceUserId={userId}
        sourceName={`${profile.firstName} ${profile.lastName}`}
        preview={preview}
      />
    </div>
  );
}
