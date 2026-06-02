// Simple inputs for the MC sandbox page. Three knobs + sims slider; everything
// else (sampling method, inflation, frequencies) defaulted by the service.

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface MCInputs {
  retirementAge: number;
  horizonYears: number;
  annualWithdrawal: number;
  numSimulations: number;
}

interface Props {
  value: MCInputs;
  onChange: (next: MCInputs) => void;
  currentAge: number | null;
}

export function MCInputsForm({ value, onChange, currentAge }: Props) {
  const set = <K extends keyof MCInputs>(k: K, v: MCInputs[K]) =>
    onChange({ ...value, [k]: v });

  // Compute the retirement date from currentAge + retirementAge (used by parent on submit).
  const yearsToRetirement = currentAge != null ? Math.max(0, value.retirementAge - currentAge) : null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Simulation inputs</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Retirement age</Label>
          <Input type="number" min={30} max={90} value={value.retirementAge}
            onChange={(e) => set('retirementAge', Number(e.target.value) || 0)} />
          {yearsToRetirement != null && (
            <p className="text-[10px] text-muted-foreground mt-1">{yearsToRetirement} years from now</p>
          )}
        </div>
        <div>
          <Label className="text-xs">Plan horizon (years past retirement)</Label>
          <Input type="number" min={5} max={50} value={value.horizonYears}
            onChange={(e) => set('horizonYears', Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Annual withdrawal ($)</Label>
          <Input type="number" min={0} step={1000} value={value.annualWithdrawal}
            onChange={(e) => set('annualWithdrawal', Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs">Simulations</Label>
          <Input type="number" min={10} max={5000} step={50} value={value.numSimulations}
            onChange={(e) => set('numSimulations', Number(e.target.value) || 100)} />
          <p className="text-[10px] text-muted-foreground mt-1">100 = ~3s, 1000 = ~15s</p>
        </div>
      </div>
    </div>
  );
}
