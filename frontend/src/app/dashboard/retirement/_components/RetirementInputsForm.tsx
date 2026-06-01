// Thin retirement-inputs form. Page-local ephemeral state — no persistence.
// Defaults filled by the parent from User profile + capability's resolved inputs.

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RetirementInputs } from '@/lib/retirement/types';

interface Props {
  value: RetirementInputs;
  onChange: (next: RetirementInputs) => void;
}

export function RetirementInputsForm({ value, onChange }: Props) {
  const set = <K extends keyof RetirementInputs>(k: K, v: RetirementInputs[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Assumptions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Retirement age</Label>
          <Input
            type="number" min={30} max={90} step={1}
            value={value.retirementAge}
            onChange={(e) => set('retirementAge', Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Target spend (per month)</Label>
          <Input
            type="number" min={0} step={100}
            value={value.targetMonthlySpending}
            onChange={(e) => set('targetMonthlySpending', Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs">Plan through age</Label>
          <Input
            type="number" min={value.retirementAge} max={110} step={1}
            value={value.endOfLifeAge ?? 95}
            onChange={(e) => set('endOfLifeAge', Number(e.target.value) || 95)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        These inputs aren&apos;t saved — change them to explore scenarios.
      </p>
    </div>
  );
}
