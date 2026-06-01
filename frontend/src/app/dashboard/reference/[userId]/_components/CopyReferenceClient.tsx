// Client form for "Use as starting point" — granular, additive copy of a reference
// profile into the user's account. Calls POST /api/reference/copy.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { httpPost, HttpError } from '@/lib/http';
import type { CopyResult, CopySections } from '@/lib/reference/types';

interface Props {
  sourceUserId: string;
  sourceName: string;
  preview: {
    portfolioCount: number;
    accountCount: number;
    assetCount: number;
    cashFlowCount: number;
    profileFieldsPresent: number;
  };
}

export function CopyReferenceClient({ sourceUserId, sourceName, preview }: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<CopySections>({
    portfolios: true,
    income: true,
    profile: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopyResult | null>(null);

  const toggle = (key: keyof CopySections) =>
    setSections((s) => ({ ...s, [key]: !s[key] }));

  const anySelected = sections.portfolios || sections.income || sections.profile;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const r = await httpPost<CopyResult>('/api/reference/copy', { sourceUserId, sections });
      setResult(r);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Failed to copy reference profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Imported from {sourceName}</h2>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {result.copiedPortfolios > 0 && (
              <li>
                <strong>{result.copiedPortfolios}</strong> portfolio{result.copiedPortfolios === 1 ? '' : 's'}
                {' · '}<strong>{result.copiedAccounts}</strong> account{result.copiedAccounts === 1 ? '' : 's'}
                {' · '}<strong>{result.copiedAssets}</strong> asset{result.copiedAssets === 1 ? '' : 's'}
              </li>
            )}
            {result.copiedCashFlows > 0 && (
              <li>
                <strong>{result.copiedCashFlows}</strong> income/expense cash flow{result.copiedCashFlows === 1 ? '' : 's'}
              </li>
            )}
            {result.filledProfileFields > 0 && (
              <li>
                <strong>{result.filledProfileFields}</strong> profile field{result.filledProfileFields === 1 ? '' : 's'} filled
              </li>
            )}
            {result.skippedProfileFields.length > 0 && (
              <li className="text-muted-foreground">
                Skipped {result.skippedProfileFields.length} profile field{result.skippedProfileFields.length === 1 ? '' : 's'} you already had values for ({result.skippedProfileFields.join(', ')})
              </li>
            )}
          </ul>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => router.push('/dashboard/myportfolio')}>Go to My Portfolio</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/income')}>Go to Income</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/retirement')}>Go to Retirement</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold mb-2">What to copy</h2>
          <p className="text-xs text-muted-foreground mb-3">
            This is additive — existing portfolios, income, and filled profile fields are never overwritten.
            Imported portfolios are named &quot;... (from {sourceName})&quot; so you can find and remove them later.
          </p>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={!!sections.portfolios} onChange={() => toggle('portfolios')} />
              <div>
                <span className="text-sm font-medium">Portfolios + accounts + assets</span>
                <p className="text-xs text-muted-foreground">
                  Adds {preview.portfolioCount} portfolio{preview.portfolioCount === 1 ? '' : 's'} with {preview.accountCount} account{preview.accountCount === 1 ? '' : 's'} and {preview.assetCount} asset{preview.assetCount === 1 ? '' : 's'}.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={!!sections.income} onChange={() => toggle('income')} />
              <div>
                <span className="text-sm font-medium">Income &amp; expense cash flows</span>
                <p className="text-xs text-muted-foreground">
                  Adds {preview.cashFlowCount} cash flow{preview.cashFlowCount === 1 ? '' : 's'} (alongside your existing ones).
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={!!sections.profile} onChange={() => toggle('profile')} />
              <div>
                <span className="text-sm font-medium">Profile fields</span>
                <p className="text-xs text-muted-foreground">
                  Fills up to {preview.profileFieldsPresent} of your empty profile field{preview.profileFieldsPresent === 1 ? '' : 's'} (birthDate, income, expenses, SS estimate, risk tolerance, etc.). Fields you&apos;ve already filled are left alone.
                </p>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/40 rounded p-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={submitting || !anySelected}>
            {submitting ? 'Importing…' : `Import from ${sourceName}`}
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/portfolio')}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
