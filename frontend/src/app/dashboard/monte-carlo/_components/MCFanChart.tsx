// Multi-band fan chart for MC results (Phase 4 Part C).
// Recharts ComposedChart: three nested translucent bands (p5-p95, p25-p75)
// plus the p50 median line + a ReferenceLine at retirement.

'use client';

import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { FanChartData } from '@/lib/mc/types';

interface Props {
  accumulation: FanChartData;
  decumulation: FanChartData;
}

function fmtCompact(n: number): string {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

const fmtFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function MCFanChart({ accumulation, decumulation }: Props) {
  // Concatenate accumulation + decumulation into one continuous series; the
  // ReferenceLine at the join marks retirement.
  const merged = [
    ...accumulation.data.map((p, i) => ({
      idx: i,
      date: p.date,
      band95: [p.p5, p.p95] as [number, number],
      band75: [p.p25, p.p75] as [number, number],
      p50: p.p50,
      phase: 'accumulation' as const,
    })),
    ...decumulation.data.map((p, i) => ({
      idx: accumulation.data.length + i,
      date: p.date,
      band95: [p.p5, p.p95] as [number, number],
      band75: [p.p25, p.p75] as [number, number],
      p50: p.p50,
      phase: 'decumulation' as const,
    })),
  ];
  const retirementIdx = accumulation.data.length;

  return (
    <div className="rounded-lg border bg-card p-3 md:p-4">
      <div className="h-[250px] md:h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(d) => String(d).slice(0, 4)}
              interval={Math.floor(merged.length / 8) || 1}
            />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11 }} width={56} />
            <Tooltip
              formatter={(value: unknown, name: string) => {
                if (Array.isArray(value)) {
                  const [lo, hi] = value as [number, number];
                  return [`${fmtFull.format(lo)} – ${fmtFull.format(hi)}`, name === 'band95' ? '5%–95%' : '25%–75%'];
                }
                return [fmtFull.format(value as number), name === 'p50' ? 'Median' : name];
              }}
              labelFormatter={(d) => `Date: ${d}`}
              contentStyle={{ fontSize: '0.8rem' }}
            />
            {/* Outer band: 5%-95% — light, wide. */}
            <Area type="monotone" dataKey="band95" stroke="none"
              fill="#22c55e" fillOpacity={0.12} isAnimationActive={false} />
            {/* Inner band: 25%-75% — darker. */}
            <Area type="monotone" dataKey="band75" stroke="none"
              fill="#22c55e" fillOpacity={0.25} isAnimationActive={false} />
            {/* Median line. */}
            <Line type="monotone" dataKey="p50" stroke="#15803d" strokeWidth={2} dot={false} isAnimationActive={false} />
            {/* Retirement boundary. */}
            {merged[retirementIdx] && (
              <ReferenceLine x={merged[retirementIdx].date} stroke="#f59e0b" strokeDasharray="4 2"
                label={{ value: 'Retire', position: 'top', fontSize: 11, fill: '#f59e0b' }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2 italic">
        Bands show 5–95% (light) and 25–75% (darker) outcome ranges across {accumulation.data.length + decumulation.data.length} periods.
        Solid line is the median (50th percentile). Sampling: {accumulation.sampling_method}.
      </p>
    </div>
  );
}
