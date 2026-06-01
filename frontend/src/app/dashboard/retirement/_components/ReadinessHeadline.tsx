// The big headline number + status badge. Pure presentational.

'use client';

import { Badge } from '@/components/ui/badge';
import type { ReadinessSummary, RetirementProjection } from '@/lib/retirement/types';

interface Props {
  readiness: ReadinessSummary;
  projection: RetirementProjection;
}

const STATUS_LABEL: Record<ReadinessSummary['status'], string> = {
  on_track: 'On track',
  tight: 'Tight',
  falling_behind: 'Falling behind',
};

const STATUS_VARIANT: Record<ReadinessSummary['status'], 'success' | 'warning' | 'destructive'> = {
  on_track: 'success',
  tight: 'warning',
  falling_behind: 'destructive',
};

export function ReadinessHeadline({ readiness, projection }: Props) {
  const pct = (projection.expectedReturn * 100).toFixed(0);
  const ageStart = projection.path[0]?.age;
  const ageEnd = projection.endOfLifeAge;
  return (
    <div className="rounded-lg border bg-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Money lasts to age</p>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-5xl font-bold tabular-nums">{readiness.lastsToAge}</span>
          <Badge variant={STATUS_VARIANT[readiness.status]} className="text-sm">
            {STATUS_LABEL[readiness.status]}
          </Badge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground sm:text-right">
        {pct}% real return (after inflation, ±2% band). <br />
        Balances in today&apos;s dollars; ages {ageStart}{ageStart != null ? ` → ${ageEnd}` : ` to ${ageEnd}`}.
      </div>
    </div>
  );
}
