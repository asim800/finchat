// RetirementPageClient — owns the page-local ephemeral inputs state, fetches
// /api/retirement/project on mount + on input changes (debounced), and lays out
// the supporting panels. NO business logic; no imports from lib/accounts /
// lib/income / lib/db — only the capability's HTTP contract.

'use client';

import { useEffect, useRef, useState } from 'react';
import { httpPost, HttpError } from '@/lib/http';
import type { RetirementInputs, RetirementResult } from '@/lib/retirement/types';
import { ReadinessHeadline } from './ReadinessHeadline';
import { ProjectionChart } from './ProjectionChart';
import { WhatWeKnowPanel } from './WhatWeKnowPanel';
import { RetirementInputsForm } from './RetirementInputsForm';
import { RealEstateSummary } from './RealEstateSummary';
import { AssetMatrix } from './AssetMatrix';

// Sensible initial inputs; we refine the spend target after the first response
// using the user's resolved monthly expenses (so the default "80% of current
// expenses" actually reflects the user's data).
const INITIAL_INPUTS: RetirementInputs = {
  retirementAge: 65,
  targetMonthlySpending: 5000,
  endOfLifeAge: 95,
};

export function RetirementPageClient() {
  const [inputs, setInputs] = useState<RetirementInputs>(INITIAL_INPUTS);
  const [result, setResult] = useState<RetirementResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didDefaultSpend = useRef(false);

  useEffect(() => {
    // Debounce input changes so rapid typing doesn't spam the server.
    const handle = setTimeout(() => {
      void fetchProjection(inputs);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  const fetchProjection = async (next: RetirementInputs) => {
    setLoading(true);
    setError(null);
    try {
      const r = await httpPost<RetirementResult>('/api/retirement/project', next);
      setResult(r);
      // First-time default: set target spend to 80% × current monthly expenses,
      // but only if the user hasn't customized yet.
      if (!didDefaultSpend.current && r.inputsResolved.monthlyExpenses > 0) {
        didDefaultSpend.current = true;
        const suggested = Math.round((r.inputsResolved.monthlyExpenses * 0.8) / 100) * 100;
        if (suggested > 0 && suggested !== next.targetMonthlySpending) {
          setInputs((prev) => ({ ...prev, targetMonthlySpending: suggested }));
        }
      }
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Failed to project retirement');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (!result) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        {loading ? 'Projecting…' : 'No data yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline + chart sit at the top — emotional payoff first. */}
      <ReadinessHeadline readiness={result.readiness} projection={result.projection} />
      <ProjectionChart projection={result.projection} />

      {/* Side-by-side: inputs + gap-fill panel. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RetirementInputsForm value={inputs} onChange={setInputs} />
        <WhatWeKnowPanel whatWeKnow={result.whatWeKnow} inputs={result.inputsResolved} />
      </div>

      {/* Real-estate (only if present). */}
      <RealEstateSummary realEstate={result.realEstate} />

      {/* Diagnostic: cross-tab of where the money actually sits. */}
      <AssetMatrix matrix={result.matrix} />

      {loading && (
        <p className="text-xs text-muted-foreground text-right">Recomputing…</p>
      )}
    </div>
  );
}
