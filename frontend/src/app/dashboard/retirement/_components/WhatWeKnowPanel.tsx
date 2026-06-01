// "What we know about you" gap-fill panel. Each row: ✓ if filled / ⚠ if missing,
// with a deep-link to the page where the user can fix it. The retirement page
// orchestrates corrections — it points at Portfolio / Income / Profile but never
// inlines those concerns.

'use client';

import Link from 'next/link';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WhatWeKnow, InputsResolved } from '@/lib/retirement/types';

interface Props {
  whatWeKnow: WhatWeKnow;
  inputs: InputsResolved;
}

interface Row {
  label: string;
  filled: boolean;
  /** What's filled-in: a human-readable summary. */
  value?: string;
  /** Where the value came from (CashFlow or User profile), if filled. */
  source?: 'cashflow' | 'profile' | 'unknown';
  /** Where to send the user to fix it. */
  fixHref: string;
  fixLabel: string;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function WhatWeKnowPanel({ whatWeKnow, inputs }: Props) {
  const rows: Row[] = [
    {
      label: 'Birth date',
      filled: whatWeKnow.hasBirthDate,
      value: inputs.currentAge != null ? `Age ${inputs.currentAge}` : undefined,
      source: inputs.sources.age,
      fixHref: '/dashboard/profile',
      fixLabel: 'Add to profile',
    },
    {
      label: 'Monthly income',
      filled: whatWeKnow.hasIncome,
      value: inputs.monthlyIncome > 0 ? `${fmt.format(inputs.monthlyIncome)} / mo` : undefined,
      source: inputs.sources.income,
      fixHref: inputs.sources.income === 'profile' ? '/dashboard/income' : '/dashboard/income',
      fixLabel: 'Add income flow',
    },
    {
      label: 'Monthly expenses',
      filled: whatWeKnow.hasExpenses,
      value: inputs.monthlyExpenses > 0 ? `${fmt.format(inputs.monthlyExpenses)} / mo` : undefined,
      source: inputs.sources.expenses,
      fixHref: '/dashboard/income',
      fixLabel: 'Add expense flow',
    },
    {
      label: 'Social Security estimate',
      filled: whatWeKnow.hasSocialSecurity,
      value: undefined,
      fixHref: '/dashboard/profile',
      fixLabel: 'Add SS estimate',
    },
    {
      label: 'Risk tolerance',
      filled: whatWeKnow.hasRiskTolerance,
      value: undefined,
      fixHref: '/dashboard/profile',
      fixLabel: 'Set risk tolerance',
    },
    {
      label: 'Investable assets',
      filled: whatWeKnow.hasInvestableAssets,
      value: inputs.investableBalance > 0 ? fmt.format(inputs.investableBalance) : undefined,
      fixHref: '/dashboard/myportfolio',
      fixLabel: 'Add holdings',
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">What we know about you</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              {r.filled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              )}
              <span className="font-medium">{r.label}</span>
              {r.filled && r.value && (
                <span className="text-muted-foreground truncate">— {r.value}</span>
              )}
              {r.filled && r.source && r.source !== 'unknown' && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {r.source}
                </Badge>
              )}
            </div>
            {!r.filled && (
              <Link href={r.fixHref} className="text-xs text-primary hover:underline flex-shrink-0">
                {r.fixLabel} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
