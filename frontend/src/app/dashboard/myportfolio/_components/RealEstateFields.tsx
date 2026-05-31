// Real-estate sub-form fields. Used by AccountForm when accountType=RealEstate.
// Pure controlled component; parent owns state.

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RealEstateDetailsInput } from '@/lib/accounts/types';

interface Props {
  value: RealEstateDetailsInput;
  onChange: (next: RealEstateDetailsInput) => void;
}

const PROPERTY_TYPE_LABELS: Record<RealEstateDetailsInput['propertyType'], string> = {
  primary_home: 'Primary Home',
  rental: 'Rental Property',
  other: 'Other Property',
};

export function RealEstateFields({ value, onChange }: Props) {
  // Tiny helper to keep the JSX readable.
  const set = <K extends keyof RealEstateDetailsInput>(k: K, v: RealEstateDetailsInput[K]) =>
    onChange({ ...value, [k]: v });

  // Numeric field: convert empty string → null so partial entries don't bomb the backend.
  const num = (s: string): number | null => (s === '' ? null : Number(s));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-md bg-muted/40 border">
      <div className="md:col-span-2">
        <Label className="text-xs">Property Type *</Label>
        <Select
          value={value.propertyType}
          onValueChange={(v) => set('propertyType', v as RealEstateDetailsInput['propertyType'])}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PROPERTY_TYPE_LABELS) as (keyof typeof PROPERTY_TYPE_LABELS)[]).map((k) => (
              <SelectItem key={k} value={k}>{PROPERTY_TYPE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Current Value *</Label>
        <Input
          type="number" min="0" step="1"
          value={value.currentValue ?? ''}
          onChange={(e) => set('currentValue', Number(e.target.value) || 0)}
          placeholder="500000"
        />
      </div>

      <div>
        <Label className="text-xs">Outstanding Loan</Label>
        <Input
          type="number" min="0" step="1"
          value={value.outstandingLoan ?? ''}
          onChange={(e) => set('outstandingLoan', num(e.target.value))}
          placeholder="350000"
        />
      </div>

      <div>
        <Label className="text-xs">Interest Rate (%)</Label>
        <Input
          type="number" min="0" step="0.01"
          value={value.interestRate ?? ''}
          onChange={(e) => set('interestRate', num(e.target.value))}
          placeholder="6.5"
        />
      </div>

      <div>
        <Label className="text-xs">Monthly Payment</Label>
        <Input
          type="number" min="0" step="1"
          value={value.monthlyPayment ?? ''}
          onChange={(e) => set('monthlyPayment', num(e.target.value))}
          placeholder="2200"
        />
      </div>
    </div>
  );
}
