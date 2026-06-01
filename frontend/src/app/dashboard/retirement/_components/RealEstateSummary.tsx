// Real-estate wealth summary. Excluded from the projection (illiquid for most users);
// shown here as a separate wealth bucket so the user sees the full picture.

'use client';

import { Badge } from '@/components/ui/badge';
import type { RealEstateWealth } from '@/lib/retirement/types';

interface Props {
  realEstate: RealEstateWealth;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  primary_home: 'Primary',
  rental: 'Rental',
  other: 'Other',
};

export function RealEstateSummary({ realEstate }: Props) {
  if (realEstate.properties.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <h3 className="text-sm font-semibold">Real-estate wealth</h3>
        <p className="text-xs text-muted-foreground">
          Net equity <span className="font-medium text-foreground">{fmt.format(realEstate.netEquity)}</span>
          <span className="ml-2">
            ({fmt.format(realEstate.totalValue)} value − {fmt.format(realEstate.totalLoan)} loan)
          </span>
        </p>
      </div>
      <ul className="space-y-1">
        {realEstate.properties.map((p) => (
          <li key={p.name} className="flex items-center gap-2 text-sm flex-wrap">
            <Badge variant="outline" className="text-[10px]">
              {PROPERTY_TYPE_LABEL[p.propertyType] ?? p.propertyType}
            </Badge>
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground text-xs">
              {fmt.format(p.value)}
              {p.loan > 0 && <> · loan {fmt.format(p.loan)}</>}
              <> · equity <span className="text-foreground font-medium">{fmt.format(p.equity)}</span></>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-2 italic">
        Excluded from the projection above — most users don&apos;t liquidate their
        primary home to fund retirement.
      </p>
    </div>
  );
}
