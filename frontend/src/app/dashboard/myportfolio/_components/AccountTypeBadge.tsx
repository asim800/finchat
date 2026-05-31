// Account-type label badge — colocated, disposable. Pure presentational; safe to throw away.

'use client';

import { Badge } from '@/components/ui/badge';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_SHORT_LABELS, type AccountType } from '@/lib/accounts/types';

// Each type gets a stable visual hint so the eye can scan a long portfolio quickly.
const VARIANT_FOR_TYPE: Record<AccountType, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  CashBank: 'secondary',
  TaxableBrokerage: 'default',
  TraditionalRetirement: 'warning',
  RothRetirement: 'success',
  HSA: 'success',
  RealEstate: 'outline',
  MortgageLoan: 'destructive',
  Other: 'outline',
};

interface Props {
  type: AccountType;
  /** Optional shorter label for tight rows (e.g. "Roth" vs full "Roth (Roth 401(k) / Roth IRA)"). */
  short?: boolean;
}

export function AccountTypeBadge({ type, short = false }: Props) {
  return (
    <Badge variant={VARIANT_FOR_TYPE[type]}>
      {short ? ACCOUNT_TYPE_SHORT_LABELS[type] : ACCOUNT_TYPE_LABELS[type]}
    </Badge>
  );
}
