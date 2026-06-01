// Retirement diagnostic — power-user audit view (Phase 3.5 Package D).
//
// Same /api/retirement/project endpoint as the main retirement page, just with
// richer inputs (overrides + SS toggle) + the per-account breakdown surfaced
// in the InputsResolved struct. No new business logic — the math lives in
// lib/retirement.

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { httpPost, HttpError } from '@/lib/http';
import { ACCOUNT_TYPE_SHORT_LABELS } from '@/lib/accounts/types';
import type { RetirementInputs, RetirementResult } from '@/lib/retirement/types';
import { ReadinessHeadline } from '../../_components/ReadinessHeadline';
import { ProjectionChart } from '../../_components/ProjectionChart';

const INITIAL_INPUTS: RetirementInputs = {
  retirementAge: 65,
  targetMonthlySpending: 5000,
  endOfLifeAge: 95,
  includeSocialSecurity: true,
  overrideMonthlyIncome: null,
  overrideMonthlyExpenses: null,
};

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function RetirementDiagnosticClient() {
  const [inputs, setInputs] = useState<RetirementInputs>(INITIAL_INPUTS);
  const [result, setResult] = useState<RetirementResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didDefaultSpend = useRef(false);

  useEffect(() => {
    const handle = setTimeout(() => { void fetchProjection(inputs); }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  const fetchProjection = async (next: RetirementInputs) => {
    setLoading(true);
    setError(null);
    try {
      const r = await httpPost<RetirementResult>('/api/retirement/project', next);
      setResult(r);
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

  const ir = result.inputsResolved;
  const totalBreakdown = ir.investableBreakdown.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-4">
      <ReadinessHeadline readiness={result.readiness} projection={result.projection} />
      <ProjectionChart projection={result.projection} />

      {/* "What the model is using" — single-line summary of resolved inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What the model is using</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
            <Resolved label="Current age" value={ir.currentAge ?? '—'} source={ir.sources.age} />
            <Resolved label="Income / mo" value={fmt.format(ir.monthlyIncome)} source={ir.sources.income} />
            <Resolved label="Expense / mo" value={fmt.format(ir.monthlyExpenses)} source={ir.sources.expenses} />
            <Resolved label="Retire income / mo" value={fmt.format(ir.monthlyRetirementIncomeAtRetire)} hint="SS + pension + rental" />
            <Resolved label="Expected return" value={`${(ir.expectedReturn * 100).toFixed(1)}% real`} hint="from risk tolerance" />
          </dl>
        </CardContent>
      </Card>

      {/* Diagnostic controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnostic controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DiagInput label="Override income / mo" value={inputs.overrideMonthlyIncome ?? ''}
              hint={ir.sources.income === 'override' ? 'using override' : `default: ${fmt.format(ir.monthlyIncome)}/mo`}
              onChange={(v) => setInputs({ ...inputs, overrideMonthlyIncome: v === '' ? null : Number(v) })}
              onReset={() => setInputs({ ...inputs, overrideMonthlyIncome: null })}
            />
            <DiagInput label="Override expense / mo" value={inputs.overrideMonthlyExpenses ?? ''}
              hint={ir.sources.expenses === 'override' ? 'using override' : `default: ${fmt.format(ir.monthlyExpenses)}/mo`}
              onChange={(v) => setInputs({ ...inputs, overrideMonthlyExpenses: v === '' ? null : Number(v) })}
              onReset={() => setInputs({ ...inputs, overrideMonthlyExpenses: null })}
            />
            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input type="checkbox" checked={inputs.includeSocialSecurity !== false}
                  onChange={(e) => setInputs({ ...inputs, includeSocialSecurity: e.target.checked })} />
                <span className="text-sm font-medium">Include Social Security</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Off &rarr; excludes CashFlow SS rows AND profile estimate. Pension/Annuity/Rental still counted.
              </p>
            </div>
          </div>

          {/* Retirement / target / horizon — same controls as the main retirement page */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
            <div>
              <Label className="text-xs">Retirement age</Label>
              <Input type="number" min={30} max={90} value={inputs.retirementAge}
                onChange={(e) => setInputs({ ...inputs, retirementAge: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Target spend / mo</Label>
              <Input type="number" min={0} step={100} value={inputs.targetMonthlySpending}
                onChange={(e) => setInputs({ ...inputs, targetMonthlySpending: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Plan through age</Label>
              <Input type="number" min={inputs.retirementAge} max={110} value={inputs.endOfLifeAge ?? 95}
                onChange={(e) => setInputs({ ...inputs, endOfLifeAge: Number(e.target.value) || 95 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-account investable breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investable balance breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {ir.investableBreakdown.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No investable accounts.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Account</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Portfolio</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Source</th>
                  <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {ir.investableBreakdown.map((r) => (
                  <tr key={r.accountId} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 font-medium">{r.accountName}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.portfolioName}</td>
                    <td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">{ACCOUNT_TYPE_SHORT_LABELS[r.accountType]}</Badge></td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.source === 'assets' ? 'asset market value' : 'account balance fallback'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt.format(r.value)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40">
                  <td className="px-3 py-1.5 font-bold" colSpan={4}>Total investable</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-bold">{fmt.format(totalBreakdown)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted-foreground italic px-4 py-2">
            Real Estate and Mortgage accounts are NOT included here (they&apos;re modeled separately as net real-estate wealth on the main retirement page).
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-2">
        <Link href="/dashboard/retirement"><Button variant="outline">← Back to Retirement</Button></Link>
      </div>

      {loading && <p className="text-xs text-muted-foreground text-right">Recomputing…</p>}
    </div>
  );
}

function Resolved({ label, value, source, hint }: { label: string; value: string | number; source?: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums flex items-center gap-1.5">
        {value}
        {source && source !== 'unknown' && <Badge variant="outline" className="text-[9px] uppercase">{source}</Badge>}
      </dd>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DiagInput({ label, value, hint, onChange, onReset }: { label: string; value: number | string; hint: string; onChange: (v: string) => void; onReset: () => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={100} value={value} placeholder="—" onChange={(e) => onChange(e.target.value)} />
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-muted-foreground">{hint}</p>
        {value !== '' && value != null && (
          <button type="button" className="text-[10px] text-primary hover:underline" onClick={onReset}>reset</button>
        )}
      </div>
    </div>
  );
}
