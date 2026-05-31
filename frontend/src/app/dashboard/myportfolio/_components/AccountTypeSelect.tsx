// Account-type dropdown — colocated, disposable.
// Uses shadcn Select; values are the Prisma enum strings; labels are human-readable.

'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from '@/lib/accounts/types';

interface Props {
  value: AccountType;
  onChange: (value: AccountType) => void;
  disabled?: boolean;
}

export function AccountTypeSelect({ value, onChange, disabled = false }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AccountType)} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select account type" />
      </SelectTrigger>
      <SelectContent>
        {ACCOUNT_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {ACCOUNT_TYPE_LABELS[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
