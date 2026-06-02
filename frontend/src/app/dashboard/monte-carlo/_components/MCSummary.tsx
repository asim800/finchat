// MC headline summary — success rate + key percentiles at retirement and end of horizon.

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MCSimulationResponse } from '@/lib/mc/types';

interface Props {
  result: MCSimulationResponse;
  samplingMethod: string;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function MCSummary({ result, samplingMethod }: Props) {
  const successRate = result.success_rates?.[samplingMethod] ?? 0;
  const atRetire = result.percentiles_at_retirement?.[samplingMethod] ?? {};
  const atHorizon = result.percentiles_at_horizon?.[samplingMethod] ?? {};

  let statusLabel: string;
  let statusVariant: 'success' | 'warning' | 'destructive';
  if (successRate >= 0.85) { statusLabel = 'Likely sustainable'; statusVariant = 'success'; }
  else if (successRate >= 0.5) { statusLabel = 'Coin-flip'; statusVariant = 'warning'; }
  else { statusLabel = 'High depletion risk'; statusVariant = 'destructive'; }

  return (
    <Card>
      <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Probability the portfolio survives</p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-5xl font-bold tabular-nums">{pct(successRate)}</span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Median @ retirement:</dt>
          <dd className="font-medium tabular-nums">{fmt.format(atRetire['50'] ?? 0)}</dd>
          <dt className="text-muted-foreground">5th–95th @ retirement:</dt>
          <dd className="text-xs tabular-nums">{fmt.format(atRetire['5'] ?? 0)} – {fmt.format(atRetire['95'] ?? 0)}</dd>
          <dt className="text-muted-foreground">Median @ horizon:</dt>
          <dd className="font-medium tabular-nums">{fmt.format(atHorizon['50'] ?? 0)}</dd>
          <dt className="text-muted-foreground">5th–95th @ horizon:</dt>
          <dd className="text-xs tabular-nums">{fmt.format(atHorizon['5'] ?? 0)} – {fmt.format(atHorizon['95'] ?? 0)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
