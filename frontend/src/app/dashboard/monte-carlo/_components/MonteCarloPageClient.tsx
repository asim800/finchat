// MC sandbox orchestrator (Phase 4 Part C). Page-local ephemeral state;
// fetches /api/mc/simulate on submit; renders MCSummary + MCFanChart + errors.

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { httpPost, HttpError } from '@/lib/http';
import type { MCSimulationResponse } from '@/lib/mc/types';
import { MCInputsForm, type MCInputs } from './MCInputsForm';
import { MCFanChart } from './MCFanChart';
import { MCSummary } from './MCSummary';

const INITIAL_INPUTS: MCInputs = {
  retirementAge: 65,
  horizonYears: 30,
  annualWithdrawal: 40000,
  numSimulations: 100,
};

// Parametric sampling is what works without bootstrap historical data; sandbox
// defaults to it. Users can switch later when bootstrap mode is fully wired.
const SAMPLING_METHOD = 'parametric';

interface UserSnippet { currentAge: number | null }

export function MonteCarloPageClient() {
  const [inputs, setInputs] = useState<MCInputs>(INITIAL_INPUTS);
  const [result, setResult] = useState<MCSimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // userSnippet just carries currentAge so the form can show "X years from now".
  // We fetch it lazily on first sim run from the retirement endpoint (already
  // computes age from User.birthDate).
  const [userSnippet, setUserSnippet] = useState<UserSnippet>({ currentAge: null });

  const runSim = async () => {
    setLoading(true);
    setError(null);
    try {
      // Compute retirementDate from currentAge if known, else from the input directly.
      const yearsToRetire = userSnippet.currentAge != null
        ? Math.max(0, inputs.retirementAge - userSnippet.currentAge)
        : 25; // sensible default
      const retireYear = new Date().getFullYear() + yearsToRetire;
      const retirementDate = `${retireYear}-01-01`;

      const r = await httpPost<MCSimulationResponse>('/api/mc/simulate', {
        lifecycle: {
          retirementDate,
          horizonYears: inputs.horizonYears,
          annualWithdrawal: inputs.annualWithdrawal,
          numSimulations: inputs.numSimulations,
          samplingMethod: SAMPLING_METHOD,
        },
      }, { timeoutMs: 90_000 });

      setResult(r);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  // First-time fetch of currentAge — call retirement endpoint just to get it.
  // (No cost: project caches inside that capability; we throw away the projection.)
  const fetchAge = async () => {
    try {
      const r = await httpPost<{ inputsResolved: { currentAge: number | null } }>('/api/retirement/project',
        { retirementAge: 65, targetMonthlySpending: 5000 });
      setUserSnippet({ currentAge: r.inputsResolved.currentAge });
    } catch { /* non-fatal */ }
  };

  // One-shot on mount.
  useEffect(() => { void fetchAge(); }, []);

  const accumulation = result?.accumulation?.[SAMPLING_METHOD];
  const decumulation = result?.decumulation?.[SAMPLING_METHOD];

  return (
    <div className="space-y-4">
      <MCInputsForm value={inputs} onChange={setInputs} currentAge={userSnippet.currentAge} />

      <div className="flex justify-end">
        <Button onClick={runSim} disabled={loading} size="lg">
          {loading ? 'Running…' : 'Run simulation'}
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-destructive font-medium mb-2">Simulation error</p>
            <p className="text-sm text-muted-foreground break-words">{error}</p>
            <p className="text-xs text-muted-foreground mt-3 italic">
              The MC service currently knows a limited set of tickers
              (SPY, AGG, NVDA, GLD) via its default covariance matrix. If your
              portfolio has other holdings, the parametric sampler can&apos;t
              simulate them yet. Expanding the cov matrix is a follow-up.
            </p>
          </CardContent>
        </Card>
      )}

      {result && accumulation && decumulation && !error && (
        <>
          <MCSummary result={result} samplingMethod={SAMPLING_METHOD} />
          <MCFanChart accumulation={accumulation} decumulation={decumulation} />
        </>
      )}

      {!result && !error && !loading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Set your inputs above and hit <span className="font-medium">Run simulation</span> to project your portfolio.
            Uses your default portfolio&apos;s current holdings. Parametric sampling, ~3s per 100 sims.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
